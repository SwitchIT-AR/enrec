import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pregunta_sets')
export class PreguntaSet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  // días de la semana activos: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
  @Column({ type: 'jsonb', default: '[]' })
  dias: number[];

  @Column({ default: true })
  activo: boolean;

  @Column({ default: false })
  es_default: boolean;

  @Column({ nullable: true })
  p1_etiqueta: string;

  @Column('text')
  p1_pregunta: string;

  @Column()
  p1_youtube_url: string;

  @Column()
  p1_respuesta_correcta: string;

  @Column({ nullable: true })
  p2_etiqueta: string;

  @Column('text')
  p2_pregunta: string;

  @Column()
  p2_youtube_url: string;

  @Column()
  p2_respuesta_correcta: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
