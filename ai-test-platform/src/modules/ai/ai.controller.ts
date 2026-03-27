import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AiService, TestCaseTemplate } from './ai.service';

@ApiTags('AI能力')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-cases')
  @ApiOperation({ description: 'AI生成测试用例' })
  generateTestCases(@Body('prompt') prompt: string): Promise<TestCaseTemplate[]> {
    return this.aiService.generateTestCases(prompt);
  }

  @Post('generate-script')
  @ApiOperation({ description: 'AI生成测试脚本' })
  generateScript(
    @Body('testCase') testCase: TestCaseTemplate,
    @Body('scriptType') scriptType: 'interface' | 'ui',
  ): Promise<string> {
    return this.aiService.generateScript(testCase, scriptType);
  }

  @Post('analyze-defect')
  @ApiOperation({ description: 'AI分析缺陷' })
  analyzeDefect(
    @Body('logs') logs: string,
    @Body('description') description: string,
  ): Promise<{ rootCause: string; suggestion: string }> {
    return this.aiService.analyzeDefect(logs, description);
  }

  @Post('generate-report')
  @ApiOperation({ description: 'AI生成测试报告' })
  generateReport(@Body('taskResult') taskResult: any): Promise<string> {
    return this.aiService.generateReport(taskResult);
  }

  @Post('chat')
  @ApiOperation({ description: 'AI对话' })
  chat(@Body('message') message: string, @Body('context') context?: string): Promise<string> {
    return this.aiService.chat(message, context);
  }
}
