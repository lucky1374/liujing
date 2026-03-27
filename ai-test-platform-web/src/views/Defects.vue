<template>
  <div class="page-container">
    <div class="card-header">
      <h2>缺陷管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus />新建缺陷</el-icon>
      </el-button>
    </div>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select v-model="queryForm.projectId" clearable filterable placeholder="全部项目" style="width: 220px">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="请选择" clearable>
            <el-option label="待处理" value="open" />
            <el-option label="处理中" value="in_progress" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="queryForm.severity" placeholder="请选择" clearable>
            <el-option label="阻断" value="blocker" />
            <el-option label="严重" value="critical" />
            <el-option label="一般" value="major" />
            <el-option label="轻微" value="minor" />
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
        <el-table-column prop="title" label="缺陷标题" />
        <el-table-column prop="type" label="类型">
          <template #default="{ row }">
            <el-tag>{{ typeMap[row.type] || row.type || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="severity" label="严重程度">
          <template #default="{ row }">
            <el-tag :type="severityMap[row.severity]?.type || 'info'">{{ severityMap[row.severity]?.label || row.severity || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">{{ statusMap[row.status]?.label || row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button v-if="row.relatedTaskId" type="primary" link @click="goToTask(row.relatedTaskId)">查看任务</el-button>
            <el-button type="primary" link @click="handleAIAnalyze(row)">AI分析</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" title="新建缺陷" width="60%">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" filterable placeholder="请选择项目" style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="缺陷标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type">
            <el-option label="功能缺陷" value="functional" />
            <el-option label="UI缺陷" value="ui" />
            <el-option label="性能缺陷" value="performance" />
          </el-select>
        </el-form-item>
        <el-form-item label="严重程度">
          <el-select v-model="form.severity">
            <el-option label="阻断" value="blocker" />
            <el-option label="严重" value="critical" />
            <el-option label="一般" value="major" />
            <el-option label="轻微" value="minor" />
          </el-select>
        </el-form-item>
        <el-form-item label="缺陷描述">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useProjectStore } from '../store/project'

const tableData = ref([])
const projects = ref([])
const dialogVisible = ref(false)
const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()
const formRef = ref()
const saveLoading = ref(false)

const typeMap = { functional: '功能', ui: 'UI', performance: '性能', security: '安全' }
const severityMap = {
  blocker: { label: '阻断', type: 'danger' },
  critical: { label: '严重', type: 'danger' },
  major: { label: '一般', type: 'warning' },
  minor: { label: '轻微', type: 'info' },
  trivial: { label: '提示', type: 'info' }
}
const statusMap = {
  open: { label: '待处理', type: 'danger' },
  in_progress: { label: '处理中', type: 'warning' },
  resolved: { label: '已解决', type: 'success' },
  closed: { label: '已关闭', type: 'info' },
  reopened: { label: '重新打开', type: 'warning' }
}

const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))

const pagination = reactive({ page: 1, total: 0 })
const queryForm = reactive({ projectId: '', relatedTaskId: '', status: '', severity: '' })
const form = reactive({ id: '', projectId: '', title: '', type: 'functional', severity: 'minor', description: '' })

const rules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  title: [{ required: true, message: '请输入缺陷标题', trigger: 'blur' }],
  type: [{ required: true, message: '请选择缺陷类型', trigger: 'change' }],
  severity: [{ required: true, message: '请选择严重程度', trigger: 'change' }]
}

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadData = async () => {
  try {
    const params = {
      page: pagination.page,
      pageSize: 10,
      ...(queryForm.projectId && { projectId: queryForm.projectId }),
      ...(queryForm.relatedTaskId && { relatedTaskId: queryForm.relatedTaskId }),
      ...(queryForm.status && { status: queryForm.status }),
      ...(queryForm.severity && { severity: queryForm.severity })
    }
    const res = await api.get('/defects', { params })
    tableData.value = res.data.list || []
    pagination.total = res.data.total || 0
  } catch (e) { console.error(e) }
}

const handleAdd = () => {
  Object.assign(form, { id: '', projectId: '', title: '', type: 'functional', severity: 'minor', description: '' })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveLoading.value = true
  try {
    if (form.id) {
      await api.put(`/defects/${form.id}`, form)
    } else {
      await api.post('/defects', form)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '缺陷保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm('确认删除?', '提示', { type: 'warning' })
  try {
    await api.delete(`/defects/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) { console.error(e) }
}

const handleAIAnalyze = async (row) => {
  try {
    await api.post(`/defects/${row.id}/analyze`)
    ElMessage.success('AI分析完成')
    loadData()
  } catch (e) { console.error(e) }
}

const goToTask = (taskId) => {
  router.push({ path: '/test-tasks', query: { taskId } })
}

onMounted(async () => {
  await loadProjects()
  if (route.query.projectId) queryForm.projectId = route.query.projectId
  if (route.query.taskId) queryForm.relatedTaskId = route.query.taskId
  if (projectStore.selectedProjectId) {
    queryForm.projectId = queryForm.projectId || projectStore.selectedProjectId
    form.projectId = projectStore.selectedProjectId
  }
  await loadData()
})

watch(() => projectStore.selectedProjectId, async (projectId) => {
  if (!route.query.projectId) queryForm.projectId = projectId || ''
  if (!form.id) form.projectId = projectId || ''
  await loadData()
})

watch(() => route.query, async (query) => {
  queryForm.projectId = query.projectId || projectStore.selectedProjectId || ''
  queryForm.relatedTaskId = query.taskId || ''
  await loadData()
})
</script>
