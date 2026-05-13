import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './radar/radar.entity';
import { PreguntaSet } from './radar/pregunta-set.entity';
import { YoutubeBaseline } from './radar/youtube-baseline.entity';
import { PageViewLog } from './radar/page-view-log.entity';
import { RadarModule } from './radar/radar.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        username: cfg.get('DB_USER', 'enrec'),
        password: cfg.get('DB_PASSWORD', ''),
        database: cfg.get('DB_NAME', 'enrec'),
        entities: [Postulacion, PreguntaSet, YoutubeBaseline, PageViewLog],
        synchronize: true,
      }),
    }),
    RadarModule,
  ],
})
export class AppModule {}
