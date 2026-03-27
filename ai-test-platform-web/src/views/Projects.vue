<template>
  <div class="page-container">
    <div class="card-header">
      <h2>项目管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新建项目
      </el-button>
    </div>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" clearable placeholder="全部状态">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
            <el-option label="归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键字">
          <el-input v-model="queryForm.keyword" clearable placeholder="项目名称" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe>
        <el-table-column prop="name" label="项目名称" min-width="180" />
        <el-table-column prop="code" label="项目编码" width="160" />
        <el-table-column prop="businessLine" label="业务线" width="160" />
        <el-table-column prop="ownerId" label="负责人ID" width="200" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">
              {{ statusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="项目名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="项目编码">
          <el-input v-model="form.code" :disabled="Boolean(form.id)" />
        </el-form-item>
        <el-form-item label="业务线">
          <el-input v-model="form.businessLine" />
        </el-form-item>
        <el-form-item label="负责人ID">
          <el-input v-model="form.ownerId" />
        </el-form-item>
        <el-form-item label="项目状态">
          <el-select v-model="form.status">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
            <el-option label="归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目描述">
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../api'

const tableData = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const formRef = ref()
const saveLoading = ref(false)

const statusMap = {
  active: { label: '启用', type: 'success' },
  inactive: { label: '停用', type: 'warning' },
  archived: { label: '归档', type: 'info' }
}

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const queryForm = reactive({
  status: '',
  keyword: ''
})

const form = reactive({
  id: '',
  name: '',
  code: '',
  businessLine: '',
  ownerId: '',
  status: 'active',
  description: ''
})

const rules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入项目编码', trigger: 'blur' }]
}

const loadData = async () => {
  const params = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(queryForm.status && { status: queryForm.status }),
    ...(queryForm.keyword && { keyword: queryForm.keyword })
  }

  const res = await api.get('/projects', { params })
  tableData.value = res.data.list || []
  pagination.total = res.data.total || 0
}

const handleAdd = () => {
  Object.assign(form, {
    id: '',
    name: '',
    code: '',
    businessLine: '',
    ownerId: '',
    status: 'active',
    description: ''
  })
  dialogTitle.value = '新建项目'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, {
    id: row.id,
    name: row.name,
    code: row.code,
    businessLine: row.businessLine || '',
    ownerId: row.ownerId || '',
    status: row.status || 'active',
    description: row.description || ''
  })
  dialogTitle.value = '编辑项目'
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload = {
    name: form.name,
    code: form.code,
    businessLine: form.businessLine,
    ownerId: form.ownerId,
    status: form.status,
    description: form.description
  }

  saveLoading.value = true
  try {
    if (form.id) {
      await api.put(`/projects/${form.id}`, payload)
      ElMessage.success('项目更新成功')
    } else {
      await api.post('/projects', payload)
      ElMessage.success('项目创建成功')
    }

    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '项目保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确认删除项目“${row.name}”吗？`, '提示', { type: 'warning' })
  await api.delete(`/projects/${row.id}`)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>
