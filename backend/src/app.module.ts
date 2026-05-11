import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './radar/radar.entity';
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
        entities: [Postulacion],
        synchronize: true, // crea/actualiza la tabla automáticamente
      }),
    }),
    RadarModule,
  ],
})
export class AppModule {}
