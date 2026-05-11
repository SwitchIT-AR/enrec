import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Postulacion } from './radar.entity';
import { CreateRadarDto } from './create-radar.dto';

@Injectable()
export class RadarService {
  private readonly logger = new Logger(RadarService.name);

  constructor(
    @InjectRepository(Postulacion)
    private readonly repo: Repository<Postulacion>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateRadarDto, ip: string): Promise<Postulacion> {
    const entity = this.repo.create({
      ...dto,
      yt_channel: dto.ytChannel ?? null,
      yt_subscribed_verified: dto.ytSubscribedVerified ?? false,
      ip_address: ip,
    });
    const saved = await this.repo.save(entity);
    await this.sendEmails(saved);
    return saved;
  }

  findAll(): Promise<Postulacion[]> {
    return this.repo.find({ order: { created_at: 'DESC' } });
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
