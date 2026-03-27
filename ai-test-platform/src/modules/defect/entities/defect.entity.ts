import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum DefectStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  REOPENED = 'reopened',
}

export enum DefectSeverity {
  BLOCKER = 'blocker',
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  TRIVIAL = 'trivial',
}

export enum DefectType {
  FUNCTIONAL = 'functional',
  UI = 'ui',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  DATA = 'data',
  CONFIGURATION = 'configuration',
}

export enum DefectSource {
  AI_DETECTED = 'ai_detected',
  MANUAL_REPORTED = 'manual_reported',
  IMPORTED = 'imported',
}

@Entity('defects')
export class Defect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DefectType, default: DefectType.FUNCTIONAL })
  type: DefectType;

  @Column({ type: 'enum', enum: DefectSeverity, default: DefectSeverity.MINOR })
  severity: DefectSeverity;

  @Column({ type: 'enum', enum: DefectStatus, default: DefectStatus.OPEN })
  status: DefectStatus;

  @Column({ type: 'enum', enum: DefectSource, default: DefectSource.MANUAL_REPORTED })
  source: DefectSource;

  @Column({ nullable: true })
  module: string;

  @Column({ nullable: true })
  subModule: string;

  @Column({ nullable: true })
  relatedCaseId: string;

  @Column({ nullable: true })
  relatedScriptId: string;

  @Column({ nullable: true })
  relatedTaskId: string;

  @Column({ nullable: true })
  environment: string;

  @Column({ nullable: true })
  stepsToReproduce: string;

  @Column({ nullable: true })
  actualResult: string;

  @Column({ nullable: true })
  expectedResult: string;

  @Column({ nullable: true })
  screenshots: string;

  @Column({ nullable: true })
  logs: string;

  @Column({ nullable: true })
  rootCauseAnalysis: string;

  @Column({ nullable: true })
  aiSuggestion: string;

  @Column({ nullable: true })
  jiraKey: string;

  @Column({ nullable: true })
  assigneeId: string;

  @ManyToOne(() => User)
  assignee: User;

  @Column()
  reporterId: string;

  @ManyToOne(() => User)
  reporter: User;

  @Column({ nullable: true })
  resolvedBy: string;

  @ManyToOne(() => User)
  resolver: User;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  closedBy: string;

  @Column({ nullable: true })
  closedAt: Date;

  @Column({ type: 'int', default: 0 })
  reopenCount: number;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
