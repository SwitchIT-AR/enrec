import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateRadarDto } from './create-radar.dto';
import { RadarService } from './radar.service';

@Controller('api/radar')
export class RadarController {
  constructor(
    private readonly service: RadarService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async submit(@Body() dto: CreateRadarDto, @Ip() ip: string) {
    await this.service.create(dto, ip);
    return { ok: true };
  }

  @Get('verify-subscription')
  async verifySubscription(@Query('channel') channel: string) {
    if (!channel?.trim()) throw new BadRequestException('Canal requerido');
    return this.service.verifySubscription(channel.trim());
  }

  @Get('admin/postulaciones')
  async getAll(@Headers('authorization') auth: string) {
    const token = (auth ?? '').replace(/^Bearer\s+/i, '');
    const expected = this.config.get<string>('ADMIN_TOKEN', '');
    if (!token || token !== expected) {
      throw new UnauthorizedException('Token inválido');
    }
    return this.service.findAll();
  }
}
