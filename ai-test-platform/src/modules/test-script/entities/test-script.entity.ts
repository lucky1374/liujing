import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ScriptType {
  INTERFACE = 'interface',
  UI = 'ui',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

export enum ScriptStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  NEED_OPTIMIZE = 'need_optimize',
}

export enum ScriptSource {
  AI_GENERATED = 'ai_generated',
  MANUAL = 'manual',
  IMPORTED = 'imported',
}

export enum ScriptLanguage {
  PYTHON = 'python',
  JAVA = 'java',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
}

export enum ScriptExecutionMode {
  LITE = 'lite',
  PYTHON = 'python',
}

@Entity('test_scripts')
export class TestScript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  caseId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ScriptType, default: ScriptType.INTERFACE })
  type: ScriptType;

  @Column({ type: 'enum', enum: ScriptLanguage, default: ScriptLanguage.PYTHON })
  language: ScriptLanguage;

  @Column({ type: 'enum', enum: ScriptExecutionMode, default: ScriptExecutionMode.LITE })
  executionMode: ScriptExecutionMode;

  @Column({ type: 'text' })
  scriptContent: string;

  @Column({ nullable: true })
  module: string;

  @Column({ type: 'enum', enum: ScriptStatus, default: ScriptStatus.VALID })
  status: ScriptStatus;

  @Column({ type: 'enum', enum: ScriptSource, default: ScriptSource.MANUAL })
  source: ScriptSource;

  @Column({ nullable: true })
  framework: string;

  @Column({ nullable: true })
  frameworkVersion: string;

  @Column({ nullable: true })
  tags: string;

  @Column({ nullable: true })
  remarks: string;

  @Column({ default: false })
  isGlobal: boolean;

  @Column()
  createdBy: string;

  @ManyToOne(() => User)
  creator: User;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
