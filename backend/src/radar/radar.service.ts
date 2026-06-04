import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { google } from 'googleapis';
import { YoutubeBaseline } from './youtube-baseline.entity';

const SESSIONS = [
  { nombre: 'Manu Martínez', videoId: '3u0bbataius' },
  { nombre: 'Mariana Michi', videoId: '__KGJ4_HmgY' },
  { nombre: 'Fepo', videoId: 'zNRcYUV6ZdE' },
  { nombre: 'Coval', videoId: '3CRVIZJU8F8' },
  { nombre: 'Francisca y Los Exploradores', videoId: '4GrL1ccJ3mo' },
  { nombre: 'Luaso', videoId: 'yEq3rOBf0SM' },
  { nombre: 'Martu Brito', videoId: 'BZivQ-XM7tI' },
  { nombre: 'Motel Montpellier', videoId: 'nTQM4gD68Yo' },
  { nombre: 'JJJulian', videoId: 'jngaRABfN50' },
  { nombre: 'Mina Baxx', videoId: 'kLsmlObEMUk' },
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
import { UpdateScoreDto } from './update-score.dto';

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);

  constructor(
    @InjectRepository(Postulacion)
    private readonly repo: Repository<Postulacion>,
    @InjectRepository(PreguntaSet)
    private readonly setRepo: Repository<PreguntaSet>,
    @InjectRepository(YoutubeBaseline)
    private readonly baselineRepo: Repository<YoutubeBaseline>,
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

  async updateScore(id: number, dto: UpdateScoreDto): Promise<Postulacion> {
    await this.repo.update(id, dto);
    const updated = await this.repo.findOne({ where: { id } });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  private parseDuration(iso: string): number {
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return parseInt(m[1] ?? '0') + parseInt(m[2] ?? '0') / 60 + parseInt(m[3] ?? '0') / 3600;
  }

  async getYppStats(): Promise<Record<string, unknown>> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    const channelId = this.config.get<string>('ENREC_CHANNEL_ID');
    if (!apiKey || !channelId) return { error: 'no_config' };

    try {
      // Canal: suscriptores y views totales
      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`,
      );
      const chData = await chRes.json() as { items?: { statistics?: Record<string, string> }[] };
      const stats = chData.items?.[0]?.statistics ?? {};
      const subscribers = parseInt(stats.subscriberCount ?? '0');
      const totalViews   = parseInt(stats.viewCount ?? '0');
      const videoCount   = parseInt(stats.videoCount ?? '0');

      // Videos: duración + views + fecha de publicación
      const ids = SESSIONS.map((s) => s.videoId).join(',');
      const vRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ids}&key=${apiKey}`,
      );
      const vData = await vRes.json() as {
        items?: {
          id: string;
          statistics?: Record<string, string>;
          contentDetails?: { duration?: string };
          snippet?: { publishedAt?: string };
        }[]
      };
      const items = vData.items ?? [];
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);

      const videoDetails = SESSIONS.map((session) => {
        const item = items.find((i) => i.id === session.videoId);
        const views = parseInt(item?.statistics?.viewCount ?? '0');
        const durationH = this.parseDuration(item?.contentDetails?.duration ?? 'PT0S');
        const publishedAt = item?.snippet?.publishedAt ?? null;
        const isWithinYear = publishedAt ? new Date(publishedAt) >= cutoff : false;
        return {
          nombre: session.nombre,
          videoId: session.videoId,
          views,
          durationMin: Math.round(durationH * 60),
          estimatedHoursUpperBound: Math.round(views * durationH),
          publishedAt,
          isWithinYear,
        };
      });

      // Horas reales via YouTube Analytics API (OAuth 2.0)
      let watchHoursLongForm: number | null = null;
      let shortsViews90d: number | null = null;
      let watchHoursApiAvailable = false;

      const clientId     = this.config.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
      const refreshToken = this.config.get<string>('GOOGLE_REFRESH_TOKEN');

      if (clientId && clientSecret && refreshToken) {
        try {
          const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
          oauth2Client.setCredentials({ refresh_token: refreshToken });

          const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client });

          // Analytics tiene ~3 días de lag
          const endDate = new Date();
          endDate.setDate(endDate.getDate() - 3);

          // Camino A: horas de videos largos — ventana rolling 365 días
          const startDate365 = new Date(endDate);
          startDate365.setFullYear(startDate365.getFullYear() - 1);

          // Camino B: vistas de Shorts — ventana 90 días
          const startDate90 = new Date(endDate);
          startDate90.setDate(startDate90.getDate() - 90);

          const endStr   = endDate.toISOString().split('T')[0];
          const start365 = startDate365.toISOString().split('T')[0];
          const start90  = startDate90.toISOString().split('T')[0];

          // creatorContentType solo funciona como dimensión, no como filtro
          // → dos queries con dimension=creatorContentType, luego se filtran las filas
          const [longFormRes, shortsRes] = await Promise.all([
            youtubeAnalytics.reports.query({
              ids: 'channel==MINE',
              startDate: start365,
              endDate: endStr,
              metrics: 'estimatedMinutesWatched',
              dimensions: 'creatorContentType',
            }),
            youtubeAnalytics.reports.query({
              ids: 'channel==MINE',
              startDate: start90,
              endDate: endStr,
              metrics: 'views',
              dimensions: 'creatorContentType',
            }),
          ]);

          this.logger.log(`LF rows: ${JSON.stringify(longFormRes.data.rows)}`);
          this.logger.log(`Shorts rows: ${JSON.stringify(shortsRes.data.rows)}`);
          const findRow = (rows: unknown[][], type: string) =>
            (rows ?? []).find((r) => r[0] === type)?.[1] as number ?? 0;

          const longFormMinutes = findRow(longFormRes.data.rows as unknown[][], 'VIDEO_ON_DEMAND');
          watchHoursLongForm = Math.round(longFormMinutes / 60);
          shortsViews90d = findRow(shortsRes.data.rows as unknown[][], 'SHORTS');
          watchHoursApiAvailable = true;
        } catch (oauthErr) {
          this.logger.warn('YouTube Analytics OAuth failed', (oauthErr as Error).message);
        }
      }

      return {
        subscribers,
        subscribersGoal: 1000,
        totalViews,
        videoCount,
        watchHoursLongForm,
        watchHoursGoal: 4000,
        shortsViews90d,
        shortsViewsGoal: 10_000_000,
        watchHoursApiAvailable,
        videoDetails,
      };
    } catch (e) {
      this.logger.error('YPP stats failed', e);
      return { error: 'fetch_error' };
    }
  }

  async getYoutubeStats(): Promise<Record<string, unknown>[]> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) return SESSIONS.map((s) => ({ ...s, error: 'no_api' }));

    // ── YouTube API ───────────────────────────────────────────────────────────
    let ytData: Record<string, unknown> = {};
    try {
      const ids = SESSIONS.map((s) => s.videoId).join(',');
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${apiKey}`,
      );
      ytData = await res.json();
      if ((ytData as { error?: unknown }).error) {
        this.logger.error('YouTube API error', JSON.stringify(ytData));
      }
    } catch (e) {
      this.logger.error('YouTube fetch failed', e);
      return SESSIONS.map((s) => ({ ...s, error: 'fetch_error' }));
    }

    // ── Baseline (no bloquea si la tabla no existe aún) ───────────────────────
    let baselineMap = new Map<string, YoutubeBaseline>();
    try {
      const baselines = await this.baselineRepo
        .createQueryBuilder('b')
        .distinctOn(['b.video_id'])
        .orderBy('b.video_id')
        .addOrderBy('b.captured_at', 'DESC')
        .getMany();
      baselineMap = new Map(baselines.map((b) => [b.video_id, b]));
    } catch (e) {
      this.logger.warn('Baseline query failed (tabla puede no existir aún):', (e as Error).message);
    }

    const items = (ytData as { items?: { id: string; statistics?: Record<string, string>; snippet?: Record<string, unknown> }[] }).items ?? [];
    return SESSIONS.map((session) => {
      const item = items.find((i) => i.id === session.videoId);
      const viewCount = parseInt(item?.statistics?.viewCount ?? '0', 10);
      const likeCount = parseInt(item?.statistics?.likeCount ?? '0', 10);
      const commentCount = parseInt(item?.statistics?.commentCount ?? '0', 10);
      const baseline = baselineMap.get(session.videoId);
      return {
        nombre: session.nombre,
        videoId: session.videoId,
        viewCount,
        likeCount,
        commentCount,
        publishedAt: (item?.snippet?.publishedAt as string) ?? null,
        thumbnail: (item?.snippet as { thumbnails?: { medium?: { url?: string } } })?.thumbnails?.medium?.url ?? null,
        deltaViews: baseline ? viewCount - Number(baseline.view_count) : null,
        deltaLikes: baseline ? likeCount - Number(baseline.like_count) : null,
      };
    });
  }

  async captureBaseline(): Promise<{ captured: number; capturedAt: Date }> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    if (!apiKey) throw new Error('YOUTUBE_API_KEY not configured');

    const ids = SESSIONS.map((s) => s.videoId).join(',');
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids}&key=${apiKey}`,
    );
    const data = await res.json();

    const entities = SESSIONS.map((session) => {
      const item = data.items?.find((i: { id: string }) => i.id === session.videoId);
      return this.baselineRepo.create({
        video_id: session.videoId,
        view_count: parseInt(item?.statistics?.viewCount ?? '0', 10),
        like_count: parseInt(item?.statistics?.likeCount ?? '0', 10),
        comment_count: parseInt(item?.statistics?.commentCount ?? '0', 10),
        label: session.nombre,
      });
    });

    await this.baselineRepo.save(entities);
    return { captured: entities.length, capturedAt: new Date() };
  }

  async getLatestBaseline(): Promise<{ capturedAt: Date | null; label: string | null }> {
    const latest = await this.baselineRepo.findOne({
      where: {},
      order: { captured_at: 'DESC' },
    });
    return { capturedAt: latest?.captured_at ?? null, label: latest ? 'Campaña Radar EN .REC' : null };
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
