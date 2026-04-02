import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum AlertNotificationType {
  CALLBACK_RISK = 'callback_risk',
  CALLBACK_RECOVERED = 'callback_recovered',
}

@Entity('alert_notifications')
export class AlertNotification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  taskId: string;

  @Column({ type: 'enum', enum: AlertNotificationType })
  type: AlertNotificationType;

  @Column({ default: 'warning' })
  level: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
