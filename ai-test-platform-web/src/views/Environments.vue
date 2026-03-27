<template>
  <div class="page-container">
    <div class="card-header">
      <h2>环境管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus />新建环境</el-icon>
      </el-button>
    </div>

    <el-card>
      <el-form :inline="true" style="margin-bottom: 18px">
        <el-form-item label="所属项目">
          <el-select v-model="queryProjectId" clearable filterable placeholder="全部项目" style="width: 220px" @change="loadData">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column label="所属项目" min-width="160">
          <template #default="{ row }">{{ projectNameMap[row.projectId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="name" label="环境名称" />
        <el-table-column prop="type" label="类型">
          <template #default="{ row }">
            <el-tag>{{ typeMap[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="baseUrl" label="基础URL" />
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'available' ? 'success' : row.status === 'maintenance' ? 'warning' : 'danger'">
              {{ statusMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="healthScore" label="健康度" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="50%">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" filterable placeholder="请选择项目" style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="环境名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="环境类型">
          <el-select v-model="form.type">
            <el-option label="开发环境" value="development" />
            <el-option label="测试环境" value="test" />
            <el-option label="预发环境" value="pre_production" />
            <el-option label="生产环境" value="production" />
          </el-select>
        </el-form-item>
        <el-form-item label="基础URL">
          <el-input v-model="form.baseUrl" placeholder="http://localhost:8080" />
        </el-form-item>
        <el-form-item label="认证方式">
          <el-select v-model="form.authType" clearable placeholder="可选，默认无认证" style="width: 100%">
            <el-option label="无" value="" />
            <el-option label="Bearer Token" value="bearer" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.authType === 'bearer'" label="Bearer Token">
          <el-input
            v-model="form.bearerToken"
            type="textarea"
            :rows="3"
            :placeholder="form.id ? '已配置Bearer Token；留空表示不修改，填写新值则覆盖' : '仅填写token本身，不需要Bearer前缀'"
          />
          <div class="security-tip">敏感信息不会在列表中明文展示；编辑已有环境时，留空可保留原 token。</div>
        </el-form-item>
        <el-form-item label="附加请求头JSON">
          <el-input v-model="form.headersText" type="textarea" :rows="4" placeholder='例如: {"X-App":"demo"}' />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
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
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useProjectStore } from '../store/project'

const tableData = ref([])
const projects = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const queryProjectId = ref('')
const projectStore = useProjectStore()
const formRef = ref()
const saveLoading = ref(false)
const persistedBearerToken = ref('')

const typeMap = { development: '开发', test: '测试', pre_production: '预发', production: '生产' }
const statusMap = { available: '可用', unavailable: '不可用', maintenance: '维护中' }
const projectNameMap = computed(() => Object.fromEntries(projects.value.map((item) => [item.id, item.name])))

const form = reactive({
  id: '',
  projectId: '',
  name: '',
  type: 'test',
  baseUrl: '',
  authType: '',
  bearerToken: '',
  headersText: '',
  description: ''
})

const rules = {
  projectId: [{ required: true, message: '请选择所属项目', trigger: 'change' }],
  name: [{ required: true, message: '请输入环境名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择环境类型', trigger: 'change' }],
  baseUrl: [{ required: true, message: '请输入基础URL', trigger: 'blur' }]
}

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadData = async () => {
  try {
    const res = await api.get('/environments', { params: queryProjectId.value ? { projectId: queryProjectId.value } : {} })
    tableData.value = res.data || []
  } catch (e) { console.error(e) }
}

const handleAdd = () => {
  Object.assign(form, { id: '', projectId: '', name: '', type: 'test', baseUrl: '', authType: '', bearerToken: '', headersText: '', description: '' })
  persistedBearerToken.value = ''
  dialogTitle.value = '新建环境'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  persistedBearerToken.value = row.authConfig?.token || ''
  Object.assign(form, {
    ...row,
    authType: row.authConfig?.type || '',
    bearerToken: '',
    headersText: row.headers ? JSON.stringify(row.headers, null, 2) : ''
  })
  dialogTitle.value = '编辑环境'
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveLoading.value = true
  try {
    let parsedHeaders = {}
    if (form.headersText?.trim()) {
      try {
        parsedHeaders = JSON.parse(form.headersText)
      } catch {
        ElMessage.error('附加请求头必须是合法JSON')
        saveLoading.value = false
        return
      }
    }

    const payload = {
      projectId: form.projectId,
      name: form.name,
      type: form.type,
      baseUrl: form.baseUrl,
      headers: parsedHeaders,
      authConfig: form.authType === 'bearer' && (form.bearerToken || persistedBearerToken.value)
        ? { type: 'bearer', token: (form.bearerToken || persistedBearerToken.value).trim() }
        : undefined,
      description: form.description
    }
    if (form.id) {
      await api.put(`/environments/${form.id}`, payload)
    } else {
      await api.post('/environments', payload)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '环境保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm('确认删除?', '提示', { type: 'warning' })
  try {
    await api.delete(`/environments/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) { console.error(e) }
}

onMounted(async () => {
  await loadProjects()
  if (projectStore.selectedProjectId) {
    queryProjectId.value = projectStore.selectedProjectId
    form.projectId = projectStore.selectedProjectId
  }
  await loadData()
})

watch(() => projectStore.selectedProjectId, async (projectId) => {
  queryProjectId.value = projectId || ''
  if (!form.id) form.projectId = projectId || ''
  await loadData()
})
</script>

<style scoped>
.security-tip {
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
</style>
