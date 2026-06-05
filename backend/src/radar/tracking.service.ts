import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageViewLog } from './page-view-log.entity';

interface Hit {
  path: string;
  sid: string;
  ts: number;
}

@Injectable()
export class TrackingService {
  private readonly hits: Hit[] = [];
  private readonly WINDOW_MS = 30 * 60 * 1000;

  constructor(
    @InjectRepository(PageViewLog)
    private readonly logRepo: Repository<PageViewLog>,
  ) {}

  record(path: string, sid: string) {
    const now = Date.now();
    const existing = this.hits.find((h) => h.sid === sid && h.path === path);
    if (existing) {
      existing.ts = now;
    } else {
      this.hits.push({ path, sid, ts: now });
      this.logRepo.save(this.logRepo.create({ sid, path })).catch(() => {});
    }
    const cutoff = now - 2 * 60 * 60 * 1000;
    for (let i = this.hits.length - 1; i >= 0; i--) {
      if (this.hits[i].ts < cutoff) this.hits.splice(i, 1);
    }
  }

  getStats(): { total: number; pages: Record<string, number> } {
    const cutoff = Date.now() - this.WINDOW_MS;
    const recent = this.hits.filter((h) => h.ts >= cutoff);
    const pages: Record<string, number> = {};
    for (const h of recent) {
      pages[h.path] = (pages[h.path] ?? 0) + 1;
    }
    const uniqueSessions = new Set(recent.map((h) => h.sid)).size;
    return { total: uniqueSessions, pages };
  }

  async getTotalStats(): Promise<{ uniqueVisitors: number; totalPageViews: number; pageViewsByPath: Record<string, number> }> {
    const [uniqueResult, totalPageViews, byPath] = await Promise.all([
      this.logRepo
        .createQueryBuilder('l')
        .select('COUNT(DISTINCT l.sid)', 'count')
        .getRawOne<{ count: string }>(),
      this.logRepo.count(),
      this.logRepo
        .createQueryBuilder('l')
        .select('l.path', 'path')
        .addSelect('COUNT(*)', 'count')
        .groupBy('l.path')
        .getRawMany<{ path: string; count: string }>(),
    ]);
    const pageViewsByPath: Record<string, number> = {};
    for (const row of byPath) {
      pageViewsByPath[row.path] = parseInt(row.count, 10);
    }
    return {
      uniqueVisitors: parseInt(uniqueResult?.count ?? '0', 10),
      totalPageViews,
      pageViewsByPath,
    };
  }
}
