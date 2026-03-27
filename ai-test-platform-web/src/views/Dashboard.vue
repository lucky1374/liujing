<template>
  <div class="dashboard-page">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">AI自动化测试平台</p>
        <h2>{{ currentProjectName }}</h2>
        <p class="hero-text">聚焦当前项目的测试资产、执行状态、缺陷风险与报告沉淀，帮助你快速定位今天最值得处理的测试工作。</p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" @click="router.push('/test-tasks')">进入任务中心</el-button>
        <el-button @click="router.push('/defects')">查看缺陷</el-button>
      </div>
    </section>

    <section class="metrics-grid">
      <el-card class="metric-card accent-blue">
        <p>用例总数</p>
        <h3>{{ stats.totalCases }}</h3>
        <span>当前项目沉淀的测试用例资产</span>
      </el-card>
      <el-card class="metric-card accent-green">
        <p>脚本总数</p>
        <h3>{{ stats.totalScripts }}</h3>
        <span>可直接参与执行的自动化脚本</span>
      </el-card>
      <el-card class="metric-card accent-amber">
        <p>任务总数</p>
        <h3>{{ taskStats.total }}</h3>
        <span>待执行、执行中和历史任务汇总</span>
      </el-card>
      <el-card class="metric-card accent-red">
        <p>缺陷总数</p>
        <h3>{{ defectStats.total }}</h3>
        <span>当前项目关联的全部缺陷记录</span>
      </el-card>
    </section>

    <section class="content-grid">
      <el-card>
        <template #header>
          <div class="section-head">
            <span>执行概览</span>
            <el-tag type="info">报告数 {{ stats.totalReports }}</el-tag>
          </div>
        </template>
        <div class="overview-grid">
          <div class="overview-item">
            <strong>{{ taskStats.pending }}</strong>
            <span>待执行任务</span>
          </div>
          <div class="overview-item">
            <strong>{{ taskStats.running }}</strong>
            <span>执行中任务</span>
          </div>
          <div class="overview-item">
            <strong>{{ taskStats.completed }}</strong>
            <span>已完成任务</span>
          </div>
          <div class="overview-item danger">
            <strong>{{ taskStats.failed }}</strong>
            <span>失败任务</span>
          </div>
        </div>
      </el-card>

      <el-card>
        <template #header>
          <div class="section-head">
            <span>缺陷概览</span>
            <el-button type="primary" link @click="router.push('/defects')">前往缺陷页</el-button>
          </div>
        </template>
        <div class="overview-grid defect-grid">
          <div class="overview-item danger">
            <strong>{{ defectStats.open }}</strong>
            <span>待处理缺陷</span>
          </div>
          <div class="overview-item success">
            <strong>{{ defectStats.resolved }}</strong>
            <span>已解决缺陷</span>
          </div>
          <div class="overview-item neutral">
            <strong>{{ recentDefects.length }}</strong>
            <span>近期新增缺陷</span>
          </div>
        </div>
      </el-card>
    </section>

    <section class="content-grid lower-grid">
      <el-card>
        <template #header>
          <div class="section-head">
            <span>最近任务</span>
            <el-button type="primary" link @click="router.push('/test-tasks')">查看全部</el-button>
          </div>
        </template>
        <el-table :data="recentTasks" size="small" border>
          <el-table-column prop="name" label="任务名称" min-width="180" />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="taskStatusMap[row.status]?.type || 'info'">{{ taskStatusMap[row.status]?.label || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="passRate" label="通过率" width="100">
            <template #default="{ row }">{{ Number(row.passRate || 0) }}%</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card>
        <template #header>
          <div class="section-head">
            <span>近期缺陷</span>
            <el-button type="primary" link @click="router.push('/defects')">查看全部</el-button>
          </div>
        </template>
        <el-table :data="recentDefects" size="small" border>
          <el-table-column prop="title" label="缺陷标题" min-width="180" />
          <el-table-column prop="severity" label="严重度" width="100">
            <template #default="{ row }">
              <el-tag :type="defectSeverityMap[row.severity]?.type || 'info'">{{ defectSeverityMap[row.severity]?.label || row.severity }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="defectStatusMap[row.status]?.type || 'info'">{{ defectStatusMap[row.status]?.label || row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </section>

    <section class="content-grid lower-grid">
      <el-card>
        <template #header>
          <div class="section-head">
            <span>AI智能助手</span>
          </div>
        </template>
        <div class="ai-chat">
          <div class="chat-messages">
            <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.role === 'user' ? 'user' : 'ai']">
              {{ msg.content }}
            </div>
          </div>
          <div class="chat-input">
            <el-input v-model="chatInput" placeholder="输入问题，AI帮你解答..." @keyup.enter="sendMessage">
              <template #append>
                <el-button :icon="Promotion" @click="sendMessage" />
              </template>
            </el-input>
          </div>
        </div>
      </el-card>

      <el-card>
        <template #header>
          <div class="section-head">
            <span>快速操作</span>
          </div>
        </template>
        <div class="quick-actions">
          <el-button type="primary" @click="router.push('/test-cases')"><el-icon><Plus /></el-icon>新建用例</el-button>
          <el-button type="success" @click="router.push('/test-scripts')"><el-icon><Plus /></el-icon>新建脚本</el-button>
          <el-button type="warning" @click="router.push('/test-tasks')"><el-icon><VideoPlay /></el-icon>执行任务</el-button>
          <el-button type="info" @click="router.push('/test-reports')"><el-icon><Document /></el-icon>查看报告</el-button>
        </div>
      </el-card>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Plus, Promotion, VideoPlay } from '@element-plus/icons-vue'
import api from '../api'
import { useProjectStore } from '../store/project'

const router = useRouter()
const projectStore = useProjectStore()

const stats = reactive({
  totalCases: 0,
  totalScripts: 0,
  totalReports: 0
})

const taskStats = reactive({
  total: 0,
  pending: 0,
  running: 0,
  completed: 0,
  failed: 0
})

const defectStats = reactive({
  total: 0,
  open: 0,
  resolved: 0
})

const recentTasks = ref([])
const recentDefects = ref([])
const chatInput = ref('')
const chatMessages = ref([
  { role: 'ai', content: '你好，我会结合当前项目的任务、缺陷和报告信息，帮助你判断下一步应该优先处理什么。' }
])

const taskStatusMap = {
  pending: { label: '待执行', type: 'info' },
  running: { label: '执行中', type: 'primary' },
  completed: { label: '已完成', type: 'success' },
  failed: { label: '失败', type: 'danger' }
}

const defectStatusMap = {
  open: { label: '待处理', type: 'danger' },
  in_progress: { label: '处理中', type: 'warning' },
  resolved: { label: '已解决', type: 'success' },
  closed: { label: '已关闭', type: 'info' },
  reopened: { label: '重新打开', type: 'warning' }
}

const defectSeverityMap = {
  blocker: { label: '阻断', type: 'danger' },
  critical: { label: '严重', type: 'danger' },
  major: { label: '一般', type: 'warning' },
  minor: { label: '轻微', type: 'info' },
  trivial: { label: '提示', type: 'info' }
}

const currentProjectName = computed(() => projectStore.selectedProject?.name || '全项目视角')

const buildParams = (extra = {}) => ({
  ...(projectStore.selectedProjectId && { projectId: projectStore.selectedProjectId }),
  ...extra
})

const loadStats = async () => {
  try {
    const [casesRes, scriptsRes, tasksRes, defectsRes, reportsRes, recentTasksRes, recentDefectsRes] = await Promise.all([
      api.get('/test-cases', { params: buildParams({ page: 1, pageSize: 10 }) }),
      api.get('/test-scripts', { params: buildParams({ page: 1, pageSize: 10 }) }),
      api.get('/test-tasks/statistics', { params: buildParams() }),
      api.get('/defects/statistics', { params: buildParams() }),
      api.get('/test-reports', { params: buildParams({ page: 1, pageSize: 10 }) }),
      api.get('/test-tasks', { params: buildParams({ page: 1, pageSize: 5 }) }),
      api.get('/defects', { params: buildParams({ page: 1, pageSize: 5 }) })
    ])

    stats.totalCases = casesRes.data.total || 0
    stats.totalScripts = scriptsRes.data.total || 0
    stats.totalReports = reportsRes.data.total || 0

    Object.assign(taskStats, tasksRes.data || {})
    Object.assign(defectStats, defectsRes.data || {})

    recentTasks.value = recentTasksRes.data.list || []
    recentDefects.value = recentDefectsRes.data.list || []
  } catch (error) {
    console.error(error)
  }
}

const sendMessage = async () => {
  if (!chatInput.value.trim()) return

  const userMsg = chatInput.value
  chatMessages.value.push({ role: 'user', content: userMsg })
  chatInput.value = ''

  try {
    const res = await api.post('/ai/chat', { message: userMsg })
    chatMessages.value.push({ role: 'ai', content: res.data })
  } catch {
    ElMessage.error('AI响应失败')
  }
}

onMounted(loadStats)
watch(() => projectStore.selectedProjectId, loadStats)
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 28px;
  border-radius: 18px;
  background: linear-gradient(135deg, #17324d 0%, #245d7a 55%, #d7e7ee 100%);
  color: #fff;
}

.eyebrow {
  margin-bottom: 10px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.8;
}

.hero-panel h2 {
  margin: 0;
  font-size: 30px;
}

.hero-text {
  max-width: 760px;
  margin-top: 10px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.88);
}

.hero-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.metrics-grid,
.content-grid {
  display: grid;
  gap: 16px;
}

.metrics-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.content-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric-card {
  border-radius: 16px;
}

.metric-card p {
  margin: 0;
  color: #6b7280;
}

.metric-card h3 {
  margin: 10px 0 6px;
  font-size: 32px;
  color: #1f2937;
}

.metric-card span {
  color: #9ca3af;
  font-size: 13px;
}

.accent-blue { box-shadow: inset 0 4px 0 #2f6fed; }
.accent-green { box-shadow: inset 0 4px 0 #1f9d68; }
.accent-amber { box-shadow: inset 0 4px 0 #d97706; }
.accent-red { box-shadow: inset 0 4px 0 #dc2626; }

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.defect-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-item {
  padding: 16px;
  border-radius: 14px;
  background: #f6f8fb;
}

.overview-item strong {
  display: block;
  font-size: 28px;
  color: #1f2937;
}

.overview-item span {
  color: #6b7280;
}

.overview-item.danger { background: #fff1f2; }
.overview-item.success { background: #f0fdf4; }
.overview-item.neutral { background: #f5f3ff; }

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick-actions .el-button {
  margin: 0;
}

.ai-chat {
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 10px;
  margin-bottom: 12px;
}

.message {
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  max-width: 82%;
  line-height: 1.6;
}

.message.user {
  background: #245d7a;
  color: white;
  margin-left: auto;
}

.message.ai {
  background: white;
  border: 1px solid #e5e7eb;
}

@media (max-width: 1100px) {
  .metrics-grid,
  .content-grid,
  .overview-grid,
  .defect-grid,
  .quick-actions {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .hero-panel,
  .metrics-grid,
  .content-grid,
  .overview-grid,
  .defect-grid,
  .quick-actions {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    flex-direction: column;
  }

  .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
