# AI自动化测试平台部署清单

## 1. 文档目的

本文档用于整理当前 AI 自动化测试平台进入内部部署或测试环境部署前需要准备的资源、配置、步骤与注意事项。

## 2. 当前部署范围

当前建议部署范围包括：

- NestJS 后端服务
- Vue3 前端服务
- MySQL 数据库
- Redis
- Python Runner

当前不包含：

- 容器化隔离执行
- 分布式 Runner 集群
- 正式生产级监控告警体系

## 3. 部署组件清单

### 3.1 后端服务

- 目录：`/Users/lj/liujing/ai-test-platform`
- 技术栈：NestJS + TypeORM + MySQL + Redis
- 启动命令：`npm run start:dev`（开发）/ `npm run start:prod`（生产）

### 3.2 前端服务

- 目录：`/Users/lj/liujing/ai-test-platform-web`
- 技术栈：Vue3 + Vite + Element Plus
- 启动命令：`npm run dev`（开发）

### 3.3 Python Runner

- 目录：`/Users/lj/liujing/ai-test-platform/python-runner`
- 技术栈：Python3 + requests
- 当前模式：本机解释器调用

### 3.4 数据层

- MySQL
- Redis

## 4. 环境准备清单

### 4.1 基础软件

- Node.js 18+
- npm 9+
- Python 3.9+
- MySQL 8.0+
- Redis 6+

### 4.2 数据库准备

至少准备：

- 业务数据库，例如：`ai_test_platform`
- 可选迁移测试库，例如：`ai_test_platform_new`

### 4.3 Python Runner 准备

```bash
cd /Users/lj/liujing/ai-test-platform/python-runner
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 5. 配置清单

### 5.1 后端 `.env`

需要确认：

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `AI_PROVIDER`
- `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`
- `FRONTEND_URL`

### 5.2 Python 解释器

当前平台调用 Python Runner 时：

- 优先使用 `python-runner/.venv/bin/python`
- 如需自定义可设置环境变量：`PYTHON_BIN`

## 6. 推荐部署步骤

### 一键启动方案（当前最适合本地演示）

仓库根目录已补充：

- `/Users/lj/liujing/docker-compose.local.yml`

包含服务：

- MySQL
- Redis
- NestJS 后端
- Vue 前端

启动方式：

```bash
cd /Users/lj/liujing
docker compose -f docker-compose.local.yml up --build
```

说明：

- 后端容器已内置 Python3，并会准备 `python-runner/.venv`
- 前端容器默认暴露 `5173`
- 后端容器默认暴露 `3000`
- 当前 `.env` 中 AI Key 仍需按实际环境替换

首次启动后，如需初始化管理员账号，可在后端容器内执行：

```bash
docker exec -it ai-test-backend npm run seed
```

### 步骤 1：准备数据库与 Redis

确保：

- MySQL 可连接
- Redis 可连接
- 业务数据库已创建

### 步骤 2：配置后端环境变量

```bash
cd /Users/lj/liujing/ai-test-platform
cp .env.example .env
```

按真实环境修改 `.env`。

### 步骤 3：安装后端依赖

```bash
cd /Users/lj/liujing/ai-test-platform
npm install
```

### 步骤 4：初始化数据库

可选两种方式：

- 继续使用当前开发模式 `synchronize`
- 或对全新数据库执行迁移：`npm run migration:run`

### 步骤 5：初始化管理员账号

```bash
cd /Users/lj/liujing/ai-test-platform
npm run seed
```

### 步骤 6：安装前端依赖

```bash
cd /Users/lj/liujing/ai-test-platform-web
npm install
```

### 步骤 7：准备 Python Runner

```bash
cd /Users/lj/liujing/ai-test-platform/python-runner
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 步骤 8：启动服务

后端：

```bash
cd /Users/lj/liujing/ai-test-platform
npm run start:dev
```

前端：

```bash
cd /Users/lj/liujing/ai-test-platform-web
npm run dev
```

## 7. 部署后验证清单

部署后至少验证：

1. 后端 `http://localhost:3000/api-docs` 可访问
2. 前端 `http://localhost:5173` 可访问
3. `admin/admin123` 能登录
4. 项目可创建
5. 环境可创建
6. 脚本可创建
7. 任务可执行
8. Python Runner 模式可执行

## 8. 当前已知注意事项

### 8.1 当前数据库现状

- 当前开发库曾使用 `synchronize=true`
- 初始迁移更适用于全新数据库
- 老开发库不要直接执行 `InitSchema`

### 8.2 当前 Runner 现状

- 已支持最小可运行的真实 Python 执行
- 当前仍是本机调用，不是独立服务
- 后续可升级为独立 Runner 服务

### 8.3 当前安全现状

- 页面已对 Bearer Token 做脱敏处理
- 环境中仍保存真实 token，后续可继续加强加密与权限隔离

## 9. 建议的下一阶段部署增强项

- Docker Compose 一键启动
- Python Runner 服务化
- Nginx 反向代理
- 统一日志与监控
- 配置中心与敏感信息管理

## 10. 结论

当前平台已经具备内部测试环境部署与联调条件，可作为公司内部测试平台的第一版演示和验证环境使用。
