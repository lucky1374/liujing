import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestScript } from './entities/test-script.entity';
import { TestCase } from '../test-case/entities/test-case.entity';
import { TestScriptService } from './test-script.service';
import { TestScriptController } from './test-script.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([TestScript, TestCase]), AiModule],
  providers: [TestScriptService],
  controllers: [TestScriptController],
  exports: [TestScriptService],
})
export class TestScriptModule {}
