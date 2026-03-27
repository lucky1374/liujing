import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestTask } from './entities/test-task.entity';
import { TestScript } from '../test-script/entities/test-script.entity';
import { Environment } from '../environment/entities/environment.entity';
import { TestExecution } from './entities/test-execution.entity';
import { TestTaskService } from './test-task.service';
import { TestTaskController } from './test-task.controller';
import { TestExecutionService } from './test-execution.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestTask, TestScript, Environment, TestExecution]),
    BullModule.registerQueue({ name: 'test-task' }),
  ],
  providers: [TestTaskService, TestExecutionService],
  controllers: [TestTaskController],
  exports: [TestTaskService, TestExecutionService],
})
export class TestTaskModule {}
