# Python Runner

最小可运行版 Python Runner 原型，用于验证平台从 `lite` 执行模式升级到真实 Python 执行模式的可行性。

## 当前能力

- 接收 JSON payload
- 将脚本内容写入临时文件
- 注入环境变量
- 调用本机 Python 执行脚本
- 捕获 `stdout`、`stderr`、退出码、耗时
- 输出结构化执行结果 JSON

## 目录结构

```text
python-runner/
  runner/
    main.py
    models.py
    executor.py
    utils.py
  examples/
    sample_payload.json
  requirements.txt
```

## 安装依赖

```bash
cd /Users/lj/liujing/ai-test-platform/python-runner
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 运行示例

```bash
cd /Users/lj/liujing/ai-test-platform/python-runner
source .venv/bin/activate
python runner/main.py --payload examples/sample_payload.json
```

## 启动 HTTP 服务

```bash
cd /Users/lj/liujing/ai-test-platform/python-runner
source .venv/bin/activate
export RUNNER_AUTH_TOKEN=change-me-runner-token
uvicorn runner.server:app --host 0.0.0.0 --port 8001
```

可用接口：

- `GET /health`
- `POST /execute`

## Runner 鉴权

当前最小鉴权方式：

- 请求头：`X-Runner-Token`
- 环境变量：`RUNNER_AUTH_TOKEN`

如果未配置 `RUNNER_AUTH_TOKEN`，Runner 默认不校验。
如果已配置，NestJS 侧也需要在 `.env` 中配置相同的 `RUNNER_AUTH_TOKEN`。

## Payload 说明

Runner 当前要求 payload 至少包含：

- `executionId`
- `script.content`
- `environment.baseUrl`

可选：

- `environment.headers`
- `environment.authConfig`
- `environment.variables`
- `options.timeoutMs`

## 下一步接入平台建议

1. NestJS 平台执行 `python` 模式脚本时生成 payload 文件
2. 通过子进程或 HTTP 调用 Runner
3. 解析 Runner 返回 JSON
4. 将结果回写 `test_execution`
