import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Postulacion } from './radar.entity';
import { RadarController } from './radar.controller';
import { RadarService } from './radar.service';

@Module({
  imports: [TypeOrmModule.forFeature([Postulacion])],
  controllers: [RadarController],
  providers: [RadarService],
})
export class RadarModule {}
