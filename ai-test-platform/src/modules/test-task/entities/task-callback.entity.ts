import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TaskCallbackStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Entity('task_callbacks')
export class TaskCallback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  taskId: string;

  @Column({ nullable: true })
  batchNo: string;

  @Column({ nullable: true })
  triggerType: string;

  @Column({ nullable: true })
  callbackUrl: string;

  @Column({ nullable: true })
  event: string;

  @Column({ type: 'enum', enum: TaskCallbackStatus, default: TaskCallbackStatus.SUCCESS })
  status: TaskCallbackStatus;

  @Column({ type: 'int', default: 1 })
  attempts: number;

  @Column({ type: 'int', nullable: true })
  responseStatus: number;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'boolean', default: false })
  signatureEnabled: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  requestBody: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
