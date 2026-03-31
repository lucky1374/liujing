<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试任务</h2>
      <div class="header-actions">
        <el-button @click="goToTroubleshootingGuide">联调速查</el-button>
        <el-button :loading="runnerDiagLoading" @click="handleDiagnoseRunner">Runner诊断</el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新建任务
        </el-button>
      </div>
    </div>

    <el-card class="runner-overview-card" v-loading="runnerOverviewLoading">
      <template #header>
        <div class="runner-overview-header">
          <span>Runner实时状态</span>
          <el-button size="small" @click="loadRunnerOverview">刷新</el-button>
        </div>
      </template>
      <div class="runner-overview-grid">
        <div v-for="item in runnerOverviewItems" :key="item.label" class="runner-overview-item">
          <div class="runner-overview-label">{{ item.label }}</div>
          <div class="runner-overview-value">{{ item.value }}</div>
        </div>
      </div>
    </el-card>

    <el-card class="runner-overview-card" v-loading="observabilityLoading">
      <template #header>
        <div class="runner-overview-header">
          <span>执行观测概览（{{ observabilityRangeLabel }}）</span>
          <div class="obs-header-actions">
            <el-radio-group v-model="observability.hours" size="small" @change="handleObservabilityRangeChange">
              <el-radio-button v-for="item in observabilityRangeOptions" :key="item.value" :label="item.value">
                {{ item.label }}
              </el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="loadObservabilityOverview">刷新</el-button>
          </div>
        </div>
      </template>
      <div class="obs-overview-grid">
        <div class="obs-overview-item">
          <div class="runner-overview-label">失败总数</div>
          <div class="runner-overview-value">{{ observability.failedTotal }}</div>
        </div>
        <div class="obs-overview-item">
          <div class="runner-overview-label">HTTP Runner失败</div>
          <div class="runner-overview-value">{{ observability.byRunnerSource.python_http || 0 }}</div>
        </div>
        <div class="obs-overview-item">
          <div class="runner-overview-label">本地兜底失败</div>
          <div class="runner-overview-value">{{ observability.byRunnerSource.python_local || 0 }}</div>
        </div>
      </div>
      <div class="obs-reasons" v-if="observability.topFailureReasons.length">
        <div class="obs-reason-item" v-for="item in observability.topFailureReasons" :key="item.reason" @click="applyGlobalFailureReasonFilter(item.reason)">
          <span>{{ item.reason }}</span>
          <el-tag type="danger">{{ item.count }}</el-tag>
        </div>
      </div>
    </el-card>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select v-model="queryForm.projectId" clearable filterable placeholder="全部项目" style="width: 220px">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务状态">
          <el-radio-group v-model="queryForm.status" size="small" @change="handleStatusFilterChange">
            <el-radio-button v-for="item in statusFilterOptions" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="失败原因">
          <el-select v-model="globalFailureReasonFilter" clearable placeholder="执行记录筛选预设" style="width: 220px" @change="handleGlobalFailureReasonChange">
            <el-option v-for="item in globalFailureReasonOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="任务名称" min-width="180" />
        <el-table-column label="所属项目" min-width="160">
          <template #default="{ row }">{{ projectNameMap[row.projectId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="任务类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ typeMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="110">
          <template #default="{ row }">
            <el-tag :type="row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'info'">
              {{ priorityMap[row.priority] || row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">{{ statusMap[row.status]?.label || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="passRate" label="通过率" width="100">
          <template #default="{ row }">{{ row.passRate || 0 }}%</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="handleExecute(row)">执行</el-button>
            <el-button type="primary" link @click="handleViewExecutions(row)">执行记录</el-button>
            <el-button type="primary" link @click="goToDefects(row)">关联缺陷</el-button>
            <el-button type="primary" link @click="goToReports(row)">关联报告</el-button>
            <el-button type="warning" link @click="handleGenerateReport(row)">生成报告</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="loadData"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" filterable placeholder="请选择项目" style="width: 100%" @change="handleProjectChange">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="任务类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="接口测试" value="interface_test" />
            <el-option label="回归测试" value="regression_test" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行方式">
          <el-radio-group v-model="form.executeType">
            <el-radio label="immediate">立即执行</el-radio>
            <el-radio label="scheduled">定时执行</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.executeType === 'scheduled'" label="定时执行时间">
          <el-date-picker v-model="form.scheduledTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="默认执行环境">
          <el-select v-model="form.environmentId" clearable placeholder="请选择环境" style="width: 100%">
            <el-option v-for="item in environments" :key="item.id" :label="`${item.name} (${envTypeMap[item.type] || item.type})`" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行环境类型">
          <el-checkbox-group v-model="form.executeEnvironments">
            <el-checkbox label="test">测试环境</el-checkbox>
            <el-checkbox label="pre_production">预发环境</el-checkbox>
            <el-checkbox label="production">生产环境</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="关联脚本">
          <el-select v-model="form.scriptIds" multiple collapse-tags collapse-tags-tooltip filterable placeholder="请选择脚本" style="width: 100%">
            <el-option v-for="item in scripts" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务描述">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="executionDrawerVisible" :title="executionDrawerTitle" size="55%">
      <el-alert
        v-if="executionRunnerHint"
        :title="executionRunnerHint.title"
        :type="executionRunnerHint.type"
        :description="executionRunnerHint.description"
        :closable="false"
        show-icon
        style="margin-bottom: 12px"
      />
      <div class="execution-filter-row">
        <el-select v-model="executionReasonFilter" clearable placeholder="按失败原因筛选" style="width: 260px">
          <el-option v-for="item in executionReasonOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </div>
      <el-table :data="filteredExecutionList" border stripe>
        <el-table-column prop="scriptName" label="脚本名称" min-width="180" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="executionStatusMap[row.status]?.type || 'info'">
              {{ executionStatusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="失败原因" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getExecutionReason(row) || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="responseStatus" label="响应码" width="100" />
        <el-table-column prop="durationMs" label="耗时(ms)" width="120" />
        <el-table-column prop="runnerSource" label="执行来源" width="140">
          <template #default="{ row }">
            <el-tag :type="runnerSourceMap[row.runnerSource]?.type || 'info'">
              {{ runnerSourceMap[row.runnerSource]?.label || row.runnerSource || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="requestMethod" label="请求方式" width="110" />
        <el-table-column prop="requestUrl" label="请求地址" min-width="220" show-overflow-tooltip />
        <el-table-column label="重试信息" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatRetryMeta(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="errorMessage" label="错误信息" min-width="220" show-overflow-tooltip />
        <el-table-column label="快速定位建议" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ getExecutionQuickTip(row) || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewExecutionDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'failed'" type="danger" link @click="handleCreateDefect(row)">转缺陷</el-button>
            <el-button v-if="row.status === 'failed'" type="warning" link @click="handleCopyExecutionCommands(row)">复制排查命令</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog v-model="executionDetailVisible" title="执行详情" width="70%">
      <template v-if="currentExecution">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="执行编号">{{ currentExecution.executionNo }}</el-descriptions-item>
          <el-descriptions-item label="脚本名称">{{ currentExecution.scriptName }}</el-descriptions-item>
          <el-descriptions-item label="执行状态">
            <el-tag :type="executionStatusMap[currentExecution.status]?.type || 'info'">
              {{ executionStatusMap[currentExecution.status]?.label || currentExecution.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="错误类型">{{ currentExecution.errorType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="执行来源">{{ runnerSourceMap[currentExecution.runnerSource]?.label || currentExecution.runnerSource || '-' }}</el-descriptions-item>
          <el-descriptions-item label="请求方式">{{ currentExecution.requestMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="响应码">{{ currentExecution.responseStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时(ms)">{{ currentExecution.durationMs }}</el-descriptions-item>
          <el-descriptions-item label="请求地址" :span="2">{{ currentExecution.requestUrl || '-' }}</el-descriptions-item>
          <el-descriptions-item label="重试信息" :span="2">{{ formatRetryMeta(currentExecution) }}</el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">{{ currentExecution.errorMessage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="快速定位建议" :span="2">{{ currentExecutionQuickTip || '-' }}</el-descriptions-item>
          <el-descriptions-item label="排查命令" :span="2">
            <div class="inline-actions">
              <el-button size="small" @click="handleCopyExecutionCommands(currentExecution)">复制排查命令</el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>请求体</el-divider>
        <pre class="json-block">{{ formatJson(currentExecution.requestBody) }}</pre>

        <el-divider>请求头</el-divider>
        <pre class="json-block">{{ formatJson(maskSensitiveHeaders(currentExecution.requestHeaders)) }}</pre>

        <el-divider>响应体</el-divider>
        <pre class="json-block">{{ formatJson(currentExecution.responseBody) }}</pre>

        <el-divider>错误堆栈</el-divider>
        <pre class="json-block">{{ currentExecution.errorStack || '无' }}</pre>
      </template>
    </el-dialog>

    <el-dialog v-model="runnerDiagVisible" title="Runner诊断" width="680px">
      <template v-if="runnerDiag">
        <div class="diag-grid">
          <div class="diag-card" :class="runnerConfigState.type">
            <div class="diag-title">配置状态</div>
            <div class="diag-status">{{ runnerConfigState.label }}</div>
            <div class="diag-desc">Runner URL: {{ runnerDiag.runnerUrl || '-' }}</div>
            <div class="diag-desc">Token配置: {{ runnerDiag.hasAuthTokenConfigured ? '已配置' : '未配置' }}</div>
          </div>

          <div class="diag-card" :class="runnerHealthState.type">
            <div class="diag-title">Health检查</div>
            <div class="diag-status">{{ runnerHealthState.label }}</div>
            <div class="diag-desc">HTTP状态: {{ runnerDiag.health?.httpStatus || '-' }}</div>
            <div class="diag-desc">详情: {{ runnerDiag.health?.error || formatCompact(runnerDiag.health?.response) }}</div>
          </div>

          <div class="diag-card" :class="runnerExecuteState.type">
            <div class="diag-title">Execute探测</div>
            <div class="diag-status">{{ runnerExecuteState.label }}</div>
            <div class="diag-desc">HTTP状态: {{ runnerDiag.executeProbe?.httpStatus || '-' }}</div>
            <div class="diag-desc">详情: {{ runnerDiag.executeProbe?.error || formatCompact(runnerDiag.executeProbe?.response) }}</div>
          </div>

          <div class="diag-card" :class="runnerStatsState.type">
            <div class="diag-title">Stats探测</div>
            <div class="diag-status">{{ runnerStatsState.label }}</div>
            <div class="diag-desc">HTTP状态: {{ runnerDiag.statsProbe?.httpStatus || '-' }}</div>
            <div class="diag-desc">详情: {{ runnerDiag.statsProbe?.error || formatCompact(runnerDiag.statsProbe?.response) }}</div>
          </div>
        </div>
      </template>

      <template #footer>
        <el-button @click="handleCopyRunnerDiag" :disabled="!runnerDiag">复制诊断信息</el-button>
        <el-button @click="runnerDiagVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '../store/project'

const tableData = ref([])
const projects = ref([])
const environments = ref([])
const scripts = ref([])
const executionList = ref([])
const dialogVisible = ref(false)
const executionDrawerVisible = ref(false)
const executionDetailVisible = ref(false)
const runnerDiagVisible = ref(false)
const dialogTitle = ref('')
const executionDrawerTitle = ref('执行记录')
const currentExecution = ref(null)
const runnerDiag = ref(null)
const runnerDiagLoading = ref(false)
const runnerOverviewLoading = ref(false)
const observabilityLoading = ref(false)
const executionReasonFilter = ref('')
const pendingGlobalReasonFilter = ref('')
const globalFailureReasonFilter = ref('')
const runnerOverview = ref({
  maxConcurrency: 0,
  running: 0,
  waiting: 0,
  rejected: 0,
  queueTimeoutMs: 0
})
const observability = ref({
  hours: 24,
  failedTotal: 0,
  byRunnerSource: {},
  topFailureReasons: []
})
let runnerOverviewTimer = null
const projectStore = useProjectStore()
const router = useRouter()
const route = useRoute()
const formRef = ref()
const saveLoading = ref(false)

const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const queryForm = reactive({
  projectId: '',
  taskId: '',
  status: ''
})

const form = reactive({
  id: '',
  projectId: '',
  name: '',
  description: '',
  type: 'interface_test',
  executeType: 'immediate',
  executeEnvironments: ['test'],
  environmentId: '',
  scriptIds: [],
  priority: 'medium',
  scheduledTime: ''
})

const rules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  scriptIds: [{ type: 'array', required: true, min: 1, message: '请至少选择一个关联脚本', trigger: 'change' }]
}

const typeMap = {
  interface_test: '接口测试',
  regression_test: '回归测试'
}

const priorityMap = {
  high: '高',
  medium: '中',
  low: '低'
}

const statusMap = {
  pending: { label: '待执行', type: 'info' },
  running: { label: '执行中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  cancelled: { label: '已取消', type: 'warning' }
}

const statusFilterOptions = [
  { label: '全部', value: '' },
  { label: '待执行', value: 'pending' },
  { label: '执行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' }
]

const observabilityRangeOptions = [
  { label: '近1小时', value: 1 },
  { label: '近24小时', value: 24 },
  { label: '近7天', value: 168 }
]

const executionStatusMap = {
  passed: { label: '通过', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  skipped: { label: '跳过', type: 'warning' },
  running: { label: '执行中', type: 'primary' },
  pending: { label: '待执行', type: 'info' }
}

const runnerSourceMap = {
  lite: { label: 'Lite执行器', type: 'success' },
  python_http: { label: 'Python HTTP Runner', type: 'warning' },
  python_local: { label: 'Python 本地兜底', type: 'info' }
}

const envTypeMap = {
  development: '开发',
  test: '测试',
  pre_production: '预发',
  production: '生产'
}

const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))

const executionRunnerHint = computed(() => {
  if (!executionList.value.length) return null

  const hasAuthFailure = executionList.value.some((item) => {
    const source = String(item.runnerSource || '')
    const message = String(item.errorMessage || '')
    return source === 'python_http' && (message.includes('鉴权失败') || message.includes('HTTP 401') || message.includes('HTTP 403'))
  })

  if (hasAuthFailure) {
    return {
      type: 'error',
      title: '检测到 Python HTTP Runner 鉴权失败',
      description: '请检查后端 RUNNER_AUTH_TOKEN 与 Runner 进程 RUNNER_AUTH_TOKEN 是否一致。'
    }
  }

  const localCount = executionList.value.filter((item) => String(item.runnerSource || '') === 'python_local').length
  const httpCount = executionList.value.filter((item) => String(item.runnerSource || '') === 'python_http').length

  if (localCount > 0 && httpCount === 0) {
    return {
      type: 'warning',
      title: '当前任务使用了 Python 本地兜底',
      description: '建议点击“Runner诊断”检查 HTTP Runner 连通性与鉴权配置。'
    }
  }

  return null
})

const currentExecutionQuickTip = computed(() => {
  if (!currentExecution.value) return ''
  return getExecutionQuickTip(currentExecution.value)
})

const runnerConfigState = computed(() => {
  const data = runnerDiag.value
  if (!data) return { type: 'diag-info', label: '待检查' }
  if (data.runnerUrl && data.hasAuthTokenConfigured) return { type: 'diag-success', label: '正常' }
  if (data.runnerUrl) return { type: 'diag-warning', label: '缺少Token配置' }
  return { type: 'diag-error', label: '未配置Runner URL' }
})

const runnerHealthState = computed(() => {
  const data = runnerDiag.value
  if (!data) return { type: 'diag-info', label: '待检查' }
  if (data.health?.ok) return { type: 'diag-success', label: '通过' }
  return { type: 'diag-error', label: '失败' }
})

const runnerExecuteState = computed(() => {
  const data = runnerDiag.value
  if (!data) return { type: 'diag-info', label: '待检查' }
  if (!data.executeProbe) return { type: 'diag-warning', label: '未执行' }
  if (data.executeProbe.ok) return { type: 'diag-success', label: '通过' }
  return { type: 'diag-error', label: '失败' }
})

const runnerStatsState = computed(() => {
  const data = runnerDiag.value
  if (!data) return { type: 'diag-info', label: '待检查' }
  if (!data.statsProbe) return { type: 'diag-warning', label: '未执行' }
  if (data.statsProbe.ok) return { type: 'diag-success', label: '通过' }
  return { type: 'diag-error', label: '失败' }
})

const runnerOverviewItems = computed(() => [
  { label: '并发上限', value: runnerOverview.value.maxConcurrency || '-' },
  { label: '执行中', value: runnerOverview.value.running || 0 },
  { label: '排队中', value: runnerOverview.value.waiting || 0 },
  { label: '排队拒绝', value: runnerOverview.value.rejected || 0 },
  { label: '队列超时(ms)', value: runnerOverview.value.queueTimeoutMs || '-' }
])

const executionReasonOptions = computed(() => {
  const reasons = executionList.value
    .filter((item) => item.status === 'failed')
    .map((item) => getExecutionReason(item))
    .filter(Boolean)
  if (executionReasonFilter.value) {
    reasons.push(executionReasonFilter.value)
  }
  return Array.from(new Set(reasons))
})

const filteredExecutionList = computed(() => {
  if (!executionReasonFilter.value) return executionList.value
  return executionList.value.filter((item) => getExecutionReason(item) === executionReasonFilter.value)
})

const globalFailureReasonOptions = computed(() => {
  const fromOverview = (observability.value.topFailureReasons || []).map((item) => item.reason).filter(Boolean)
  if (globalFailureReasonFilter.value) {
    fromOverview.push(globalFailureReasonFilter.value)
  }
  return Array.from(new Set(fromOverview))
})

const observabilityRangeLabel = computed(() => {
  const matched = observabilityRangeOptions.find((item) => item.value === observability.value.hours)
  return matched?.label || `近${observability.value.hours}小时`
})

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadData = async () => {
  let reasonTaskIds = null

  if (globalFailureReasonFilter.value) {
    const reasonRes = await api.get('/test-tasks/observability/failure-reason-task-ids', {
      params: {
        reason: globalFailureReasonFilter.value,
        hours: observability.value.hours || 24
      }
    })
    const taskIds = Array.isArray(reasonRes.data?.taskIds) ? reasonRes.data.taskIds : []
    reasonTaskIds = taskIds

    if (!reasonTaskIds.length) {
      tableData.value = []
      pagination.total = 0
      return
    }
  }

  const params = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(queryForm.projectId && { projectId: queryForm.projectId }),
    ...(queryForm.taskId && { id: queryForm.taskId }),
    ...(reasonTaskIds?.length && { taskIds: reasonTaskIds.join(',') }),
    ...((queryForm.status || globalFailureReasonFilter.value) && { status: queryForm.status || 'failed' })
  }

  const res = await api.get('/test-tasks', { params })
  tableData.value = res.data.list || []
  pagination.total = res.data.total || 0
}

const handleStatusFilterChange = async () => {
  pagination.page = 1
  await loadData()
}

const handleGlobalFailureReasonChange = async () => {
  pagination.page = 1
  if (globalFailureReasonFilter.value && !queryForm.status) {
    queryForm.status = 'failed'
  }
  await loadData()
}

const handleObservabilityRangeChange = async () => {
  await loadObservabilityOverview()
  if (globalFailureReasonFilter.value) {
    pagination.page = 1
    await loadData()
  }
}

const loadProjectResources = async (projectId) => {
  environments.value = []
  scripts.value = []
  if (!projectId) return

  const [envRes, scriptRes] = await Promise.all([
    api.get('/environments', { params: { projectId } }),
    api.get('/test-scripts', { params: { page: 1, pageSize: 100, projectId } })
  ])
  environments.value = envRes.data || []
  scripts.value = scriptRes.data.list || []
}

const handleProjectChange = async (projectId) => {
  form.environmentId = ''
  form.scriptIds = []
  await loadProjectResources(projectId)
}

const resetForm = () => {
  Object.assign(form, {
    id: '',
    projectId: '',
    name: '',
    description: '',
    type: 'interface_test',
    executeType: 'immediate',
    executeEnvironments: ['test'],
    environmentId: '',
    scriptIds: [],
    priority: 'medium',
    scheduledTime: ''
  })
}

const handleAdd = () => {
  resetForm()
  environments.value = []
  scripts.value = []
  dialogTitle.value = '新建任务'
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  resetForm()
  Object.assign(form, {
    id: row.id,
    projectId: row.projectId || '',
    name: row.name,
    description: row.description || '',
    type: row.type,
    executeType: row.executeType || 'immediate',
    executeEnvironments: row.executeEnvironments?.length ? row.executeEnvironments : ['test'],
    environmentId: row.environmentId || '',
    scriptIds: row.scriptIds || [],
    priority: row.priority || 'medium',
    scheduledTime: row.scheduledTime || ''
  })
  await loadProjectResources(form.projectId)
  dialogTitle.value = '编辑任务'
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload = {
    projectId: form.projectId,
    name: form.name,
    description: form.description,
    type: form.type,
    executeType: form.executeType,
    executeEnvironments: form.executeEnvironments,
    environmentId: form.environmentId || undefined,
    scriptIds: form.scriptIds,
    priority: form.priority,
    scheduledTime: form.executeType === 'scheduled' ? form.scheduledTime : undefined
  }

  saveLoading.value = true
  try {
    if (form.id) {
      await api.put(`/test-tasks/${form.id}`, payload)
      ElMessage.success('任务更新成功')
    } else {
      await api.post('/test-tasks', payload)
      ElMessage.success('任务创建成功')
    }

    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '任务保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleExecute = async (row) => {
  const payload = {}
  if (row.environmentId) payload.environmentId = row.environmentId
  else if (row.executeEnvironments?.length) payload.environment = row.executeEnvironments[0]

  await api.post(`/test-tasks/${row.id}/execute`, payload)
  ElMessage.success('任务已开始执行')
  await loadData()
  await handleViewExecutions(row)
}

const goToTroubleshootingGuide = () => {
  router.push('/troubleshooting-guide')
}

const handleDiagnoseRunner = async () => {
  runnerDiagLoading.value = true
  try {
    const res = await api.get('/test-tasks/runner/diagnostics')
    runnerDiag.value = res.data || null
    applyRunnerOverview(runnerDiag.value)
    runnerDiagVisible.value = true
  } catch (error) {
    ElMessage.error(error.response?.data?.message || 'Runner诊断失败')
  } finally {
    runnerDiagLoading.value = false
  }
}

const loadRunnerOverview = async (silent = false) => {
  if (!silent) runnerOverviewLoading.value = true
  try {
    const res = await api.get('/test-tasks/runner/diagnostics')
    applyRunnerOverview(res.data || null)
  } catch {
    // 静默轮询，不打扰正常页面操作
  } finally {
    if (!silent) runnerOverviewLoading.value = false
  }
}

const loadObservabilityOverview = async (silent = false) => {
  if (!silent) observabilityLoading.value = true
  try {
    const res = await api.get('/test-tasks/observability/overview', { params: { hours: observability.value.hours } })
    const data = res.data || {}
    observability.value = {
      hours: data.timeRangeHours || 24,
      failedTotal: Number(data.failedTotal || 0),
      byRunnerSource: data.byRunnerSource || {},
      topFailureReasons: Array.isArray(data.topFailureReasons) ? data.topFailureReasons : []
    }
  } catch {
    // 静默轮询，不打扰正常页面操作
  } finally {
    if (!silent) observabilityLoading.value = false
  }
}

const applyRunnerOverview = (diag) => {
  const limiter = parseLimiter(diag?.statsProbe?.response)
  if (!limiter) return
  runnerOverview.value = {
    maxConcurrency: Number(limiter.maxConcurrency || 0),
    running: Number(limiter.running || 0),
    waiting: Number(limiter.waiting || 0),
    rejected: Number(limiter.rejected || 0),
    queueTimeoutMs: Number(limiter.queueTimeoutMs || 0)
  }
}

const parseLimiter = (statsResponse) => {
  if (!statsResponse) return null
  if (typeof statsResponse === 'string') {
    try {
      const parsed = JSON.parse(statsResponse)
      return parsed?.limiter || null
    } catch {
      return null
    }
  }
  if (typeof statsResponse === 'object') {
    return statsResponse.limiter || null
  }
  return null
}

const handleCopyRunnerDiag = async () => {
  if (!runnerDiag.value) return
  const text = buildRunnerDiagText(runnerDiag.value)
  await copyText(text, '诊断信息已复制')
}

const buildRunnerDiagText = (data) => {
  return [
    '[Runner诊断结果]',
    `Runner URL: ${data.runnerUrl || '-'}`,
    `Token已配置: ${data.hasAuthTokenConfigured ? '是' : '否'}`,
      `Health检查: ${data.health?.ok ? '通过' : '失败'}${data.health?.httpStatus ? ` (HTTP ${data.health.httpStatus})` : ''}`,
      `Health详情: ${data.health?.error || formatCompact(data.health?.response)}`,
      `Execute探测: ${data.executeProbe ? (data.executeProbe.ok ? '通过' : '失败') : '未执行'}${data.executeProbe?.httpStatus ? ` (HTTP ${data.executeProbe.httpStatus})` : ''}`,
      `Execute详情: ${data.executeProbe?.error || formatCompact(data.executeProbe?.response)}`,
      `Stats探测: ${data.statsProbe ? (data.statsProbe.ok ? '通过' : '失败') : '未执行'}${data.statsProbe?.httpStatus ? ` (HTTP ${data.statsProbe.httpStatus})` : ''}`,
      `Stats详情: ${data.statsProbe?.error || formatCompact(data.statsProbe?.response)}`
    ].join('\n')
}

const handleCopyExecutionCommands = async (execution) => {
  const commands = getExecutionQuickCommands(execution)
  await copyText(commands, '排查命令已复制')
}

const getExecutionQuickCommands = (execution) => {
  if (!execution || execution.status !== 'failed') {
    return '# 当前执行非失败状态，无需排查命令'
  }

  const source = String(execution.runnerSource || '')
  const errorMessage = String(execution.errorMessage || '')
  const errorStack = String(execution.errorStack || '')
  const fullText = `${errorMessage}\n${errorStack}`.toLowerCase()

  const lines = [
    '# Runner基础检查',
    'curl -i http://localhost:8001/health',
    'lsof -i :8001 -sTCP:LISTEN -n -P',
    'printenv | grep -E "PYTHON_RUNNER_URL|RUNNER_AUTH_TOKEN"',
    ''
  ]

  if (source === 'python_http') {
    lines.push('# HTTP Runner探测', 'curl -i -X POST "http://localhost:8001/execute" -H "Content-Type: application/json" -H "X-Runner-Token: <YOUR_RUNNER_AUTH_TOKEN>" -d "{\"executionId\":\"probe\",\"taskId\":\"diag\",\"script\":{\"id\":\"s1\",\"name\":\"diag\",\"language\":\"python\",\"content\":\"print(1)\"},\"environment\":{\"baseUrl\":\"https://example.com\",\"headers\":{},\"variables\":{},\"authConfig\":{}},\"options\":{\"timeoutMs\":5000,\"pythonBin\":\"python3\"}}"', '')
  }

  if (fullText.includes('http 401') || fullText.includes('http 403') || fullText.includes('unauthorized') || errorMessage.includes('鉴权失败')) {
    lines.push('# 鉴权排查', 'echo "检查后端 .env 与 Runner 进程中的 RUNNER_AUTH_TOKEN 是否完全一致"', 'ps eww -p $(lsof -ti :8001)', '')
  }

  if (fullText.includes('econnrefused') || fullText.includes('connect refused')) {
    lines.push('# 连接被拒绝排查', 'echo "确认 python-runner 服务已启动并监听8001端口"', 'cd /Users/lj/liujing/ai-test-platform/python-runner && source .venv/bin/activate && uvicorn runner.server:app --host 0.0.0.0 --port 8001', '')
  }

  if (source === 'python_local' || fullText.includes('no module named')) {
    lines.push('# 本地兜底执行排查', 'cd /Users/lj/liujing/ai-test-platform/python-runner && source .venv/bin/activate && pip install -r requirements.txt', 'cd /Users/lj/liujing/ai-test-platform/python-runner && source .venv/bin/activate && python -m runner.main --payload examples/sample_payload.json', '')
  }

  lines.push('# 后端Runner诊断接口', 'curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:3000/test-tasks/runner/diagnostics')

  return lines.join('\n')
}

const copyText = async (text, successMessage) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(successMessage)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success(successMessage)
  }
}

const handleViewExecutions = async (row) => {
  const res = await api.get(`/test-tasks/${row.id}/executions`)
  executionList.value = res.data || []
  const presetReason = pendingGlobalReasonFilter.value || globalFailureReasonFilter.value
  if (presetReason) {
    executionReasonFilter.value = presetReason
    pendingGlobalReasonFilter.value = ''
  }
  executionDrawerTitle.value = `执行记录 - ${row.name}`
  executionDrawerVisible.value = true
}

const handleCreateDefect = async (execution) => {
  await api.post(`/defects/from-execution/${execution.id}`)
  ElMessage.success('已转为缺陷')
}

const handleViewExecutionDetail = (execution) => {
  currentExecution.value = execution
  executionDetailVisible.value = true
}

const handleGenerateReport = async (row) => {
  await api.post('/test-reports/generate-by-ai', { taskId: row.id })
  ElMessage.success('报告生成成功')
}

const goToDefects = (row) => {
  router.push({ path: '/defects', query: { taskId: row.id, projectId: row.projectId || '' } })
}

const goToReports = (row) => {
  router.push({ path: '/test-reports', query: { taskId: row.id, projectId: row.projectId || '' } })
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确认删除任务“${row.name}”吗？`, '提示', { type: 'warning' })
  await api.delete(`/test-tasks/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

const applyGlobalFailureReasonFilter = async (reason) => {
  globalFailureReasonFilter.value = reason
  pendingGlobalReasonFilter.value = reason
  queryForm.status = 'failed'
  pagination.page = 1
  await loadData()
  ElMessage.success(`已按失败原因 ${reason} 预设筛选，请打开任务执行记录查看。`)
}

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) return value[0] || ''
  if (value === null || value === undefined) return ''
  return String(value)
}

onMounted(async () => {
  await loadProjects()
  queryForm.projectId = normalizeQueryValue(route.query.projectId)
  queryForm.taskId = normalizeQueryValue(route.query.taskId)
  queryForm.status = normalizeQueryValue(route.query.status)
  if (projectStore.selectedProjectId) {
    queryForm.projectId = queryForm.projectId || projectStore.selectedProjectId
    form.projectId = projectStore.selectedProjectId
    await loadProjectResources(projectStore.selectedProjectId)
  }
  await loadData()
  await loadRunnerOverview()
  await loadObservabilityOverview()

  runnerOverviewTimer = window.setInterval(() => {
    loadRunnerOverview(true)
    loadObservabilityOverview(true)
  }, 10000)
})

onBeforeUnmount(() => {
  if (runnerOverviewTimer) {
    window.clearInterval(runnerOverviewTimer)
    runnerOverviewTimer = null
  }
})

watch(() => projectStore.selectedProjectId, async (projectId) => {
  if (!route.query.projectId) queryForm.projectId = projectId || ''
  if (!form.id) {
    form.projectId = projectId || ''
    form.environmentId = ''
    form.scriptIds = []
  }
  if (projectId) await loadProjectResources(projectId)
  await loadData()
})

watch(() => route.query, async (query) => {
  queryForm.projectId = normalizeQueryValue(query.projectId) || projectStore.selectedProjectId || ''
  queryForm.taskId = normalizeQueryValue(query.taskId)
  queryForm.status = normalizeQueryValue(query.status)
  await loadData()
})

const formatJson = (value) => {
  if (!value) return '无'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const formatCompact = (value) => {
  if (value === undefined || value === null || value === '') return '-'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const maskSensitiveHeaders = (headers) => {
  if (!headers || typeof headers !== 'object') return headers
  const cloned = { ...headers }
  for (const key of Object.keys(cloned)) {
    const lower = key.toLowerCase()
    if (lower === 'authorization' || lower.includes('token') || lower.includes('secret')) {
      const value = String(cloned[key] || '')
      if (value.startsWith('Bearer ')) {
        const token = value.slice(7)
        cloned[key] = `Bearer ${maskToken(token)}`
      } else {
        cloned[key] = maskToken(value)
      }
    }
  }
  return cloned
}

const maskToken = (value) => {
  if (!value) return value
  if (value.length <= 10) return '******'
  return `${value.slice(0, 4)}******${value.slice(-4)}`
}

const getExecutionQuickTip = (execution) => {
  if (!execution || execution.status !== 'failed') return ''

  const runnerSource = String(execution.runnerSource || '')
  const errorMessage = String(execution.errorMessage || '')
  const errorStack = String(execution.errorStack || '')
  const fullText = `${errorMessage}\n${errorStack}`.toLowerCase()
  const runnerMeta = execution.responseBody && typeof execution.responseBody === 'object' ? execution.responseBody._runnerMeta : null

  if (runnerMeta?.lastHttpReason === 'queue_timeout' || fullText.includes('http 429') || fullText.includes('queue timeout')) {
    return 'HTTP Runner 并发满载导致排队超时。可提高 RUNNER_MAX_CONCURRENCY 或 RUNNER_QUEUE_TIMEOUT_MS，并观察 /stats。'
  }

  if (
    runnerSource === 'python_http' &&
    (errorMessage.includes('鉴权失败') || fullText.includes('http 401') || fullText.includes('http 403') || fullText.includes('unauthorized'))
  ) {
    return '检查后端 RUNNER_AUTH_TOKEN 与 Runner 进程 RUNNER_AUTH_TOKEN 是否一致，并重启后端和Runner。'
  }

  if (fullText.includes('econnrefused') || fullText.includes('connect refused')) {
    return 'Runner 服务可能未启动，或 PYTHON_RUNNER_URL/端口配置错误。请先检查 Runner 进程与地址。'
  }

  if (fullText.includes('enotfound') || fullText.includes('eai_again') || fullText.includes('name or service not known')) {
    return 'Runner 地址的域名解析失败，请检查 PYTHON_RUNNER_URL 的主机名与本机 DNS 配置。'
  }

  if (fullText.includes('etimedout') || fullText.includes('timeout')) {
    return 'Runner 调用超时，请检查 Runner 负载、网络连通性，必要时提高超时阈值。'
  }

  if (runnerSource === 'python_local' && fullText.includes('no module named')) {
    return '本地 Python 依赖缺失，请在 python-runner 虚拟环境执行 pip install -r requirements.txt。'
  }

  if (runnerSource === 'python_http' && (fullText.includes('http 500') || fullText.includes('internal server error'))) {
    return 'Runner 内部执行异常，请查看 python-runner 日志与脚本运行错误堆栈。'
  }

  if (runnerSource === 'python_local') {
    return '当前为本地兜底失败，优先检查 python-runner/.venv、PYTHON_BIN 以及脚本依赖。'
  }

  if (runnerSource === 'python_http') {
    return '请先点击 Runner诊断，确认 /health 与 /execute 探测均通过后再复测。'
  }

  return '请结合错误信息和堆栈排查脚本逻辑、环境变量与目标接口可用性。'
}

const formatRetryMeta = (execution) => {
  if (!execution) return '-'

  const body = execution.responseBody
  const meta = body && typeof body === 'object' ? body._runnerMeta : null
  if (!meta) return '-'

  const attempt = `${meta.httpAttempt || 0}/${meta.maxAttempts || 0}`
  const retryCount = meta.retryCount ?? 0
  const fallbackText = meta.fallbackUsed ? '是' : '否'
  const reasonText = meta.lastHttpReason ? `, 原因:${meta.lastHttpReason}` : ''
  const policyText = meta.retryEligible === false ? ', 策略:非幂等禁重试' : ''
  return `尝试:${attempt}, 重试:${retryCount}, 本地兜底:${fallbackText}${reasonText}${policyText}`
}

const getExecutionReason = (execution) => {
  if (!execution || execution.status !== 'failed') return ''

  const body = execution.responseBody
  const meta = body && typeof body === 'object' ? body._runnerMeta : null
  if (meta?.lastHttpReason) return meta.lastHttpReason

  const text = `${execution.errorMessage || ''} ${execution.errorStack || ''}`.toLowerCase()
  if (text.includes('401') || text.includes('403') || text.includes('unauthorized')) return 'auth_failed'
  if (text.includes('429') || text.includes('queue timeout')) return 'queue_timeout'
  if (text.includes('timeout') || text.includes('timed out')) return 'runner_timeout'
  if (text.includes('econnrefused') || text.includes('connect refused')) return 'runner_unreachable'
  if (text.includes('enotfound') || text.includes('eai_again')) return 'runner_dns_error'
  if (execution.runnerSource === 'python_local') return 'python_local_error'
  return 'unknown'
}
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 8px;
}

.runner-overview-card {
  margin-bottom: 12px;
}

.runner-overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.obs-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.runner-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.runner-overview-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fafafa;
}

.runner-overview-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.runner-overview-value {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.obs-overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.obs-overview-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fcfcfc;
}

.obs-reasons {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.obs-reason-item {
  border: 1px dashed #e4e7ed;
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  cursor: pointer;
}

.execution-filter-row {
  margin-bottom: 10px;
}

.diag-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.diag-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.diag-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.diag-status {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.diag-desc {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  word-break: break-word;
}

.inline-actions {
  display: flex;
  gap: 8px;
}

.diag-success {
  border-color: #95d475;
  background: #f0f9eb;
}

.diag-warning {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.diag-error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.diag-info {
  border-color: #bfcbd9;
  background: #f4f4f5;
}

@media (min-width: 900px) {
  .runner-overview-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .diag-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 899px) {
  .runner-overview-header {
    align-items: flex-start;
    gap: 8px;
    flex-direction: column;
  }

  .obs-header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .obs-overview-grid,
  .obs-reasons {
    grid-template-columns: 1fr;
  }
}

.json-block {
  max-height: 260px;
  overflow: auto;
  padding: 12px;
  background: #f7f8fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}
</style>
