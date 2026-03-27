# AI自动化测试平台

基于 NestJS + TypeScript 开发的 AI 自动化测试平台。

## 技术栈

- **后端**: NestJS + TypeScript
- **数据库**: MySQL 8.0 + Redis
- **ORM**: TypeORM
- **AI**: OpenAI / 通义千问 / 文心一言
- **任务队列**: Bull + Redis
- **文档**: Swagger (OpenAPI)

## 功能模块

- 用户管理 (User)
- 测试用例管理 (TestCase)
- 测试脚本管理 (TestScript)
- 测试任务管理 (TestTask)
- 缺陷管理 (Defect)
- 测试报告 (TestReport)
- 测试数据管理 (TestData)
- 环境管理 (Environment)
- AI 能力集成 (AI)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库、AI 等信息
```

### 3. 初始化数据库

当前项目现状：

- 开发环境默认开启 `TypeORM synchronize`
- 生产环境不建议依赖 `synchronize`
- 当前仓库已补齐 `typeorm.config.ts`，可开始正式生成迁移
- 当前仓库暂未提交业务迁移文件，首次本地启动建议先使用开发环境自动建表，再补迁移

推荐本地初始化顺序：

```bash
# 1) 确保 MySQL、Redis 已启动
# 2) 创建数据库
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS ai_test_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3) 启动后端一次，让开发环境自动建表
npm run start:dev

# 4) 新开终端执行初始化管理员账号
npm run seed
```

如需开始迁移化管理，可在表结构稳定后执行：

```bash
npm run migration:generate -- src/migrations/init
npm run migration:run
```

### 4. 启动服务

#### 开发模式
```bash
# 启动 MySQL 和 Redis (Docker)
docker-compose up -d mysql redis

# 启动应用
npm run start:dev
```

#### Docker 部署
```bash
docker-compose up -d
```

### 5. 访问服务

- API: http://localhost:3000
- Swagger文档: http://localhost:3000/api-docs

## 初始化账号

- 默认初始化脚本账号: `admin`
- 默认初始化脚本密码: `admin123`
- 可通过环境变量覆盖：`SEED_ADMIN_USERNAME`、`SEED_ADMIN_PASSWORD`、`SEED_ADMIN_EMAIL`

## 本地开发建议

### 后端

```bash
cp .env.example .env
npm install
npm run start:dev
```

### 前端

```bash
cd ../ai-test-platform-web
npm install
npm run dev
```

### 联调顺序

建议首次联调按下面顺序验证：

1. 登录后台
2. 创建项目
3. 创建环境
4. 创建测试用例
5. 创建或 AI 生成脚本
6. 创建任务并执行
7. 查看执行记录
8. 失败转缺陷
9. 生成测试报告

## API 概览

### 认证
- POST /auth/login - 登录
- GET /auth/profile - 获取当前用户信息

### 用户管理
- GET /users - 用户列表
- POST /users - 创建用户
- GET /users/:id - 用户详情
- PUT /users/:id - 更新用户
- DELETE /users/:id - 删除用户

### 测试用例
- GET /test-cases - 用例列表
- POST /test-cases - 创建用例
- POST /test-cases/generate-by-ai - AI生成用例
- GET /test-cases/:id - 用例详情
- PUT /test-cases/:id - 更新用例
- DELETE /test-cases/:id - 删除用例

### 测试脚本
- GET /test-scripts - 脚本列表
- POST /test-scripts - 创建脚本
- GET /test-scripts/:id - 脚本详情
- PUT /test-scripts/:id - 更新脚本
- DELETE /test-scripts/:id - 删除脚本

### 测试任务
- GET /test-tasks - 任务列表
- POST /test-tasks - 创建任务
- GET /test-tasks/statistics - 任务统计
- GET /test-tasks/:id - 任务详情

### 缺陷管理
- GET /defects - 缺陷列表
- POST /defects - 创建缺陷
- POST /defects/:id/analyze - AI分析缺陷
- GET /defects/:id - 缺陷详情
- PUT /defects/:id - 更新缺陷

### 测试报告
- GET /test-reports - 报告列表
- POST /test-reports - 创建报告
- POST /test-reports/generate-by-ai - AI生成报告

### 环境管理
- GET /environments - 环境列表
- POST /environments - 创建环境
- GET /environments/:id - 环境详情
- PUT /environments/:id - 更新环境
- DELETE /environments/:id - 删除环境

## 当前数据库与迁移说明

- `src/config/typeorm.config.ts` 已可用于 TypeORM CLI
- 当前仓库已生成初始迁移：`src/migrations/1774599997645-InitSchema.ts`
- `src/scripts/seed.ts` 可用于初始化管理员账号
- `.env.example` 已补充 Python Runner 与 Seed 相关配置项
- 开发环境 `synchronize` 方便快速迭代，正式环境请关闭并仅使用迁移

### 当前开发库如何切换到迁移模式

当前项目经历过一段 `synchronize=true` 的开发阶段，因此本地已有数据库通常已经自动建表。

请注意：

- **不要直接对已存在完整表结构的开发库执行 `InitSchema` 初始迁移**
- 否则会因为表已存在而执行失败

推荐切换策略：

#### 方案 A：新库走迁移（推荐）

适用于新环境、测试环境、部署环境。

```bash
# 1) 新建一个全新数据库
mysql -uroot -p -e "CREATE DATABASE ai_test_platform_new DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2) 临时修改 .env 中 DB_DATABASE=ai_test_platform_new

# 3) 执行迁移
npm run migration:run

# 4) 初始化管理员账号
npm run seed
```

#### 方案 B：老库继续开发，后续增量迁移

适用于当前本地开发库已可正常使用的情况。

- 当前开发库继续保留，暂不执行初始迁移
- 从下一次结构变更开始，生成新的增量迁移
- 后续新环境统一从 `InitSchema + 增量迁移` 启动

这是当前阶段最稳妥的方式。

### 后续迁移规范建议

- 初始迁移只用于全新数据库
- 当前开发数据库不强行补跑初始迁移
- 后续每次实体变更都生成单独增量迁移
- 生产环境禁用 `synchronize`

## 开发规范

- 使用 ESLint + Prettier 规范代码
- 遵循 NestJS 模块化开发
- 所有 API 需添加 Swagger 文档注释
- 使用 DTO 进行数据验证

## 目录结构

```
src/
├── modules/
│   ├── auth/           # 认证模块
│   ├── user/           # 用户模块
│   ├── test-case/      # 测试用例模块
│   ├── test-script/    # 测试脚本模块
│   ├── test-task/      # 测试任务模块
│   ├── defect/         # 缺陷管理模块
│   ├── test-report/    # 测试报告模块
│   ├── test-data/      # 测试数据模块
│   ├── environment/    # 环境管理模块
│   └── ai/             # AI能力模块
├── common/
│   ├── decorators/     # 自定义装饰器
│   ├── guards/         # 守卫
│   ├── filters/        # 过滤器
│   ├── interceptors/   # 拦截器
│   └── dto/            # 公共DTO
└── config/             # 配置文件
```

## License

MIT
