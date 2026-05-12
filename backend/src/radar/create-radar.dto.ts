import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRadarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  artista: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  genero: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  spotify?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  youtube: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  instagram: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  respuesta1: string;

  @IsString()
  @IsNotEmpty()
  respuesta2: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  ytChannel?: string;

  @IsOptional()
  ytSubscribedVerified?: boolean;

  @IsNumber()
  @IsOptional()
  preguntaSetId?: number;
}
