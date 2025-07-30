<template>
  <el-drawer v-model="visible" title="调试动态路由脚本" direction="rtl" size="50%">
    <div class="debug-container">
      <div class="debug-form">
        <h3>测试参数</h3>
        <div v-if="route.params && route.params.length > 0">
          <div v-for="(param, index) in route.params" :key="index" class="debug-param-item">
            <el-form-item :label="param.name" :prop="`testParams.${param.name}`">
              <el-input
                v-model="testParams[param.name]"
                :placeholder="`${param.description || '请输入参数值'} ${param.required ? '(必填)' : ''}`"
              />
            </el-form-item>
          </div>
        </div>
        <div v-else class="no-params">该路由没有配置参数</div>

        <div class="debug-actions">
          <el-button type="primary" @click="executeDebug" :loading="loading">执行调试</el-button>
        </div>
      </div>

      <el-divider />

      <div class="debug-result" v-if="debugResult">
        <h3>调试结果</h3>
        <el-alert
          :type="debugResult.success ? 'success' : 'error'"
          :title="debugResult.success ? '脚本执行成功' : '脚本执行失败'"
          :description="
            debugResult.success ? `耗时: ${debugResult.executionTime}ms` : debugResult.error
          "
          show-icon
        />

        <el-tabs v-model="activeTab" class="debug-tabs">
          <el-tab-pane label="执行结果" name="result">
            <div v-if="debugResult.success && debugResult.result">
              <el-table :data="debugResult.result.items" style="width: 100%">
                <el-table-column prop="title" label="标题" min-width="150" />
                <el-table-column prop="link" label="链接" min-width="200">
                  <template #default="{ row }">
                    <el-link :href="row.link" target="_blank" type="primary">{{
                      row.link
                    }}</el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="pubDate" label="发布日期" width="180" />
                <el-table-column prop="author" label="作者" width="120" />
              </el-table>
            </div>
            <div v-else-if="debugResult.success">
              <el-empty description="脚本执行成功，但没有返回数据" />
            </div>
            <div v-else>
              <el-empty description="脚本执行失败，请查看错误信息" />
            </div>
          </el-tab-pane>

          <el-tab-pane label="日志输出" name="logs">
            <div class="debug-logs">
              <div v-for="(log, index) in debugResult.logs" :key="index" class="log-item">
                <span
                  :class="{
                    'log-info': typeof log === 'string' && log.includes('[INFO]'),
                    'log-warn': log.includes('[WARN]'),
                    'log-error': log.includes('[ERROR]') || log.includes('[FATAL]'),
                    'log-debug': log.includes('[DEBUG]'),
                  }"
                >
                  {{ log }}
                </span>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="JSON视图" name="json">
            <pre class="json-view">{{ JSON.stringify(debugResult.result, null, 2) }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { debugDynamicRouteScript, type DynamicRouteConfig } from '@/api/dynamicRoute';

interface Props {
  modelValue: boolean;
  route: DynamicRouteConfig;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式状态
const loading = ref(false);
const testParams = ref<Record<string, unknown>>({});
const debugResult = ref<Record<string, any>>();
const activeTab = ref('result');

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// 重置调试状态
const resetDebugState = () => {
  testParams.value = {};
  debugResult.value = undefined;
  activeTab.value = 'result';
};

// 执行调试
const executeDebug = async () => {
  loading.value = true;
  try {
    const res = await debugDynamicRouteScript(props.route, testParams.value);

    if (res.code === 0) {
      debugResult.value = res.data as Record<string, unknown> | undefined;
      activeTab.value = 'result';
    } else {
      ElMessage.error(res.message || '脚本调试失败');
    }
  } catch (error) {
    console.error('调试脚本出错:', error);
    ElMessage.error('调试脚本出错');
  } finally {
    loading.value = false;
  }
};

// 监听对话框显示状态，重置调试状态
watch(visible, (newValue) => {
  if (newValue) {
    resetDebugState();
  }
});
</script>

<style scoped>
.debug-container {
  padding: 0;
}

.debug-form {
  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.debug-param-item {
  margin-bottom: 16px;
}

.no-params {
  color: #909399;
  font-size: 14px;
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 4px;
}

.debug-actions {
  margin-top: 20px;
  text-align: center;
}

.debug-result {
  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.debug-tabs {
  margin-top: 16px;
}

.debug-logs {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  
  .log-item {
    padding: 4px 0;
    border-bottom: 1px solid #e4e7ed;
    font-family: monospace;
    font-size: 12px;
    
    &:last-child {
      border-bottom: none;
    }
    
    .log-info {
      color: #409eff;
    }
    
    .log-warn {
      color: #e6a23c;
    }
    
    .log-error {
      color: #f56c6c;
    }
    
    .log-debug {
      color: #909399;
    }
  }
}

.json-view {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  max-height: 400px;
  overflow-y: auto;
}
</style>