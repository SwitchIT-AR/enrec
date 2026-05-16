import { IsBoolean, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

export class UpdateScoreDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(5)
  estrellas?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsBoolean()
  aclaro_respuestas?: boolean | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  calidad_proyecto?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  calidad_artista?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  repertorio?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  presencia_camara?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(10)
  compatibilidad?: number | null;
}
