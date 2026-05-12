import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class PreguntaSetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsArray()
  @IsNumber({}, { each: true })
  dias: number[];

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsBoolean()
  @IsOptional()
  es_default?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  p1_etiqueta?: string;

  @IsString()
  @IsNotEmpty()
  p1_pregunta: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  p1_youtube_url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  p1_respuesta_correcta: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  p2_etiqueta?: string;

  @IsString()
  @IsNotEmpty()
  p2_pregunta: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  p2_youtube_url: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  p2_respuesta_correcta: string;
}
