import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './radar.entity';
import { PreguntaSet } from './pregunta-set.entity';
import { RadarController } from './radar.controller';
import { RadarService } from './radar.service';

@Module({
  imports: [TypeOrmModule.forFeature([Postulacion, PreguntaSet])],
  controllers: [RadarController],
  providers: [RadarService],
})
export class RadarModule {}
