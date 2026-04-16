<template>
  <div class="page-container">
    <div class="card-header">
      <h2>接口集成测试（Scenario）</h2>
      <div>
        <el-select v-model="dashboardDays" style="width: 130px; margin-right: 8px" @change="loadDashboard">
          <el-option :value="7" label="近7天" />
          <el-option :value="14" label="近14天" />
          <el-option :value="30" label="近30天" />
        </el-select>
        <el-button style="margin-right: 8px" @click="handleOpenTemplateDialog">模板创建</el-button>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新建场景
        </el-button>
      </div>
    </div>

    <el-card v-loading="dashboardLoading" style="margin-bottom: 14px">
      <template #header>
        <div class="dashboard-header">Scenario 定时回归看板</div>
      </template>
      <div class="dashboard-grid">
        <div class="metric-card">
          <div class="metric-label">Scenario任务数</div>
          <div class="metric-value">{{ dashboard.summary.totalScenarioTasks }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">定时任务数</div>
          <div class="metric-value">{{ dashboard.summary.scheduledScenarioTasks }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">执行批次数</div>
          <div class="metric-value">{{ dashboard.summary.executedRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">失败批次数</div>
          <div class="metric-value danger">{{ dashboard.summary.failedRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">通过率</div>
          <div class="metric-value success">{{ dashboard.summary.passRate }}%</div>
        </div>
      </div>

      <div class="dashboard-panels">
        <div>
          <div class="panel-title">趋势（日）</div>
          <el-table :data="dashboard.dailyTrend" size="small" border>
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="totalRuns" label="总批次" width="90" />
            <el-table-column prop="passedRuns" label="通过" width="90" />
            <el-table-column prop="failedRuns" label="失败" width="90" />
            <el-table-column prop="passRate" label="通过率" width="100">
              <template #default="{ row }">{{ row.passRate }}%</template>
            </el-table-column>
          </el-table>
        </div>
        <div>
          <div class="panel-title">高频失败原因</div>
          <el-table :data="dashboard.topFailureReasons" size="small" border>
            <el-table-column prop="reason" label="原因" min-width="160" />
            <el-table-column prop="count" label="次数" width="90" />
          </el-table>
          <div class="panel-title" style="margin-top: 10px">失败任务排行</div>
          <el-table :data="dashboard.taskLeaderboard" size="small" border>
            <el-table-column prop="taskName" label="任务" min-width="180" show-overflow-tooltip />
            <el-table-column prop="totalRuns" label="批次" width="80" />
            <el-table-column prop="failedRuns" label="失败" width="80" />
            <el-table-column prop="passRate" label="通过率" width="90">
              <template #default="{ row }">{{ row.passRate }}%</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="panel-title" style="margin-top: 12px">失败重试监控</div>
      <div class="retry-metrics">
        <div class="metric-card">
          <div class="metric-label">总批次</div>
          <div class="metric-value">{{ retryOverview.summary.totalRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">发生重试</div>
          <div class="metric-value">{{ retryOverview.summary.retriedRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">重试后成功</div>
          <div class="metric-value success">{{ retryOverview.summary.retrySuccessRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">重试后失败</div>
          <div class="metric-value danger">{{ retryOverview.summary.retryFailedRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">平均尝试次数</div>
          <div class="metric-value">{{ retryOverview.summary.averageAttempts }}</div>
        </div>
      </div>

      <div class="dashboard-panels" style="margin-top: 10px">
        <div>
          <div class="panel-title">尝试次数分布</div>
          <el-table :data="retryOverview.attemptsDistribution" size="small" border>
            <el-table-column prop="attempts" label="尝试次数" width="120" />
            <el-table-column prop="runs" label="批次数" width="120" />
          </el-table>
        </div>
        <div>
          <div class="panel-title">重试后仍失败原因 Top</div>
          <el-table :data="retryOverview.topFailureReasonsAfterRetry" size="small" border>
            <el-table-column prop="reason" label="原因" min-width="160" />
            <el-table-column prop="count" label="次数" width="90" />
          </el-table>
        </div>
      </div>

      <div class="panel-title" style="margin-top: 12px">执行成本分析</div>
      <div class="retry-metrics">
        <div class="metric-card">
          <div class="metric-label">总批次</div>
          <div class="metric-value">{{ costAnalysis.summary.totalRuns }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">总尝试次数</div>
          <div class="metric-value">{{ costAnalysis.summary.totalAttempts }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">额外重试次数</div>
          <div class="metric-value warning">{{ costAnalysis.summary.extraAttempts }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">平均尝试/批次</div>
          <div class="metric-value">{{ costAnalysis.summary.averageAttemptsPerRun }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">重试成本占比</div>
          <div class="metric-value danger">{{ costAnalysis.summary.retryCostRatio }}%</div>
        </div>
      </div>

      <div class="dashboard-panels" style="margin-top: 10px">
        <div>
          <div class="panel-title">按尝试次数成本分布</div>
          <el-table :data="costAnalysis.costByAttempts" size="small" border>
            <el-table-column prop="attempts" label="尝试次数" width="100" />
            <el-table-column prop="runs" label="批次" width="90" />
            <el-table-column prop="totalDurationMs" label="总耗时(ms)" width="120" />
            <el-table-column prop="avgDurationMs" label="平均耗时(ms)" width="130" />
          </el-table>
        </div>
        <div>
          <div class="panel-title">高成本任务 Top</div>
          <el-table :data="costAnalysis.topExpensiveTasks" size="small" border>
            <el-table-column prop="taskName" label="任务" min-width="150" show-overflow-tooltip />
            <el-table-column prop="runs" label="批次" width="70" />
            <el-table-column prop="avgAttempts" label="平均尝试" width="90" />
            <el-table-column prop="avgDurationMs" label="平均耗时(ms)" width="120" />
            <el-table-column prop="retryCostRatio" label="重试占比" width="100">
              <template #default="{ row }">{{ row.retryCostRatio }}%</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="panel-title" style="margin-top: 12px">高成本低质量预警</div>
      <el-table :data="costQualityAlerts.alerts" size="small" border>
        <el-table-column prop="taskName" label="任务" min-width="180" show-overflow-tooltip />
        <el-table-column prop="scenarioName" label="场景" min-width="160" show-overflow-tooltip />
        <el-table-column prop="templateKey" label="模板Key" width="160" show-overflow-tooltip />
        <el-table-column prop="qualityScore" label="质量分" width="90" />
        <el-table-column prop="retryCostRatio" label="重试占比" width="100">
          <template #default="{ row }">{{ row.retryCostRatio }}%</template>
        </el-table-column>
        <el-table-column prop="averageAttempts" label="平均尝试" width="90" />
        <el-table-column prop="recommendation" label="建议" min-width="240" show-overflow-tooltip />
      </el-table>
    </el-card>

    <el-card>
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="所属项目">
          <el-select
            v-model="queryForm.projectId"
            clearable
            filterable
            placeholder="全部项目"
            style="width: 220px"
          >
            <el-option
              v-for="item in projects"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" clearable placeholder="全部状态" style="width: 150px">
            <el-option label="草稿" value="draft" />
            <el-option label="启用" value="active" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="场景名称">
          <el-input v-model="queryForm.name" clearable placeholder="支持模糊搜索" style="width: 220px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column label="所属项目" min-width="160">
          <template #default="{ row }">{{ projectNameMap[row.projectId] || '-' }}</template>
        </el-table-column>
        <el-table-column prop="name" label="场景名称" min-width="220" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType[row.status] || 'info'">{{ statusLabelMap[row.status] || row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="步骤数" width="100">
          <template #default="{ row }">{{ Array.isArray(row.steps) ? row.steps.length : 0 }}</template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="390" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="handleOpenExecute(row)">执行</el-button>
            <el-button type="primary" link @click="handleViewExecutions(row)">执行记录</el-button>
            <el-button type="warning" link @click="handleOpenCreateTask(row)">转任务</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属项目">
          <el-select v-model="form.projectId" clearable filterable placeholder="请选择项目" style="width: 100%">
            <el-option
              v-for="item in projects"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="场景名称" prop="name">
          <el-input v-model="form.name" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 200px">
            <el-option label="草稿" value="draft" />
            <el-option label="启用" value="active" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="场景描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="默认变量(JSON)">
          <el-input
            v-model="form.defaultVariablesText"
            type="textarea"
            :rows="5"
            placeholder='例如：{"baseUrl":"https://ananx-qa.juhux.com"}'
          />
        </el-form-item>
        <el-form-item label="步骤编辑器">
          <div class="step-toolbar">
            <el-button size="small" @click="handleAddStep">新增步骤</el-button>
            <el-button size="small" @click="handleSyncStepsFromJson">从JSON生成步骤</el-button>
            <el-button size="small" @click="handleSyncStepsToJson">步骤转JSON</el-button>
          </div>
          <el-collapse v-if="form.steps.length" class="step-collapse">
            <el-collapse-item v-for="(step, index) in form.steps" :key="step.__key" :title="`步骤${index + 1} - ${step.name || '未命名'}`" :name="step.__key">
              <div class="step-grid">
                <el-input v-model="step.name" placeholder="步骤名称" />
                <el-select v-model="step.method" placeholder="方法" style="width: 140px">
                  <el-option label="GET" value="GET" />
                  <el-option label="POST" value="POST" />
                  <el-option label="PUT" value="PUT" />
                  <el-option label="PATCH" value="PATCH" />
                  <el-option label="DELETE" value="DELETE" />
                </el-select>
                <el-input v-model="step.url" placeholder="URL，支持{{var}}" />
                <el-input-number v-model="step.timeoutMs" :min="1000" :max="120000" :step="1000" style="width: 180px" />
                <el-switch v-model="step.continueOnFailure" active-text="失败继续" />
                <el-input-number v-model="step.onPassedStepIndex" :min="0" :step="1" style="width: 180px" placeholder="通过跳转" />
                <el-input-number v-model="step.onFailedStepIndex" :min="0" :step="1" style="width: 180px" placeholder="失败跳转" />
                <el-button type="danger" link @click="handleRemoveStep(index)">删除步骤</el-button>
              </div>
              <el-input v-model="step.headersText" type="textarea" :rows="3" placeholder='headers(JSON)，例如{"Authorization":"Bearer {{token}}"}' />
              <el-input v-model="step.queryText" type="textarea" :rows="2" placeholder='query(JSON)，例如{"page":1}' style="margin-top: 8px" />
              <el-input v-model="step.bodyText" type="textarea" :rows="3" placeholder='body(JSON)' style="margin-top: 8px" />
              <el-input v-model="step.assertionsText" type="textarea" :rows="4" placeholder='assertions(JSON数组)' style="margin-top: 8px" />
              <el-input v-model="step.extractorsText" type="textarea" :rows="4" placeholder='extractors(JSON数组)' style="margin-top: 8px" />
              <el-input v-model="step.branchRulesText" type="textarea" :rows="4" placeholder='branchRules(JSON数组)，例如[{"source":"vars","path":"flow","operator":"eq","expected":"fast","nextStepIndex":2}]' style="margin-top: 8px" />
            </el-collapse-item>
          </el-collapse>
        </el-form-item>
        <el-form-item label="步骤(JSON)" prop="stepsText">
          <el-input
            v-model="form.stepsText"
            type="textarea"
            :rows="10"
            placeholder="请填写步骤数组，支持 method/url/headers/query/body/assertions/extractors"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="executeDialogVisible" title="执行场景" width="720px">
      <el-alert
        :title="`场景：${currentScenario?.name || '-'}（可选覆盖变量）`"
        type="info"
        :closable="false"
        style="margin-bottom: 12px"
      />
      <el-input
        v-model="executeVariablesText"
        type="textarea"
        :rows="8"
        placeholder='例如：{"token":"Bearer xxx"}'
      />
      <template #footer>
        <el-button @click="executeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="executeLoading" @click="handleExecute">开始执行</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="executionDrawerVisible" :title="executionDrawerTitle" size="60%">
      <el-table :data="executionList" border stripe v-loading="executionLoading" :row-class-name="executionRowClassName">
        <el-table-column prop="createdAt" label="执行时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'passed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalSteps" label="总步骤" width="90" />
        <el-table-column prop="passedSteps" label="通过" width="90" />
        <el-table-column prop="failedSteps" label="失败" width="90" />
        <el-table-column prop="durationMs" label="耗时(ms)" width="110" />
        <el-table-column prop="errorMessage" label="错误信息" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewExecutionDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'failed'" type="warning" link @click="handleRerunExecution(row)">重跑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 12px"
        layout="total, prev, pager, next, sizes"
        :total="executionPagination.total"
        :current-page="executionPagination.page"
        :page-size="executionPagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="handleExecutionPageChange"
        @size-change="handleExecutionSizeChange"
      />
    </el-drawer>

    <el-dialog v-model="executionDetailVisible" title="执行详情" width="860px">
      <template v-if="currentExecution">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="执行ID" :span="2">{{ currentExecution.id }}</el-descriptions-item>
          <el-descriptions-item label="执行状态">{{ currentExecution.status }}</el-descriptions-item>
          <el-descriptions-item label="耗时(ms)">{{ currentExecution.durationMs }}</el-descriptions-item>
          <el-descriptions-item label="通过步骤">{{ currentExecution.passedSteps }}</el-descriptions-item>
          <el-descriptions-item label="失败步骤">{{ currentExecution.failedSteps }}</el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">{{ currentExecution.errorMessage || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider>输入变量</el-divider>
        <pre class="json-block">{{ formatJson(currentExecution.inputVariables) }}</pre>

        <el-divider>输出变量</el-divider>
        <pre class="json-block">{{ formatJson(currentExecution.outputVariables) }}</pre>

        <el-divider>步骤结果</el-divider>
        <pre class="json-block">{{ formatJson(currentExecution.stepResults) }}</pre>
        <div style="margin-top: 10px; text-align: right">
          <el-button v-if="currentExecution.status === 'failed'" type="warning" @click="handleRerunExecution(currentExecution)">按本次变量重跑</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="createTaskDialogVisible" title="场景转测试任务" width="640px">
      <el-form :model="taskForm" label-width="110px">
        <el-form-item label="所属项目">
          <el-select v-model="taskForm.projectId" filterable style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务名称">
          <el-input v-model="taskForm.name" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="taskForm.priority" style="width: 180px">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行方式">
          <el-radio-group v-model="taskForm.executeType">
            <el-radio label="immediate">立即执行</el-radio>
            <el-radio label="scheduled">定时执行</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="taskForm.executeType === 'scheduled'" label="计划时间">
          <el-date-picker
            v-model="taskForm.scheduledTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="执行环境">
          <el-select v-model="taskForm.executeEnvironments" multiple style="width: 100%">
            <el-option label="测试" value="test" />
            <el-option label="预发" value="pre_production" />
            <el-option label="生产" value="production" />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐策略">
          <el-select v-model="taskForm.retryPresetKey" placeholder="可选：按业务线套用推荐策略" clearable style="width: calc(100% - 120px)">
            <el-option
              v-for="item in retryPresets"
              :key="item.key"
              :label="`${item.name}（${item.businessLine}）`"
              :value="item.key"
            />
          </el-select>
          <el-button style="margin-left: 8px" @click="handleApplyRetryPreset">套用</el-button>
        </el-form-item>
        <el-form-item label="失败重试">
          <el-switch v-model="taskForm.retryEnabled" active-text="开启" inactive-text="关闭" />
          <el-input-number v-model="taskForm.maxRetries" :min="0" :max="3" :disabled="!taskForm.retryEnabled" style="margin-left: 12px" />
          <span style="margin-left: 8px; color: #909399">最大重试次数</span>
        </el-form-item>
        <el-form-item label="退避策略">
          <el-input-number v-model="taskForm.backoffBaseMs" :min="100" :max="10000" :step="100" :disabled="!taskForm.retryEnabled" />
          <span style="margin: 0 8px; color: #909399">基础退避(ms)</span>
          <el-input-number v-model="taskForm.backoffMaxMs" :min="100" :max="60000" :step="500" :disabled="!taskForm.retryEnabled" />
          <span style="margin-left: 8px; color: #909399">最大退避(ms)</span>
        </el-form-item>
        <el-form-item label="重试原因">
          <el-input
            v-model="taskForm.retryOnReasonsText"
            :disabled="!taskForm.retryEnabled"
            placeholder="逗号分隔，可留空表示全部失败原因都可重试"
          />
        </el-form-item>
        <el-form-item label="跳过重试原因">
          <el-input
            v-model="taskForm.skipRetryOnReasonsText"
            :disabled="!taskForm.retryEnabled"
            placeholder="逗号分隔，如 auth_failed,http_400"
          />
        </el-form-item>
        <el-form-item label="重试失败类型">
          <el-input
            v-model="taskForm.retryOnFailureTypesText"
            :disabled="!taskForm.retryEnabled"
            placeholder="逗号分隔，如 timeout,network,http_5xx"
          />
        </el-form-item>
        <el-form-item label="跳过失败类型">
          <el-input
            v-model="taskForm.skipRetryOnFailureTypesText"
            :disabled="!taskForm.retryEnabled"
            placeholder="逗号分隔，如 auth,http_4xx"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="taskForm.executeNow">创建后立即执行一次</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createTaskLoading" @click="handleCreateTask">创建任务</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateDialogVisible" title="模板创建场景" width="760px">
      <el-form :model="templateForm" label-width="110px">
        <el-form-item label="模板选择">
          <el-select v-model="templateForm.templateKey" placeholder="请选择模板" filterable style="width: calc(100% - 170px)">
            <el-option
              v-for="tpl in templates"
              :key="tpl.key"
              :label="`${tpl.name}（${tpl.category} / v${tpl.version || 1} / ${tpl.source === 'custom' ? '自定义' : '系统'} / 质量${tpl.qualityScore || 0}）`"
              :value="tpl.key"
            />
          </el-select>
          <el-button style="margin-left: 8px" @click="handleExportTemplates">导出模板</el-button>
            <el-button @click="handleOpenImportTemplates">导入模板</el-button>
            <el-button @click="handleOpenQualityPolicyDialog">评分策略</el-button>
            <el-button @click="handleOpenGovernanceRuleDialog">自动流转规则</el-button>
            <el-button @click="handleOpenLifecycleReminderDialog">生命周期提醒</el-button>
          </el-form-item>
        <el-form-item label="所属项目">
          <el-select v-model="templateForm.projectId" filterable clearable style="width: 100%">
            <el-option v-for="item in projects" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="场景名称">
          <el-input v-model="templateForm.name" placeholder="可不填，默认使用模板名称" />
        </el-form-item>
        <el-form-item v-if="templateVariableRows.length" label="模板参数">
          <div style="width: 100%">
            <div class="template-var-actions">
              <el-button size="small" @click="handleSyncTemplateVariablesFromJson">从JSON同步参数</el-button>
              <el-button size="small" @click="handleSyncTemplateVariablesToJson">参数写回JSON</el-button>
            </div>
            <div class="template-var-grid">
              <div v-for="row in templateVariableRows" :key="row.key" class="template-var-item">
                <div class="template-var-label">{{ row.key }}</div>
                <el-switch v-if="row.type === 'boolean'" v-model="row.value" />
                <el-input-number v-else-if="row.type === 'number'" v-model="row.value" :controls="false" style="width: 100%" />
                <el-input
                  v-else-if="row.type === 'json'"
                  v-model="row.value"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入JSON"
                />
                <el-input v-else v-model="row.value" />
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="变量覆盖(JSON)">
          <el-input v-model="templateForm.variablesText" type="textarea" :rows="8" placeholder='例如：{"baseUrl":"https://ananx-qa.juhux.com"}' />
        </el-form-item>
      </el-form>

      <el-alert
        v-if="selectedTemplate"
        type="info"
        :closable="false"
        :title="`${selectedTemplate.description}（步骤数：${selectedTemplate.stepCount}，质量分：${selectedTemplate.qualityScore || 0}）`"
      />
      <div v-if="selectedTemplate" class="template-review-bar">
        <el-tag :type="templateStatusTagType[selectedTemplate.status] || 'info'">
          审核状态：{{ templateStatusLabel[selectedTemplate.status] || selectedTemplate.status }}
        </el-tag>
        <el-tag :type="templateLifecycleTagType[selectedTemplate.lifecycleStatus] || 'info'">
          生命周期：{{ templateLifecycleLabel[selectedTemplate.lifecycleStatus] || selectedTemplate.lifecycleStatus }}
        </el-tag>
        <el-tag :type="templateQualityTagType[selectedTemplate.qualityLevel] || 'info'">
          质量等级：{{ templateQualityLabel[selectedTemplate.qualityLevel] || selectedTemplate.qualityLevel }}
        </el-tag>
        <span class="template-quality-text">
          结构{{ selectedTemplate.qualityBreakdown?.structure || 0 }} /
          断言{{ selectedTemplate.qualityBreakdown?.assertions || 0 }} /
          变量{{ selectedTemplate.qualityBreakdown?.variableDependency || 0 }} /
          可维护{{ selectedTemplate.qualityBreakdown?.maintainability || 0 }}
        </span>
        <span class="template-quality-text" v-if="selectedTemplate.releaseTag">
          发布标签：{{ selectedTemplate.releaseTag }}
        </span>
        <span class="template-quality-text" v-if="selectedTemplate.releasedAt">
          发布时间：{{ selectedTemplate.releasedAt }}
        </span>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          @click="handleSubmitTemplateReview"
        >
          提交审核
        </el-button>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          type="success"
          @click="handleReviewTemplate('approve')"
        >
          审核通过
        </el-button>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          type="danger"
          @click="handleReviewTemplate('reject')"
        >
          驳回
        </el-button>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          @click="handleOpenTemplateAuditArchive"
        >
          审核记录
        </el-button>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          type="warning"
          @click="handleUpdateTemplateLifecycle('deprecated')"
        >
          标记废弃
        </el-button>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          type="danger"
          @click="handleUpdateTemplateLifecycle('archived')"
        >
          归档
        </el-button>
        <el-button
          v-if="selectedTemplate.source === 'custom'"
          size="small"
          type="success"
          @click="handleUpdateTemplateLifecycle('active')"
        >
          恢复启用
        </el-button>
      </div>

      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="templateCreateLoading" @click="handleCreateFromTemplate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateExchangeVisible" :title="templateExchangeTitle" width="760px">
      <el-input
        v-model="templateExchangeText"
        type="textarea"
        :rows="16"
        :readonly="templateExchangeMode === 'export'"
        placeholder="粘贴模板JSON，格式：{ templates: [...] }"
      />
      <template #footer>
        <el-button @click="templateExchangeVisible = false">关闭</el-button>
        <el-button
          v-if="templateExchangeMode === 'import'"
          type="primary"
          :loading="templateExchangeLoading"
          @click="handleSubmitImportTemplates"
        >
          导入
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateAuditVisible" title="模板审核归档" width="920px">
      <el-table :data="templateAuditList" border size="small" v-loading="templateAuditLoading">
        <el-table-column prop="createdAt" label="时间" width="180" />
        <el-table-column prop="action" label="动作" width="100" />
        <el-table-column prop="operatorId" label="操作人" width="120" />
        <el-table-column prop="comment" label="备注" min-width="220" show-overflow-tooltip />
      </el-table>
      <div class="template-var-actions" style="margin-top: 10px">
        <el-button @click="handleLoadTemplateAuditDiff">查看最近两次差异</el-button>
      </div>
      <pre class="json-block" style="margin-top: 8px">{{ formatJson(templateAuditDiff) }}</pre>
      <template #footer>
        <el-button @click="templateAuditVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="qualityPolicyVisible" title="评分规则配置" width="860px">
      <el-table :data="qualityPolicies" border size="small" v-loading="qualityPolicyLoading">
        <el-table-column prop="businessLine" label="业务线" width="120" />
        <el-table-column prop="source" label="来源" width="90" />
        <el-table-column label="权重" min-width="260">
          <template #default="{ row }">
            structure={{ row.weights?.structure }}, assertions={{ row.weights?.assertions }},
            vars={{ row.weights?.variableDependency }}, maintain={{ row.weights?.maintainability }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="200" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleSelectQualityPolicy(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider />
      <el-form :model="qualityPolicyForm" label-width="120px">
        <el-form-item label="业务线">
          <el-input v-model="qualityPolicyForm.businessLine" :disabled="qualityPolicySaving" />
        </el-form-item>
        <el-form-item label="策略说明">
          <el-input v-model="qualityPolicyForm.description" />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="qualityPolicyForm.enabled" />
        </el-form-item>
        <el-form-item label="结构权重">
          <el-input-number v-model="qualityPolicyForm.structure" :min="0" :max="1" :step="0.05" :precision="2" />
        </el-form-item>
        <el-form-item label="断言权重">
          <el-input-number v-model="qualityPolicyForm.assertions" :min="0" :max="1" :step="0.05" :precision="2" />
        </el-form-item>
        <el-form-item label="变量依赖权重">
          <el-input-number v-model="qualityPolicyForm.variableDependency" :min="0" :max="1" :step="0.05" :precision="2" />
        </el-form-item>
        <el-form-item label="可维护权重">
          <el-input-number v-model="qualityPolicyForm.maintainability" :min="0" :max="1" :step="0.05" :precision="2" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="qualityPolicyVisible = false">关闭</el-button>
        <el-button type="primary" :loading="qualityPolicySaving" @click="handleSaveQualityPolicy">保存策略</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="governanceRuleVisible" title="模板自动流转规则" width="920px">
      <el-alert
        title="支持 dry-run 预览：建议先预览命中，再执行自动流转。"
        type="info"
        :closable="false"
        style="margin-bottom: 10px"
      />
      <el-table :data="governanceRules" border size="small" v-loading="governanceRuleLoading">
        <el-table-column prop="businessLine" label="业务线" width="120" />
        <el-table-column prop="source" label="来源" width="90" />
        <el-table-column label="核心阈值" min-width="300">
          <template #default="{ row }">
            审核超时={{ row.pendingReviewTimeoutDays }}天，驳回超时={{ row.rejectedNotFixedDays }}天，低质量阈值={{ row.lowQualityThreshold }}
          </template>
        </el-table-column>
        <el-table-column label="开关" min-width="260">
          <template #default="{ row }">
            主开关={{ row.enabled ? '开' : '关' }} / 审核超时驳回={{ row.autoRejectPendingReviewEnabled ? '开' : '关' }} /
            驳回超时废弃={{ row.autoDeprecatedRejectedEnabled ? '开' : '关' }} / 审核通过自动发布={{ row.autoReleaseApprovedEnabled ? '开' : '关' }} /
            低质量废弃={{ row.autoDeprecatedLowQualityEnabled ? '开' : '关' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleSelectGovernanceRule(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider />
      <el-form :model="governanceRuleForm" label-width="150px">
        <el-form-item label="业务线">
          <el-input v-model="governanceRuleForm.businessLine" :disabled="governanceRuleSaving" />
        </el-form-item>
        <el-form-item label="规则说明">
          <el-input v-model="governanceRuleForm.description" />
        </el-form-item>
        <el-form-item label="主开关">
          <el-switch v-model="governanceRuleForm.enabled" />
        </el-form-item>
        <el-form-item label="待审核超时驳回">
          <el-switch v-model="governanceRuleForm.autoRejectPendingReviewEnabled" />
          <el-input-number v-model="governanceRuleForm.pendingReviewTimeoutDays" :min="1" :max="60" style="margin-left: 12px" />
          <span style="margin-left: 8px; color: #909399">天</span>
        </el-form-item>
        <el-form-item label="驳回超时废弃">
          <el-switch v-model="governanceRuleForm.autoDeprecatedRejectedEnabled" />
          <el-input-number v-model="governanceRuleForm.rejectedNotFixedDays" :min="1" :max="180" style="margin-left: 12px" />
          <span style="margin-left: 8px; color: #909399">天</span>
        </el-form-item>
        <el-form-item label="审核通过自动发布">
          <el-switch v-model="governanceRuleForm.autoReleaseApprovedEnabled" />
        </el-form-item>
        <el-form-item label="低质量自动废弃">
          <el-switch v-model="governanceRuleForm.autoDeprecatedLowQualityEnabled" />
          <el-input-number v-model="governanceRuleForm.lowQualityThreshold" :min="0" :max="100" style="margin-left: 12px" />
          <span style="margin-left: 8px; color: #909399">分</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="governanceRuleVisible = false">关闭</el-button>
        <el-button :loading="governanceExecuteLoading" @click="handleExecuteGovernanceRules(true)">预览命中</el-button>
        <el-button type="warning" :loading="governanceExecuteLoading" @click="handleExecuteGovernanceRules(false)">执行自动流转</el-button>
        <el-button type="primary" :loading="governanceRuleSaving" @click="handleSaveGovernanceRule">保存规则</el-button>
      </template>
      <pre v-if="governanceExecuteResult" class="json-block" style="margin-top: 8px">{{ formatJson(governanceExecuteResult) }}</pre>
    </el-dialog>

    <el-dialog v-model="lifecycleReminderVisible" title="生命周期提醒" width="760px">
      <el-form :model="lifecycleNotifyForm" inline style="margin-bottom: 8px">
        <el-form-item label="Webhook URLs">
          <el-input v-model="lifecycleNotifyForm.webhookUrlsText" placeholder="逗号分隔，可留空走后端默认" style="width: 280px" />
        </el-form-item>
        <el-form-item label="通知邮箱">
          <el-input v-model="lifecycleNotifyForm.emailsText" placeholder="逗号分隔，可留空走后端默认" style="width: 260px" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="lifecycleNotifyForm.dryRun">仅预览</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="lifecycleNotifyLoading" @click="handleSendLifecycleReminders">发送提醒</el-button>
        </el-form-item>
      </el-form>
      <el-table :data="lifecycleReminders" border size="small" v-loading="lifecycleReminderLoading">
        <el-table-column prop="templateKey" label="模板Key" width="200" />
        <el-table-column prop="type" label="类型" width="160" />
        <el-table-column prop="level" label="级别" width="100" />
        <el-table-column prop="days" label="天数" width="80" />
        <el-table-column prop="message" label="提醒" min-width="220" />
      </el-table>
      <pre v-if="lifecycleNotifyResult" class="json-block" style="margin-top: 8px">{{ formatJson(lifecycleNotifyResult) }}</pre>
      <template #footer>
        <el-button @click="lifecycleReminderVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectStore } from '../store/project'

const projectStore = useProjectStore()
const router = useRouter()
const loading = ref(false)
const dashboardLoading = ref(false)
const tableData = ref([])
const projects = ref([])
const dialogVisible = ref(false)
const dialogTitle = ref('')
const saveLoading = ref(false)
const executeDialogVisible = ref(false)
const executeLoading = ref(false)
const executeVariablesText = ref('{}')
const currentScenario = ref(null)
const executionDrawerVisible = ref(false)
const executionDrawerTitle = ref('执行记录')
const executionLoading = ref(false)
const executionList = ref([])
const executionDetailVisible = ref(false)
const currentExecution = ref(null)
const createTaskDialogVisible = ref(false)
const createTaskLoading = ref(false)
const templateDialogVisible = ref(false)
const templateCreateLoading = ref(false)
const templateExchangeVisible = ref(false)
const templateExchangeMode = ref('export')
const templateExchangeTitle = ref('模板导出')
const templateExchangeText = ref('')
const templateExchangeLoading = ref(false)
const templateAuditVisible = ref(false)
const templateAuditLoading = ref(false)
const templateAuditList = ref([])
const templateAuditDiff = ref(null)
const qualityPolicyVisible = ref(false)
const qualityPolicyLoading = ref(false)
const qualityPolicySaving = ref(false)
const qualityPolicies = ref([])
const governanceRuleVisible = ref(false)
const governanceRuleLoading = ref(false)
const governanceRuleSaving = ref(false)
const governanceExecuteLoading = ref(false)
const governanceRules = ref([])
const governanceExecuteResult = ref(null)
const lifecycleReminderVisible = ref(false)
const lifecycleReminderLoading = ref(false)
const lifecycleReminders = ref([])
const lifecycleNotifyLoading = ref(false)
const lifecycleNotifyResult = ref(null)
const formRef = ref()

const queryForm = reactive({
  projectId: '',
  status: '',
  name: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const executionPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})
const dashboardDays = ref(7)
const templates = ref([])
const templateVariableRows = ref([])
const retryPresets = ref([])
const dashboard = reactive({
  summary: {
    totalScenarioTasks: 0,
    scheduledScenarioTasks: 0,
    executedRuns: 0,
    passedRuns: 0,
    failedRuns: 0,
    passRate: 0,
  },
  dailyTrend: [],
  topFailureReasons: [],
  taskLeaderboard: [],
})
const retryOverview = reactive({
  summary: {
    totalRuns: 0,
    retriedRuns: 0,
    retrySuccessRuns: 0,
    retryFailedRuns: 0,
    noRetryFailedRuns: 0,
    averageAttempts: 0,
  },
  attemptsDistribution: [],
  topFailureReasonsAfterRetry: [],
})
const costAnalysis = reactive({
  summary: {
    totalRuns: 0,
    totalAttempts: 0,
    extraAttempts: 0,
    averageAttemptsPerRun: 0,
    totalDurationMs: 0,
    averageDurationMsPerRun: 0,
    retryCostRatio: 0,
  },
  costByAttempts: [],
  topExpensiveTasks: [],
  topFailureReasonsByCost: [],
})
const costQualityAlerts = reactive({
  thresholds: {
    minRuns: 3,
    maxQualityScore: 70,
    minRetryCostRatio: 25,
  },
  totalCandidates: 0,
  alerts: [],
})

const taskForm = reactive({
  scenarioId: '',
  projectId: '',
  name: '',
  priority: 'medium',
  executeType: 'immediate',
  scheduledTime: '',
  executeEnvironments: ['test'],
  executeNow: false,
  retryPresetKey: 'ecommerce-default',
  retryEnabled: true,
  maxRetries: 1,
  backoffBaseMs: 500,
  backoffMaxMs: 5000,
  retryOnReasonsText: 'runner_timeout,runner_unreachable,queue_timeout,http_502,http_503,http_504',
  skipRetryOnReasonsText: 'auth_failed,http_400,http_401,http_403,http_404',
  retryOnFailureTypesText: 'timeout,network,http_5xx',
  skipRetryOnFailureTypesText: 'auth,http_4xx',
})

const templateForm = reactive({
  templateKey: '',
  projectId: '',
  name: '',
  variablesText: '{\n  "baseUrl": "https://example.com"\n}',
})

const qualityPolicyForm = reactive({
  businessLine: 'general',
  description: '',
  enabled: true,
  structure: 0.25,
  assertions: 0.35,
  variableDependency: 0.25,
  maintainability: 0.15,
})

const governanceRuleForm = reactive({
  businessLine: 'general',
  description: '',
  enabled: true,
  autoRejectPendingReviewEnabled: true,
  pendingReviewTimeoutDays: 2,
  autoDeprecatedRejectedEnabled: true,
  rejectedNotFixedDays: 14,
  autoReleaseApprovedEnabled: false,
  autoDeprecatedLowQualityEnabled: false,
  lowQualityThreshold: 60,
})

const lifecycleNotifyForm = reactive({
  webhookUrlsText: '',
  emailsText: '',
  dryRun: false,
})

const form = reactive({
  id: '',
  projectId: '',
  name: '',
  description: '',
  status: 'draft',
  defaultVariablesText: '{}',
  steps: [],
  stepsText: `[
  {
    "name": "登录",
    "method": "POST",
    "url": "{{baseUrl}}/api/login",
    "body": {
      "username": "test",
      "password": "123456"
    },
    "extractors": [
      {
        "name": "token",
        "source": "response.body",
        "path": "data.token"
      }
    ],
    "assertions": [
      {
        "source": "response.status",
        "operator": "eq",
        "expected": 200
      }
    ]
  },
  {
    "name": "查询用户信息",
    "method": "GET",
    "url": "{{baseUrl}}/api/user/profile",
    "headers": {
      "Authorization": "Bearer {{token}}"
    },
    "assertions": [
      {
        "source": "response.status",
        "operator": "eq",
        "expected": 200
      }
    ]
  }
]`,
})

const statusLabelMap = {
  draft: '草稿',
  active: '启用',
  disabled: '停用',
}

const statusTagType = {
  draft: 'info',
  active: 'success',
  disabled: 'warning',
}

const rules = {
  name: [{ required: true, message: '请输入场景名称', trigger: 'blur' }],
  stepsText: [{ required: true, message: '请填写步骤JSON', trigger: 'blur' }],
}

const buildEditorStep = (step = {}) => ({
  __key: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  name: step.name || '',
  method: String(step.method || 'GET').toUpperCase(),
  url: step.url || '',
  timeoutMs: Number(step.timeoutMs || 30000),
  continueOnFailure: Boolean(step.continueOnFailure),
  onPassedStepIndex: Number.isInteger(step.onPassedStepIndex) ? Number(step.onPassedStepIndex) : undefined,
  onFailedStepIndex: Number.isInteger(step.onFailedStepIndex) ? Number(step.onFailedStepIndex) : undefined,
  headersText: JSON.stringify(step.headers || {}, null, 2),
  queryText: JSON.stringify(step.query || {}, null, 2),
  bodyText: step.body === undefined ? '' : JSON.stringify(step.body, null, 2),
  assertionsText: JSON.stringify(step.assertions || [], null, 2),
  extractorsText: JSON.stringify(step.extractors || [], null, 2),
  branchRulesText: JSON.stringify(step.branchRules || [], null, 2),
})

const projectNameMap = computed(() => {
  return Object.fromEntries(projects.value.map((item) => [item.id, item.name]))
})

const selectedTemplate = computed(() => {
  return templates.value.find((item) => item.key === templateForm.templateKey) || null
})

const templateStatusLabel = {
  draft: '草稿',
  pending_review: '待审核',
  approved: '已通过',
  rejected: '已驳回',
}

const templateStatusTagType = {
  draft: 'info',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
}

const templateLifecycleLabel = {
  active: '启用',
  deprecated: '已废弃',
  archived: '已归档',
}

const templateLifecycleTagType = {
  active: 'success',
  deprecated: 'warning',
  archived: 'info',
}

const templateQualityLabel = {
  high: '高',
  medium: '中',
  low: '低',
}

const templateQualityTagType = {
  high: 'success',
  medium: 'warning',
  low: 'danger',
}

const inferTemplateValueType = (value) => {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (value && typeof value === 'object') return 'json'
  return 'string'
}

const toTemplateEditorValue = (type, value) => {
  if (type === 'json') {
    try {
      return JSON.stringify(value ?? {}, null, 2)
    } catch {
      return '{}'
    }
  }
  return value ?? (type === 'number' ? 0 : type === 'boolean' ? false : '')
}

const initTemplateVariableRows = (overrides = {}) => {
  const defaults = selectedTemplate.value?.defaultVariables || {}
  const merged = { ...defaults, ...(overrides || {}) }
  const keys = Object.keys(merged)

  templateVariableRows.value = keys.map((key) => {
    const defaultValue = defaults[key]
    const value = merged[key]
    const type = inferTemplateValueType(defaultValue !== undefined ? defaultValue : value)
    return {
      key,
      type,
      value: toTemplateEditorValue(type, value),
    }
  })
}

const parseTemplateVariablesFromRows = () => {
  const result = {}
  for (const row of templateVariableRows.value) {
    if (!row.key) continue
    if (row.type === 'json') {
      try {
        result[row.key] = JSON.parse(String(row.value || '{}'))
      } catch {
        throw new Error(`模板参数 ${row.key} 的 JSON 格式不正确`)
      }
      continue
    }
    if (row.type === 'number') {
      result[row.key] = Number(row.value || 0)
      continue
    }
    if (row.type === 'boolean') {
      result[row.key] = Boolean(row.value)
      continue
    }
    result[row.key] = String(row.value ?? '')
  }
  return result
}

const loadProjects = async () => {
  const res = await api.get('/projects', { params: { page: 1, pageSize: 100 } })
  projects.value = res.data.list || []
}

const loadTemplates = async () => {
  const res = await api.get('/integration-scenarios/templates')
  templates.value = Array.isArray(res.data) ? res.data : []
}

const loadRetryPresets = async () => {
  const res = await api.get('/test-tasks/observability/scenario-retry-presets')
  retryPresets.value = Array.isArray(res.data) ? res.data : []
}

const handleApplyRetryPreset = () => {
  const preset = retryPresets.value.find((item) => item.key === taskForm.retryPresetKey)
  if (!preset?.config) {
    ElMessage.warning('请先选择推荐策略')
    return
  }

  const cfg = preset.config
  taskForm.retryEnabled = Boolean(cfg.enabled)
  taskForm.maxRetries = Number(cfg.maxRetries || 0)
  taskForm.backoffBaseMs = Number(cfg.backoffBaseMs || 500)
  taskForm.backoffMaxMs = Number(cfg.backoffMaxMs || 5000)
  taskForm.retryOnReasonsText = (cfg.retryOnReasons || []).join(',')
  taskForm.skipRetryOnReasonsText = (cfg.skipRetryOnReasons || []).join(',')
  taskForm.retryOnFailureTypesText = (cfg.retryOnFailureTypes || []).join(',')
  taskForm.skipRetryOnFailureTypesText = (cfg.skipRetryOnFailureTypes || []).join(',')
  ElMessage.success(`已套用策略：${preset.name}`)
}

const handleExportTemplates = async () => {
  const res = await api.get('/integration-scenarios/templates/export')
  templateExchangeMode.value = 'export'
  templateExchangeTitle.value = '模板导出（可复制共享）'
  templateExchangeText.value = JSON.stringify(res.data, null, 2)
  templateExchangeVisible.value = true
}

const handleOpenImportTemplates = () => {
  templateExchangeMode.value = 'import'
  templateExchangeTitle.value = '模板导入'
  templateExchangeText.value = '{\n  "overwrite": true,\n  "templates": []\n}'
  templateExchangeVisible.value = true
}

const handleSubmitImportTemplates = async () => {
  let payload
  try {
    payload = JSON.parse(String(templateExchangeText.value || '{}'))
  } catch {
    ElMessage.error('模板导入JSON格式不正确')
    return
  }

  templateExchangeLoading.value = true
  try {
    const res = await api.post('/integration-scenarios/templates/import', payload)
    await loadTemplates()
    ElMessage.success(`导入完成：成功 ${res.data?.imported || 0}，跳过 ${res.data?.skipped || 0}`)
    templateExchangeVisible.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '模板导入失败')
  } finally {
    templateExchangeLoading.value = false
  }
}

const handleSubmitTemplateReview = async () => {
  if (!selectedTemplate.value?.key || selectedTemplate.value.source !== 'custom') return
  try {
    await api.post(`/integration-scenarios/templates/${selectedTemplate.value.key}/submit`)
    await loadTemplates()
    ElMessage.success('模板已提交审核')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '提交审核失败')
  }
}

const handleReviewTemplate = async (action) => {
  if (!selectedTemplate.value?.key || selectedTemplate.value.source !== 'custom') return

  let comment = ''
  if (action === 'reject') {
    try {
      const res = await ElMessageBox.prompt('请输入驳回原因', '模板审核驳回', {
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：步骤断言不完整',
      })
      comment = res.value
    } catch {
      return
    }
  }

  try {
    await api.post(`/integration-scenarios/templates/${selectedTemplate.value.key}/review`, {
      action,
      comment,
    })
    await loadTemplates()
    ElMessage.success(action === 'approve' ? '模板审核通过' : '模板已驳回')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '模板审核失败')
  }
}

const handleOpenTemplateAuditArchive = async () => {
  if (!selectedTemplate.value?.key || selectedTemplate.value.source !== 'custom') return
  templateAuditVisible.value = true
  templateAuditDiff.value = null
  templateAuditLoading.value = true
  try {
    const res = await api.get(`/integration-scenarios/templates/${selectedTemplate.value.key}/audits`, {
      params: { page: 1, pageSize: 50 },
    })
    templateAuditList.value = res.data?.list || []
  } finally {
    templateAuditLoading.value = false
  }
}

const handleLoadTemplateAuditDiff = async () => {
  if (!selectedTemplate.value?.key || selectedTemplate.value.source !== 'custom') return
  const res = await api.get(`/integration-scenarios/templates/${selectedTemplate.value.key}/audits/diff`)
  templateAuditDiff.value = res.data
}

const loadQualityPolicies = async () => {
  qualityPolicyLoading.value = true
  try {
    const res = await api.get('/integration-scenarios/templates/quality-policies')
    qualityPolicies.value = Array.isArray(res.data) ? res.data : []
  } finally {
    qualityPolicyLoading.value = false
  }
}

const handleOpenQualityPolicyDialog = async () => {
  await loadQualityPolicies()
  const first = qualityPolicies.value[0]
  if (first) {
    handleSelectQualityPolicy(first)
  }
  qualityPolicyVisible.value = true
}

const handleSelectQualityPolicy = (row) => {
  qualityPolicyForm.businessLine = row.businessLine || 'general'
  qualityPolicyForm.description = row.description || ''
  qualityPolicyForm.enabled = row.enabled !== false
  qualityPolicyForm.structure = Number(row.weights?.structure ?? 0.25)
  qualityPolicyForm.assertions = Number(row.weights?.assertions ?? 0.35)
  qualityPolicyForm.variableDependency = Number(row.weights?.variableDependency ?? 0.25)
  qualityPolicyForm.maintainability = Number(row.weights?.maintainability ?? 0.15)
}

const handleSaveQualityPolicy = async () => {
  const businessLine = String(qualityPolicyForm.businessLine || '').trim()
  if (!businessLine) {
    ElMessage.warning('业务线不能为空')
    return
  }

  const payload = {
    description: qualityPolicyForm.description,
    enabled: Boolean(qualityPolicyForm.enabled),
    structure: Number(qualityPolicyForm.structure || 0),
    assertions: Number(qualityPolicyForm.assertions || 0),
    variableDependency: Number(qualityPolicyForm.variableDependency || 0),
    maintainability: Number(qualityPolicyForm.maintainability || 0),
  }
  const sum = payload.structure + payload.assertions + payload.variableDependency + payload.maintainability
  if (sum <= 0) {
    ElMessage.warning('权重总和必须大于0')
    return
  }

  qualityPolicySaving.value = true
  try {
    await api.put(`/integration-scenarios/templates/quality-policies/${businessLine}`, payload)
    ElMessage.success('评分策略已保存')
    await loadQualityPolicies()
    await loadTemplates()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '评分策略保存失败')
  } finally {
    qualityPolicySaving.value = false
  }
}

const loadGovernanceRules = async () => {
  governanceRuleLoading.value = true
  try {
    const res = await api.get('/integration-scenarios/templates/governance-rules')
    governanceRules.value = Array.isArray(res.data) ? res.data : []
  } finally {
    governanceRuleLoading.value = false
  }
}

const handleSelectGovernanceRule = (row) => {
  governanceRuleForm.businessLine = row.businessLine || 'general'
  governanceRuleForm.description = row.description || ''
  governanceRuleForm.enabled = row.enabled !== false
  governanceRuleForm.autoRejectPendingReviewEnabled = row.autoRejectPendingReviewEnabled !== false
  governanceRuleForm.pendingReviewTimeoutDays = Number(row.pendingReviewTimeoutDays ?? 2)
  governanceRuleForm.autoDeprecatedRejectedEnabled = row.autoDeprecatedRejectedEnabled !== false
  governanceRuleForm.rejectedNotFixedDays = Number(row.rejectedNotFixedDays ?? 14)
  governanceRuleForm.autoReleaseApprovedEnabled = Boolean(row.autoReleaseApprovedEnabled)
  governanceRuleForm.autoDeprecatedLowQualityEnabled = Boolean(row.autoDeprecatedLowQualityEnabled)
  governanceRuleForm.lowQualityThreshold = Number(row.lowQualityThreshold ?? 60)
}

const handleOpenGovernanceRuleDialog = async () => {
  await loadGovernanceRules()
  const first = governanceRules.value[0]
  if (first) {
    handleSelectGovernanceRule(first)
  }
  governanceExecuteResult.value = null
  governanceRuleVisible.value = true
}

const handleSaveGovernanceRule = async () => {
  const businessLine = String(governanceRuleForm.businessLine || '').trim()
  if (!businessLine) {
    ElMessage.warning('业务线不能为空')
    return
  }

  governanceRuleSaving.value = true
  try {
    await api.put(`/integration-scenarios/templates/governance-rules/${businessLine}`, {
      description: governanceRuleForm.description,
      enabled: Boolean(governanceRuleForm.enabled),
      autoRejectPendingReviewEnabled: Boolean(governanceRuleForm.autoRejectPendingReviewEnabled),
      pendingReviewTimeoutDays: Number(governanceRuleForm.pendingReviewTimeoutDays || 2),
      autoDeprecatedRejectedEnabled: Boolean(governanceRuleForm.autoDeprecatedRejectedEnabled),
      rejectedNotFixedDays: Number(governanceRuleForm.rejectedNotFixedDays || 14),
      autoReleaseApprovedEnabled: Boolean(governanceRuleForm.autoReleaseApprovedEnabled),
      autoDeprecatedLowQualityEnabled: Boolean(governanceRuleForm.autoDeprecatedLowQualityEnabled),
      lowQualityThreshold: Number(governanceRuleForm.lowQualityThreshold || 60),
    })
    ElMessage.success('自动流转规则已保存')
    await loadGovernanceRules()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '自动流转规则保存失败')
  } finally {
    governanceRuleSaving.value = false
  }
}

const handleExecuteGovernanceRules = async (dryRun = true) => {
  governanceExecuteLoading.value = true
  try {
    const res = await api.post('/integration-scenarios/templates/governance-rules/execute', {
      businessLine: String(governanceRuleForm.businessLine || '').trim() || undefined,
      dryRun,
    })
    governanceExecuteResult.value = res.data
    ElMessage.success(dryRun ? '规则预览完成' : '自动流转执行完成')
    if (!dryRun) {
      await loadTemplates()
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '自动流转执行失败')
  } finally {
    governanceExecuteLoading.value = false
  }
}

const handleUpdateTemplateLifecycle = async (lifecycleStatus) => {
  if (!selectedTemplate.value?.key || selectedTemplate.value.source !== 'custom') return

  let comment = ''
  if (lifecycleStatus !== 'active') {
    try {
      const res = await ElMessageBox.prompt('请输入生命周期变更备注', '模板生命周期治理', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputPlaceholder: lifecycleStatus === 'deprecated' ? '例如：接口已下线待替换' : '例如：长期不再维护，转归档',
      })
      comment = res.value
    } catch {
      return
    }
  }

  try {
    await api.put(`/integration-scenarios/templates/${selectedTemplate.value.key}/lifecycle`, {
      lifecycleStatus,
      comment,
    })
    await loadTemplates()
    ElMessage.success('模板生命周期已更新')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '生命周期更新失败')
  }
}

const handleOpenLifecycleReminderDialog = async () => {
  lifecycleReminderVisible.value = true
  lifecycleReminderLoading.value = true
  lifecycleNotifyResult.value = null
  try {
    const res = await api.get('/integration-scenarios/templates/lifecycle-reminders')
    lifecycleReminders.value = Array.isArray(res.data?.reminders) ? res.data.reminders : []
  } finally {
    lifecycleReminderLoading.value = false
  }
}

const handleSendLifecycleReminders = async () => {
  const parseList = (text) => String(text || '').split(',').map((item) => item.trim()).filter(Boolean)

  lifecycleNotifyLoading.value = true
  try {
    const res = await api.post('/integration-scenarios/templates/lifecycle-reminders/notify', {
      webhookUrls: parseList(lifecycleNotifyForm.webhookUrlsText),
      emails: parseList(lifecycleNotifyForm.emailsText),
      dryRun: Boolean(lifecycleNotifyForm.dryRun),
    })
    lifecycleNotifyResult.value = res.data
    ElMessage.success(lifecycleNotifyForm.dryRun ? '预览完成' : '提醒发送完成')
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '发送提醒失败')
  } finally {
    lifecycleNotifyLoading.value = false
  }
}

const handleOpenTemplateDialog = async () => {
  if (!templates.value.length) {
    await loadTemplates()
  }
  templateForm.templateKey = templates.value[0]?.key || ''
  templateForm.projectId = projectStore.selectedProjectId || ''
  templateForm.name = ''
  initTemplateVariableRows()
  templateForm.variablesText = JSON.stringify(parseTemplateVariablesFromRows(), null, 2)
  templateDialogVisible.value = true
}

const handleSyncTemplateVariablesFromJson = () => {
  try {
    const parsed = JSON.parse(String(templateForm.variablesText || '{}'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid json')
    }
    initTemplateVariableRows(parsed)
    ElMessage.success('已从JSON同步模板参数')
  } catch {
    ElMessage.error('变量覆盖 JSON 格式不正确，无法同步参数')
  }
}

const handleSyncTemplateVariablesToJson = () => {
  try {
    templateForm.variablesText = JSON.stringify(parseTemplateVariablesFromRows(), null, 2)
    ElMessage.success('模板参数已写回 JSON')
  } catch (error) {
    ElMessage.error(error.message || '模板参数写回失败')
  }
}

const handleCreateFromTemplate = async () => {
  if (!templateForm.templateKey) {
    ElMessage.warning('请先选择模板')
    return
  }

  let variables
  try {
    variables = parseTemplateVariablesFromRows()
    templateForm.variablesText = JSON.stringify(variables, null, 2)
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
      throw new Error('invalid vars')
    }
  } catch {
    ElMessage.error('变量覆盖 JSON 格式不正确，且必须是对象')
    return
  }

  templateCreateLoading.value = true
  try {
    await api.post(`/integration-scenarios/templates/${templateForm.templateKey}`, {
      projectId: templateForm.projectId || undefined,
      name: templateForm.name || undefined,
      variables,
    })
    templateDialogVisible.value = false
    ElMessage.success('模板场景创建成功')
    await loadData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '模板创建失败')
  } finally {
    templateCreateLoading.value = false
  }
}

const loadDashboard = async () => {
  dashboardLoading.value = true
  try {
    const params = {
      days: dashboardDays.value,
      ...(queryForm.projectId ? { projectId: queryForm.projectId } : {}),
    }
    const res = await api.get('/test-tasks/observability/scenario-regression-dashboard', { params })
    const retryRes = await api.get('/test-tasks/observability/scenario-retry-overview', { params })
    const costRes = await api.get('/test-tasks/observability/scenario-cost-analysis', { params })
    const costQualityRes = await api.get('/test-tasks/observability/scenario-cost-quality-alerts', { params })
    Object.assign(dashboard.summary, res.data?.summary || {})
    dashboard.dailyTrend = Array.isArray(res.data?.dailyTrend) ? res.data.dailyTrend : []
    dashboard.topFailureReasons = Array.isArray(res.data?.topFailureReasons) ? res.data.topFailureReasons : []
    dashboard.taskLeaderboard = Array.isArray(res.data?.taskLeaderboard) ? res.data.taskLeaderboard : []

    Object.assign(retryOverview.summary, retryRes.data?.summary || {})
    retryOverview.attemptsDistribution = Array.isArray(retryRes.data?.attemptsDistribution)
      ? retryRes.data.attemptsDistribution
      : []
    retryOverview.topFailureReasonsAfterRetry = Array.isArray(retryRes.data?.topFailureReasonsAfterRetry)
      ? retryRes.data.topFailureReasonsAfterRetry
      : []

    Object.assign(costAnalysis.summary, costRes.data?.summary || {})
    costAnalysis.costByAttempts = Array.isArray(costRes.data?.costByAttempts)
      ? costRes.data.costByAttempts
      : []
    costAnalysis.topExpensiveTasks = Array.isArray(costRes.data?.topExpensiveTasks)
      ? costRes.data.topExpensiveTasks
      : []
    costAnalysis.topFailureReasonsByCost = Array.isArray(costRes.data?.topFailureReasonsByCost)
      ? costRes.data.topFailureReasonsByCost
      : []

    Object.assign(costQualityAlerts.thresholds, costQualityRes.data?.thresholds || {})
    costQualityAlerts.totalCandidates = Number(costQualityRes.data?.totalCandidates || 0)
    costQualityAlerts.alerts = Array.isArray(costQualityRes.data?.alerts) ? costQualityRes.data.alerts : []
  } finally {
    dashboardLoading.value = false
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...(queryForm.projectId ? { projectId: queryForm.projectId } : {}),
      ...(queryForm.status ? { status: queryForm.status } : {}),
      ...(queryForm.name ? { name: queryForm.name } : {}),
    }
    const res = await api.get('/integration-scenarios', { params })
    tableData.value = res.data.list || []
    pagination.total = Number(res.data.total || 0)
    await loadDashboard()
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  queryForm.projectId = projectStore.selectedProjectId || ''
  queryForm.status = ''
  queryForm.name = ''
  pagination.page = 1
  loadData()
}

const executionRowClassName = ({ row }) => {
  return row.status === 'failed' ? 'failed-row' : ''
}

const parseJsonObject = (text, fallback, errorMessage) => {
  const raw = String(text || '').trim()
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not object')
      }
    }
    if (Array.isArray(fallback) && !Array.isArray(parsed)) {
      throw new Error('not array')
    }
    return parsed
  } catch {
    throw new Error(errorMessage)
  }
}

const parseJsonAny = (text, errorMessage) => {
  try {
    return JSON.parse(String(text || '').trim())
  } catch {
    throw new Error(errorMessage)
  }
}

const handleAddStep = () => {
  form.steps.push(buildEditorStep())
}

const handleRemoveStep = (index) => {
  form.steps.splice(index, 1)
}

const handleSyncStepsFromJson = () => {
  try {
    const steps = parseJsonObject(form.stepsText, [], '步骤 JSON 格式不正确，且必须是数组')
    form.steps = steps.map((item) => buildEditorStep(item || {}))
    ElMessage.success(`已从JSON加载 ${form.steps.length} 个步骤`)
  } catch (error) {
    ElMessage.error(error.message || '步骤 JSON 解析失败')
  }
}

const buildStepsFromEditor = () => {
  return form.steps.map((step, index) => {
    const headers = parseJsonObject(step.headersText, {}, `步骤${index + 1} 的 headers JSON 不合法`)
    const query = parseJsonObject(step.queryText, {}, `步骤${index + 1} 的 query JSON 不合法`)
    const body = String(step.bodyText || '').trim() ? parseJsonAny(step.bodyText, `步骤${index + 1} 的 body JSON 不合法`) : undefined
    const assertions = parseJsonObject(step.assertionsText, [], `步骤${index + 1} 的 assertions JSON 不合法`) || []
    const extractors = parseJsonObject(step.extractorsText, [], `步骤${index + 1} 的 extractors JSON 不合法`) || []
    const branchRules = parseJsonObject(step.branchRulesText, [], `步骤${index + 1} 的 branchRules JSON 不合法`) || []

    return {
      name: step.name,
      method: String(step.method || 'GET').toUpperCase(),
      url: step.url,
      timeoutMs: Number(step.timeoutMs || 30000),
      continueOnFailure: Boolean(step.continueOnFailure),
      onPassedStepIndex: Number.isInteger(step.onPassedStepIndex) ? Number(step.onPassedStepIndex) : undefined,
      onFailedStepIndex: Number.isInteger(step.onFailedStepIndex) ? Number(step.onFailedStepIndex) : undefined,
      headers,
      query,
      body,
      assertions,
      extractors,
      branchRules,
    }
  })
}

const handleSyncStepsToJson = () => {
  try {
    const steps = buildStepsFromEditor()
    form.stepsText = JSON.stringify(steps, null, 2)
    ElMessage.success('已将可视化步骤同步到JSON')
  } catch (error) {
    ElMessage.error(error.message || '同步失败')
  }
}

const handleAdd = () => {
  Object.assign(form, {
    id: '',
    projectId: projectStore.selectedProjectId || '',
    name: '',
    description: '',
    status: 'draft',
    defaultVariablesText: '{}',
    steps: [],
  })
  form.steps = [buildEditorStep()]
  handleSyncStepsToJson()
  dialogTitle.value = '新建接口集成场景'
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(form, {
    id: row.id,
    projectId: row.projectId || '',
    name: row.name || '',
    description: row.description || '',
    status: row.status || 'draft',
    defaultVariablesText: JSON.stringify(row.defaultVariables || {}, null, 2),
    stepsText: JSON.stringify(Array.isArray(row.steps) ? row.steps : [], null, 2),
  })
  form.steps = (Array.isArray(row.steps) ? row.steps : []).map((item) => buildEditorStep(item || {}))
  dialogTitle.value = '编辑接口集成场景'
  dialogVisible.value = true
}

const handleSave = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  let steps
  let defaultVariables
  try {
    if (form.steps.length) {
      steps = buildStepsFromEditor()
      form.stepsText = JSON.stringify(steps, null, 2)
    } else {
      steps = JSON.parse(String(form.stepsText || '[]'))
    }
    if (!Array.isArray(steps)) throw new Error('steps must be array')
  } catch {
    ElMessage.error('步骤 JSON 格式不正确，且必须是数组')
    return
  }

  try {
    defaultVariables = JSON.parse(String(form.defaultVariablesText || '{}'))
    if (!defaultVariables || typeof defaultVariables !== 'object' || Array.isArray(defaultVariables)) {
      throw new Error('defaultVariables must be object')
    }
  } catch {
    ElMessage.error('默认变量 JSON 格式不正确，且必须是对象')
    return
  }

  const payload = {
    projectId: form.projectId || undefined,
    name: form.name,
    description: form.description || undefined,
    status: form.status,
    defaultVariables,
    steps,
  }

  saveLoading.value = true
  try {
    if (form.id) {
      await api.put(`/integration-scenarios/${form.id}`, payload)
      ElMessage.success('场景更新成功')
    } else {
      await api.post('/integration-scenarios', payload)
      ElMessage.success('场景创建成功')
    }
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '场景保存失败')
  } finally {
    saveLoading.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.prompt(
      `为避免误删，请输入场景名称进行确认：${row.name}`,
      '二次确认删除',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入场景名称',
        inputValidator: (value) => (String(value || '').trim() === String(row.name || '').trim() ? true : '输入的场景名称不一致')
      }
    )
  } catch {
    return
  }

  await api.delete(`/integration-scenarios/${row.id}`)
  ElMessage.success('场景删除成功')
  await loadData()
}

const handleOpenExecute = (row) => {
  currentScenario.value = row
  executeVariablesText.value = JSON.stringify(row.defaultVariables || {}, null, 2)
  executeDialogVisible.value = true
}

const handleRerunExecution = (row) => {
  const variables = row.inputVariables || currentExecution.value?.inputVariables || currentScenario.value?.defaultVariables || {}
  executeVariablesText.value = JSON.stringify(variables, null, 2)
  executeDialogVisible.value = true
}

const handleExecute = async () => {
  if (!currentScenario.value?.id) return

  let variables
  try {
    variables = JSON.parse(String(executeVariablesText.value || '{}'))
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
      throw new Error('variables must be object')
    }
  } catch {
    ElMessage.error('执行变量 JSON 格式不正确，且必须是对象')
    return
  }

  executeLoading.value = true
  try {
    const res = await api.post(`/integration-scenarios/${currentScenario.value.id}/execute`, {
      variables,
    })
    executeDialogVisible.value = false
    ElMessage.success(`执行完成：${res.data?.status || '-'}`)
    await handleViewExecutions(currentScenario.value)
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '场景执行失败')
  } finally {
    executeLoading.value = false
  }
}

const handleViewExecutions = async (row) => {
  currentScenario.value = row
  executionDrawerTitle.value = `执行记录 - ${row.name}`
  executionPagination.page = 1
  executionDrawerVisible.value = true
  await loadExecutions()
}

const loadExecutions = async () => {
  if (!currentScenario.value?.id) return
  executionLoading.value = true
  try {
    const res = await api.get(`/integration-scenarios/${currentScenario.value.id}/executions`, {
      params: {
        page: executionPagination.page,
        pageSize: executionPagination.pageSize,
      },
    })
    executionList.value = res.data.list || []
    executionPagination.total = Number(res.data.total || 0)
  } finally {
    executionLoading.value = false
  }
}

const handleExecutionPageChange = async (page) => {
  executionPagination.page = page
  await loadExecutions()
}

const handleExecutionSizeChange = async (size) => {
  executionPagination.pageSize = size
  executionPagination.page = 1
  await loadExecutions()
}

const handleViewExecutionDetail = async (row) => {
  const res = await api.get(`/integration-scenarios/executions/${row.id}`)
  currentExecution.value = res.data
  executionDetailVisible.value = true
}

const handleOpenCreateTask = (row) => {
  taskForm.scenarioId = row.id
  taskForm.projectId = row.projectId || projectStore.selectedProjectId || ''
  taskForm.name = `Scenario回归 - ${row.name}`
  taskForm.priority = 'medium'
  taskForm.executeType = 'immediate'
  taskForm.scheduledTime = ''
  taskForm.executeEnvironments = ['test']
  taskForm.executeNow = false
  taskForm.retryPresetKey = retryPresets.value[0]?.key || 'ecommerce-default'
  taskForm.retryEnabled = true
  taskForm.maxRetries = 1
  taskForm.backoffBaseMs = 500
  taskForm.backoffMaxMs = 5000
  taskForm.retryOnReasonsText = 'runner_timeout,runner_unreachable,queue_timeout,http_502,http_503,http_504'
  taskForm.skipRetryOnReasonsText = 'auth_failed,http_400,http_401,http_403,http_404'
  taskForm.retryOnFailureTypesText = 'timeout,network,http_5xx'
  taskForm.skipRetryOnFailureTypesText = 'auth,http_4xx'
  if (taskForm.retryPresetKey) {
    handleApplyRetryPreset()
  }
  createTaskDialogVisible.value = true
}

const handleCreateTask = async () => {
  if (!taskForm.scenarioId) return
  if (!taskForm.name.trim()) {
    ElMessage.warning('请输入任务名称')
    return
  }
  if (taskForm.executeType === 'scheduled' && !taskForm.scheduledTime) {
    ElMessage.warning('请设置计划执行时间')
    return
  }
  if (!taskForm.executeEnvironments.length) {
    ElMessage.warning('请至少选择一个执行环境')
    return
  }

  createTaskLoading.value = true
  try {
    const parseReasonText = (value) => String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    const payload = {
      projectId: taskForm.projectId || undefined,
      name: taskForm.name.trim(),
      description: `由接口集成场景转换创建，scenarioId=${taskForm.scenarioId}`,
      type: 'regression_test',
      executeType: taskForm.executeType,
      executeEnvironments: taskForm.executeEnvironments,
      priority: taskForm.priority,
      scheduledTime: taskForm.executeType === 'scheduled' ? taskForm.scheduledTime : undefined,
      integrationScenarioId: taskForm.scenarioId,
      scenarioRetryConfig: {
        enabled: Boolean(taskForm.retryEnabled),
        maxRetries: Number(taskForm.maxRetries || 0),
        backoffBaseMs: Number(taskForm.backoffBaseMs || 500),
        backoffMaxMs: Number(taskForm.backoffMaxMs || 5000),
        retryOnReasons: parseReasonText(taskForm.retryOnReasonsText),
        skipRetryOnReasons: parseReasonText(taskForm.skipRetryOnReasonsText),
        retryOnFailureTypes: parseReasonText(taskForm.retryOnFailureTypesText),
        skipRetryOnFailureTypes: parseReasonText(taskForm.skipRetryOnFailureTypesText),
      },
    }
    const res = await api.post('/test-tasks', payload)
    const taskId = res.data?.id
    if (taskForm.executeNow && taskId) {
      await api.post(`/test-tasks/${taskId}/execute`, {
        environment: taskForm.executeEnvironments[0] || 'test',
      })
    }
    createTaskDialogVisible.value = false
    ElMessage.success(taskForm.executeNow ? '任务创建并触发执行成功' : '任务创建成功')
    await router.push({ path: '/test-tasks', query: { taskId } })
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '创建任务失败')
  } finally {
    createTaskLoading.value = false
  }
}

const formatJson = (value) => {
  try {
    return JSON.stringify(value ?? null, null, 2)
  } catch {
    return String(value)
  }
}

watch(
  () => templateForm.templateKey,
  (templateKey) => {
    if (!templateKey) {
      templateVariableRows.value = []
      templateForm.variablesText = '{}'
      return
    }
    initTemplateVariableRows()
    try {
      templateForm.variablesText = JSON.stringify(parseTemplateVariablesFromRows(), null, 2)
    } catch {
      templateForm.variablesText = '{}'
    }
  }
)

watch(
  templateVariableRows,
  () => {
    try {
      templateForm.variablesText = JSON.stringify(parseTemplateVariablesFromRows(), null, 2)
    } catch {
      // ignore temporary invalid JSON input in visual editor
    }
  },
  { deep: true }
)

onMounted(async () => {
  await loadProjects()
  await loadTemplates()
  await loadRetryPresets()
  if (projectStore.selectedProjectId) {
    queryForm.projectId = projectStore.selectedProjectId
  }
  await loadData()
})

watch(
  () => projectStore.selectedProjectId,
  async (projectId) => {
    queryForm.projectId = projectId || ''
    pagination.page = 1
    await loadData()
  }
)
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h2 {
  margin: 0;
}

.json-block {
  margin: 0;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow: auto;
}

.dashboard-header {
  font-weight: 600;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.metric-card {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 10px;
}

.metric-label {
  color: #606266;
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.metric-value.success {
  color: #67c23a;
}

.metric-value.danger {
  color: #f56c6c;
}

.metric-value.warning {
  color: #e6a23c;
}

.dashboard-panels {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
}

.retry-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(120px, 1fr));
  gap: 10px;
}

.panel-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.template-var-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.template-var-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 8px;
}

.template-var-item {
  padding: 8px;
  background: #f7f8fa;
  border-radius: 6px;
}

.template-var-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}

.template-review-bar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.template-quality-text {
  font-size: 12px;
  color: #606266;
}

.step-toolbar {
  width: 100%;
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.step-collapse {
  width: 100%;
}

.step-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

:deep(.failed-row) {
  --el-table-tr-bg-color: #fff2f0;
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .dashboard-panels {
    grid-template-columns: 1fr;
  }

  .retry-metrics {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }

  .template-var-grid {
    grid-template-columns: 1fr;
  }
}
</style>
