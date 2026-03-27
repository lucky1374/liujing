import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum TestDataStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

export enum DataType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  MOCK = 'mock',
}

@Entity('test_data')
export class TestData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: DataType, default: DataType.STATIC })
  type: DataType;

  @Column({ nullable: true })
  module: string;

  @Column({ type: 'text' })
  dataContent: string;

  @Column({ nullable: true })
  dataSchema: string;

  @Column({ type: 'enum', enum: TestDataStatus, default: TestDataStatus.ACTIVE })
  status: TestDataStatus;

  @Column({ default: false })
  isSensitive: boolean;

  @Column({ nullable: true })
  sensitiveFields: string;

  @Column({ nullable: true })
  tags: string;

  @Column({ default: false })
  isReusable: boolean;

  @Column({ nullable: true })
  expiresAt: Date;

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
