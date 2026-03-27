import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EnvironmentType {
  TEST = 'test',
  PRE_PRODUCTION = 'pre_production',
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
}

export enum EnvironmentStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  MAINTENANCE = 'maintenance',
}

@Entity('environments')
export class Environment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: EnvironmentType })
  type: EnvironmentType;

  @Column()
  baseUrl: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'json', nullable: true })
  variables: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  headers: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  authConfig: Record<string, any>;

  @Column({ type: 'enum', enum: EnvironmentStatus, default: EnvironmentStatus.AVAILABLE })
  status: EnvironmentStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  healthScore: number;

  @Column({ nullable: true })
  lastHealthCheck: Date;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
