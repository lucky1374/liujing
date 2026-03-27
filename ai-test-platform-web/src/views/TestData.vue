<template>
  <div class="page-container">
    <div class="card-header">
      <h2>测试数据</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus />新建数据</el-icon>
      </el-button>
    </div>

    <el-card>
      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="数据名称" />
        <el-table-column prop="module" label="所属模块" />
        <el-table-column prop="type" label="类型">
          <template #default="{ row }">
            <el-tag>{{ typeMap[row.type] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'inactive' ? 'info' : 'warning'">
              {{ statusMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isSensitive" label="敏感数据">
          <template #default="{ row }">
            <el-tag :type="row.isSensitive ? 'danger' : 'info'">{{ row.isSensitive ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isReusable" label="可复用">
          <template #default="{ row }">
            <el-tag :type="row.isReusable ? 'success' : 'info'">{{ row.isReusable ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
            <el-button type="warning" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="60%">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="数据名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="所属模块">
          <el-input v-model="form.module" />
        </el-form-item>
        <el-form-item label="数据类型">
          <el-select v-model="form.type">
            <el-option label="静态数据" value="static" />
            <el-option label="动态数据" value="dynamic" />
            <el-option label="Mock数据" value="mock" />
          </el-select>
        </el-form-item>
        <el-form-item label="数据内容">
          <el-input v-model="form.dataContent" type="textarea" :rows="6" placeholder="JSON格式或文本内容" />
        </el-form-item>
        <el-form-item label="数据Schema">
          <el-input v-model="form.dataSchema" type="textarea" :rows="3" placeholder="数据结构定义(JSON Schema)" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="激活" value="active" />
            <el-option label="未激活" value="inactive" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="敏感数据">
          <el-switch v-model="form.isSensitive" />
        </el-form-item>
        <el-form-item label="敏感字段" v-if="form.isSensitive">
          <el-input v-model="form.sensitiveFields" placeholder="用逗号分隔，如: password,token" />
        </el-form-item>
        <el-form-item label="可复用">
          <el-switch v-model="form.isReusable" />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker v-model="form.expiresAt" type="datetime" placeholder="选择过期时间" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewVisible" title="数据详情" width="60%">
      <el-descriptions v-if="currentData" :column="2" border>
        <el-descriptions-item label="数据名称">{{ currentData.name }}</el-descriptions-item>
        <el-descriptions-item label="所属模块">{{ currentData.module }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeMap[currentData.type] }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentData.status === 'active' ? 'success' : 'info'">
            {{ statusMap[currentData.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="敏感数据">{{ currentData.isSensitive ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="可复用">{{ currentData.isReusable ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ currentData.createdAt }}</el-descriptions-item>
        <el-descriptions-item label="过期时间">{{ currentData.expiresAt || '永不过期' }}</el-descriptions-item>
      </el-descriptions>
      <el-divider>数据内容</el-divider>
      <pre class="data-content">{{ currentData?.dataContent }}</pre>
      <el-divider v-if="currentData?.dataSchema">数据Schema</el-divider>
      <pre v-if="currentData?.dataSchema" class="data-content">{{ currentData.dataSchema }}</pre>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const tableData = ref([])
const dialogVisible = ref(false)
const viewVisible = ref(false)
const dialogTitle = ref('新建测试数据')
const currentData = ref(null)
const isEdit = ref(false)
const formRef = ref()
const saveLoading = ref(false)

const typeMap = {
  static: '静态数据',
  dynamic: '动态数据',
  mock: 'Mock数据'
}

const statusMap = {
  active: '激活',
  inactive: '未激活',
  expired: '已过期'
}

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const form = reactive({
  id: '',
  name: '',
  module: '',
  type: 'static',
  dataContent: '',
  dataSchema: '',
  status: 'active',
  isSensitive: false,
  sensitiveFields: '',
  isReusable: true,
  expiresAt: null,
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入数据名称', trigger: 'blur' }],
  module: [{ required: true, message: '请输入所属模块', trigger: 'blur' }],
  type: [{ required: true, message: '请选择数据类型', trigger: 'change' }],
  dataContent: [{ required: true, message: '请输入数据内容', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const loadData = async () => {
  try {
    const res = await api.get('/test-data', { params: { page: pagination.page, pageSize: pagination.pageSize } })
    tableData.value = res.data.list || []
    pagination.total = res.data.total || 0
  } catch (e) {
    console.error(e)
  }
}

const handleAdd = () => {
  Object.assign(form, {
    id: '', name: '', module: '', type: 'static', dataContent: '', dataSchema: '',
    status: 'active', isSensitive: false, sensitiveFields: '', isReusable: true,
    expiresAt: null, description: ''
  })
  dialogTitle.value = '新建测试数据'
  isEdit.value = false
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, { ...row, sensitiveFields: row.sensitiveFields || '' })
  dialogTitle.value = '编辑测试数据'
  isEdit.value = true
  dialogVisible.value = true
}

const handleView = async (row) => {
  try {
    const res = await api.get(`/test-data/${row.id}`)
    currentData.value = res.data
    viewVisible.value = true
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveLoading.value = true
  try {
    if (isEdit.value) {
      await api.put(`/test-data/${form.id}`, form)
      ElMessage.success('更新成功')
    } else {
      await api.post('/test-data', form)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该测试数据吗？', '提示', { type: 'warning' })
    await api.delete(`/test-data/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.response?.data?.message || '删除失败')
    }
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.data-content {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  max-height: 300px;
  overflow: auto;
}
</style>
