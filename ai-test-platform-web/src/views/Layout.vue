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
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { useProjectStore } from '../store/project'
import api from '../api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const projectStore = useProjectStore()

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projectStore.setProjects(res.data.list || [])
}

const handleProjectChange = (projectId) => {
  projectStore.setSelectedProjectId(projectId)
}

const handleCommand = (command) => {
  if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}

onMounted(loadProjects)
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
</style>
