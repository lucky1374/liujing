import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment } from './entities/environment.entity';
import { EnvironmentService } from './environment.service';
import { EnvironmentController } from './environment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Environment])],
  providers: [EnvironmentService],
  controllers: [EnvironmentController],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
