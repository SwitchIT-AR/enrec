import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('page_view_log')
export class PageViewLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sid: string;

  @Column()
  path: string;

  @CreateDateColumn()
  created_at: Date;
}
