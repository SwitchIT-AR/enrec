import { Injectable } from '@nestjs/common';

interface Hit {
  path: string;
  sid: string;
  ts: number;
}

@Injectable()
export class TrackingService {
  private readonly hits: Hit[] = [];
  private readonly WINDOW_MS = 30 * 60 * 1000; // 30 minutos

  record(path: string, sid: string) {
    const now = Date.now();
    // Actualizar timestamp si la sesión ya está en la ventana para este path
    const existing = this.hits.find((h) => h.sid === sid && h.path === path);
    if (existing) {
      existing.ts = now;
    } else {
      this.hits.push({ path, sid, ts: now });
    }
    // Limpiar entradas viejas (mantener sólo últimas 2 horas)
    const cutoff = now - 2 * 60 * 60 * 1000;
    for (let i = this.hits.length - 1; i >= 0; i--) {
      if (this.hits[i].ts < cutoff) this.hits.splice(i, 1);
    }
  }

  getStats(): { total: number; pages: Record<string, number> } {
    const cutoff = Date.now() - this.WINDOW_MS;
    const recent = this.hits.filter((h) => h.ts >= cutoff);
    // Contar sesiones únicas por path
    const pages: Record<string, number> = {};
    for (const h of recent) {
      pages[h.path] = (pages[h.path] ?? 0) + 1;
    }
    // Total = sesiones únicas globales (una sesión puede estar en múltiples paths)
    const uniqueSessions = new Set(recent.map((h) => h.sid)).size;
    return { total: uniqueSessions, pages };
  }
}
