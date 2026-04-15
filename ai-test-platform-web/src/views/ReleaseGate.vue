<template>
  <div class="page-container">
    <div class="card-header">
      <h2>发布门禁</h2>
      <div class="header-actions">
        <el-input-number
          v-model="gate.minPassRate"
          :min="1"
          :max="100"
          size="small"
          style="width: 140px"
        />
        <el-input-number
          v-model="gate.minAiAdoptionRate"
          :min="0"
          :max="100"
          size="small"
          style="width: 180px"
        />
        <el-input-number
          v-model="gate.minAiSampleSize"
          :min="1"
          :max="200"
          size="small"
          style="width: 170px"
        />
        <el-input
          v-model="gate.changeReason"
          placeholder="阈值变更原因（可选）"
          clearable
          size="small"
          style="width: 220px"
        />
        <el-button @click="copyGateDecisionSnapshot">复制门禁结论</el-button>
        <el-button @click="copyGateDecisionSnapshotMarkdown">复制门禁Markdown</el-button>
        <el-button type="warning" @click="openRectificationDraft">生成整改单草稿</el-button>
        <el-button @click="handleExportGateLogs">导出门禁记录</el-button>
        <el-button type="primary" :disabled="!projectStore.selectedProjectId" @click="saveGateSettings">保存门禁配置</el-button>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-card>
      <template #header>
        <div class="section-head">
          <span>最近批次门禁摘要</span>
          <el-tag :type="gateStatus.type">{{ gateStatus.label }}</el-tag>
        </div>
      </template>

      <div class="summary-grid">
        <div class="summary-item">
          <div class="label">项目</div>
          <div class="value">{{ currentProjectName }}</div>
        </div>
        <div class="summary-item">
          <div class="label">最近批次ID</div>
          <div class="value mono">{{ latestBatch?.id || '-' }}</div>
        </div>
        <div class="summary-item">
          <div class="label">触发时间</div>
          <div class="value">{{ formatDateTime(latestBatch?.createdAt) }}</div>
        </div>
        <div class="summary-item">
          <div class="label">通过率</div>
          <div class="value">{{ passRateLabel }}</div>
        </div>
      </div>

      <el-divider />

      <div class="checklist">
        <div class="check-item">
          <el-tag :type="checkPassRate ? 'success' : 'danger'">{{ checkPassRate ? '通过' : '未通过' }}</el-tag>
          <span>最近批次通过率 >= {{ gate.minPassRate }}%</span>
        </div>
        <div class="check-item">
          <el-tag :type="checkNoFailed ? 'success' : 'danger'">{{ checkNoFailed ? '通过' : '未通过' }}</el-tag>
          <span>最近批次失败任务数 = 0</span>
        </div>
        <div class="check-item">
          <el-tag :type="checkRecent ? 'success' : 'warning'">{{ checkRecent ? '通过' : '提醒' }}</el-tag>
          <span>最近批次在 24 小时内（建议）</span>
        </div>
        <div class="check-item">
          <el-tag :type="checkReport ? 'success' : 'warning'">{{ checkReport ? '通过' : '提醒' }}</el-tag>
          <span>最近 24 小时存在测试报告（建议）</span>
        </div>
        <div class="check-item">
          <el-tag :type="checkAiGate.type">{{ checkAiGate.label }}</el-tag>
          <span>{{ checkAiGate.text }}</span>
        </div>
      </div>

      <div class="actions">
        <el-button type="primary" @click="goTasks">查看任务批次</el-button>
        <el-button @click="goReports">查看测试报告</el-button>
      </div>
    </el-card>

    <el-card style="margin-top: 12px" v-loading="aiMetricsLoading">
      <template #header>
        <div class="section-head">
          <span>AI 缺陷检索门禁（近{{ aiMetricsDays }}天）</span>
          <div class="header-actions">
            <el-radio-group v-model="aiMetricsDays" size="small" @change="loadAiMetrics">
              <el-radio-button :label="7">7天</el-radio-button>
              <el-radio-button :label="30">30天</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="loadAiMetrics">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="summary-grid" style="margin-bottom: 10px">
        <div class="summary-item"><div class="label">命中率</div><div class="value">{{ percentLabel(aiMetrics.retrievalHitRate) }}</div></div>
        <div class="summary-item"><div class="label">高置信采纳率</div><div class="value">{{ percentLabel(aiMetrics.highConfidenceRecommendationAdoptionRate) }}</div></div>
        <div class="summary-item"><div class="label">高置信样本</div><div class="value">{{ aiMetrics.highConfidenceCount }}</div></div>
        <div class="summary-item"><div class="label">已分析样本</div><div class="value">{{ aiMetrics.analyzedCount }}</div></div>
      </div>
      <div class="trend-legend">趋势（蓝：命中率，绿：高置信采纳率）</div>
      <div class="trend-bars" v-if="aiMetricsTrend.length">
        <div v-for="item in aiMetricsTrend" :key="item.date" class="trend-day">
          <div class="trend-col trend-col-hit" :style="{ height: `${Math.max(4, Number(item.retrievalHitRate || 0) * 100)}%` }" />
          <div class="trend-col trend-col-adopt" :style="{ height: `${Math.max(4, Number(item.highConfidenceRecommendationAdoptionRate || 0) * 100)}%` }" />
          <div class="trend-label">{{ item.date.slice(5) }}</div>
        </div>
      </div>
      <div v-if="Array.isArray(aiMetrics.suggestedActions) && aiMetrics.suggestedActions.length" style="margin-top: 10px">
        <el-alert title="建议动作" type="info" :closable="false">
          <template #default>
            {{ aiMetrics.suggestedActions.join('；') }}
          </template>
        </el-alert>
        <div style="margin-top: 8px; text-align: right">
          <el-button size="small" type="primary" @click="goDefectsForAiGate">定位相关缺陷</el-button>
        </div>
      </div>
    </el-card>

    <el-card style="margin-top: 12px">
      <template #header>
        <div class="section-head">
          <span>门禁阈值变更记录</span>
          <el-tag type="info">{{ gateSettingAudits.length }} 条</el-tag>
        </div>
      </template>
      <div class="label" style="margin-bottom: 8px">
        最近更新：{{ formatDateTime(gateSettingsMeta.updatedAt) }} / {{ gateSettingsMeta.updatedBy || '-' }}
      </div>
      <el-table :data="gateSettingAudits" size="small" border>
        <el-table-column prop="createdAt" label="更新时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="operatorId" label="操作人" width="180" show-overflow-tooltip />
        <el-table-column prop="comment" label="变更原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="阈值变更" min-width="360" show-overflow-tooltip>
          <template #default="{ row }">{{ formatGateSettingDiff(row.previousSettings, row.nextSettings) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card style="margin-top: 12px">
      <template #header>
        <div class="section-head">
          <span>模板发布通告（最近）</span>
          <el-tag type="info">{{ releaseNotices.length }} 条</el-tag>
        </div>
      </template>
      <el-table :data="releaseNotices" size="small" border>
        <el-table-column prop="releasedAt" label="发布时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.releasedAt) }}</template>
        </el-table-column>
        <el-table-column prop="name" label="模板" min-width="180" show-overflow-tooltip />
        <el-table-column prop="releaseTag" label="发布标签" min-width="220" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column prop="reviewedBy" label="审核人" width="120" />
        <el-table-column prop="releaseNote" label="发布说明" min-width="220" show-overflow-tooltip />
      </el-table>
    </el-card>

    <el-card style="margin-top: 12px">
      <template #header>
        <div class="section-head">
          <span>发布审计报表（近{{ releaseAuditDays }}天）</span>
          <div class="header-actions">
            <el-input-number v-model="releaseAuditDays" :min="1" :max="90" size="small" style="width: 120px" />
            <el-button size="small" @click="loadReleaseAuditReport">刷新审计</el-button>
          </div>
        </div>
      </template>

      <div class="summary-grid" style="margin-bottom: 10px">
        <div class="summary-item"><div class="label">总动作</div><div class="value">{{ releaseAudit.summary.totalLogs }}</div></div>
        <div class="summary-item"><div class="label">审核通过</div><div class="value">{{ releaseAudit.summary.approvedCount }}</div></div>
        <div class="summary-item"><div class="label">自动发布</div><div class="value">{{ releaseAudit.summary.releasedCount }}</div></div>
        <div class="summary-item"><div class="label">驳回</div><div class="value">{{ releaseAudit.summary.rejectedCount }}</div></div>
      </div>

      <el-table :data="releaseAudit.timeline" size="small" border>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板" min-width="160" show-overflow-tooltip />
        <el-table-column prop="templateKey" label="模板Key" min-width="180" show-overflow-tooltip />
        <el-table-column prop="action" label="动作" width="130" />
        <el-table-column prop="operatorId" label="操作人" width="120" />
        <el-table-column prop="comment" label="备注" min-width="220" show-overflow-tooltip />
      </el-table>
    </el-card>

    <el-dialog v-model="rectificationDialogVisible" title="发布门禁整改单草稿" width="760px">
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px">
        <el-input v-model="rectificationMeta.owner" size="small" placeholder="负责人（可选）" style="width: 180px" />
        <el-select v-model="rectificationMeta.priority" size="small" style="width: 140px" placeholder="优先级">
          <el-option label="P0" value="P0" />
          <el-option label="P1" value="P1" />
          <el-option label="P2" value="P2" />
        </el-select>
        <el-input v-model="rectificationMeta.tags" size="small" placeholder="标签（逗号分隔）" style="width: 240px" />
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px">
        <el-radio-group v-model="rectificationDraftFormat" size="small" @change="refreshRectificationDraft">
          <el-radio-button label="plain">纯文本</el-radio-button>
          <el-radio-button label="markdown">Markdown</el-radio-button>
        </el-radio-group>
        <div style="display: flex; gap: 8px">
          <el-button size="small" @click="refreshRectificationDraft">刷新草稿</el-button>
          <el-button size="small" type="primary" @click="copyRectificationDraft">复制草稿</el-button>
          <el-button size="small" type="success" @click="copyRectificationTicketJson">复制工单JSON</el-button>
        </div>
      </div>
      <el-input v-model="rectificationDraft" type="textarea" :rows="16" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useProjectStore } from '../store/project'
import { ElMessage } from 'element-plus'

const router = useRouter()
const projectStore = useProjectStore()
const RELEASE_GATE_LOG_KEY = 'ai-test-platform-release-gate-logs'

const latestBatch = ref(null)
const latestReport = ref(null)
const releaseNotices = ref([])
const releaseAuditDays = ref(30)
const releaseAudit = reactive({
  summary: {
    totalLogs: 0,
    approvedCount: 0,
    releasedCount: 0,
    rejectedCount: 0,
    submittedCount: 0,
    reminderNotifiedCount: 0,
    lifecycleUpdatedCount: 0,
  },
  timeline: [],
})
const aiMetricsDays = ref(30)
const aiMetricsLoading = ref(false)
const aiMetrics = reactive({
  analyzedCount: 0,
  retrievalHitRate: 0,
  highConfidenceCount: 0,
  highConfidenceRecommendationAdoptionRate: 0,
  suggestedActions: [],
})
const aiMetricsTrend = ref([])
const gateSettingAudits = ref([])
const gateSettingsMeta = reactive({ updatedAt: '', updatedBy: '' })
const rectificationDialogVisible = ref(false)
const rectificationDraft = ref('')
const rectificationDraftFormat = ref('plain')
const rectificationMeta = reactive({
  owner: '',
  priority: 'P1',
  tags: 'release-gate,ai-quality',
})

const gate = reactive({
  minPassRate: 95,
  minAiAdoptionRate: 50,
  minAiSampleSize: 5,
  changeReason: '',
})

const parseRectificationTags = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const normalizeRectificationPriority = (value) => ['P0', 'P1', 'P2'].includes(String(value)) ? String(value) : 'P1'

const currentProjectName = computed(() => {
  const id = projectStore.selectedProjectId
  const project = (projectStore.projects || []).find((item) => item.id === id)
  return project?.name || '全部项目'
})

const passRate = computed(() => {
  const queued = Number(latestBatch.value?.queued || 0)
  const success = Number(latestBatch.value?.success || 0)
  return queued > 0 ? (success / queued) * 100 : 0
})

const passRateLabel = computed(() => {
  const queued = Number(latestBatch.value?.queued || 0)
  const success = Number(latestBatch.value?.success || 0)
  if (!queued) return '-'
  return `${passRate.value.toFixed(2)}% (${success}/${queued})`
})

const checkPassRate = computed(() => {
  if (!latestBatch.value) return false
  return passRate.value >= Number(gate.minPassRate || 95)
})

const checkNoFailed = computed(() => Number(latestBatch.value?.failed || 0) === 0)

const checkRecent = computed(() => {
  const at = latestBatch.value?.createdAt ? new Date(latestBatch.value.createdAt).getTime() : 0
  return at > 0 && Date.now() - at <= 24 * 60 * 60 * 1000
})

const checkReport = computed(() => {
  const at = latestReport.value?.createdAt ? new Date(latestReport.value.createdAt).getTime() : 0
  return at > 0 && Date.now() - at <= 24 * 60 * 60 * 1000
})

const gateStatus = computed(() => {
  if (!latestBatch.value) return { type: 'info', label: '暂无批次' }
  if (checkPassRate.value && checkNoFailed.value && checkAiGate.value.type !== 'danger') return { type: 'success', label: '允许发布' }
  return { type: 'danger', label: '禁止发布' }
})

const checkAiGate = computed(() => {
  const minSamples = Number(gate.minAiSampleSize || 5)
  if (Number(aiMetrics.analyzedCount || 0) < minSamples) {
    return {
      type: 'warning',
      label: '提醒',
      text: `AI 检索样本不足（已分析 ${aiMetrics.analyzedCount}，要求 >= ${minSamples}），暂不作为强门禁`,
    }
  }
  const actual = Number(aiMetrics.highConfidenceRecommendationAdoptionRate || 0) * 100
  const threshold = Number(gate.minAiAdoptionRate || 50)
  if (actual >= threshold) {
    return {
      type: 'success',
      label: '通过',
      text: `高置信建议采纳率 ${actual.toFixed(0)}% >= ${threshold}%`,
    }
  }
  return {
    type: 'danger',
    label: '未通过',
    text: `高置信建议采纳率 ${actual.toFixed(0)}% < ${threshold}%`,
  }
})

const loadData = async () => {
  const projectId = projectStore.selectedProjectId || undefined

  const [batchRes, reportRes, releaseRes] = await Promise.allSettled([
    api.get('/test-tasks/batch-executions', { params: { page: 1, pageSize: 1, projectId } }),
    api.get('/test-reports', { params: { page: 1, pageSize: 1, projectId } }),
    api.get('/integration-scenarios/templates/release-notices', { params: { limit: 20 } }),
  ])

  latestBatch.value = batchRes.status === 'fulfilled' && Array.isArray(batchRes.value.data?.list)
    ? batchRes.value.data.list[0] || null
    : null
  latestReport.value = reportRes.status === 'fulfilled' && Array.isArray(reportRes.value.data?.list)
    ? reportRes.value.data.list[0] || null
    : null
  releaseNotices.value = releaseRes.status === 'fulfilled' && Array.isArray(releaseRes.value.data)
    ? releaseRes.value.data
    : []

  await loadReleaseAuditReport()
  await loadAiMetrics()
  await loadGateSettingAudits()

  appendReleaseGateLog({
    checkedAt: new Date().toISOString(),
    projectId: projectStore.selectedProjectId || '',
    projectName: currentProjectName.value,
    minPassRate: Number(gate.minPassRate || 95),
    minAiAdoptionRate: Number(gate.minAiAdoptionRate || 50),
    minAiSampleSize: Number(gate.minAiSampleSize || 5),
    batchId: latestBatch.value?.id || '',
    batchCreatedAt: latestBatch.value?.createdAt || '',
    queued: Number(latestBatch.value?.queued || 0),
    success: Number(latestBatch.value?.success || 0),
    failed: Number(latestBatch.value?.failed || 0),
    passRate: Number(passRate.value.toFixed(2)),
    gateStatus: gateStatus.value.label,
    checkPassRate: checkPassRate.value,
    checkNoFailed: checkNoFailed.value,
    checkRecent: checkRecent.value,
    checkReport: checkReport.value,
    checkAiGate: checkAiGate.value.label,
    aiAnalyzedCount: Number(aiMetrics.analyzedCount || 0),
    aiAdoptionRate: Number((Number(aiMetrics.highConfidenceRecommendationAdoptionRate || 0) * 100).toFixed(0)),
  })
}

const loadAiMetrics = async () => {
  aiMetricsLoading.value = true
  try {
    const projectId = projectStore.selectedProjectId || undefined
    const res = await api.get('/defects/similarity-metrics', {
      params: {
        ...(projectId && { projectId }),
        days: aiMetricsDays.value,
        minScore: 0.65,
        includeTrend: true,
      },
    })
    Object.assign(aiMetrics, {
      analyzedCount: Number(res.data?.analyzedCount || 0),
      retrievalHitRate: Number(res.data?.retrievalHitRate || 0),
      highConfidenceCount: Number(res.data?.highConfidenceCount || 0),
      highConfidenceRecommendationAdoptionRate: Number(res.data?.highConfidenceRecommendationAdoptionRate || 0),
      suggestedActions: Array.isArray(res.data?.suggestedActions) ? res.data.suggestedActions : [],
    })
    const trend = Array.isArray(res.data?.trend) ? res.data.trend : []
    aiMetricsTrend.value = aiMetricsDays.value <= 7 ? trend : trend.slice(-14)
  } catch {
    Object.assign(aiMetrics, {
      analyzedCount: 0,
      retrievalHitRate: 0,
      highConfidenceCount: 0,
      highConfidenceRecommendationAdoptionRate: 0,
      suggestedActions: [],
    })
    aiMetricsTrend.value = []
  } finally {
    aiMetricsLoading.value = false
  }
}

const loadReleaseAuditReport = async () => {
  try {
    const res = await api.get('/integration-scenarios/templates/release-audit-report', {
      params: {
        days: releaseAuditDays.value,
        limit: 200,
      },
    })
    Object.assign(releaseAudit.summary, res.data?.summary || {})
    releaseAudit.timeline = Array.isArray(res.data?.timeline) ? res.data.timeline : []
  } catch {
    Object.assign(releaseAudit.summary, {
      totalLogs: 0,
      approvedCount: 0,
      releasedCount: 0,
      rejectedCount: 0,
      submittedCount: 0,
      reminderNotifiedCount: 0,
      lifecycleUpdatedCount: 0,
    })
    releaseAudit.timeline = []
  }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

const goTasks = () => {
  router.push({
    path: '/test-tasks',
    query: {
      projectId: projectStore.selectedProjectId || '',
      openBatchHistory: '1',
      batchId: latestBatch.value?.id || undefined,
    },
  })
}

const goReports = () => {
  router.push({
    path: '/test-reports',
    query: {
      projectId: projectStore.selectedProjectId || '',
    },
  })
}

const readReleaseGateLogs = () => {
  try {
    const raw = localStorage.getItem(RELEASE_GATE_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const appendReleaseGateLog = (entry) => {
  const logs = readReleaseGateLogs()
  const key = `${entry.projectId}|${entry.batchId}|${entry.minPassRate}|${entry.minAiAdoptionRate}|${entry.minAiSampleSize}`
  if (logs[0] && `${logs[0].projectId}|${logs[0].batchId}|${logs[0].minPassRate}|${logs[0].minAiAdoptionRate}|${logs[0].minAiSampleSize}` === key) {
    return
  }
  logs.unshift(entry)
  localStorage.setItem(RELEASE_GATE_LOG_KEY, JSON.stringify(logs.slice(0, 200)))
}

const loadGateSettings = async () => {
  const projectId = projectStore.selectedProjectId
  if (!projectId) {
    gate.minPassRate = 95
    gate.minAiAdoptionRate = 50
    gate.minAiSampleSize = 5
    rectificationMeta.owner = ''
    rectificationMeta.priority = 'P1'
    rectificationMeta.tags = 'release-gate,ai-quality'
    gateSettingsMeta.updatedAt = ''
    gateSettingsMeta.updatedBy = ''
    gate.changeReason = ''
    return
  }
  try {
    const res = await api.get(`/projects/${projectId}/release-gate-settings`)
    gate.minPassRate = Number(res.data?.minPassRate || 95)
    gate.minAiAdoptionRate = Number(res.data?.minAiAdoptionRate || 50)
    gate.minAiSampleSize = Number(res.data?.minAiSampleSize || 5)
    rectificationMeta.owner = String(res.data?.rectificationOwnerDefault || '')
    rectificationMeta.priority = normalizeRectificationPriority(res.data?.rectificationPriorityDefault)
    const tags = Array.isArray(res.data?.rectificationTagsDefault)
      ? res.data.rectificationTagsDefault.map((item) => String(item).trim()).filter(Boolean)
      : ['release-gate', 'ai-quality']
    rectificationMeta.tags = tags.join(',')
    gateSettingsMeta.updatedAt = String(res.data?.updatedAt || '')
    gateSettingsMeta.updatedBy = String(res.data?.updatedBy || '')
  } catch {
    gate.minPassRate = 95
    gate.minAiAdoptionRate = 50
    gate.minAiSampleSize = 5
    rectificationMeta.owner = ''
    rectificationMeta.priority = 'P1'
    rectificationMeta.tags = 'release-gate,ai-quality'
    gateSettingsMeta.updatedAt = ''
    gateSettingsMeta.updatedBy = ''
    gate.changeReason = ''
  }
}

const saveGateSettings = async () => {
  const projectId = projectStore.selectedProjectId
  if (!projectId) {
    ElMessage.warning('请选择项目后再保存门禁配置')
    return
  }
  try {
    await api.put(`/projects/${projectId}/release-gate-settings`, {
      minPassRate: Number(gate.minPassRate || 95),
      minAiAdoptionRate: Number(gate.minAiAdoptionRate || 50),
      minAiSampleSize: Number(gate.minAiSampleSize || 5),
      rectificationOwnerDefault: String(rectificationMeta.owner || '').trim(),
      rectificationPriorityDefault: normalizeRectificationPriority(rectificationMeta.priority),
      rectificationTagsDefault: parseRectificationTags(rectificationMeta.tags),
      changeReason: gate.changeReason,
    })
    ElMessage.success('门禁配置已保存')
    gate.changeReason = ''
    await loadGateSettings()
    await loadGateSettingAudits()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '门禁配置保存失败')
  }
}

const loadGateSettingAudits = async () => {
  const projectId = projectStore.selectedProjectId
  if (!projectId) {
    gateSettingAudits.value = []
    return
  }
  try {
    const res = await api.get(`/projects/${projectId}/release-gate-settings/audits`, {
      params: { limit: 20 },
    })
    gateSettingAudits.value = Array.isArray(res.data) ? res.data : []
  } catch {
    gateSettingAudits.value = []
  }
}

const formatGateSettingDiff = (prev = {}, next = {}) => {
  const p = prev || {}
  const n = next || {}
  const numberChanged = (before, after) => Number(before) !== Number(after)
  const textChanged = (before, after) => String(before ?? '') !== String(after ?? '')
  const tagsChanged = (before, after) => {
    const left = Array.isArray(before) ? before.join(',') : String(before ?? '')
    const right = Array.isArray(after) ? after.join(',') : String(after ?? '')
    return left !== right
  }
  const pairs = [
    ['通过率阈值', p.minPassRate, n.minPassRate, numberChanged],
    ['AI采纳率阈值', p.minAiAdoptionRate, n.minAiAdoptionRate, numberChanged],
    ['AI样本阈值', p.minAiSampleSize, n.minAiSampleSize, numberChanged],
    ['整改单默认负责人', p.rectificationOwnerDefault, n.rectificationOwnerDefault, textChanged],
    ['整改单默认优先级', p.rectificationPriorityDefault, n.rectificationPriorityDefault, textChanged],
    ['整改单默认标签',
      Array.isArray(p.rectificationTagsDefault) ? p.rectificationTagsDefault.join(',') : p.rectificationTagsDefault,
      Array.isArray(n.rectificationTagsDefault) ? n.rectificationTagsDefault.join(',') : n.rectificationTagsDefault,
      tagsChanged,
    ],
  ].filter(([, before, after, comparer]) => comparer(before, after))
  if (!pairs.length) return '无阈值变化'
  return pairs.map(([name, before, after]) => `${name}: ${before ?? '-'} -> ${after ?? '-'}`).join('；')
}

const goDefectsForAiGate = () => {
  router.push({
    path: '/defects',
    query: {
      projectId: projectStore.selectedProjectId || '',
      status: 'open',
      aiRecommendationAdopted: 'false',
      minRecommendationConfidence: 0.65,
      days: aiMetricsDays.value,
      fromGate: '1',
    },
  })
}

const handleExportGateLogs = () => {
  const logs = readReleaseGateLogs()
  if (!logs.length) return

  const headers = [
    'checkedAt',
    'projectId',
    'projectName',
    'minPassRate',
    'minAiAdoptionRate',
    'minAiSampleSize',
    'batchId',
    'batchCreatedAt',
    'queued',
    'success',
    'failed',
    'passRate',
    'gateStatus',
    'checkPassRate',
    'checkNoFailed',
    'checkRecent',
    'checkReport',
    'checkAiGate',
    'aiAnalyzedCount',
    'aiAdoptionRate',
  ]

  const lines = [headers.join(',')]
  for (const item of logs) {
    const row = headers.map((key) => {
      const text = item[key] === null || item[key] === undefined ? '' : String(item[key])
      return `"${text.replace(/"/g, '""')}"`
    })
    lines.push(row.join(','))
  }

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `release_gate_logs_${Date.now()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const percentLabel = (ratio) => `${(Number(ratio || 0) * 100).toFixed(0)}%`

const copyGateDecisionSnapshot = async () => {
  try {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const text = [
      '【发布门禁结论快照】',
      `时间：${yyyy}-${mm}-${dd} ${hh}:${mi}`,
      `项目：${currentProjectName.value}`,
      `结论：${gateStatus.value.label}`,
      `批次：${latestBatch.value?.id || '-'} / 通过率 ${passRateLabel.value}`,
      `阈值：通过率>=${gate.minPassRate}% ，AI采纳率>=${gate.minAiAdoptionRate}% ，AI样本>=${gate.minAiSampleSize}`,
      `AI指标：命中率 ${percentLabel(aiMetrics.retrievalHitRate)} ，高置信采纳率 ${percentLabel(aiMetrics.highConfidenceRecommendationAdoptionRate)} ，样本 ${aiMetrics.analyzedCount}`,
      `AI门禁：${checkAiGate.value.label}（${checkAiGate.value.text}）`,
      `定位链接：${window.location.origin}/defects?projectId=${projectStore.selectedProjectId || ''}&status=open&aiRecommendationAdopted=false&minRecommendationConfidence=0.65&days=${aiMetricsDays.value}&fromGate=1`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    ElMessage.success('门禁结论快照已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const copyGateDecisionSnapshotMarkdown = async () => {
  try {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    const lines = [
      '## 发布门禁结论快照',
      `- 时间: ${yyyy}-${mm}-${dd} ${hh}:${mi}`,
      `- 项目: ${currentProjectName.value}`,
      `- 结论: ${gateStatus.value.label}`,
      `- 批次: ${latestBatch.value?.id || '-'} / 通过率 ${passRateLabel.value}`,
      `- 阈值: 通过率>=${gate.minPassRate}% ，AI采纳率>=${gate.minAiAdoptionRate}% ，AI样本>=${gate.minAiSampleSize}`,
      `- AI指标: 命中率 ${percentLabel(aiMetrics.retrievalHitRate)} ，高置信采纳率 ${percentLabel(aiMetrics.highConfidenceRecommendationAdoptionRate)} ，样本 ${aiMetrics.analyzedCount}`,
      `- AI门禁: ${checkAiGate.value.label}（${checkAiGate.value.text}）`,
      `- 定位链接: ${window.location.origin}/defects?projectId=${projectStore.selectedProjectId || ''}&status=open&aiRecommendationAdopted=false&minRecommendationConfidence=0.65&days=${aiMetricsDays.value}&fromGate=1`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    ElMessage.success('门禁Markdown快照已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const formatNow = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const buildRectificationDraft = (format = 'plain') => {
  const issueTitle = `发布门禁${gateStatus.value.label} - ${currentProjectName.value} - ${latestBatch.value?.id || '-'} `
  const issueOwner = rectificationMeta.owner || gateSettingsMeta.updatedBy || '-'
  const issuePriority = rectificationMeta.priority || 'P1'
  const issueTags = String(rectificationMeta.tags || '').trim()
  const riskSummary = `当前高置信建议采纳率 ${percentLabel(aiMetrics.highConfidenceRecommendationAdoptionRate)}，门禁判定：${checkAiGate.value.label}`
  const actions = Array.isArray(aiMetrics.suggestedActions) && aiMetrics.suggestedActions.length
    ? aiMetrics.suggestedActions.slice(0, 5)
    : ['补充关键日志并复核失败链路', '优先处理高置信未采纳缺陷并确认根因', '修复后执行最小回归并更新AI分析确认']
  const defectsUrl = `${window.location.origin}/defects?projectId=${projectStore.selectedProjectId || ''}&status=open&aiRecommendationAdopted=false&minRecommendationConfidence=0.65&days=${aiMetricsDays.value}&fromGate=1`

  if (format === 'markdown') {
    return [
      `## ${issueTitle}`,
      `- 时间: ${formatNow()}`,
      `- 项目: ${currentProjectName.value}`,
      `- 负责人: ${issueOwner}`,
      `- 优先级: ${issuePriority}`,
      ...(issueTags ? [`- 标签: ${issueTags}`] : []),
      `- 风险摘要: ${riskSummary}`,
      `- 批次信息: ${latestBatch.value?.id || '-'} / 通过率 ${passRateLabel.value}`,
      `- 门禁阈值: 通过率>=${gate.minPassRate}% ，AI采纳率>=${gate.minAiAdoptionRate}% ，AI样本>=${gate.minAiSampleSize}`,
      `- 建议动作:`,
      ...actions.map((item) => `  - ${item}`),
      `- 缺陷定位链接: ${defectsUrl}`,
      `- 期望完成时间: `,
      `- 备注: `,
    ].join('\n')
  }

  return [
    `【整改单】${issueTitle}`,
    `时间：${formatNow()}`,
    `项目：${currentProjectName.value}`,
    `负责人：${issueOwner}`,
    `优先级：${issuePriority}`,
    ...(issueTags ? [`标签：${issueTags}`] : []),
    `风险摘要：${riskSummary}`,
    `批次信息：${latestBatch.value?.id || '-'} / 通过率 ${passRateLabel.value}`,
    `门禁阈值：通过率>=${gate.minPassRate}% ，AI采纳率>=${gate.minAiAdoptionRate}% ，AI样本>=${gate.minAiSampleSize}`,
    '建议动作：',
    ...actions.map((item, idx) => `${idx + 1}. ${item}`),
    `缺陷定位链接：${defectsUrl}`,
    '期望完成时间：',
    '备注：',
  ].join('\n')
}

const openRectificationDraft = () => {
  rectificationDraft.value = buildRectificationDraft(rectificationDraftFormat.value)
  rectificationDialogVisible.value = true
}

const refreshRectificationDraft = () => {
  rectificationDraft.value = buildRectificationDraft(rectificationDraftFormat.value)
}

const copyRectificationDraft = async () => {
  try {
    await navigator.clipboard.writeText(rectificationDraft.value)
    ElMessage.success('整改单草稿已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

const copyRectificationTicketJson = async () => {
  try {
    const title = `发布门禁${gateStatus.value.label} - ${currentProjectName.value} - ${latestBatch.value?.id || '-'}`
    const labels = parseRectificationTags(rectificationMeta.tags)
    const defectsUrl = `${window.location.origin}/defects?projectId=${projectStore.selectedProjectId || ''}&status=open&aiRecommendationAdopted=false&minRecommendationConfidence=0.65&days=${aiMetricsDays.value}&fromGate=1`
    const payload = {
      title,
      sourceType: 'release-gate',
      generatedAt: new Date().toISOString(),
      priority: rectificationMeta.priority || 'P1',
      owner: rectificationMeta.owner || gateSettingsMeta.updatedBy || '',
      labels,
      project: currentProjectName.value,
      gateDecision: gateStatus.value.label,
      gateSummary: {
        batchId: latestBatch.value?.id || '',
        passRate: passRateLabel.value,
        minPassRate: Number(gate.minPassRate || 95),
        minAiAdoptionRate: Number(gate.minAiAdoptionRate || 50),
        minAiSampleSize: Number(gate.minAiSampleSize || 5),
        aiHitRate: percentLabel(aiMetrics.retrievalHitRate),
        aiAdoptionRate: percentLabel(aiMetrics.highConfidenceRecommendationAdoptionRate),
        aiSampleSize: Number(aiMetrics.analyzedCount || 0),
        aiGate: `${checkAiGate.value.label} ${checkAiGate.value.text}`,
      },
      suggestedActions: Array.isArray(aiMetrics.suggestedActions) ? aiMetrics.suggestedActions.slice(0, 5) : [],
      defectsUrl,
      description: rectificationDraft.value,
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    ElMessage.success('工单JSON已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

onMounted(async () => {
  await loadGateSettings()
  await loadData()
})

watch(() => projectStore.selectedProjectId, async () => {
  await loadGateSettings()
  await loadData()
})

watch(
  () => [rectificationMeta.owner, rectificationMeta.priority, rectificationMeta.tags],
  () => {
    if (rectificationDialogVisible.value) {
      refreshRectificationDraft()
    }
  },
)
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafafa;
}

.label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.mono {
  font-size: 13px;
  word-break: break-all;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.trend-legend {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.trend-day {
  width: 28px;
  min-width: 28px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  position: relative;
  height: 84px;
}

.trend-col {
  width: 8px;
  border-radius: 4px 4px 0 0;
}

.trend-col-hit {
  background: #409eff;
}

.trend-col-adopt {
  background: #67c23a;
}

.trend-label {
  position: absolute;
  bottom: -16px;
  font-size: 10px;
  color: #909399;
}
</style>
