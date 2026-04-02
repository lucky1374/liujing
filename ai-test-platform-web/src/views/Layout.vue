<template>
  <el-container class="layout-container">
    <el-aside width="220px">
      <div class="logo">
        <h3>AI测试平台</h3>
      </div>
      <el-menu
        :default-active="route.path"
        router
        background-color="#f5f7fa"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>

        <el-sub-menu index="interface-automation">
          <template #title>
            <el-icon><Connection /></el-icon>
            <span>接口自动化</span>
          </template>
          <el-menu-item index="/projects">
            <el-icon><FolderOpened /></el-icon>
            <span>项目管理</span>
          </el-menu-item>
          <el-menu-item index="/test-cases">
            <el-icon><Document /></el-icon>
            <span>测试用例</span>
          </el-menu-item>
          <el-menu-item index="/test-scripts">
            <el-icon><Cpu /></el-icon>
            <span>测试脚本</span>
          </el-menu-item>
          <el-menu-item index="/test-tasks">
            <el-icon><Operation /></el-icon>
            <span>测试任务</span>
          </el-menu-item>
          <el-menu-item index="/test-data">
            <el-icon><Folder /></el-icon>
            <span>测试数据</span>
          </el-menu-item>
          <el-menu-item index="/defects">
            <el-icon><Warning /></el-icon>
            <span>缺陷管理</span>
          </el-menu-item>
          <el-menu-item index="/test-reports">
            <el-icon><DataLine /></el-icon>
            <span>测试报告</span>
          </el-menu-item>
          <el-menu-item index="/environments">
            <el-icon><Setting /></el-icon>
            <span>环境管理</span>
          </el-menu-item>
          <el-menu-item index="/troubleshooting-guide">
            <el-icon><Document /></el-icon>
            <span>联调故障速查</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="ui-automation">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <span>UI 自动化</span>
          </template>
          <el-menu-item index="/ai-agent-lab">
            <el-icon><MagicStick /></el-icon>
            <span>UI 自动化实验室</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-left">
          <span class="project-label">当前项目</span>
          <el-select v-model="projectStore.selectedProjectId" clearable filterable placeholder="全部项目" class="project-switcher" @change="handleProjectChange">
            <el-option v-for="item in projectStore.projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="header-right">
          <el-popover placement="bottom-end" trigger="click" width="420">
            <template #reference>
              <el-badge :value="callbackAlert.totalRisky" :hidden="!callbackAlert.totalRisky" :max="99" class="callback-alert-badge">
                <el-button text>
                  <el-icon><Bell /></el-icon>
                  回调告警
                </el-button>
              </el-badge>
            </template>

            <div class="callback-alert-panel">
              <div class="callback-alert-header">
                <span>连续失败告警（阈值 {{ callbackAlert.threshold }}）</span>
                <el-button size="small" text @click="loadCallbackAlert(false)">刷新</el-button>
              </div>
              <div v-if="!callbackAlert.riskyTasks.length" class="callback-alert-empty">暂无风险任务</div>
              <div v-else class="callback-alert-list">
                <div v-for="item in callbackAlert.riskyTasks" :key="item.taskId" class="callback-alert-item">
                  <div class="callback-alert-title">{{ item.taskName }}</div>
                  <div class="callback-alert-meta">连续失败 {{ item.consecutiveFailed }} 次</div>
                  <el-button size="small" text type="primary" @click="goToTask(item)">查看任务</el-button>
                </div>
              </div>
            </div>
          </el-popover>

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.userInfo.realName || userStore.userInfo.username }}
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { useProjectStore } from '../store/project'
import api from '../api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()
let callbackAlertTimer = null

const callbackAlert = reactive({
  threshold: 3,
  totalRisky: 0,
  riskyTasks: []
})

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projectStore.setProjects(res.data.list || [])
}

const loadCallbackAlert = async (silent = true) => {
  try {
    const res = await api.get('/test-tasks/observability/callback-alerts', {
      params: {
        projectId: projectStore.selectedProjectId || undefined,
        limit: 10,
        _t: Date.now()
      }
    })
    callbackAlert.threshold = Number(res.data?.threshold || 3)
    callbackAlert.totalRisky = Number(res.data?.totalRisky || 0)
    callbackAlert.riskyTasks = Array.isArray(res.data?.riskyTasks) ? res.data.riskyTasks : []
  } catch {
    if (!silent) {
      callbackAlert.threshold = 3
      callbackAlert.totalRisky = 0
      callbackAlert.riskyTasks = []
    }
  }
}

const handleProjectChange = (projectId) => {
  projectStore.setSelectedProjectId(projectId)
  loadCallbackAlert()
}

const goToTask = (item) => {
  router.push({
    path: '/test-tasks',
    query: {
      taskId: item.taskId,
      projectId: item.projectId || '',
      openCallbacks: '1',
      callbackStatus: 'failed'
    }
  })
}

const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}

onMounted(async () => {
  await loadProjects()
  await loadCallbackAlert()
  callbackAlertTimer = window.setInterval(() => {
    loadCallbackAlert(true)
  }, 30000)
})

onBeforeUnmount(() => {
  if (callbackAlertTimer) {
    window.clearInterval(callbackAlertTimer)
    callbackAlertTimer = null
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.el-aside {
  background-color: #f5f7fa;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1e88e5;
}

.logo h3 {
  color: white;
  font-size: 18px;
}

.el-header {
  background-color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-label {
  color: #606266;
  font-size: 14px;
}

.project-switcher {
  width: 240px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.callback-alert-badge {
  margin-right: 4px;
}

.callback-alert-panel {
  max-height: 360px;
  overflow: auto;
}

.callback-alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.callback-alert-empty {
  color: #909399;
  font-size: 13px;
}

.callback-alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.callback-alert-item {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px 10px;
}

.callback-alert-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.callback-alert-meta {
  font-size: 12px;
  color: #f56c6c;
  margin-bottom: 2px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.el-main {
  background-color: #f0f2f5;
}

.el-menu-item {
  height: 50px;
  line-height: 50px;
}

:deep(.el-sub-menu__title) {
  font-weight: 600;
}
</style>
