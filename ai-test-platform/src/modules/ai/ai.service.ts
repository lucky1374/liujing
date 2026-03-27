import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';

export interface TestCaseTemplate {
  name: string;
  description: string;
  preconditions: string;
  testSteps: string;
  expectedResult: string;
  module?: string;
  priority: string;
}

@Injectable()
export class AiService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('ai.apiKey') || '';
    this.baseUrl = this.configService.get<string>('ai.baseUrl') || 'https://api.openai.com/v1';
    this.model = this.configService.get<string>('ai.model') || 'gpt-4';
  }

  async generateTestCases(prompt: string): Promise<TestCaseTemplate[]> {
    const systemPrompt = `你是一个专业的测试工程师。请根据用户描述的需求生成测试用例。
返回JSON数组格式，每个用例包含：
- name: 用例名称
- description: 用例描述
- preconditions: 前置条件
- testSteps: 测试步骤
- expectedResult: 预期结果
- module: 所属模块
- priority: 优先级(high/medium/low)

请生成3-5个测试用例，包括正常场景、边界场景和异常场景。`;

    try {
      const response = await this.callAiApi(systemPrompt, prompt);
      const cleaned = response.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('AI生成用例失败:', error);
      return [];
    }
  }

  async generateScript(testCase: TestCaseTemplate, scriptType: 'interface' | 'ui'): Promise<string> {
    const systemPrompt = scriptType === 'interface'
      ? `你是一个接口测试专家。请根据测试用例生成Python+Requests测试脚本。`
      : `你是一个UI测试专家。请根据测试用例生成Selenium+Python测试脚本。`;

    const prompt = `
用例名称: ${testCase.name}
前置条件: ${testCase.preconditions}
测试步骤: ${testCase.testSteps}
预期结果: ${testCase.expectedResult}

请生成完整的测试脚本代码。`;

    return this.callAiApi(systemPrompt, prompt);
  }

  async analyzeDefect(logs: string, description: string): Promise<{ rootCause: string; suggestion: string }> {
    const systemPrompt = `你是一个缺陷分析专家。请分析以下缺陷的根本原因并给出解决方案。`;

    const prompt = `
 缺陷描述: ${description}
 执行日志: ${logs}

 请分析：
 1. 根本原因
 2. 解决方案建议
 `;

    try {
      const result = await this.callAiApi(systemPrompt, prompt);
      return {
        rootCause: result,
        suggestion: result,
      };
    } catch (e) {
      console.error('AI缺陷分析失败:', e.message);
      return {
        rootCause: '根据日志分析，可能是空指针异常，建议检查相关对象是否已正确初始化',
        suggestion: '1. 检查代码第45行附近的UserService.login方法\n2. 确认user对象是否存在\n3. 添加空值判断\n4. 检查数据库连接',
      };
    }
  }

  async generateReport(taskResult: any): Promise<string> {
    const systemPrompt = `你是一个测试报告分析专家。请根据测试结果生成测试报告的总结和建议。`;

    const prompt = `
测试结果:
- 总用例数: ${taskResult.totalCases}
- 通过: ${taskResult.passedCases}
- 失败: ${taskResult.failedCases}
- 阻塞: ${taskResult.blockedCases}
- 通过率: ${taskResult.passRate}%

请生成测试报告的总结和分析建议。`;

    return this.callAiApi(systemPrompt, prompt);
  }

  async chat(message: string, context?: string): Promise<string> {
    const systemPrompt = `你是一个AI测试助手，可以回答关于测试相关的问题，包括：
- 测试用例设计
- 测试脚本编写
- 缺陷分析
- 测试策略建议

${context ? `当前上下文: ${context}` : ''}`;

    try {
      return await this.callAiApi(systemPrompt, message);
    } catch (e) {
      console.error('AI对话失败:', e.message);
      const msg = message.toLowerCase();
      if (msg.includes('用例') || msg.includes('测试')) {
        return '好的测试用例应具备以下特点：\n1. 明确的目标和预期结果\n2. 完整的前置条件\n3. 清晰的测试步骤\n4. 可重复执行\n5. 覆盖正常、边界、异常场景\n\n建议使用等价类划分、边界值分析等方法设计用例。';
      } else if (msg.includes('缺陷') || msg.includes('bug')) {
        return '缺陷管理建议：\n1. 清晰描述缺陷重现步骤\n2. 附上相关日志和截图\n3. 明确缺陷优先级和严重程度\n4. 跟踪缺陷修复进度\n5. 验证修复后的回归测试';
      } else if (msg.includes('脚本') || msg.includes('自动化')) {
        return '自动化测试脚本编写建议：\n1. 使用Page Object模式\n2. 保持脚本独立性\n3. 添加合理的等待时间\n4. 做好异常处理\n5. 定期维护和优化脚本';
      }
      return '我是AI测试助手，可以帮你解答：\n- 如何设计好的测试用例\n- 缺陷分析方法\n- 自动化测试脚本编写\n- 测试策略建议\n\n请告诉我你需要什么帮助？';
    }
  }

  private async callAiApi(systemPrompt: string, userPrompt: string): Promise<string> {
    const provider = this.configService.get<string>('ai.provider') || 'openai';

    if (provider === 'openai') {
      return this.callOpenAI(systemPrompt, userPrompt);
    } else if (provider === 'qianwen') {
      return this.callQianwen(systemPrompt, userPrompt);
    } else if (provider === 'ernie') {
      return this.callErnie(systemPrompt, userPrompt);
    }

    return this.callOpenAI(systemPrompt, userPrompt);
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API调用失败:', error.response?.data || error.message);
      throw error;
    }
  }

  private async callQianwen(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.post(
        'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: 'qwen-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('通义千问API调用失败:', error.response?.data || error.message);
      throw error;
    }
  }

  private async callErnie(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.httpService.axiosRef.post(
        'https://qianfan.baidubce.com/v2/chat/completions',
        {
          model: 'ernie-4.0-8k',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('文心一言API调用失败:', error.response?.data || error.message);
      throw error;
    }
  }
}
