<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试用例</h2>
      <div>
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
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
const dialogTitle = ref('')
const projectStore = useProjectStore()
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
  await ElMessageBox.confirm('确认删除该用例?', '提示', { type: 'warning' })
  await api.delete(`/test-cases/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

const handleGenerateByAI = () => {
  aiPrompt.value = ''
  aiProjectId.value = ''
  aiDialogVisible.value = true
}

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
