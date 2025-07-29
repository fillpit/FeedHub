<template>
  <el-dialog 
    v-model="visible" 
    title="内联脚本在线编辑器" 
    width="90%" 
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="inline-script-editor">
      <div class="editor-layout">
        <!-- 左侧文件树 -->
        <div class="file-tree-panel">
          <div class="panel-header">
            <h4>文件列表</h4>
            <div class="panel-actions">
              <el-button size="small" @click="loadFiles">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </div>
          <el-tree
            :data="files"
            :props="{ label: 'name', children: 'children' }"
            default-expand-all
            :expand-on-click-node="false"
            @node-click="handleFileClick"
          >
            <template #default="{ node, data }">
              <span class="tree-node" :class="{ active: selectedFile === data.path }">
                <el-icon style="margin-right: 4px;">
                  <Document />
                </el-icon>
                {{ data.name }}
              </span>
            </template>
          </el-tree>
        </div>
        
        <!-- 右侧代码编辑器 -->
        <div class="code-editor-panel">
          <div class="panel-header">
            <h4>{{ selectedFile || '请选择文件' }}</h4>
            <div class="panel-actions">
              <el-button 
                type="primary" 
                size="small" 
                @click="saveFile"
                :disabled="!selectedFile"
              >
                <el-icon><DocumentCopy /></el-icon>
                保存
              </el-button>
            </div>
          </div>
          <div class="editor-container">
            <CodeEditor
              v-if="selectedFile"
              v-model="fileContent"
              :language="selectedFile.endsWith('.json') ? 'json' : 'javascript'"
              theme="vs-dark"
              :height="500"
              :options="{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true
              }"
            />
            <div v-else class="empty-editor">
              <el-empty description="请选择要编辑的文件" />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Document, DocumentCopy } from '@element-plus/icons-vue';
import CodeEditor from '@/components/CodeEditor.vue';
import {
  getInlineScriptFiles,
  getInlineScriptFileContent,
  updateInlineScriptFileContent,
} from '@/api/dynamicRoute';

// Props
interface Props {
  modelValue: boolean;
  routeId: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  routeId: 0,
});

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const emit = defineEmits<Emits>();

// 状态
const visible = ref(false);
const loading = ref(false);
const files = ref<any[]>([]);
const selectedFile = ref<string>('');
const fileContent = ref<string>('');

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    visible.value = newValue;
    if (newValue && props.routeId) {
      loadFiles();
    }
  },
  { immediate: true }
);

// 监听 visible 变化
watch(visible, (newValue) => {
  emit('update:modelValue', newValue);
});

// 加载文件列表
const loadFiles = async () => {
  if (!props.routeId) return;
  
  try {
    loading.value = true;
    const result = await getInlineScriptFiles(props.routeId) as any;
    if (result.success) {
      // 转换文件列表为树形结构
      const fileList = result.data.map((file: string) => ({
        name: file,
        path: file,
        type: 'file'
      }));
      files.value = fileList;
      
      // 默认选择第一个文件
      if (fileList.length > 0) {
        await selectFile(fileList[0].path);
      }
    } else {
      ElMessage.error(result.message || '获取文件列表失败');
    }
  } catch (error) {
    console.error('加载文件列表失败:', error);
    ElMessage.error('加载文件列表失败');
  } finally {
    loading.value = false;
  }
};

// 选择文件
const selectFile = async (fileName: string) => {
  if (!props.routeId) return;
  
  try {
    selectedFile.value = fileName;
    const result = await getInlineScriptFileContent(props.routeId, fileName) as any;
    if (result.success) {
      fileContent.value = result.data.content;
    } else {
      ElMessage.error(result.message || '获取文件内容失败');
    }
  } catch (error) {
    console.error('获取文件内容失败:', error);
    ElMessage.error('获取文件内容失败');
  }
};

// 保存文件
const saveFile = async () => {
  if (!props.routeId || !selectedFile.value) return;
  
  try {
    const result = await updateInlineScriptFileContent(
      props.routeId,
      selectedFile.value,
      fileContent.value
    ) as any;
    
    if (result.success) {
      ElMessage.success('文件保存成功');
    } else {
      ElMessage.error(result.message || '文件保存失败');
    }
  } catch (error) {
    console.error('保存文件失败:', error);
    ElMessage.error('保存文件失败');
  }
};

// 处理文件点击
const handleFileClick = (data: any) => {
  if (data.type === 'file') {
    selectFile(data.path);
  }
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  selectedFile.value = '';
  fileContent.value = '';
  files.value = [];
};
</script>

<style lang="scss" scoped>
.inline-script-editor {
  .editor-layout {
    display: flex;
    height: 600px;
    width: 100%;
    max-width: 100%;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    overflow: hidden;
    box-sizing: border-box;
    
    .file-tree-panel {
      width: 300px;
      border-right: 1px solid #e4e7ed;
      background: #fafafa;
      
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e4e7ed;
        background: #f5f7fa;
        
        h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
        }
        
        .panel-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .el-tree {
        padding: 8px;
        background: transparent;
        
        .tree-node {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          
          &:hover {
            background: #e6f7ff;
          }
          
          &.active {
            background: #1890ff;
            color: white;
          }
        }
      }
    }
    
    .code-editor-panel {
      flex: 1;
      min-width: 0; // 防止flex子元素溢出
      display: flex;
      flex-direction: column;
      
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #e4e7ed;
        background: #f5f7fa;
        min-width: 0; // 确保header不会溢出
        
        h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 500;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        .panel-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0; // 防止按钮被压缩
        }
      }
      
      .editor-container {
        flex: 1;
        min-width: 0;
        position: relative;
        overflow: hidden;
        
        .empty-editor {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: #fafafa;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>