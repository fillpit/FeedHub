<template>
  <el-dialog :model-value="visible" :title="title" width="70%" top="5vh" @close="$emit('close')">
    <div class="debug-result-container">
      <div class="info">
        <p>
          <strong>执行状态:</strong>
          <el-tag :type="result?.success ? 'success' : 'danger'">
            {{ result?.success ? "成功" : "失败" }}
          </el-tag>
        </p>
        <p><strong>执行耗时:</strong> {{ result?.executionTime }} ms</p>
      </div>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="执行结果" name="result">
          <el-table
            border
            v-if="Array.isArray(result?.result)"
            :data="result?.result"
            size="small"
            style="width: 100%"
          >
            <el-table-column
              prop="image"
              label="封面"
              align="center"
              width="220"
              show-overflow-tooltip
            >
              <template #default="scope">
                <el-image :src="scope.row.image" fit="contain" style="height: 100%" />
              </template>
            </el-table-column>
            <el-table-column
              prop="title"
              label="标题"
              align="center"
              width="220"
              show-overflow-tooltip
            />
            <el-table-column prop="link" label="链接" align="center" show-overflow-tooltip />
            <el-table-column
              prop="content"
              label="内容"
              align="center"
              width="300"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <div class="content-preview">
                  <span>{{
                    row.content
                      ? row.content.length > 100
                        ? row.content.substring(0, 100) + "..."
                        : row.content
                      : "无内容"
                  }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column
              prop="pubDate"
              label="发布时间"
              width="200"
              align="center"
              show-overflow-tooltip
            />
            <el-table-column
              prop="author"
              label="作者"
              width="100"
              align="center"
              show-overflow-tooltip
            />
          </el-table>
          <pre v-else>{{ JSON.stringify(result?.result, null, 2) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="日志输出" name="logs">
          <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 10px">
            <span>日志等级：</span>
            <el-select v-model="logLevel" size="small" style="width: 120px">
              <el-option label="Debug" value="debug" />
              <el-option label="Info" value="info" />
              <el-option label="Warn" value="warn" />
              <el-option label="Error" value="error" />
              <el-option label="Fatal" value="fatal" />
            </el-select>
          </div>
          <div class="logs-panel">
            <div
              v-for="(log, index) in filteredLogs"
              :key="index"
              class="log-item"
              :class="getLogClass(log)"
            >
              {{ log }}
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane label="错误信息" name="error" v-if="!result?.success">
          <pre class="error-panel">{{ result?.error }}\n{{ result?.stack }}</pre>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="$emit('close')">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
const props = defineProps({
  visible: Boolean,
  title: { type: String, default: "调试结果" },
  result: { type: Object, required: true },
});
const emit = defineEmits(["close"]);
const activeTab = ref("result");
const logLevel = ref<"debug" | "info" | "warn" | "error" | "fatal">("info");
const logLevelMap = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
const filteredLogs = computed(() => {
  if (!props.result?.logs) return [];
  const minLevel = logLevelMap[logLevel.value];
  return props.result.logs.filter((log: string) => {
    if (log.includes("[FATAL]") || log.includes("[FATAL"))
      return logLevel.value === "fatal" ? true : minLevel <= 4;
    if (log.includes("[ERROR]") || log.includes("[ERROR")) return minLevel <= 3;
    if (log.includes("[WARN]") || log.includes("[WARN")) return minLevel <= 2;
    if (log.includes("[INFO]") || log.includes("[INFO")) return minLevel <= 1;
    if (log.includes("[DEBUG]") || log.includes("[DEBUG")) return minLevel <= 0;
    return true;
  });
});
function getLogClass(log: string) {
  if (log.includes("[ERROR]")) return "log-error";
  if (log.includes("[WARN]")) return "log-warn";
  if (log.includes("[INFO]")) return "log-info";
  if (log.includes("[DEBUG]")) return "log-debug";
  if (log.includes("[FATAL]")) return "log-fatal";
  return "";
}
watch(
  () => props.visible,
  (v) => {
    if (v) activeTab.value = "result";
  }
);
</script>

<style scoped>
.debug-result-container .info {
  margin-bottom: 20px;
}
.logs-panel {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}
.log-item {
  font-family: monospace;
  white-space: pre-wrap;
  padding: 2px 0;
  border-bottom: 1px solid #eee;
}
.log-error {
  color: #f56c6c;
}
.log-warn {
  color: #e6a23c;
}
.log-info {
  color: #67c23a;
}
.log-debug {
  color: #409eff;
}
.log-fatal {
  color: #fff;
  background: #f56c6c;
}
.error-panel {
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 10px;
  border-radius: 4px;
}
.dialog-footer {
  text-align: right;
}

.content-preview {
  max-width: 300px;
  text-align: left;

  span {
    display: block;
    line-height: 1.4;
    color: #606266;
    font-size: 13px;
    word-break: break-word;
    white-space: pre-wrap;
  }
}
</style>
