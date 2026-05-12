import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './radar.entity';
import { PreguntaSet } from './pregunta-set.entity';
import { YoutubeBaseline } from './youtube-baseline.entity';
import { RadarController } from './radar.controller';
import { RadarService } from './radar.service';
import { TrackingService } from './tracking.service';

@Module({
  imports: [TypeOrmModule.forFeature([Postulacion, PreguntaSet, YoutubeBaseline])],
  controllers: [RadarController],
  providers: [RadarService, TrackingService],
})
export class RadarModule {}
