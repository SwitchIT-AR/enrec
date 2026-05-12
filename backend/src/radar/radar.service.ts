import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';

const SESSIONS = [
  { nombre: 'Manu Martínez', videoId: '3u0bbataius' },
  { nombre: 'Mariana Michi', videoId: '__KGJ4_HmgY' },
  { nombre: 'Fepo Cambiasso', videoId: 'zNRcYUV6ZdE' },
  { nombre: 'Coval', videoId: '3CRVIZJU8F8' },
  { nombre: 'Francisca y Los Exploradores', videoId: '4GrL1ccJ3mo' },
  { nombre: 'Luaso', videoId: 'yEq3rOBf0SM' },
  { nombre: 'Martu Brito', videoId: 'BZivQ-XM7tI' },
  { nombre: 'Motel', videoId: 'nTQM4gD68Yo' },
  { nombre: 'JJJulian', videoId: 'jngaRABfN50' },
  { nombre: 'Mina', videoId: 'kLsmlObEMUk' },
  { nombre: 'Los Palmos', videoId: 'qXqajLd4YHI' },
];
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Postulacion } from './radar.entity';
import { PreguntaSet } from './pregunta-set.entity';
import { CreateRadarDto } from './create-radar.dto';
import { PreguntaSetDto } from './pregunta-set.dto';

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);

  constructor(
    @InjectRepository(Postulacion)
    private readonly repo: Repository<Postulacion>,
    @InjectRepository(PreguntaSet)
    private readonly setRepo: Repository<PreguntaSet>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateRadarDto, ip: string): Promise<Postulacion> {
    const entity = this.repo.create({
      ...dto,
      respuesta1: dto.respuesta1,
      respuesta2: dto.respuesta2,
      yt_channel: dto.ytChannel ?? null,
      yt_subscribed_verified: dto.ytSubscribedVerified ?? false,
      pregunta_set_id: dto.preguntaSetId ?? null,
      ip_address: ip,
    });
    const saved = await this.repo.save(entity);
    await this.sendEmails(saved);
    return saved;
  }

  findAll(): Promise<Postulacion[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
  }

  async deletePostulacion(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async getYoutubeStats(): Promise<Record<string, unknown>[]> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) return SESSIONS.map((s) => ({ ...s, error: 'no_api' }));

    const ids = SESSIONS.map((s) => s.videoId).join(',');
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${apiKey}`,
      );
      const data = await res.json();
      return SESSIONS.map((session) => {
        const item = data.items?.find((i: { id: string }) => i.id === session.videoId);
        return {
          nombre: session.nombre,
          videoId: session.videoId,
          viewCount: parseInt(item?.statistics?.viewCount ?? '0', 10),
          likeCount: parseInt(item?.statistics?.likeCount ?? '0', 10),
          commentCount: parseInt(item?.statistics?.commentCount ?? '0', 10),
          publishedAt: item?.snippet?.publishedAt ?? null,
          thumbnail: item?.snippet?.thumbnails?.medium?.url ?? null,
        };
      });
    } catch {
      return SESSIONS.map((s) => ({ ...s, error: 'fetch_error' }));
    }
  }

  // ── Pregunta Sets ─────────────────────────────────────────────────────────

  private toPublicSet(s: PreguntaSet): Record<string, unknown> {
    return {
      id: s.id,
      nombre: s.nombre,
      p1_etiqueta: s.p1_etiqueta,
      p1_pregunta: s.p1_pregunta,
      p1_youtube_url: s.p1_youtube_url,
      p2_etiqueta: s.p2_etiqueta,
      p2_pregunta: s.p2_pregunta,
      p2_youtube_url: s.p2_youtube_url,
    };
  }

  async getActivePreguntaSet(): Promise<Record<string, unknown> | null> {
    const sets = await this.setRepo.find({ where: { activo: true } });
    const today = new Date().getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    // Primero: set que coincide con el día de hoy
    const dayMatch = sets.find((s) => {
      const dias = Array.isArray(s.dias) ? s.dias : [];
      return dias.map(Number).includes(today);
    });
    if (dayMatch) return this.toPublicSet(dayMatch);
    // Fallback: set marcado como predeterminado
    const defaultSet = sets.find((s) => s.es_default);
    return defaultSet ? this.toPublicSet(defaultSet) : null;
  }

  findAllPreguntaSets(): Promise<PreguntaSet[]> {
    return this.setRepo.find({ order: { id: 'ASC' } });
  }

  async createPreguntaSet(dto: PreguntaSetDto): Promise<PreguntaSet> {
    if (dto.es_default) {
      await this.setRepo.update({}, { es_default: false });
    }
    const set = this.setRepo.create({ ...dto, activo: dto.activo ?? true, es_default: dto.es_default ?? false });
    return this.setRepo.save(set);
  }

  async updatePreguntaSet(id: number, dto: PreguntaSetDto): Promise<PreguntaSet> {
    const existing = await this.setRepo.findOneBy({ id });
    if (!existing) throw new NotFoundException('Set no encontrado');
    if (dto.es_default) {
      await this.setRepo.update({}, { es_default: false });
    }
    Object.assign(existing, dto);
    return this.setRepo.save(existing);
  }

  async deletePreguntaSet(id: number): Promise<void> {
    await this.setRepo.delete(id);
  }

  async verifySubscription(channelInput: string): Promise<{
    exists: boolean;
    subscribed: boolean;
    couldBePrivate: boolean;
    channelTitle?: string;
    channelId?: string;
    noApi?: boolean;
  }> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    const enrecChannelId = this.config.get<string>('ENREC_CHANNEL_ID');

    if (!apiKey || !enrecChannelId) {
      return { exists: false, subscribed: false, couldBePrivate: false, noApi: true };
    }

    // ── Parsear input → handle o channel ID ───────────────────────────────
    let handle: string | null = null;
    let directChannelId: string | null = null;

    const input = channelInput.trim().replace(/\/+$/, '');
    const channelIdMatch = input.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
    const handleMatch = input.match(/(?:youtube\.com\/@|^@)([a-zA-Z0-9._-]+)/);

    if (channelIdMatch) {
      directChannelId = channelIdMatch[1];
    } else if (handleMatch) {
      handle = handleMatch[1];
    } else {
      // Asumir que es un handle sin @ ni URL
      handle = input.replace(/^@/, '');
    }

    // ── Resolver channel ID del artista ──────────────────────────────────
    let channelId = directChannelId;
    let channelTitle: string | undefined;

    try {
      if (!channelId && handle) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
        );
        const data = await res.json();
        if (!data.items?.length) {
          return { exists: false, subscribed: false, couldBePrivate: false };
        }
        channelId = data.items[0].id;
        channelTitle = data.items[0].snippet?.title;
      } else if (channelId) {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`,
        );
        const data = await res.json();
        if (!data.items?.length) {
          return { exists: false, subscribed: false, couldBePrivate: false };
        }
        channelTitle = data.items[0].snippet?.title;
      }
    } catch {
      return { exists: false, subscribed: false, couldBePrivate: false };
    }

    // ── Verificar suscripción ─────────────────────────────────────────────
    try {
      const subRes = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&channelId=${channelId}&forChannelId=${enrecChannelId}&key=${apiKey}`,
      );
      const subData = await subRes.json();

      if (subData.error) {
        // 403 suele indicar suscripciones privadas
        const isPrivate = subData.error.code === 403;
        return { exists: true, subscribed: false, couldBePrivate: isPrivate, channelId, channelTitle };
      }

      const subscribed = (subData.pageInfo?.totalResults ?? 0) > 0;
      // Si no está suscripto, puede ser porque las suscripciones son privadas
      return { exists: true, subscribed, couldBePrivate: !subscribed, channelId, channelTitle };
    } catch {
      return { exists: true, subscribed: false, couldBePrivate: true, channelId, channelTitle };
    }
  }

  async getGa4Stats(): Promise<Record<string, unknown>> {
    const credPath = this.config.get<string>('GOOGLE_CREDENTIALS_PATH');
    const propertyId = this.config.get<string>('GA4_PROPERTY_ID');
    if (!credPath || !propertyId) return { error: 'no_config' };

    try {
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      const token = await this.getGoogleAccessToken(creds);

      const body = {
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              { filter: { fieldName: 'pagePath', stringFilter: { value: '/', matchType: 'EXACT' } } },
              { filter: { fieldName: 'pagePath', stringFilter: { value: '/radar', matchType: 'EXACT' } } },
            ],
          },
        },
      };

      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();

      const result: Record<string, { views: number; users: number }> = { '/': { views: 0, users: 0 }, '/radar': { views: 0, users: 0 } };
      for (const row of data.rows ?? []) {
        const path = row.dimensionValues?.[0]?.value as string;
        if (result[path]) {
          result[path].views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
          result[path].users = parseInt(row.metricValues?.[1]?.value ?? '0', 10);
        }
      }
      return result;
    } catch (e) {
      this.logger.error('GA4 stats error', e);
      return { error: 'fetch_error' };
    }
  }

  private async getGoogleAccessToken(creds: { client_email: string; private_key: string }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(creds.private_key, 'base64url');
    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const data = await res.json();
    return data.access_token;
  }

  private async sendEmails(p: Postulacion) {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST no configurado — emails omitidos');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT', 587)),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });

    const from = `"${this.config.get('FROM_NAME', 'EN .REC')}" <${this.config.get('FROM_EMAIL', 'radar@enrec.com.ar')}>`;
    const notify = this.config.get('NOTIFY_EMAIL', 'clari.presas@gmail.com');

    // Email al equipo
    const teamBody = [
      `Nueva postulación — Radar EN .REC`,
      `${'─'.repeat(50)}`,
      `ARTISTA / BANDA : ${p.artista}`,
      `EMAIL           : ${p.email}`,
      `GÉNERO          : ${p.genero}`,
      `SPOTIFY         : ${p.spotify || '—'}`,
      `YOUTUBE         : ${p.youtube}`,
      `INSTAGRAM       : ${p.instagram}`,
      ``,
      `DESCRIPCIÓN:`,
      p.descripcion,
      ``,
      `${'─'.repeat(50)}`,
      `PREGUNTA 1 (camarógrafos Francisca):`,
      p.respuesta1,
      ``,
      `PREGUNTA 2 (solos guitarra Mariana Michi):`,
      p.respuesta2,
    ].join('\n');

    await transporter.sendMail({
      from,
      to: notify,
      replyTo: `"${p.artista}" <${p.email}>`,
      subject: `Postulación Radar EN .REC — ${p.artista}`,
      text: teamBody,
    });

    // Confirmación al artista
    const artistBody = [
      `Hola ${p.artista},`,
      ``,
      `Recibimos tu postulación para el Radar EN .REC. 🎙️`,
      ``,
      `Vamos a revisar todos los proyectos con calma y, si quedás entre los finalistas,`,
      `te vamos a escribir a este email.`,
      ``,
      `Las inscripciones cierran el 31 de Julio de 2026.`,
      ``,
      `Gracias por sumarte y mostrarnos lo que hacés.`,
      ``,
      `— Equipo EN .REC`,
      `enrec.com.ar · @enrec.ar`,
    ].join('\n');

    await transporter.sendMail({
      from,
      to: p.email,
      subject: `Recibimos tu postulación — Radar EN .REC 🎙️`,
      text: artistBody,
    });

    this.logger.log(`Emails enviados para postulación de ${p.artista}`);
  }
}
