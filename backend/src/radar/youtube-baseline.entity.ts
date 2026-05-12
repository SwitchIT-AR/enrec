import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('youtube_baseline')
export class YoutubeBaseline {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  video_id: string;

  @Column('bigint')
  view_count: number;

  @Column('bigint')
  like_count: number;

  @Column('bigint')
  comment_count: number;

  @Column()
  label: string;

  @CreateDateColumn()
  captured_at: Date;
}
