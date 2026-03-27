import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum TaskType {
  INTERFACE_TEST = 'interface_test',
  UI_TEST = 'ui_test',
  PERFORMANCE_TEST = 'performance_test',
  SECURITY_TEST = 'security_test',
  REGRESSION_TEST = 'regression_test',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum ExecuteType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
}

export enum ExecuteEnvironment {
  TEST = 'test',
  PRE_PRODUCTION = 'pre_production',
  PRODUCTION = 'production',
}

@Entity('test_tasks')
export class TestTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskType, default: TaskType.INTERFACE_TEST })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'enum', enum: ExecuteType, default: ExecuteType.IMMEDIATE })
  executeType: ExecuteType;

  @Column({ type: 'simple-array', nullable: true })
  executeEnvironments: ExecuteEnvironment[];

  @Column({ type: 'simple-array', nullable: true })
  scriptIds: string[];

  @Column({ nullable: true })
  environmentId: string;

  @Column({ nullable: true })
  scheduledTime: Date;

  @Column({ nullable: true })
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  totalCases: number;

  @Column({ type: 'int', default: 0 })
  passedCases: number;

  @Column({ type: 'int', default: 0 })
  failedCases: number;

  @Column({ type: 'int', default: 0 })
  blockedCases: number;

  @Column({ type: 'int', default: 0 })
  skippedCases: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  passRate: number;

  @Column({ nullable: true })
  progress: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  creator: User;

  @Column({ nullable: true })
  triggerType: string;

  @Column({ nullable: true })
  triggerUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
