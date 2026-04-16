# Phase 3 Week 1：OpenAPI 覆盖更新模式（开发细化）

## 1. 目标

- 为 OpenAPI 导入新增 `importMode`，支持：
  - `skip`：已存在接口跳过（保持现状）
  - `upsert`：已存在接口按规则覆盖更新
- 输出可审计、可回归、可灰度的导入行为。

## 2. 接口契约变更

### 2.1 后端请求字段

- 路径：`POST /test-cases/openapi/import`
- DTO 文件：`src/modules/test-case/dto/test-case.dto.ts`
- 新增字段：

```ts
importMode?: 'skip' | 'upsert' // 默认 skip
```

- 兼容策略：
  - 若仅传历史字段 `skipExisting=true`，映射为 `importMode=skip`
  - 若 `skipExisting=false` 且未传 `importMode`，映射为 `importMode=upsert`

### 2.2 后端返回字段

- Service 返回增加统计字段（前端展示用）：

```ts
{
  importedCases: number,
  importedScripts: number,
  skippedExistingCount: number,
  createdCount: number,
  updatedCount: number,
  skippedCount: number,
  // 兼容保留
  cases: TestCase[],
  scripts: TestScript[],
  skippedExisting: Array<{ key: string; caseId?: string }>
}
```

## 3. 后端实现点（文件级）

### 3.1 DTO

- `src/modules/test-case/dto/test-case.dto.ts`
  - 新增 `OpenApiImportMode` 枚举
  - `OpenApiImportDto` 新增 `importMode` 字段并加 swagger/class-validator

### 3.2 Service 核心逻辑

- `src/modules/test-case/test-case.service.ts`
  - `importOpenApi` 增加模式分支：
    - `skip`：维持当前逻辑
    - `upsert`：
      - 如果 marker 已存在，加载旧用例并更新可覆盖字段
      - 若关联脚本存在且来自 imported，则更新脚本内容；否则新建脚本
  - 新增内部方法建议：
    - `resolveImportMode(payload)`
    - `updateImportedCase(existingCase, operation, override, payload, userId)`
    - `findImportedScriptByCaseId(caseId)`
    - `updateImportedScript(existingScript, operation, baseUrl, defaultHeaders, userId)`

### 3.3 可覆盖字段定义（首版）

- TestCase 可覆盖：
  - `name`
  - `description`
  - `module`
  - `priority`
  - `preconditions`
  - `testSteps`
  - `expectedResult`
  - `updatedBy`
- TestCase 不覆盖：
  - `status`
  - `createdBy/createdAt`
  - 人工备注（若另有字段承载）
- TestScript（source=imported）可覆盖：
  - `name`
  - `description`
  - `module`
  - `scriptContent`
  - `updatedBy`

## 4. 前端实现点（文件级）

- `ai-test-platform-web/src/views/TestCases.vue`
  - OpenAPI 导入区域新增“导入模式”单选：
    - 跳过已存在（skip）
    - 覆盖更新（upsert）
  - 保留 `skipExisting` 作为兼容显示，内部统一映射到 `importMode`
  - 提交 payload 增加 `importMode`
  - 成功提示改为展示 `createdCount/updatedCount/skippedCount`

## 5. 验收用例（最小集）

### Case A：skip 模式

- 前置：项目已有 `POST /api/users` 导入记录
- 动作：同文档再次导入，`importMode=skip`
- 预期：
  - 该接口不更新
  - `skippedCount +1`
  - `updatedCount = 0`

### Case B：upsert 模式

- 前置：项目已有 `POST /api/users` 导入记录
- 动作：同文档再次导入，且 summary/module 发生变化，`importMode=upsert`
- 预期：
  - 用例被更新（name/description/module 可见变化）
  - 导入脚本内容同步更新
  - `updatedCount +1`

### Case C：混合结果

- 前置：文档含新旧接口混合
- 动作：`importMode=upsert`
- 预期：
  - 新接口进入 `createdCount`
  - 旧接口进入 `updatedCount`
  - 无法处理项进入 `skippedCount`

## 6. 回归检查

- `npm run build`（后端/前端）
- OpenAPI 预览功能不回归
- 自动建任务链路不回归
- 一键导入执行链路不回归

## 7. 发布策略

- 第一阶段仅对测试项目开启 `upsert`（灰度）
- 观察 2-3 天后放开全项目
- 发布说明强调：`upsert` 仅覆盖导入字段，不覆盖执行历史与人工沉淀

## 8. 本地实链验证记录（2026-04-16）

- 验证环境：
  - 前端：`http://localhost:5173`
  - 后端：`http://127.0.0.1:3000`
  - 项目：`按按v0.1.2`（`96d7bbc9-c1d8-472c-a974-533e97658a90`）
- 验证流程：同一接口按 `skip -> skip -> upsert` 三段导入
- 结果：
  - 第一次 `skip`：`createdCount=1, updatedCount=0, skippedCount=0`
  - 第二次 `skip`：`createdCount=0, updatedCount=0, skippedCount=1`
  - 第三次 `upsert`：`createdCount=0, updatedCount=1, skippedCount=0`
  - 用例内容已从 v1 更新为 v2（描述字段变化可见）
- 补充验证：不传 `moduleName` 时，`upsert` 可按 tags 更新模块（`tag-a -> tag-b`）
- 结论：Week 1 核心能力（导入模式 + 计数 + 更新行为）已通过实链回归。
