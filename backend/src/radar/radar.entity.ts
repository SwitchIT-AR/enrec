import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('postulaciones')
export class Postulacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  artista: string;

  @Column()
  email: string;

  @Column()
  genero: string;

  @Column({ nullable: true })
  spotify: string;

  @Column()
  youtube: string;

  @Column()
  instagram: string;

  @Column('text')
  descripcion: string;

  @Column('text')
  respuesta1: string;

  @Column('text')
  respuesta2: string;

  @Column({ nullable: true })
  yt_channel: string;

  @Column({ default: false })
  yt_subscribed_verified: boolean;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ type: 'integer', nullable: true })
  pregunta_set_id: number | null;

  @CreateDateColumn()
  created_at: Date;
}
