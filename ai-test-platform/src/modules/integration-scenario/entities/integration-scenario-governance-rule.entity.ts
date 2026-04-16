import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('integration_scenario_governance_rules')
export class IntegrationScenarioGovernanceRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  businessLine: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: true })
  autoRejectPendingReviewEnabled: boolean;

  @Column({ type: 'int', default: 2 })
  pendingReviewTimeoutDays: number;

  @Column({ default: true })
  autoDeprecatedRejectedEnabled: boolean;

  @Column({ type: 'int', default: 14 })
  rejectedNotFixedDays: number;

  @Column({ default: false })
  autoReleaseApprovedEnabled: boolean;

  @Column({ default: false })
  autoDeprecatedLowQualityEnabled: boolean;

  @Column({ type: 'int', default: 60 })
  lowQualityThreshold: number;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
