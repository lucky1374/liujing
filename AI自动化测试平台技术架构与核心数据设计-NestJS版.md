# AI自动化测试平台技术架构与核心数据设计（NestJS版）

## 1. 文档目标

本文档用于支持 AI 自动化测试平台一期开发启动，明确系统技术架构、NestJS 服务拆分、核心链路、数据模型、部署建议与工程规范。

## 2. 总体架构目标

一期目标不是做成大而全的 AI 平台，而是做成一个可执行、可追溯、可扩展的接口测试平台底座，并预留 AI 增强能力。

技术架构需满足以下目标：

- 支撑接口测试主链路闭环
- 支撑项目级数据隔离与角色权限控制
- 支撑 AI 结构化结果接入与人工审核
- 支撑后续扩展 UI 测试、性能测试、安全测试
- 保持 NestJS 平台服务与执行引擎、AI 服务解耦

## 3. 总体技术架构

### 3.1 分层架构

- 前端展示层：`Vue3` + `TypeScript` + `Element Plus`
- 平台服务层：`NestJS`
- 执行调度层：任务调度服务 + 执行 Worker
- AI 服务层：用例生成、脚本生成、报告总结等独立服务
- 数据存储层：`MySQL` + `MongoDB` + 对象存储
- 基础设施层：`Docker` + `Nginx` + CI/CD + 日志监控

### 3.2 推荐一期部署形态

建议一期采用“模块化单体 + 独立执行器 + 独立 AI 服务”的方式：

- 平台主服务：1 个 NestJS 应用，按领域拆模块
- 执行器服务：独立 Worker 进程或独立服务
- AI 服务：独立 HTTP 服务

这样可以兼顾开发效率和后续扩展性，避免一开始拆过细的微服务导致复杂度过高。

## 4. 一期系统组件说明

### 4.1 前端工作台

职责：

- 提供业务操作页面
- 展示任务、执行、缺陷、报告等数据
- 提供 AI 生成结果审核入口

### 4.2 NestJS 平台主服务

职责：

- 提供统一业务 API
- 管理用户、项目、环境、用例、脚本、任务、缺陷、报告
- 与 AI 服务、执行器、存储服务交互
- 承担鉴权、权限、审计、参数校验、业务编排

### 4.3 执行器服务

职责：

- 拉取待执行任务
- 根据脚本和环境信息执行测试
- 回传执行结果、日志、断言数据、附件地址
- 控制超时、重试、失败分类

### 4.4 AI 服务

职责：

- 接收平台传入的结构化输入
- 生成结构化测试用例或脚本结果
- 返回标准化 JSON 输出

### 4.5 对象存储

职责：

- 存放执行日志文件、截图、导出报告等非结构化文件

## 5. NestJS 模块设计

推荐采用领域模块化设计。

### 5.1 基础模块

- `app`：应用入口与全局配置
- `auth`：登录、JWT、刷新令牌、鉴权守卫
- `users`：用户管理
- `roles`：角色与权限管理
- `projects`：项目与业务线管理
- `system`：系统参数、操作日志、通知配置

### 5.2 测试域模块

- `environments`：环境配置、环境变量、鉴权配置
- `cases`：测试用例管理
- `scripts`：测试脚本管理
- `tasks`：测试任务管理
- `executions`：执行记录、执行日志、失败信息
- `defects`：缺陷管理
- `reports`：测试报告管理

### 5.3 集成模块

- `ai`：AI 服务接入、请求封装、结果入库
- `storage`：文件上传下载、对象存储适配
- `queue`：异步任务、调度、执行消息
- `webhook`：通知和回调

## 6. 核心链路设计

### 6.1 AI 用例生成链路

1. 用户上传 Swagger/OpenAPI 或输入测试场景
2. 平台解析基础信息并组装 AI 请求体
3. 调用 AI 服务生成结构化候选用例
4. 平台将结果落库为“待审核”状态
5. 用户审核通过后正式入库

### 6.2 AI 脚本生成链路

1. 用户选择已确认用例
2. 平台读取脚本模板、环境变量规则、断言模板
3. 调用 AI 服务生成标准脚本内容
4. 平台入库并标记为“待审核”或“可执行”
5. 用户确认后可加入任务执行

### 6.3 任务执行链路

1. 用户创建任务并选择环境、脚本、优先级
2. 平台写入任务和执行计划
3. 执行器拉取任务
4. 执行器加载环境配置并运行脚本
5. 执行器回传执行状态、断言结果、请求日志、错误日志
6. 平台生成执行记录并更新任务状态
7. 用户查看执行详情并决定是否转缺陷

### 6.4 报告生成链路

1. 任务完成后平台聚合执行数据
2. 生成任务级测试报告
3. 统计通过率、失败原因、缺陷分布
4. 输出 HTML/PDF/Excel 报告文件

## 7. 核心数据存储设计

### 7.1 存储建议

- `MySQL`：核心业务结构化数据
- `MongoDB`：执行原始日志、AI 原始返回、长文本详情
- 对象存储：截图、导出报告、附件文件

### 7.2 为什么这样拆分

- 核心实体关系强，适合 MySQL 管理
- 执行日志和原始响应体字段长度不稳定，适合 MongoDB
- 文件和二进制资源不适合放数据库

## 8. 核心实体关系

一期建议统一围绕以下实体构建：

- 用户 `user`
- 角色 `role`
- 项目 `project`
- 环境 `environment`
- 用例 `test_case`
- 脚本 `test_script`
- 任务 `test_task`
- 执行记录 `test_execution`
- 缺陷 `defect`
- 报告 `test_report`
- AI 记录 `ai_generation_record`

推荐关系：

- 一个项目包含多个环境、用例、脚本、任务、缺陷、报告
- 一个用例可关联多个脚本版本
- 一个任务可关联多个用例和脚本
- 一个任务产生多条执行记录
- 一个执行记录可关联零到多条缺陷
- 一个报告通常对应一次任务执行结果汇总

## 9. 核心表设计建议

以下为一期必须优先设计的数据表。

### 9.1 用户与权限域

#### `users`

核心字段：

- `id`
- `username`
- `password_hash`
- `real_name`
- `email`
- `mobile`
- `status`
- `last_login_at`
- `created_at`
- `updated_at`

#### `roles`

核心字段：

- `id`
- `name`
- `code`
- `description`
- `status`

#### `user_roles`

核心字段：

- `id`
- `user_id`
- `role_id`

#### `permissions`

核心字段：

- `id`
- `name`
- `code`
- `resource_type`
- `action`

### 9.2 项目与环境域

#### `projects`

核心字段：

- `id`
- `name`
- `code`
- `business_line`
- `owner_id`
- `description`
- `status`
- `created_at`
- `updated_at`

#### `environments`

核心字段：

- `id`
- `project_id`
- `name`
- `code`
- `base_url`
- `auth_type`
- `auth_config`
- `headers_config`
- `variables_config`
- `status`
- `created_at`
- `updated_at`

说明：

- `auth_config`、`headers_config`、`variables_config` 建议使用 JSON 字段

### 9.3 用例域

#### `test_cases`

核心字段：

- `id`
- `project_id`
- `case_no`
- `name`
- `module_name`
- `case_type`
- `priority`
- `source_type`
- `status`
- `review_status`
- `creator_id`
- `description`
- `preconditions`
- `steps`
- `expected_result`
- `tags`
- `version`
- `created_at`
- `updated_at`

说明：

- `source_type`：人工录入、接口导入、AI生成
- `review_status`：待审核、已通过、已驳回

### 9.4 脚本域

#### `test_scripts`

核心字段：

- `id`
- `project_id`
- `case_id`
- `script_no`
- `name`
- `script_type`
- `template_type`
- `source_type`
- `status`
- `review_status`
- `version`
- `content`
- `creator_id`
- `created_at`
- `updated_at`

说明：

- `content` 若较长可拆至 MongoDB 或对象存储，也可先放 MySQL `longtext`

### 9.5 任务域

#### `test_tasks`

核心字段：

- `id`
- `project_id`
- `task_no`
- `name`
- `task_type`
- `environment_id`
- `trigger_mode`
- `priority`
- `status`
- `creator_id`
- `scheduled_at`
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

#### `test_task_items`

核心字段：

- `id`
- `task_id`
- `case_id`
- `script_id`
- `sort_order`

### 9.6 执行域

#### `test_executions`

核心字段：

- `id`
- `task_id`
- `project_id`
- `environment_id`
- `case_id`
- `script_id`
- `execution_no`
- `status`
- `result`
- `started_at`
- `finished_at`
- `duration_ms`
- `error_type`
- `error_message`
- `executor_node`
- `log_ref_id`
- `created_at`

说明：

- `error_type` 建议标准化：环境问题、脚本问题、断言失败、数据问题、未知问题

#### `execution_logs`（建议 MongoDB）

核心字段：

- `execution_id`
- `request_data`
- `response_data`
- `assertions`
- `step_logs`
- `stdout`
- `stderr`
- `attachments`

### 9.7 缺陷域

#### `defects`

核心字段：

- `id`
- `project_id`
- `defect_no`
- `title`
- `defect_type`
- `severity`
- `status`
- `source_type`
- `case_id`
- `script_id`
- `task_id`
- `execution_id`
- `assignee_id`
- `reporter_id`
- `description`
- `root_cause`
- `resolution`
- `created_at`
- `updated_at`

### 9.8 报告域

#### `test_reports`

核心字段：

- `id`
- `project_id`
- `task_id`
- `report_no`
- `name`
- `report_type`
- `summary`
- `total_count`
- `passed_count`
- `failed_count`
- `pass_rate`
- `defect_count`
- `report_file_url`
- `created_by`
- `created_at`

### 9.9 AI 域

#### `ai_generation_records`

核心字段：

- `id`
- `project_id`
- `biz_type`
- `source_ref_id`
- `model_name`
- `input_payload`
- `output_payload`
- `status`
- `review_status`
- `created_by`
- `created_at`

说明：

- `biz_type`：用例生成、脚本生成、报告总结等

## 10. 关键接口设计原则

### 10.1 API 风格

- 推荐 `RESTful API`
- 使用统一响应结构
- DTO 必须有参数校验
- 核心接口需保留操作日志

### 10.2 错误处理

- 平台级异常统一过滤
- AI 服务异常与执行器异常需区分处理
- 禁止将底层异常栈直接透出给前端

### 10.3 鉴权建议

- 登录采用 `JWT`
- 接口权限通过 Guard + 自定义装饰器实现
- 敏感操作写入审计日志

## 11. 执行引擎设计建议

一期建议不要把执行逻辑直接塞进 NestJS API 服务里，应该独立出来。

### 11.1 执行器最小职责

- 轮询或消费待执行任务
- 加载脚本和环境配置
- 执行接口测试脚本
- 捕获请求、响应、断言与异常
- 回传执行状态

### 11.2 推荐执行方式

- 一期可采用独立 Node.js Worker 或容器 Worker
- 脚本执行尽量沙箱化，避免污染平台主服务
- 任务执行支持超时终止

### 11.3 后续扩展预留

- 并发执行
- 分布式节点调度
- 多类型执行器：接口、UI、性能、安全

## 12. AI 输入输出协议建议

### 12.1 输入必须结构化

- 项目名
- 模块名
- 接口描述
- 请求参数
- 返回结构
- 业务规则
- 输出格式要求

### 12.2 输出必须结构化

- 用例生成输出 JSON 数组
- 脚本生成输出标准代码文本 + 元数据
- 所有输出包含置信度、模型信息、生成时间

### 12.3 审核机制

- AI 结果默认不直接生效
- 平台必须保留审核状态和驳回原因

## 13. 工程规范建议

### 13.1 NestJS 工程建议

- 统一使用模块化目录结构
- Controller、Service、DTO、Entity 分层清晰
- 使用 `class-validator` 做参数校验
- 使用 `Swagger` 自动生成接口文档
- 配置统一日志、异常过滤器、响应拦截器

### 13.2 ORM 建议

如果公司允许，我更建议：

- 优先 `Prisma`，适合类型约束和数据模型管理

如果公司已有存量规范，也可：

- 使用 `TypeORM`

### 13.3 测试建议

- 单元测试：Service 层核心逻辑
- 集成测试：关键 API 和任务状态流转
- 冒烟测试：登录、用例生成、脚本生成、任务执行、报告生成

## 14. 非功能设计建议

### 14.1 安全性

- 密码加密存储
- 环境鉴权信息加密保存
- 敏感配置脱敏展示
- 操作留痕

### 14.2 可观测性

- API 请求日志
- 执行成功率监控
- 执行耗时统计
- AI 调用成功率与耗时统计
- Worker 节点健康监控

### 14.3 可扩展性

- AI 服务、执行器、存储适配层保持独立
- 业务核心表设计预留状态和版本字段
- 用统一事件模型支撑后续通知和工作流扩展

## 15. 一期开发前必须定下来的技术决策

- NestJS 项目脚手架和目录规范
- ORM 方案
- MySQL 与 MongoDB 是否都启用
- 队列方案：`BullMQ`/Redis 是否采用
- 对象存储方案
- 登录是否接公司统一认证
- AI 服务协议格式
- 执行器脚本运行方式

## 16. 推荐一期目录结构示例

```text
src/
  modules/
    auth/
    users/
    roles/
    projects/
    environments/
    cases/
    scripts/
    tasks/
    executions/
    defects/
    reports/
    ai/
    system/
  common/
    decorators/
    guards/
    interceptors/
    filters/
    pipes/
    utils/
  config/
  main.ts
```

## 17. 建议紧接着产出的研发材料

- NestJS 接口清单
- Prisma/TypeORM 数据模型文件
- 执行器设计文档
- AI 协议示例
- 迭代排期表

## 18. 结论

如果公司后端技术栈明确为 `NestJS`，一期最合理的方案不是把 AI 和平台全部做重，而是以 NestJS 做稳定的平台中台，以独立执行器承接测试执行，以独立 AI 服务承接智能生成。

这样做的好处是：

- 开发边界清晰，方便团队分工
- 一期能尽快跑通主链路
- 二期扩展 AI、UI 自动化、CI/CD 时改动更可控
