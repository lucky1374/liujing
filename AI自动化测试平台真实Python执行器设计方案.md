# AI自动化测试平台真实 Python 执行器设计方案

## 1. 目标

当前平台已具备接口测试 MVP 能力，但执行器仍以“脚本文本解析 + 平台内发请求”为主，适合简单 GET/POST 场景，不适合复杂真实项目。

本方案目标是将执行能力升级为：

- 支持真实 Python 脚本执行
- 支持复杂变量、函数、依赖传参、签名计算
- 支持环境变量、请求头、鉴权配置统一注入
- 支持执行日志、断言结果、错误堆栈、附件回传
- 与现有 NestJS 平台解耦，形成可扩展执行层

## 2. 当前问题

现有执行器问题：

- 不是在真正执行 Python 代码，而是在解析脚本文本
- 对复杂脚本支持弱，容易被多行对象、动态变量、函数调用击穿
- 无法支持公共函数、前后置处理、接口依赖、动态数据生成
- 无法稳定支持真实项目中的 token 刷新、签名、链路编排
- 后续扩展 UI 自动化、性能测试时复用价值有限

## 3. 建设目标

### 3.1 一期目标

- 支持真实 Python 接口脚本执行
- 平台将脚本、环境、任务信息下发给 Python Runner
- Runner 执行后回传结构化结果
- 保持现有轻量执行模式兼容，避免一次性切换风险

### 3.2 二期目标

- 支持公共库、前后置 Hook、依赖参数提取
- 支持 pytest 风格断言与报告
- 支持多脚本批量执行和并发执行

### 3.3 三期目标

- 扩展 UI 自动化 Runner
- 扩展性能测试 Runner
- 扩展容器化隔离执行

## 4. 总体架构

推荐采用“双执行模式”：

- `lite` 模式：保留当前文本解析执行，适合简单脚本
- `python` 模式：新增真实 Python Runner，作为未来主模式

架构分层：

1. NestJS 平台层
   - 管理任务、脚本、环境、执行记录
   - 调度执行器
   - 持久化执行结果

2. Execution Gateway
   - 接收平台调度请求
   - 路由到对应 Runner
   - 管理超时、重试、状态回传

3. Python Runner
   - 将脚本写入临时工作目录
   - 注入环境变量、headers、authConfig
   - 调用 Python 解释器执行
   - 捕获 stdout、stderr、exit code、结构化结果

4. Result Collector
   - 标准化执行结果
   - 回传 NestJS 平台

## 5. 推荐执行流程

### 5.1 平台侧

1. 用户触发任务执行
2. 平台读取任务、脚本、环境配置
3. 生成执行负载 `execution payload`
4. 发送给 Python Runner

### 5.2 Runner 侧

1. 创建临时执行目录
2. 写入脚本文件
3. 写入环境配置文件
4. 设置环境变量
5. 调用 Python 执行器运行脚本
6. 捕获执行结果
7. 生成结构化结果 JSON
8. 回传平台

### 5.3 平台回写

1. 保存执行记录
2. 保存日志、响应体、错误堆栈
3. 更新任务状态
4. 供缺陷和报告模块继续使用

## 6. 平台与 Runner 交互协议

建议平台向 Runner 下发统一 JSON：

```json
{
  "executionId": "xxx",
  "taskId": "xxx",
  "script": {
    "id": "xxx",
    "name": "查询优惠券",
    "language": "python",
    "content": "..."
  },
  "environment": {
    "baseUrl": "https://example.com",
    "headers": {
      "Authorization": "Bearer xxx"
    },
    "variables": {
      "tenantId": "1001"
    },
    "authConfig": {
      "type": "bearer",
      "token": "xxx"
    }
  },
  "options": {
    "timeoutMs": 30000,
    "mode": "python"
  }
}
```

Runner 回传统一 JSON：

```json
{
  "status": "passed",
  "durationMs": 1234,
  "request": {
    "method": "GET",
    "url": "https://example.com/api"
  },
  "response": {
    "status": 200,
    "body": {}
  },
  "logs": {
    "stdout": "...",
    "stderr": "..."
  },
  "error": null
}
```

## 7. Python Runner 目录建议

建议独立为单独目录或服务，例如：

```text
python-runner/
  runner/
    main.py
    executor.py
    adapters/
      http_adapter.py
    utils/
      env_loader.py
      result_writer.py
  requirements.txt
```

## 8. 第一版 Runner 能力边界

第一版只做最必要能力：

- 执行 Python 接口脚本
- 自动注入 baseUrl、headers、variables
- 捕获 stdout/stderr
- 捕获请求与响应基本信息
- 回传执行状态与错误堆栈

第一版先不做：

- 容器隔离
- 分布式并发
- pytest 插件体系
- UI 自动化
- 自定义依赖安装

## 9. 脚本规范建议

为保证 Runner 可控，建议第一版统一脚本规范：

- 统一使用 Python
- 统一使用 `requests`
- 统一从 `os.environ` 或平台注入上下文读取环境变量
- 统一输出结构化结果

示例：

```python
import os
import requests

def main():
    base_url = os.getenv("BASE_URL")
    token = os.getenv("BEARER_TOKEN")

    response = requests.get(
        f"{base_url}/api/v1/demo",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )

    assert response.status_code == 200
    print(response.text)

if __name__ == "__main__":
    main()
```

## 10. 分阶段落地计划

### 阶段 A：设计与兼容（当前最建议）

- 定义 Runner 协议
- 在脚本表增加执行模式字段：`lite` / `python`
- 平台保留现有执行方式

### 阶段 B：最小 Python Runner

- 新建 `python-runner`
- 支持单脚本执行
- 支持环境变量和 Bearer Token 注入
- 支持结果回传

### 阶段 C：接入平台

- NestJS 调度 Runner
- 执行结果落库
- 前端执行详情兼容 Runner 输出

### 阶段 D：增强能力

- 公共库
- Hook
- 参数依赖
- 批量执行
- 容器化隔离

## 11. 对当前项目最推荐的下一步

结合当前 MVP 现状，最推荐这样推进：

1. 先保留当前 `lite` 执行器，继续接更多真实接口
2. 同时设计 `python-runner` 协议与目录结构
3. 先做最小可运行版 Python Runner
4. 挑 `massage-service` 中已跑通的接口做 Runner 验证

## 12. 结论

当前平台已经完成真实项目 MVP 验证，但如果要继续接入更多复杂业务接口、提升脚本复用性与真实自动化能力，必须尽快启动真实 Python 执行器建设。

建议策略不是推翻现有实现，而是：

- 短期保留 `lite` 执行
- 中期新增 `python` 执行
- 长期形成可扩展多 Runner 执行架构
