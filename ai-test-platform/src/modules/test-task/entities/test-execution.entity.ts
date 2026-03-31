import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PASSED = 'passed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ExecutionErrorType {
  ENVIRONMENT = 'environment',
  SCRIPT = 'script',
  ASSERTION = 'assertion',
  DATA = 'data',
  UNKNOWN = 'unknown',
}

export enum ExecutionRunnerSource {
  LITE = 'lite',
  PYTHON_HTTP = 'python_http',
  PYTHON_LOCAL = 'python_local',
}

@Entity('test_executions')
export class TestExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  taskId: string;

  @Column({ nullable: true })
  environmentId: string;

  @Column({ nullable: true })
  scriptId: string;

  @Column({ nullable: true })
  caseId: string;

  @Column({ unique: true })
  executionNo: string;

  @Column({ nullable: true })
  batchNo: string;

  @Column({ type: 'enum', enum: ExecutionStatus, default: ExecutionStatus.PENDING })
  status: ExecutionStatus;

  @Column({ nullable: true })
  scriptName: string;

  @Column({ nullable: true })
  requestUrl: string;

  @Column({ nullable: true })
  requestMethod: string;

  @Column({ type: 'enum', enum: ExecutionRunnerSource, nullable: true })
  runnerSource: ExecutionRunnerSource;

  @Column({ type: 'json', nullable: true })
  requestHeaders: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  requestBody: Record<string, any>;

  @Column({ type: 'int', nullable: true })
  responseStatus: number;

  @Column({ type: 'json', nullable: true })
  responseBody: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  errorStack: string;

  @Column({ type: 'enum', enum: ExecutionErrorType, nullable: true })
  errorType: ExecutionErrorType;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
