import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum IntegrationScenarioTemplateAuditAction {
  IMPORTED = 'imported',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  LIFECYCLE_UPDATED = 'lifecycle_updated',
  RELEASED = 'released',
  REMINDER_NOTIFIED = 'reminder_notified',
  GOVERNANCE_AUTO_TRANSITION = 'governance_auto_transition',
}

@Entity('integration_scenario_template_audits')
export class IntegrationScenarioTemplateAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  templateKey: string;

  @Column({
    type: 'enum',
    enum: IntegrationScenarioTemplateAuditAction,
  })
  action: IntegrationScenarioTemplateAuditAction;

  @Column({ nullable: true })
  operatorId: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'json', nullable: true })
  beforeSnapshot: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  afterSnapshot: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
