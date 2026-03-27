import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum TestCasePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TestCaseStatus {
  DRAFT = 'draft',
  VALID = 'valid',
  INVALID = 'invalid',
  OBSOLETE = 'obsolete',
}

export enum TestCaseSource {
  AI_GENERATED = 'ai_generated',
  MANUAL = 'manual',
  IMPORTED = 'imported',
}

export enum TestCaseType {
  FUNCTIONAL = 'functional',
  INTERFACE = 'interface',
  UI = 'ui',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
}

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  preconditions: string;

  @Column({ type: 'text' })
  testSteps: string;

  @Column({ type: 'text' })
  expectedResult: string;

  @Column({ nullable: true })
  module: string;

  @Column({ nullable: true })
  subModule: string;

  @Column({ type: 'enum', enum: TestCaseType, default: TestCaseType.FUNCTIONAL })
  type: TestCaseType;

  @Column({ type: 'enum', enum: TestCasePriority, default: TestCasePriority.MEDIUM })
  priority: TestCasePriority;

  @Column({ type: 'enum', enum: TestCaseStatus, default: TestCaseStatus.DRAFT })
  status: TestCaseStatus;

  @Column({ type: 'enum', enum: TestCaseSource, default: TestCaseSource.MANUAL })
  source: TestCaseSource;

  @Column({ default: false })
  isCoreCase: boolean;

  @Column({ nullable: true })
  tags: string;

  @Column({ nullable: true })
  remarks: string;

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
