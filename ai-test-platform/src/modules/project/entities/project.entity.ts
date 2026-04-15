import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  businessLine: string;

  @Column({ nullable: true })
  ownerId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  status: ProjectStatus;

  @Column({ type: 'json', nullable: true })
  releaseGateSettings: {
    minPassRate?: number;
    minAiAdoptionRate?: number;
    minAiSampleSize?: number;
    rectificationOwnerDefault?: string;
    rectificationPriorityDefault?: 'P0' | 'P1' | 'P2';
    rectificationTagsDefault?: string[];
    updatedAt?: string;
    updatedBy?: string;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
