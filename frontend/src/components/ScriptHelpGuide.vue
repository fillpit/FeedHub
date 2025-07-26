<template>
  <div class="script-help-guide">
    <!-- 对话框模式 -->
    <el-dialog v-if="mode === 'dialog'" v-model="visible" title="脚本帮助指南" width="60%">
      <div class="script-help-content">
        <ScriptHelpContent />
      </div>
    </el-dialog>
    
    <!-- 弹出框模式 -->
    <el-popover
      v-else
      placement="right"
      :width="500"
      trigger="click"
      popper-class="script-help-popover"
    >
      <template #reference>
        <el-button type="primary" size="small" plain>
          <el-icon><QuestionFilled /></el-icon>
          脚本工具说明
        </el-button>
      </template>
      
      <div class="help-content">
        <ScriptHelpContent :compact="true" />
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';
import { QuestionFilled } from '@element-plus/icons-vue';
import ScriptHelpContent from './ScriptHelpContent.vue';

interface Props {
  mode?: 'dialog' | 'popover';
  modelValue?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'popover',
  modelValue: false
});

const emit = defineEmits<Emits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});
</script>

<style scoped>
.script-help-guide {
  margin: 5px 0;
  display: inline-block;
}

.help-content {
  padding: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.tool-item {
  margin-bottom: 20px;
}

.tool-item h5 {
  font-weight: bold;
  margin-bottom: 5px;
  color: #409EFF;
}

.code-example {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 10px;
  margin-top: 5px;
  overflow-x: auto;
}

.code-example pre {
  margin: 0;
}

.code-example code {
  font-family: 'Courier New', Courier, monospace;
  white-space: pre;
}
</style>

<style>
/* 全局样式，确保弹出框有足够的宽度和高度 */
.script-help-popover .el-popover__title {
  font-weight: bold;
  color: #409EFF;
}

.script-help-popover {
  max-width: 90vw;
  max-height: 80vh;
}
</style>