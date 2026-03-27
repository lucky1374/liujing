<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试脚本</h2>
      <div>
        <el-button type="warning" @click="aiDialogVisible = true">
          <el-icon><MagicStick /></el-icon>
          AI生成脚本
        </el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新建脚本
        </el-button>
      </div>
    </div>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select v-model="queryForm.projectId" clearable filterable placeholder="全部项目" style="width: 220px" @change="handleQueryProjectChange">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="脚本类型">
          <el-select v-model="queryForm.type" clearable placeholder="请选择">
            <el-option label="接口测试" value="interface" />
            <el-option label="UI测试" value="ui" />
            <el-option label="性能测试" value="performance" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" clearable placeholder="请选择">
            <el-option label="有效" value="valid" />
            <el-option label="无效" value="invalid" />
            <el-option label="待优化" value="need_optimize" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column label="所属项目" min-width="160">
          <template #default="{ row }">{{ projectNameMap[row.projectId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="name" label="脚本名称" min-width="180" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.type === 'interface' ? '接口测试' : row.type === 'ui' ? 'UI测试' : '性能测试' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="language" label="语言" width="110" />
        <el-table-column prop="executionMode" label="执行模式" width="130">
          <template #default="{ row }">
            <el-tag :type="row.executionMode === 'python' ? 'warning' : 'success'">
              {{ row.executionMode === 'python' ? 'Python Runner' : 'Lite' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="140" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="row.status === 'valid' ? 'success' : row.status === 'need_optimize' ? 'warning' : 'danger'">
              {{ row.status === 'valid' ? '有效' : row.status === 'need_optimize' ? '待优化' : '无效' }}
            </el-tag>
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
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @current-change="loadData"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="70%">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" filterable placeholder="请选择项目" style="width: 100%" @change="loadFormCases">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联用例">
          <el-select v-model="form.caseId" clearable filterable placeholder="请选择测试用例" style="width: 100%">
            <el-option v-for="item in projectCases" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="脚本名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="脚本类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="接口测试" value="interface" />
            <el-option label="UI测试" value="ui" />
          </el-select>
        </el-form-item>
        <el-form-item label="编程语言">
          <el-select v-model="form.language" style="width: 100%">
            <el-option label="Python" value="python" />
            <el-option label="Java" value="java" />
            <el-option label="JavaScript" value="javascript" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行模式">
          <el-select v-model="form.executionMode" style="width: 100%">
            <el-option label="Lite解析执行" value="lite" />
            <el-option label="Python Runner" value="python" />
          </el-select>
        </el-form-item>
        <el-form-item label="模块">
          <el-input v-model="form.module" />
        </el-form-item>
        <el-form-item label="脚本内容">
          <el-input v-model="form.scriptContent" type="textarea" :rows="15" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="aiDialogVisible" title="AI生成脚本" width="50%">
      <el-form label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="aiForm.projectId" filterable placeholder="请选择项目" style="width: 100%" @change="loadAiCases">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="选择用例">
          <el-select v-model="aiForm.testCaseId" filterable placeholder="选择测试用例" style="width: 100%">
            <el-option v-for="c in aiCases" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="脚本类型">
          <el-radio-group v-model="aiForm.scriptType">
            <el-radio label="interface">接口测试</el-radio>
            <el-radio label="ui">UI测试</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="aiDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="aiLoading" @click="handleAIGenerate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '../store/project'

const tableData = ref([])
const projects = ref([])
const projectCases = ref([])
const aiCases = ref([])
const dialogVisible = ref(false)
const aiDialogVisible = ref(false)
const aiLoading = ref(false)
const dialogTitle = ref('')
const projectStore = useProjectStore()
const formRef = ref()
const saveLoading = ref(false)

const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

const queryForm = reactive({
  projectId: '',
  type: '',
  status: ''
})

const form = reactive({
  id: '',
  projectId: '',
  caseId: '',
  name: '',
  type: 'interface',
  language: 'python',
  executionMode: 'lite',
  module: '',
  scriptContent: ''
})

const rules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入脚本名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择脚本类型', trigger: 'change' }],
  language: [{ required: true, message: '请选择编程语言', trigger: 'change' }]
}

const aiForm = reactive({
  projectId: '',
  testCaseId: '',
  scriptType: 'interface'
})

const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadProjectCases = async (projectId) => {
  if (!projectId) return []
  const res = await api.get('/test-cases', { params: { page: 1, pageSize: 100, projectId } })
  return res.data.list || []
}

const loadData = async () => {
  const params = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(queryForm.projectId && { projectId: queryForm.projectId }),
    ...(queryForm.type && { type: queryForm.type }),
    ...(queryForm.status && { status: queryForm.status })
  }
  const res = await api.get('/test-scripts', { params })
  tableData.value = res.data.list || []
  pagination.total = res.data.total || 0
}

const handleQueryProjectChange = async () => {
  await loadData()
}

const loadFormCases = async (projectId) => {
  projectCases.value = await loadProjectCases(projectId)
}

const loadAiCases = async (projectId) => {
  aiCases.value = await loadProjectCases(projectId)
  aiForm.testCaseId = ''
}

const handleAIGenerate = async () => {
  if (!aiForm.projectId || !aiForm.testCaseId) {
    ElMessage.warning('请选择项目和测试用例')
    return
  }
  aiLoading.value = true
  try {
    await api.post('/test-scripts/generate-by-ai', {
      testCaseId: aiForm.testCaseId,
      scriptType: aiForm.scriptType
    })
    ElMessage.success('脚本生成成功')
    aiDialogVisible.value = false
    queryForm.projectId = aiForm.projectId
    loadData()
  } finally {
    aiLoading.value = false
  }
}

const handleAdd = () => {
  Object.assign(form, { id: '', projectId: '', caseId: '', name: '', type: 'interface', language: 'python', executionMode: 'lite', module: '', scriptContent: '' })
  projectCases.value = []
  dialogTitle.value = '新建脚本'
  dialogVisible.value = true
}

const handleEdit = async (row) => {
  Object.assign(form, row)
  await loadFormCases(row.projectId)
  dialogTitle.value = '编辑脚本'
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveLoading.value = true
  try {
    const payload = {
      projectId: form.projectId,
      caseId: form.caseId || undefined,
      name: form.name,
      type: form.type,
      language: form.language,
      executionMode: form.executionMode,
      module: form.module,
      scriptContent: form.scriptContent
    }
    if (form.id) {
      await api.put(`/test-scripts/${form.id}`, payload)
      ElMessage.success('更新成功')
    } else {
      await api.post('/test-scripts', payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '脚本保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm('确认删除该脚本?', '提示', { type: 'warning' })
  await api.delete(`/test-scripts/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(async () => {
  await loadProjects()
  if (projectStore.selectedProjectId) {
    queryForm.projectId = projectStore.selectedProjectId
    form.projectId = projectStore.selectedProjectId
    aiForm.projectId = projectStore.selectedProjectId
    aiCases.value = await loadProjectCases(projectStore.selectedProjectId)
  }
  await loadData()
})

watch(() => projectStore.selectedProjectId, async (projectId) => {
  queryForm.projectId = projectId || ''
  if (!form.id) form.projectId = projectId || ''
  aiForm.projectId = projectId || ''
  aiCases.value = projectId ? await loadProjectCases(projectId) : []
  await loadData()
})
</script>
