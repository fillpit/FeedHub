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
              <el-button size="small" type="primary" @click="showCreateFileDialog">
                <el-icon><Plus /></el-icon>
                新建
              </el-button>
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
              <div class="tree-node" :class="{ active: selectedFile === data.path }">
                <span class="file-info" @click="handleFileClick(data)">
                  <el-icon style="margin-right: 4px;">
                    <Document />
                  </el-icon>
                  {{ data.name }}
                </span>
                <div class="file-actions" v-if="data.name !== 'main.js' && data.name !== 'index.js'">
                  <el-button 
                    size="small" 
                    type="danger" 
                    text 
                    @click.stop="deleteFile(data.path)"
                    title="删除文件"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
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

  <!-- 新建文件对话框 -->
  <el-dialog
    v-model="createFileDialogVisible"
    title="新建文件"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form :model="createFileForm" label-width="80px">
      <el-form-item label="文件名" required>
        <el-input
          v-model="createFileForm.fileName"
          placeholder="请输入文件名（如：utils.js, config.json）"
          @keyup.enter="createFile"
        />
      </el-form-item>
      <el-form-item label="模板">
        <el-radio-group v-model="createFileForm.template">
          <el-radio label="blank">空白模板</el-radio>
          <el-radio label="main">主文件模板</el-radio>
          <el-radio label="utils">工具模板</el-radio>
          <el-radio label="package">Package模板</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <div class="template-description">
          <p v-if="createFileForm.template === 'blank'">创建一个空白文件，适合自定义内容</p>
          <p v-else-if="createFileForm.template === 'main'">创建一个主入口文件模板，包含完整的脚本结构</p>
          <p v-else-if="createFileForm.template === 'utils'">创建一个工具函数模板，包含常用的工具方法</p>
          <p v-else-if="createFileForm.template === 'package'">创建一个package.json文件模板</p>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="createFileDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createFile" :disabled="!createFileForm.fileName.trim()">创建</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Document, DocumentCopy, Plus, Delete } from '@element-plus/icons-vue';
import CodeEditor from '@/components/CodeEditor.vue';
import {
  getInlineScriptFiles,
  getInlineScriptFileContent,
  updateInlineScriptFileContent,
  createInlineScriptFile,
  deleteInlineScriptFile,
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

// 新建文件对话框状态
const createFileDialogVisible = ref(false);
const createFileForm = ref({
  fileName: '',
  template: 'blank'
});

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

// 显示新建文件对话框
const showCreateFileDialog = () => {
  createFileForm.value = {
    fileName: '',
    template: 'blank'
  };
  createFileDialogVisible.value = true;
};

// 创建文件
const createFile = async () => {
  if (!props.routeId || !createFileForm.value.fileName.trim()) return;
  
  try {
    const result = await createInlineScriptFile(
      props.routeId,
      createFileForm.value.fileName.trim(),
      createFileForm.value.template
    ) as any;
    
    if (result.success) {
      ElMessage.success('文件创建成功');
      createFileDialogVisible.value = false;
      await loadFiles();
      // 自动选择新创建的文件
      await selectFile(createFileForm.value.fileName.trim());
    } else {
      ElMessage.error(result.message || '文件创建失败');
    }
  } catch (error) {
    console.error('创建文件失败:', error);
    ElMessage.error('创建文件失败');
  }
};

// 删除文件
const deleteFile = async (fileName: string) => {
  if (!props.routeId) return;
  
  try {
    await ElMessageBox.confirm(
      `确定要删除文件 "${fileName}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    const result = await deleteInlineScriptFile(props.routeId, fileName) as any;
    
    if (result.success) {
      ElMessage.success('文件删除成功');
      // 如果删除的是当前选中的文件，清空选择
      if (selectedFile.value === fileName) {
        selectedFile.value = '';
        fileContent.value = '';
      }
      await loadFiles();
    } else {
      ElMessage.error(result.message || '文件删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文件失败:', error);
      ElMessage.error('删除文件失败');
    }
  }
};

// 关闭对话框
const handleClose = () => {
  visible.value = false;
  selectedFile.value = '';
  fileContent.value = '';
  files.value = [];
  createFileDialogVisible.value = false;
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
          color: #303133;
        }
        
        .panel-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .tree-node {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 4px 0;
        
        &.active {
          .file-info {
            color: #409eff;
            font-weight: 500;
          }
        }
        
        .file-info {
          display: flex;
          align-items: center;
          flex: 1;
          cursor: pointer;
          
          &:hover {
            color: #409eff;
          }
        }
        
        .file-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        &:hover .file-actions {
          opacity: 1;
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

.template-description {
  p {
    margin: 0;
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
  }
}
</style>