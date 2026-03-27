<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试任务</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新建任务
      </el-button>
    </div>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select v-model="queryForm.projectId" clearable filterable placeholder="全部项目" style="width: 220px">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务状态">
          <el-select v-model="queryForm.status" clearable placeholder="全部状态">
            <el-option label="待执行" value="pending" />
            <el-option label="执行中" value="running" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
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
      <el-table :data="executionList" border stripe>
        <el-table-column prop="scriptName" label="脚本名称" min-width="180" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="executionStatusMap[row.status]?.type || 'info'">
              {{ executionStatusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responseStatus" label="响应码" width="100" />
        <el-table-column prop="durationMs" label="耗时(ms)" width="120" />
        <el-table-column prop="requestMethod" label="请求方式" width="110" />
        <el-table-column prop="requestUrl" label="请求地址" min-width="220" show-overflow-tooltip />
        <el-table-column prop="errorMessage" label="错误信息" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewExecutionDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'failed'" type="danger" link @click="handleCreateDefect(row)">转缺陷</el-button>
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
          <el-descriptions-item label="请求方式">{{ currentExecution.requestMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="响应码">{{ currentExecution.responseStatus || '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时(ms)">{{ currentExecution.durationMs }}</el-descriptions-item>
          <el-descriptions-item label="请求地址" :span="2">{{ currentExecution.requestUrl || '-' }}</el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">{{ currentExecution.errorMessage || '-' }}</el-descriptions-item>
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
const dialogTitle = ref('')
const executionDrawerTitle = ref('执行记录')
const currentExecution = ref(null)
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

const executionStatusMap = {
  passed: { label: '通过', type: 'success' },
  failed: { label: '失败', type: 'danger' },
  skipped: { label: '跳过', type: 'warning' },
  running: { label: '执行中', type: 'primary' },
  pending: { label: '待执行', type: 'info' }
}

const envTypeMap = {
  development: '开发',
  test: '测试',
  pre_production: '预发',
  production: '生产'
}

const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadData = async () => {
  const params = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(queryForm.projectId && { projectId: queryForm.projectId }),
    ...(queryForm.taskId && { id: queryForm.taskId }),
    ...(queryForm.status && { status: queryForm.status })
  }
  const res = await api.get('/test-tasks', { params })
  tableData.value = res.data.list || []
  pagination.total = res.data.total || 0
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

const handleViewExecutions = async (row) => {
  const res = await api.get(`/test-tasks/${row.id}/executions`)
  executionList.value = res.data || []
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

onMounted(async () => {
  await loadProjects()
  if (route.query.projectId) queryForm.projectId = route.query.projectId
  if (route.query.taskId) queryForm.taskId = route.query.taskId
  if (projectStore.selectedProjectId) {
    queryForm.projectId = queryForm.projectId || projectStore.selectedProjectId
    form.projectId = projectStore.selectedProjectId
    await loadProjectResources(projectStore.selectedProjectId)
  }
  await loadData()
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
  queryForm.projectId = query.projectId || projectStore.selectedProjectId || ''
  queryForm.taskId = query.taskId || ''
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
</script>

<style scoped>
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
