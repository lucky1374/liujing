<template>
  <div class="page-container">
    <div class="card-header">
      <h2>联调故障速查清单</h2>
      <el-tag type="info">Runner / 任务执行</el-tag>
    </div>

    <el-card class="section-card">
      <template #header>30秒健康检查</template>
      <pre class="code-block">{{ healthCheckCommands }}</pre>
      <el-button size="small" @click="copyText(healthCheckCommands)">复制命令</el-button>
    </el-card>

    <el-card class="section-card">
      <template #header>平台内置诊断入口</template>
      <div class="line">路径：测试任务 - Runner诊断</div>
      <div class="line">接口：GET /test-tasks/runner/diagnostics</div>
      <div class="line">建议：联调群反馈时直接粘贴“复制诊断信息”的内容。</div>
      <div class="actions-row">
        <el-button size="small" @click="goToTasks">前往测试任务页</el-button>
        <el-button size="small" type="warning" @click="goToFailedTasks">查看失败任务</el-button>
      </div>
    </el-card>

    <el-card class="section-card">
      <template #header>高频故障处理</template>
      <el-collapse>
        <el-collapse-item title="执行来源仍是 Python 本地兜底" name="1">
          <pre class="code-block">{{ fallbackCommands }}</pre>
          <el-button size="small" @click="copyText(fallbackCommands)">复制命令</el-button>
        </el-collapse-item>
        <el-collapse-item title="401/403 鉴权失败" name="2">
          <pre class="code-block">{{ authCommands }}</pre>
          <el-button size="small" @click="copyText(authCommands)">复制命令</el-button>
        </el-collapse-item>
        <el-collapse-item title="ECONNREFUSED 连接被拒绝" name="3">
          <pre class="code-block">{{ refusedCommands }}</pre>
          <el-button size="small" @click="copyText(refusedCommands)">复制命令</el-button>
        </el-collapse-item>
        <el-collapse-item title="python_local 依赖缺失" name="4">
          <pre class="code-block">{{ localDepsCommands }}</pre>
          <el-button size="small" @click="copyText(localDepsCommands)">复制命令</el-button>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()

const healthCheckCommands = `curl -i http://localhost:8001/health
lsof -i :8001 -sTCP:LISTEN -n -P
printenv | grep -E "PYTHON_RUNNER_URL|RUNNER_AUTH_TOKEN"`

const fallbackCommands = `curl -i http://localhost:8001/health
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" http://localhost:3000/test-tasks/runner/diagnostics`

const authCommands = `ps eww -p $(lsof -ti :8001)
grep -E "PYTHON_RUNNER_URL|RUNNER_AUTH_TOKEN" /Users/lj/liujing/ai-test-platform/.env`

const refusedCommands = `cd /Users/lj/liujing/ai-test-platform/python-runner
source .venv/bin/activate
uvicorn runner.server:app --host 0.0.0.0 --port 8001`

const localDepsCommands = `cd /Users/lj/liujing/ai-test-platform/python-runner
source .venv/bin/activate
pip install -r requirements.txt
python -m runner.main --payload examples/sample_payload.json`

const goToTasks = () => {
  router.push('/test-tasks')
}

const goToFailedTasks = () => {
  router.push({ path: '/test-tasks', query: { status: 'failed' } })
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('命令已复制')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('命令已复制')
  }
}
</script>

<style scoped>
.section-card {
  margin-bottom: 12px;
}

.line {
  margin-bottom: 8px;
  color: #606266;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.code-block {
  max-height: 220px;
  overflow: auto;
  padding: 12px;
  margin-bottom: 10px;
  background: #f7f8fa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}
</style>
