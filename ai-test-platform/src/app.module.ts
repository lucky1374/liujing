import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { TestCaseModule } from './modules/test-case/test-case.module';
import { TestScriptModule } from './modules/test-script/test-script.module';
import { TestTaskModule } from './modules/test-task/test-task.module';
import { DefectModule } from './modules/defect/defect.module';
import { TestReportModule } from './modules/test-report/test-report.module';
import { TestDataModule } from './modules/test-data/test-data.module';
import { EnvironmentModule } from './modules/environment/environment.module';
import { ProjectModule } from './modules/project/project.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
        },
      }),
    }),
    AuthModule,
    UserModule,
    ProjectModule,
    TestCaseModule,
    TestScriptModule,
    TestTaskModule,
    DefectModule,
    TestReportModule,
    TestDataModule,
    EnvironmentModule,
  ],
})
export class AppModule {}
