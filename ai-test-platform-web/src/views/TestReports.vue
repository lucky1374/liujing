<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试报告</h2>
      <el-button type="primary" @click="generateDialogVisible = true">
        <el-icon><Plus /></el-icon>
        生成报告
      </el-button>
    </div>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select v-model="queryForm.projectId" clearable filterable placeholder="全部项目" style="width: 220px">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="报告类型">
          <el-select v-model="queryForm.type" clearable placeholder="全部类型">
            <el-option label="任务报告" value="task_report" />
            <el-option label="模块报告" value="module_report" />
            <el-option label="全量报告" value="full_report" />
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
        <el-table-column prop="title" label="报告标题" min-width="220" />
        <el-table-column label="关联任务" min-width="180">
          <template #default="{ row }">{{ taskNameMap[row.relatedTaskId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ row.type === 'task_report' ? '任务报告' : row.type === 'module_report' ? '模块报告' : '全量报告' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="passRate" label="通过率" width="110">
          <template #default="{ row }">
            <el-tag :type="Number(row.passRate || 0) >= 90 ? 'success' : Number(row.passRate || 0) >= 70 ? 'warning' : 'danger'">
              {{ Number(row.passRate || 0) }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalCases" label="执行数" width="90" />
        <el-table-column prop="passedCases" label="通过" width="90" />
        <el-table-column prop="failedCases" label="失败" width="90" />
        <el-table-column prop="totalDefects" label="缺陷数" width="90" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.relatedTaskId" type="primary" link @click="goToTask(row.relatedTaskId)">查看任务</el-button>
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
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

    <el-dialog v-model="generateDialogVisible" title="生成测试报告" width="520px">
      <el-form ref="generateFormRef" :model="generateForm" :rules="generateRules" label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="generateForm.projectId" filterable placeholder="请选择项目" style="width: 100%" @change="loadTasksByProject">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="测试任务">
          <el-select v-model="generateForm.taskId" filterable placeholder="请选择任务" style="width: 100%">
            <el-option v-for="item in tasks" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generateLoading" @click="handleGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" title="报告详情" width="72%">
      <template v-if="currentReport">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报告标题">{{ currentReport.title }}</el-descriptions-item>
          <el-descriptions-item label="关联任务">{{ taskNameMap[currentReport.relatedTaskId] || '-' }}</el-descriptions-item>
          <el-descriptions-item label="通过率">
            <el-tag :type="currentReport.passRate >= 90 ? 'success' : currentReport.passRate >= 70 ? 'warning' : 'danger'">
              {{ currentReport.passRate }}%
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总结">{{ currentReport.summary }}</el-descriptions-item>
          <el-descriptions-item label="总执行项">{{ currentReport.totalCases }}</el-descriptions-item>
          <el-descriptions-item label="通过">{{ currentReport.passedCases }}</el-descriptions-item>
          <el-descriptions-item label="失败">{{ currentReport.failedCases }}</el-descriptions-item>
          <el-descriptions-item label="跳过">{{ currentReport.skippedCases }}</el-descriptions-item>
          <el-descriptions-item label="总缺陷">{{ currentReport.totalDefects }}</el-descriptions-item>
          <el-descriptions-item label="未关闭缺陷">{{ currentReport.openDefects }}</el-descriptions-item>
          <el-descriptions-item label="结论" :span="2">
            <el-tag :type="currentReport.passRate >= 80 ? 'success' : 'danger'">{{ currentReport.conclusion }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>执行分布</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><el-statistic title="通过" :value="currentReport.moduleSummary?.statusDistribution?.passed || 0" /></el-col>
          <el-col :span="8"><el-statistic title="失败" :value="currentReport.moduleSummary?.statusDistribution?.failed || 0" /></el-col>
          <el-col :span="8"><el-statistic title="跳过" :value="currentReport.moduleSummary?.statusDistribution?.skipped || 0" /></el-col>
        </el-row>

        <el-divider>失败明细</el-divider>
        <el-table :data="currentReport.moduleSummary?.failureDetails || []" border stripe>
          <el-table-column prop="scriptName" label="脚本名称" min-width="180" />
          <el-table-column prop="requestUrl" label="请求地址" min-width="220" show-overflow-tooltip />
          <el-table-column prop="responseStatus" label="响应码" width="100" />
          <el-table-column prop="errorType" label="错误类型" width="120" />
          <el-table-column prop="errorMessage" label="错误信息" min-width="220" show-overflow-tooltip />
        </el-table>

        <el-divider>缺陷分布</el-divider>
        <el-row :gutter="16">
          <el-col :span="8"><el-statistic title="严重缺陷" :value="currentReport.defectDistribution?.bySeverity?.critical || 0" /></el-col>
          <el-col :span="8"><el-statistic title="一般缺陷" :value="currentReport.defectDistribution?.bySeverity?.major || 0" /></el-col>
          <el-col :span="8"><el-statistic title="轻微缺陷" :value="currentReport.defectDistribution?.bySeverity?.minor || 0" /></el-col>
        </el-row>

        <el-divider>AI分析</el-divider>
        <div v-if="currentReport.aiAnalysis" class="ai-content">{{ currentReport.aiAnalysis }}</div>
        <el-empty v-else description="暂无AI分析" />

        <el-divider>AI建议</el-divider>
        <div v-if="currentReport.aiSuggestions" class="ai-content">{{ currentReport.aiSuggestions }}</div>
        <el-empty v-else description="暂无AI建议" />
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '../store/project'

const tableData = ref([])
const projects = ref([])
const tasks = ref([])
const dialogVisible = ref(false)
const generateDialogVisible = ref(false)
const generateLoading = ref(false)
const currentReport = ref(null)
const projectStore = useProjectStore()
const route = useRoute()
const router = useRouter()
const generateFormRef = ref()

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const queryForm = reactive({
  projectId: '',
  relatedTaskId: '',
  type: ''
})

const generateForm = reactive({
  projectId: '',
  taskId: ''
})

const generateRules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  taskId: [{ required: true, message: '请选择测试任务', trigger: 'change' }]
}

const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))
const taskNameMap = computed(() => Object.fromEntries(tasks.value.map((item) => [item.id, item.name])))

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadAllTasks = async () => {
  const res = await api.get('/test-tasks', { params: { page: 1, pageSize: 100 } })
  tasks.value = res.data.list || []
}

const loadTasksByProject = async (projectId) => {
  generateForm.taskId = ''
  if (!projectId) {
    tasks.value = []
    return
  }
  const res = await api.get('/test-tasks', { params: { page: 1, pageSize: 100, projectId } })
  tasks.value = res.data.list || []
}

const loadData = async () => {
  const res = await api.get('/test-reports', {
    params: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(queryForm.projectId && { projectId: queryForm.projectId }),
      ...(queryForm.relatedTaskId && { relatedTaskId: queryForm.relatedTaskId }),
      ...(queryForm.type && { type: queryForm.type })
    }
  })
  tableData.value = res.data.list || []
  pagination.total = res.data.total || 0
}

const handleGenerate = async () => {
  const valid = await generateFormRef.value?.validate().catch(() => false)
  if (!valid) return
  generateLoading.value = true
  try {
    await api.post('/test-reports/generate-by-ai', { taskId: generateForm.taskId })
    ElMessage.success('报告生成成功')
    generateDialogVisible.value = false
    queryForm.projectId = generateForm.projectId
    await loadAllTasks()
    await loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '报告生成失败')
  } finally {
    generateLoading.value = false
  }
}

const handleView = async (row) => {
  const res = await api.get(`/test-reports/${row.id}`)
  currentReport.value = res.data
  dialogVisible.value = true
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该报告吗？', '提示', { type: 'warning' })
    await api.delete(`/test-reports/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.message || '删除报告失败')
    }
  }
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
    generateForm.projectId = queryForm.projectId || projectStore.selectedProjectId
    await loadTasksByProject(generateForm.projectId)
  } else {
    await loadAllTasks()
  }
  await loadData()
})

watch(() => projectStore.selectedProjectId, async (projectId) => {
  if (!route.query.projectId) queryForm.projectId = projectId || ''
  generateForm.projectId = queryForm.projectId || projectId || ''
  generateForm.taskId = ''
  if (generateForm.projectId) await loadTasksByProject(generateForm.projectId)
  else await loadAllTasks()
  await loadData()
})

watch(() => route.query, async (query) => {
  queryForm.projectId = query.projectId || projectStore.selectedProjectId || ''
  queryForm.relatedTaskId = query.taskId || ''
  generateForm.projectId = queryForm.projectId
  if (generateForm.projectId) await loadTasksByProject(generateForm.projectId)
  else await loadAllTasks()
  await loadData()
})
</script>

<style scoped>
.ai-content {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
