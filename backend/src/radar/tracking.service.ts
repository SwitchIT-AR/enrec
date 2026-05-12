import { Injectable } from '@nestjs/common';

interface Hit {
  path: string;
  ts: number;
}

@Injectable()
export class TrackingService {
  private readonly hits: Hit[] = [];
  private readonly WINDOW_MS = 30 * 60 * 1000; // 30 minutos

  record(path: string) {
    this.hits.push({ path, ts: Date.now() });
    // Limpiar entradas viejas (mantener sólo últimas 2 horas)
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    while (this.hits.length > 0 && this.hits[0].ts < cutoff) {
      this.hits.shift();
    }
  }

  getStats(): { total: number; pages: Record<string, number> } {
    const cutoff = Date.now() - this.WINDOW_MS;
    const recent = this.hits.filter((h) => h.ts >= cutoff);
    const pages: Record<string, number> = {};
    for (const h of recent) {
      pages[h.path] = (pages[h.path] ?? 0) + 1;
    }
    return { total: recent.length, pages };
  }
}
