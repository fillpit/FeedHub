<template>
  <el-dialog
    v-model="visible"
    title="初始化脚本"
    width="600px"
    :before-close="handleClose"
  >
    <div class="script-init-content">
      <p>检测到路由脚本为空，您可以选择以下方式初始化脚本：</p>
      
      <el-radio-group v-model="initType" class="init-type-group">
        <el-radio label="template">使用模板</el-radio>
        <el-radio label="upload">上传ZIP包</el-radio>
        <el-radio label="git">从Git仓库导入</el-radio>
      </el-radio-group>
      
      <!-- 模板选择 -->
      <div v-if="initType === 'template'" class="init-option">
        <el-select v-model="selectedTemplate" placeholder="选择模板">
          <el-option label="基础模板" value="basic" />
          <el-option label="RSS模板" value="rss" />
          <el-option label="API模板" value="api" />
        </el-select>
      </div>
      
      <!-- 文件上传 -->
      <div v-if="initType === 'upload'" class="init-option">
        <input
          ref="scriptFileInputRef"
          type="file"
          accept=".zip"
          style="display: none"
          @change="handleFileUpload"
        />
        <el-button @click="scriptFileInputRef?.click()">选择ZIP文件</el-button>
        <span v-if="uploadFile" class="file-name">{{ uploadFile.name }}</span>
      </div>
      
      <!-- Git导入 -->
      <div v-if="initType === 'git'" class="init-option">
        <el-input v-model="gitUrl" placeholder="Git仓库地址" class="git-input" />
        <el-input v-model="gitBranch" placeholder="分支名称" class="git-input" />
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleSkip">跳过初始化</el-button>
        <el-button type="primary" @click="handleInit" :loading="loading">
          初始化
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { initializeRouteScript } from '@/api/dynamicRoute';

interface Props {
  modelValue: boolean;
  routeId: number;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success'): void;
  (e: 'skip'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 响应式状态
const loading = ref(false);
const initType = ref<'template' | 'upload' | 'git'>('template');
const selectedTemplate = ref('basic');
const uploadFile = ref<File>();
const gitUrl = ref('');
const gitBranch = ref('main');
const scriptFileInputRef = ref<HTMLInputElement>();

// 计算属性
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// 重置表单数据
const resetForm = () => {
  initType.value = 'template';
  selectedTemplate.value = 'basic';
  uploadFile.value = undefined;
  gitUrl.value = '';
  gitBranch.value = 'main';
};

// 处理文件上传
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    if (!file.name.endsWith('.zip')) {
      ElMessage.error('请选择ZIP格式的文件');
      return;
    }
    uploadFile.value = file;
  }
};

// 处理脚本初始化
const handleInit = async () => {
  if (!props.routeId) {
    ElMessage.error('路由ID不能为空');
    return;
  }
  
  try {
    loading.value = true;
    
    const options: any = {};
    
    if (initType.value === 'template') {
      options.templateName = selectedTemplate.value;
    } else if (initType.value === 'upload') {
      if (!uploadFile.value) {
        ElMessage.error('请选择要上传的ZIP文件');
        return;
      }
      options.zipFile = uploadFile.value;
    } else if (initType.value === 'git') {
      if (!gitUrl.value.trim()) {
        ElMessage.error('请输入Git仓库地址');
        return;
      }
      options.gitUrl = gitUrl.value;
      options.gitBranch = gitBranch.value;
    }
    
    const res = await initializeRouteScript(props.routeId, initType.value, options);
    
    if (res.code === 0) {
      ElMessage.success('脚本初始化成功');
      visible.value = false;
      emit('success');
    } else {
      ElMessage.error(res.message || '脚本初始化失败');
    }
  } catch (error) {
    console.error('脚本初始化失败:', error);
    ElMessage.error('脚本初始化失败');
  } finally {
    loading.value = false;
  }
};

// 跳过初始化
const handleSkip = () => {
  visible.value = false;
  emit('skip');
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  resetForm();
};

// 监听对话框显示状态，重置表单
watch(visible, (newValue) => {
  if (newValue) {
    resetForm();
  }
});
</script>

<style scoped>
.script-init-content {
  .init-type-group {
    margin: 20px 0;
    display: flex;
    gap: 20px;
  }
  
  .init-option {
    margin-top: 20px;
    
    .file-name {
      margin-left: 10px;
      color: #409eff;
      font-size: 14px;
    }
    
    .git-input {
      margin-bottom: 10px;
    }
  }
}
</style>