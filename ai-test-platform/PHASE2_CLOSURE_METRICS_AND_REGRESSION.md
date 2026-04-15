# Phase 2 收口：指标口径与回归检查清单

## 1. 适用范围

- 适用于 Phase 2（AI 优化）后段/收尾阶段的发布门禁、缺陷 AI 分析与相似检索能力。
- 指标定义以当前后端实现为准：`src/modules/defect/defect.service.ts`。

## 2. 指标口径（统一定义）

### 2.1 数据窗口

- 统计窗口：`days` 参数，默认 `30`，范围 `1-180`。
- 样本来源：窗口内缺陷数据（最多取最近 `1000` 条）。
- 返回时间戳：`generatedAt`。

### 2.2 核心指标

- `sampleSize`：窗口内缺陷总样本数。
- `analyzedCount`：已有 `aiAnalysisCard` 的样本数。
- `retrievalHitRate`（命中率）：`有 similarCases 的 analyzed 样本数 / analyzedCount`。
- `avgTopSimilarity`：命中样本中 Top1 相似度均值。
- `avgCandidateSimilarity`：命中样本中全部候选相似度均值。
- `highConfidenceThreshold`：高置信阈值，来自 `minScore`（默认 `0.65`）。
- `highConfidenceCount`：`similarRecommendation.confidence >= minScore` 的样本数。
- `highConfidenceAdoptedCount`：高置信样本中 `similarRecommendationAdopted = true` 的样本数。
- `highConfidenceRecommendationAdoptionRate`（高置信采纳率）：`highConfidenceAdoptedCount / highConfidenceCount`（无样本时为 `0`）。
- `suggestedActions`：基于高置信样本聚合得到的建议动作。

### 2.3 趋势口径

- `includeTrend=true` 时返回 `trend[]`，按天聚合。
- 每日指标口径与总体一致，字段为：`date/sampleSize/analyzedCount/retrievalHitRate/avgTopSimilarity/highConfidenceRecommendationAdoptionRate/suggestedActions`。

### 2.4 展示口径约定

- 后端指标比率按 `0-1` 小数返回，前端展示统一转为百分比。
- 发布门禁 AI 规则：
  - 当 `analyzedCount < minAiSampleSize`，仅提示不做强门禁拦截。
  - 当 `analyzedCount >= minAiSampleSize`，以 `highConfidenceRecommendationAdoptionRate` 与阈值比较。

## 3. 发布门禁整改单模板默认值（项目级）

- 配置归属：`/projects/:id/release-gate-settings`。
- 新增字段：
  - `rectificationOwnerDefault`
  - `rectificationPriorityDefault`（`P0|P1|P2`）
  - `rectificationTagsDefault`（字符串数组）
- 目标：团队共享整改单草稿默认值，避免仅本地浏览器生效。

## 4. 工单 JSON 追踪字段

- 来源：Release Gate 整改单草稿导出 JSON。
- 新增字段：
  - `sourceType: "release-gate"`
  - `generatedAt: ISO8601 时间`
- 目标：便于外部工单系统做来源识别与生成时刻追踪。

## 5. 回归检查清单（Phase 2 收口）

### 5.1 后端

- [ ] `npm run build`
- [ ] 指标接口：`GET /defects/similarity-metrics?projectId=&days=&minScore=&includeTrend=true`
- [ ] 门禁配置读取：`GET /projects/:id/release-gate-settings`
- [ ] 门禁配置更新（含模板默认值）：`PUT /projects/:id/release-gate-settings`
- [ ] 门禁配置审计：`GET /projects/:id/release-gate-settings/audits?limit=`

### 5.2 前端

- [ ] `npm run build`
- [ ] 发布门禁页加载与刷新正常（含 AI 指标趋势）
- [ ] 整改单草稿默认值可随项目加载（owner/priority/tags）
- [ ] 保存门禁配置后，审计列表可见默认值变更
- [ ] 复制工单 JSON 包含 `sourceType`、`generatedAt`

### 5.3 冒烟

- [ ] `npm run test -- modules/integration-scenario/scenario-execution.engine.spec.ts --runInBand`
- [ ] 发布门禁 -> 缺陷定位跳转链路可用

## 6. 已知非阻塞项

- 前端构建历史告警：`page-agent-main eval/chunk warning`（非本轮引入，不作为本轮拦截项）。

## 7. 快速验收脚本

- 脚本：`phase2-closure-check.sh`
- 用途：串行校验 Phase 2 收口关键接口（门禁配置读写/审计 + 相似检索指标趋势）。
- 使用方式：

```bash
TOKEN=<jwt-token> PROJECT_ID=<project-id> ./phase2-closure-check.sh
```

- 可选变量：`BASE_URL`（默认 `http://127.0.0.1:3000`）。
