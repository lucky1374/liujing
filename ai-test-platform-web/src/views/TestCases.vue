<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试用例</h2>
      <div>
        <el-button type="warning" @click="handleOpenApiImport">
          <el-icon><Upload /></el-icon>
          OpenAPI导入
        </el-button>
        <el-button type="primary" @click="handleGenerateByAI">
          <el-icon><MagicStick /></el-icon>
          AI生成用例
        </el-button>
        <el-button type="success" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新建用例
        </el-button>
      </div>
    </div>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select v-model="queryForm.projectId" clearable filterable placeholder="请选择项目" style="width: 220px">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="queryForm.module" clearable placeholder="请选择模块">
            <el-option v-for="m in modules" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="queryForm.priority" clearable placeholder="请选择优先级">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" clearable placeholder="请选择状态">
            <el-option label="草稿" value="draft" />
            <el-option label="有效" value="valid" />
            <el-option label="无效" value="invalid" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column label="所属项目" min-width="160">
          <template #default="{ row }">{{ projectNameMap[row.projectId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="name" label="用例名称" min-width="180" />
        <el-table-column prop="module" label="模块" width="140" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'info'">
              {{ row.priority === 'high' ? '高' : row.priority === 'medium' ? '中' : '低' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'valid' ? 'success' : row.status === 'draft' ? 'info' : 'danger'">
              {{ row.status === 'valid' ? '有效' : row.status === 'draft' ? '草稿' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.source === 'ai_generated'" type="warning">AI生成</el-tag>
            <el-tag v-else type="info">人工</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60%">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" filterable placeholder="请选择项目" style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="用例名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="模块">
          <el-input v-model="form.module" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="前置条件">
          <el-input v-model="form.preconditions" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="测试步骤">
          <el-input v-model="form.testSteps" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="预期结果">
          <el-input v-model="form.expectedResult" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="aiDialogVisible" title="AI生成用例" width="50%">
      <el-form label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="aiProjectId" filterable placeholder="请选择项目" style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="需求描述">
          <el-input v-model="aiPrompt" type="textarea" :rows="4" placeholder="请输入需求描述，AI将自动生成测试用例..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="aiDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="aiLoading" @click="handleAIGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="openApiDialogVisible" title="OpenAPI导入" width="70%">
      <el-form label-width="120px">
        <el-form-item label="所属项目">
          <el-select v-model="openApiForm.projectId" filterable placeholder="请选择项目" style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源类型">
          <el-radio-group v-model="openApiForm.sourceType">
            <el-radio label="url">URL</el-radio>
            <el-radio label="json">JSON/YAML</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="openApiForm.sourceType === 'url'" label="文档URL">
          <el-input v-model="openApiForm.url" placeholder="https://example.com/openapi.json" />
        </el-form-item>
        <el-form-item v-else label="JSON内容">
          <el-input v-model="openApiForm.rawContent" type="textarea" :rows="6" placeholder="粘贴 OpenAPI JSON 或 YAML" />
        </el-form-item>
        <el-form-item label="默认模块名">
          <el-input v-model="openApiForm.moduleName" placeholder="可选，默认取 tags[0]" />
        </el-form-item>
        <el-form-item label="任务名前缀">
          <el-input v-model="openApiForm.taskPrefix" placeholder="可选，默认 OpenAPI导入" />
        </el-form-item>
        <el-form-item label="任务优先级">
          <el-select v-model="openApiForm.taskPriority" style="width: 220px">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行环境">
          <el-select v-model="openApiForm.taskExecuteEnvironments" multiple style="width: 320px">
            <el-option label="测试" value="test" />
            <el-option label="预发" value="pre_production" />
            <el-option label="生产" value="production" />
          </el-select>
        </el-form-item>
        <el-form-item label="回调类型">
          <el-select v-model="openApiForm.taskTriggerType" clearable style="width: 220px">
            <el-option label="Webhook" value="webhook" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="openApiForm.taskTriggerType === 'webhook'" label="回调地址">
          <el-input v-model="openApiForm.taskTriggerUrl" placeholder="如 https://example.com/webhook" />
        </el-form-item>
        <el-form-item label="默认网关地址">
          <el-input v-model="openApiForm.baseUrl" placeholder="可选，如 https://ananx-qa.juhux.com" />
        </el-form-item>
        <el-form-item label="默认请求头JSON">
          <el-input
            v-model="openApiForm.defaultHeadersText"
            type="textarea"
            :rows="4"
            placeholder='可选，如 {"Authorization":"Bearer xxx"}'
          />
        </el-form-item>
        <el-form-item label="关键接口(每行一个)">
          <el-input
            v-model="openApiForm.criticalOperationsText"
            type="textarea"
            :rows="4"
            placeholder="可选，如\nPOST /api/v1/massage-service/xxx\nGET /api/v1/massage-service/yyy"
          />
        </el-form-item>
        <el-form-item label="预览上限">
          <el-input-number v-model="openApiForm.maxOperations" :min="1" :max="500" />
          <el-checkbox v-model="openApiForm.createScripts" style="margin-left: 16px">同时创建脚本</el-checkbox>
          <el-radio-group v-model="openApiForm.importMode" style="margin-left: 16px">
            <el-radio-button label="skip">跳过已存在</el-radio-button>
            <el-radio-button label="upsert">覆盖更新已存在</el-radio-button>
          </el-radio-group>
          <el-checkbox v-model="openApiForm.autoCreateTasks" style="margin-left: 16px">导入后自动建任务</el-checkbox>
          <el-checkbox v-model="openApiForm.autoExecuteTasks" style="margin-left: 16px">建任务后自动执行</el-checkbox>
          <el-checkbox v-model="openApiForm.autoExportReportCsv" style="margin-left: 16px">执行后自动导出报告CSV</el-checkbox>
          <el-checkbox v-model="openApiForm.enableBaselineCheck" style="margin-left: 16px">执行基线校验</el-checkbox>
          <el-input-number
            v-if="openApiForm.enableBaselineCheck"
            v-model="openApiForm.minPassRate"
            :min="1"
            :max="100"
            style="margin-left: 8px; width: 130px"
          />
          <span v-if="openApiForm.enableBaselineCheck" style="margin-left: 4px; color: #909399">最低通过率(%)</span>
          <el-select v-if="openApiForm.autoExecuteTasks" v-model="openApiForm.taskBatchConcurrency" style="width: 130px; margin-left: 8px">
            <el-option :value="1" label="并发 1" />
            <el-option :value="2" label="并发 2" />
            <el-option :value="3" label="并发 3" />
            <el-option :value="5" label="并发 5" />
            <el-option :value="10" label="并发 10" />
          </el-select>
          <el-button style="margin-left: 16px" @click="applyAnnTemplate">应用按按模板</el-button>
          <el-button type="primary" :loading="openApiPreviewLoading" style="margin-left: 16px" @click="handleOpenApiPreview">预览接口</el-button>
        </el-form-item>
      </el-form>

      <div style="margin-bottom: 10px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
        <el-select v-model="openApiTagFilters" multiple clearable collapse-tags placeholder="按Tag筛选勾选" style="width: 320px">
          <el-option v-for="tag in openApiTagOptions" :key="tag" :label="tag" :value="tag" />
        </el-select>
        <el-button size="small" @click="handleSelectByTags">按Tag勾选</el-button>
        <el-button size="small" @click="handleSelectAllPreview">全选预览项</el-button>
        <el-button size="small" @click="handleClearOpenApiSelection">清空勾选</el-button>
      </div>

      <el-table ref="openApiTableRef" :data="openApiDisplayList" border stripe @selection-change="handleOpenApiSelectionChange" max-height="280">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="method" label="方法" width="90" />
        <el-table-column prop="path" label="路径" min-width="220" show-overflow-tooltip />
        <el-table-column prop="summary" label="摘要" min-width="220" show-overflow-tooltip />
        <el-table-column label="是否已存在" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.existsInProject" type="warning">已存在</el-tag>
            <el-tag v-else type="success">新接口</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用例名称" min-width="220">
          <template #default="{ row }">
            <el-input v-model="openApiOverrides[row.key].caseName" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="模块" width="160">
          <template #default="{ row }">
            <el-input v-model="openApiOverrides[row.key].moduleName" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="120">
          <template #default="{ row }">
            <el-select v-model="openApiOverrides[row.key].priority" size="small" style="width: 100%">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="openApiDialogVisible = false">取消</el-button>
        <el-button @click="handleCreateTasksByModule">按模块创建任务</el-button>
        <el-button type="primary" :loading="openApiImportLoading" @click="handleOpenApiImportSubmit">导入所选（{{ openApiSelectedKeys.length }}）</el-button>
        <el-button type="success" :loading="openApiImportLoading" @click="handleImportCreateAndExecute">一键导入并执行</el-button>
        <el-button @click="handleExportPipelineLogs">导出执行日志</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '../store/project'

const tableData = ref([])
const modules = ref([])
const projects = ref([])
const dialogVisible = ref(false)
const aiDialogVisible = ref(false)
const aiLoading = ref(false)
const aiPrompt = ref('')
const aiProjectId = ref('')
const openApiDialogVisible = ref(false)
const openApiPreviewLoading = ref(false)
const openApiImportLoading = ref(false)
const openApiPreviewList = ref([])
const openApiSelectedKeys = ref([])
const openApiTagFilters = ref([])
const openApiOverrides = reactive({})
const openApiTableRef = ref()
const OPENAPI_PIPELINE_RUN_LOG_KEY = 'ai-test-platform-openapi-pipeline-runs'
const openApiForm = reactive({
  projectId: '',
  sourceType: 'url',
  url: '',
  rawContent: '',
  moduleName: '',
  taskPrefix: '',
  taskPriority: 'medium',
  taskExecuteEnvironments: ['test'],
  taskTriggerType: '',
  taskTriggerUrl: '',
  baseUrl: '',
  defaultHeadersText: '',
  criticalOperationsText: '',
  maxOperations: 100,
  createScripts: true,
  importMode: 'skip',
  skipExisting: true,
  autoCreateTasks: true,
  autoExecuteTasks: false,
  autoExportReportCsv: false,
  enableBaselineCheck: true,
  minPassRate: 95,
  taskBatchConcurrency: 3,
})
const dialogTitle = ref('')
const projectStore = useProjectStore()
const router = useRouter()
const formRef = ref()
const saveLoading = ref(false)

const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const queryForm = reactive({
  projectId: '',
  module: '',
  priority: '',
  status: ''
})

const form = reactive({
  id: '',
  projectId: '',
  name: '',
  module: '',
  priority: 'medium',
  preconditions: '',
  testSteps: '',
  expectedResult: ''
})

const rules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入用例名称', trigger: 'blur' }],
  module: [{ required: true, message: '请输入模块', trigger: 'blur' }]
}

const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))

const openApiTagOptions = computed(() => {
  const set = new Set()
  for (const item of openApiPreviewList.value) {
    const tags = Array.isArray(item?.tags) ? item.tags : []
    for (const tag of tags) {
      if (tag) set.add(tag)
    }
  }
  return Array.from(set)
})

const openApiDisplayList = computed(() => {
  if (openApiForm.importMode !== 'skip') {
    return openApiPreviewList.value
  }
  return openApiPreviewList.value.filter((item) => !item.existsInProject)
})

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadData = async () => {
  const params = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(queryForm.projectId && { projectId: queryForm.projectId }),
    ...(queryForm.module && { module: queryForm.module }),
    ...(queryForm.priority && { priority: queryForm.priority }),
    ...(queryForm.status && { status: queryForm.status })
  }
  const res = await api.get('/test-cases', { params })
  tableData.value = res.data.list || []
  pagination.total = res.data.total || 0
}

const loadModules = async () => {
  const res = await api.get('/test-cases/modules')
  modules.value = res.data || []
}

const resetQuery = () => {
  Object.assign(queryForm, { projectId: '', module: '', priority: '', status: '' })
  loadData()
}

const handleAdd = () => {
  Object.assign(form, { id: '', projectId: '', name: '', module: '', priority: 'medium', preconditions: '', testSteps: '', expectedResult: '' })
  dialogTitle.value = '新建用例'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, row)
  dialogTitle.value = '编辑用例'
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saveLoading.value = true
  try {
    const payload = {
      projectId: form.projectId,
      name: form.name,
      module: form.module,
      priority: form.priority,
      preconditions: form.preconditions,
      testSteps: form.testSteps,
      expectedResult: form.expectedResult
    }
    if (form.id) {
      await api.put(`/test-cases/${form.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      await api.post('/test-cases', payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '用例保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.prompt(
      `为避免误删，请输入用例名称进行确认：${row.name}`,
      '二次确认删除',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入用例名称',
        inputValidator: (value) => (String(value || '').trim() === String(row.name || '').trim() ? true : '输入的用例名称不一致')
      }
    )
  } catch {
    return
  }
  await api.delete(`/test-cases/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

const handleGenerateByAI = () => {
  aiPrompt.value = ''
  aiProjectId.value = ''
  aiDialogVisible.value = true
}

const handleOpenApiImport = () => {
  Object.assign(openApiForm, {
    projectId: projectStore.selectedProjectId || '',
    sourceType: 'url',
    url: '',
    rawContent: '',
    moduleName: '',
    taskPrefix: '',
    taskPriority: 'medium',
    taskExecuteEnvironments: ['test'],
    taskTriggerType: '',
    taskTriggerUrl: '',
    baseUrl: '',
    defaultHeadersText: '',
    criticalOperationsText: '',
    maxOperations: 100,
    createScripts: true,
    importMode: 'skip',
    skipExisting: true,
    autoCreateTasks: true,
    autoExecuteTasks: false,
    autoExportReportCsv: false,
    enableBaselineCheck: true,
    minPassRate: 95,
    taskBatchConcurrency: 3,
  })
  openApiPreviewList.value = []
  openApiSelectedKeys.value = []
  openApiTagFilters.value = []
  Object.keys(openApiOverrides).forEach((key) => delete openApiOverrides[key])
  openApiDialogVisible.value = true
}

const applyAnnTemplate = () => {
  openApiForm.sourceType = 'url'
  openApiForm.url = 'https://api-doc-dev.haoduo.vip/api/v1/massage-service/v2/api-docs'
  openApiForm.rawContent = ''
  openApiForm.baseUrl = 'https://ananx-qa.juhux.com'
  openApiForm.defaultHeadersText = JSON.stringify({
    Authorization: 'Bearer <YOUR_TOKEN>',
  }, null, 2)
  openApiForm.criticalOperationsText = ''
  openApiForm.taskPrefix = '按按回归'
  openApiForm.taskPriority = 'medium'
  openApiForm.taskExecuteEnvironments = ['test']
  openApiForm.taskTriggerType = ''
  openApiForm.taskTriggerUrl = ''
  openApiForm.createScripts = true
  openApiForm.importMode = 'skip'
  openApiForm.skipExisting = true
  openApiForm.autoCreateTasks = true
  openApiForm.autoExecuteTasks = false
  openApiForm.autoExportReportCsv = true
  openApiForm.enableBaselineCheck = true
  openApiForm.minPassRate = 95
  openApiForm.taskBatchConcurrency = 3
  ElMessage.success('已应用按按回归模板，请替换请求头中的 token')
}

const handleOpenApiSelectionChange = (rows) => {
  openApiSelectedKeys.value = Array.isArray(rows) ? rows.map((row) => row.key) : []
}

const applyOpenApiSelection = async (keys) => {
  const keySet = new Set(Array.isArray(keys) ? keys : [])
  openApiSelectedKeys.value = Array.from(keySet)
  await nextTick()
  openApiTableRef.value?.clearSelection?.()
  for (const row of openApiDisplayList.value) {
    if (keySet.has(row.key)) {
      openApiTableRef.value?.toggleRowSelection?.(row, true)
    }
  }
}

const handleSelectByTags = async () => {
  if (!openApiTagFilters.value.length) {
    ElMessage.warning('请先选择至少一个 Tag')
    return
  }

  const selected = openApiDisplayList.value
    .filter((item) => {
      const tags = Array.isArray(item?.tags) ? item.tags : []
      return tags.some((tag) => openApiTagFilters.value.includes(tag))
    })
    .map((item) => item.key)

  await applyOpenApiSelection(selected)
  ElMessage.success(`已按 Tag 勾选 ${selected.length} 个接口`)
}

const handleSelectAllPreview = async () => {
  await applyOpenApiSelection(openApiDisplayList.value.map((item) => item.key))
}

const handleClearOpenApiSelection = async () => {
  await applyOpenApiSelection([])
}

const handleOpenApiPreview = async () => {
  if (openApiForm.sourceType === 'url' && !openApiForm.url.trim()) {
    ElMessage.warning('请输入 OpenAPI 文档 URL')
    return
  }
  if (openApiForm.sourceType === 'json' && !openApiForm.rawContent.trim()) {
    ElMessage.warning('请粘贴 OpenAPI JSON 或 YAML 内容')
    return
  }

  const defaultHeaders = parseDefaultHeadersInput(openApiForm.defaultHeadersText)
  if (defaultHeaders === null) {
    return
  }

  openApiPreviewLoading.value = true
  try {
    const res = await api.post('/test-cases/openapi/preview', {
      projectId: openApiForm.projectId || undefined,
      sourceType: openApiForm.sourceType,
      url: openApiForm.sourceType === 'url' ? openApiForm.url : undefined,
      rawContent: openApiForm.sourceType === 'json' ? openApiForm.rawContent : undefined,
      moduleName: openApiForm.moduleName || undefined,
      baseUrl: openApiForm.baseUrl || undefined,
      defaultHeaders,
      maxOperations: openApiForm.maxOperations
    })
    openApiPreviewList.value = Array.isArray(res.data?.operations) ? res.data.operations : []
    Object.keys(openApiOverrides).forEach((key) => delete openApiOverrides[key])
    for (const item of openApiPreviewList.value) {
      openApiOverrides[item.key] = {
        caseName: `${item.method} ${item.path}`,
        moduleName: openApiForm.moduleName || (Array.isArray(item.tags) ? item.tags[0] : '') || 'OpenAPI导入',
        priority: 'medium'
      }
    }
    openApiTagFilters.value = []
    await applyOpenApiSelection(openApiDisplayList.value.map((item) => item.key))
    const existingCount = openApiPreviewList.value.filter((item) => item.existsInProject).length
    ElMessage.success(`预览完成，共 ${openApiPreviewList.value.length} 个接口（已存在 ${existingCount}，当前展示 ${openApiDisplayList.value.length}）`)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || 'OpenAPI 预览失败')
  } finally {
    openApiPreviewLoading.value = false
  }
}

const handleOpenApiImportSubmit = async () => {
  const defaultHeaders = validateOpenApiImportForm()
  if (defaultHeaders === null) {
    return
  }

  openApiImportLoading.value = true
  try {
    const res = await api.post('/test-cases/openapi/import', buildOpenApiImportPayload(defaultHeaders, openApiForm.createScripts))

    let createdTasks = 0
    let skippedModules = 0
    if (openApiForm.autoCreateTasks) {
      const taskRes = await createTasksBySelection()
      createdTasks = taskRes?.createdTasks || 0
      skippedModules = taskRes?.skippedModules?.length || 0
    }

    ElMessage.success(
      `导入完成：新建 ${res.data?.createdCount || 0}，更新 ${res.data?.updatedCount || 0}，跳过 ${res.data?.skippedCount || 0}` +
      `；用例 ${res.data?.importedCases || 0}，脚本 ${res.data?.importedScripts || 0}` +
      (openApiForm.autoCreateTasks ? `；任务新增 ${createdTasks}，跳过模块 ${skippedModules}` : ''),
    )
    openApiDialogVisible.value = false
    queryForm.projectId = openApiForm.projectId
    await loadData()
    await loadModules()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || 'OpenAPI 导入失败')
  } finally {
    openApiImportLoading.value = false
  }
}

const handleImportCreateAndExecute = async () => {
  const defaultHeaders = validateOpenApiImportForm()
  if (defaultHeaders === null) {
    return
  }

  openApiImportLoading.value = true
  try {
    if (!openApiForm.createScripts) {
      ElMessage.warning('一键导入并执行已自动开启“同时创建脚本”')
    }

    const importRes = await api.post('/test-cases/openapi/import', buildOpenApiImportPayload(defaultHeaders, true))

    const taskRes = await createTasksBySelection()
    const createdTasks = Number(taskRes?.createdTasks || 0)
    const skippedModules = Number(taskRes?.skippedModules?.length || 0)

    const createdTaskIds = Array.isArray(taskRes?.tasks)
      ? taskRes.tasks.map((item) => item.id).filter(Boolean)
      : []
    const existingTaskIds = Array.isArray(taskRes?.existingTasks)
      ? taskRes.existingTasks.map((item) => item.id).filter(Boolean)
      : []
    const taskIds = Array.from(new Set([...createdTaskIds, ...existingTaskIds]))

    let executedSuccess = 0
    let executedFailed = 0
    let batchId = ''
    let executionQueued = 0
    const runStartedAt = Date.now()
    if (taskIds.length) {
      const execRes = await api.post('/test-tasks/batch-execute', {
        taskIds,
        concurrency: Number(openApiForm.taskBatchConcurrency || 3),
      })
      executedSuccess = Number(execRes.data?.success || 0)
      executedFailed = Number(execRes.data?.failed || 0)
      executionQueued = Number(execRes.data?.queued || 0)
      batchId = String(execRes.data?.batchId || '')
    }

    if (openApiForm.enableBaselineCheck && executionQueued > 0) {
      const passRate = (executedSuccess / executionQueued) * 100
      const minRate = Number(openApiForm.minPassRate || 95)
      if (passRate < minRate) {
        await ElMessageBox.alert(
          `执行基线未达标：通过率 ${passRate.toFixed(2)}% < 设定阈值 ${minRate}%\n成功 ${executedSuccess} / 总执行 ${executionQueued}，失败 ${executedFailed}`,
          '基线校验未通过',
          { type: 'error' },
        )
      }

      const criticalOperations = parseCriticalOperationsInput(openApiForm.criticalOperationsText)
      if (criticalOperations.length) {
        const criticalScriptNames = new Set(criticalOperations.map((item) => `${item} - 导入脚本`))
        const executionMap = new Map()

        for (const taskId of taskIds) {
          const res = await api.get(`/test-tasks/${taskId}/executions`, {
            params: { _t: Date.now() },
          })
          const list = Array.isArray(res.data) ? res.data : []
          for (const item of list) {
            const scriptName = String(item?.scriptName || '').trim()
            if (!scriptName || !criticalScriptNames.has(scriptName)) continue

            const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0
            if (createdAt && createdAt + 5000 < runStartedAt) continue

            const existed = executionMap.get(scriptName)
            if (!existed || new Date(item.createdAt || 0).getTime() > new Date(existed.createdAt || 0).getTime()) {
              executionMap.set(scriptName, item)
            }
          }
        }

        const failedCritical = []
        for (const scriptName of criticalScriptNames) {
          const item = executionMap.get(scriptName)
          if (!item) {
            failedCritical.push({ scriptName, reason: '未找到本次执行记录' })
            continue
          }
          if (String(item.status || '').toLowerCase() !== 'passed') {
            failedCritical.push({
              scriptName,
              reason: item.errorMessage || item.errorType || `状态=${item.status}`,
            })
          }
        }

        if (failedCritical.length) {
          const details = failedCritical
            .slice(0, 10)
            .map((item) => `${item.scriptName}: ${item.reason}`)
            .join('\n')
          await ElMessageBox.alert(
            `关键接口校验未通过，共 ${failedCritical.length} 项异常。\n${details}`,
            '关键接口未通过',
            { type: 'error' },
          )
        }
      }
    }

    let exportedReportCount = 0
    if (openApiForm.autoExportReportCsv && taskIds.length) {
      for (const taskId of taskIds) {
        try {
          await api.post('/test-reports/generate-by-ai', { taskId })
          exportedReportCount += 1
        } catch {
          // ignore single task report generation error
        }
      }
      await downloadReportsCsvByTaskIds(taskIds)
    }

    ElMessage.success(
      `一键完成：新建 ${importRes.data?.createdCount || 0}，更新 ${importRes.data?.updatedCount || 0}，跳过 ${importRes.data?.skippedCount || 0}` +
      `；导入用例 ${importRes.data?.importedCases || 0}，导入脚本 ${importRes.data?.importedScripts || 0}` +
      `；任务新增 ${createdTasks}，跳过模块 ${skippedModules}` +
      `；执行成功 ${executedSuccess}，执行失败 ${executedFailed}` +
      (openApiForm.autoExportReportCsv ? `；报告生成 ${exportedReportCount} 并导出CSV` : ''),
    )

    appendOpenApiPipelineRunLog({
      createdAt: new Date().toISOString(),
      projectId: openApiForm.projectId,
      sourceType: openApiForm.sourceType,
      sourceUrl: openApiForm.sourceType === 'url' ? openApiForm.url : '',
      selectedCount: openApiSelectedKeys.value.length,
      importedCases: Number(importRes.data?.importedCases || 0),
    importedScripts: Number(importRes.data?.importedScripts || 0),
    skippedExistingCount: Number(importRes.data?.skippedCount || 0),
      createdTasks,
      skippedModules,
      executedSuccess,
      executedFailed,
      executionQueued,
      batchId,
      autoExportReportCsv: Boolean(openApiForm.autoExportReportCsv),
      baselineEnabled: Boolean(openApiForm.enableBaselineCheck),
      baselineMinPassRate: Number(openApiForm.minPassRate || 95),
    })

    openApiDialogVisible.value = false
    queryForm.projectId = openApiForm.projectId
    await loadData()
    await loadModules()

    if (batchId) {
      await router.push({
        path: '/test-tasks',
        query: {
          projectId: openApiForm.projectId,
          openBatchHistory: '1',
          batchId,
        },
      })
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '一键导入执行失败')
  } finally {
    openApiImportLoading.value = false
  }
}

const handleCreateTasksByModule = async () => {
  if (!openApiForm.projectId) {
    ElMessage.warning('请选择所属项目')
    return
  }

  if (!openApiSelectedKeys.value.length) {
    ElMessage.warning('请先预览并选择至少一个接口')
    return
  }

  if (openApiForm.baseUrl && !/^https?:\/\//i.test(openApiForm.baseUrl.trim())) {
    ElMessage.warning('默认网关地址需以 http:// 或 https:// 开头')
    return
  }

  const defaultHeaders = parseDefaultHeadersInput(openApiForm.defaultHeadersText)
  if (defaultHeaders === null) {
    return
  }

  try {
    let importedScripts = 0
    if (openApiForm.createScripts) {
      const importRes = await api.post(
        '/test-cases/openapi/import',
        buildOpenApiImportPayload(defaultHeaders, true),
      )
      importedScripts = importRes.data?.importedScripts || 0
    }

    const res = await createTasksBySelection()

    ElMessage.success(
      `建任务完成：导入脚本 ${importedScripts}，新增任务 ${res.data?.createdTasks || 0}，跳过模块 ${res.data?.skippedModules?.length || 0}`,
    )
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '按模块创建任务失败')
  }
}

const createTasksBySelection = async () => {
  const selectedModules = Array.from(new Set(
    openApiSelectedKeys.value
      .map((key) => openApiOverrides[key]?.moduleName)
      .map((item) => String(item || '').trim())
      .filter(Boolean),
  ))

  const res = await api.post('/test-cases/openapi/create-tasks', {
    projectId: openApiForm.projectId,
    modules: selectedModules.length ? selectedModules : undefined,
    taskPrefix: openApiForm.taskPrefix || undefined,
    priority: openApiForm.taskPriority,
    executeEnvironments: openApiForm.taskExecuteEnvironments,
    triggerType: openApiForm.taskTriggerType || undefined,
    triggerUrl: openApiForm.taskTriggerUrl || undefined,
    skipExistingTasks: true,
  })
  return res.data || {}
}

const buildOpenApiImportPayload = (defaultHeaders, createScripts) => ({
  projectId: openApiForm.projectId,
  sourceType: openApiForm.sourceType,
  url: openApiForm.sourceType === 'url' ? openApiForm.url : undefined,
  rawContent: openApiForm.sourceType === 'json' ? openApiForm.rawContent : undefined,
  moduleName: openApiForm.moduleName || undefined,
  baseUrl: openApiForm.baseUrl || undefined,
  defaultHeaders,
  maxOperations: openApiForm.maxOperations,
  selectedOperations: openApiSelectedKeys.value,
  operationOverrides: openApiSelectedKeys.value.map((key) => ({ key, ...openApiOverrides[key] })),
  createScripts,
  importMode: openApiForm.importMode,
  skipExisting: openApiForm.importMode === 'skip',
})

const validateOpenApiImportForm = () => {
  if (!openApiForm.projectId) {
    ElMessage.warning('请选择所属项目')
    return null
  }
  if (!openApiSelectedKeys.value.length) {
    ElMessage.warning('请先预览并选择至少一个接口')
    return null
  }
  if (openApiForm.baseUrl && !/^https?:\/\//i.test(openApiForm.baseUrl.trim())) {
    ElMessage.warning('默认网关地址需以 http:// 或 https:// 开头')
    return null
  }
  if (openApiForm.taskTriggerType === 'webhook' && !openApiForm.taskTriggerUrl.trim()) {
    ElMessage.warning('选择 Webhook 回调时请填写回调地址')
    return null
  }
  if (openApiForm.taskTriggerUrl && !/^https?:\/\//i.test(openApiForm.taskTriggerUrl.trim())) {
    ElMessage.warning('回调地址需以 http:// 或 https:// 开头')
    return null
  }
  if (!openApiForm.taskExecuteEnvironments.length) {
    ElMessage.warning('请至少选择一个执行环境')
    return null
  }
  const defaultHeaders = parseDefaultHeadersInput(openApiForm.defaultHeadersText)
  if (defaultHeaders === null) {
    return null
  }
  return defaultHeaders
}

const parseDefaultHeadersInput = (text) => {
  const raw = String(text || '').trim()
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.warning('默认请求头必须是 JSON 对象')
      return null
    }
    return parsed
  } catch (error) {
    ElMessage.warning('默认请求头 JSON 格式不正确')
    return null
  }
}

const parseCriticalOperationsInput = (text) => {
  const lines = String(text || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)

  const result = []
  for (const line of lines) {
    const matched = line.match(/^([A-Za-z]+)\s+(.+)$/)
    if (!matched) continue
    result.push(`${matched[1].toUpperCase()} ${matched[2].trim()}`)
  }
  return Array.from(new Set(result))
}

const handleExportPipelineLogs = () => {
  const logs = readOpenApiPipelineRunLogs()
  if (!logs.length) {
    ElMessage.warning('暂无可导出的执行日志')
    return
  }

  const headers = [
    'createdAt',
    'projectId',
    'sourceType',
    'sourceUrl',
    'selectedCount',
    'importedCases',
    'importedScripts',
    'skippedExistingCount',
    'createdTasks',
    'skippedModules',
    'executionQueued',
    'executedSuccess',
    'executedFailed',
    'batchId',
    'autoExportReportCsv',
    'baselineEnabled',
    'baselineMinPassRate',
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
  link.download = `openapi_pipeline_runs_${Date.now()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('执行日志CSV已导出')
}

const readOpenApiPipelineRunLogs = () => {
  try {
    const raw = localStorage.getItem(OPENAPI_PIPELINE_RUN_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const appendOpenApiPipelineRunLog = (entry) => {
  const current = readOpenApiPipelineRunLogs()
  current.unshift(entry)
  localStorage.setItem(
    OPENAPI_PIPELINE_RUN_LOG_KEY,
    JSON.stringify(current.slice(0, 100)),
  )
}

const downloadReportsCsvByTaskIds = async (taskIds) => {
  const ids = Array.from(new Set((taskIds || []).filter(Boolean)))
  if (!ids.length) return

  const res = await api.get('/test-reports/export-by-task-ids', {
    params: { taskIds: ids.join(',') },
    responseType: 'blob',
  })

  const disposition = res.headers['content-disposition'] || ''
  const matched = disposition.match(/filename="?([^";]+)"?/) 
  const filename = matched?.[1] ? decodeURIComponent(matched[1]) : `reports_export_${Date.now()}.csv`

  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

watch(() => openApiForm.importMode, async (mode) => {
  openApiForm.skipExisting = mode === 'skip'
  if (!openApiPreviewList.value.length) return

  if (mode === 'skip') {
    const visibleSet = new Set(openApiDisplayList.value.map((item) => item.key))
    const nextKeys = openApiSelectedKeys.value.filter((key) => visibleSet.has(key))
    await applyOpenApiSelection(nextKeys)
  } else {
    await applyOpenApiSelection(openApiSelectedKeys.value)
  }
})

const handleAIGenerate = async () => {
  if (!aiProjectId.value || !aiPrompt.value.trim()) {
    ElMessage.warning('请选择项目并输入需求描述')
    return
  }
  aiLoading.value = true
  try {
    const res = await api.post('/test-cases/generate-by-ai', { projectId: aiProjectId.value, prompt: aiPrompt.value })
    if (res.data?.length) {
      ElMessage.success(`成功生成${res.data.length}个测试用例`)
      aiDialogVisible.value = false
      queryForm.projectId = aiProjectId.value
      loadData()
    } else {
      ElMessage.warning('未生成测试用例，请重试')
    }
  } finally {
    aiLoading.value = false
  }
}

onMounted(async () => {
  await loadProjects()
  if (projectStore.selectedProjectId) {
    queryForm.projectId = projectStore.selectedProjectId
    form.projectId = projectStore.selectedProjectId
    aiProjectId.value = projectStore.selectedProjectId
  }
  await loadData()
  await loadModules()
})

watch(() => projectStore.selectedProjectId, async (projectId) => {
  queryForm.projectId = projectId || ''
  if (!form.id) form.projectId = projectId || ''
  aiProjectId.value = projectId || ''
  await loadData()
})
</script>
