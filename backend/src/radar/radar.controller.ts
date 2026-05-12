import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateRadarDto } from './create-radar.dto';
import { PreguntaSetDto } from './pregunta-set.dto';
import { RadarService } from './radar.service';

@Controller('api/radar')
export class RadarController {
  constructor(
    private readonly service: RadarService,
    private readonly config: ConfigService,
  ) {}

  private checkAdmin(auth: string): void {
    const token = (auth ?? '').replace(/^Bearer\s+/i, '');
    const expected = this.config.get<string>('ADMIN_TOKEN', '');
    if (!token || token !== expected) throw new UnauthorizedException('Token inválido');
  }

  @Post()
  @HttpCode(200)
  async submit(@Body() dto: CreateRadarDto, @Ip() ip: string) {
    const startsWithDigit = (s: string) => /^\d/.test(s?.trim() ?? '');
    if (!startsWithDigit(dto.respuesta1) || !startsWithDigit(dto.respuesta2)) {
      throw new BadRequestException({ code: 'outdated_form', message: 'Formulario desactualizado' });
    }
    await this.service.create(dto, ip);
    return { ok: true };
  }

  @Get('verify-subscription')
  async verifySubscription(@Query('channel') channel: string) {
    if (!channel?.trim()) throw new BadRequestException('Canal requerido');
    return this.service.verifySubscription(channel.trim());
  }

  // ── Pregunta sets — público ───────────────────────────────────────────────

  @Get('preguntas/activo')
  getActivePreguntaSet() {
    return this.service.getActivePreguntaSet();
  }

  // ── Admin — postulaciones ─────────────────────────────────────────────────

  @Get('admin/postulaciones')
  async getAll(@Headers('authorization') auth: string) {
    this.checkAdmin(auth);
    return this.service.findAll();
  }

  @Delete('admin/postulaciones/:id')
  @HttpCode(204)
  async deletePostulacion(
    @Headers('authorization') auth: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAdmin(auth);
    await this.service.deletePostulacion(id);
  }

  // ── Admin — pregunta sets ─────────────────────────────────────────────────

  @Get('admin/pregunta-sets')
  async getAllSets(@Headers('authorization') auth: string) {
    this.checkAdmin(auth);
    return this.service.findAllPreguntaSets();
  }

  @Post('admin/pregunta-sets')
  async createSet(
    @Headers('authorization') auth: string,
    @Body() dto: PreguntaSetDto,
  ) {
    this.checkAdmin(auth);
    return this.service.createPreguntaSet(dto);
  }

  @Put('admin/pregunta-sets/:id')
  async updateSet(
    @Headers('authorization') auth: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PreguntaSetDto,
  ) {
    this.checkAdmin(auth);
    return this.service.updatePreguntaSet(id, dto);
  }

  @Delete('admin/pregunta-sets/:id')
  @HttpCode(204)
  async deleteSet(
    @Headers('authorization') auth: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.checkAdmin(auth);
    await this.service.deletePreguntaSet(id);
  }
}
