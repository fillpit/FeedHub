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
          <div class="custom-file-tree">
            <FileTreeNode 
              v-for="node in files" 
              :key="node.path"
              :node="node"
              :selected-file="selectedFile"
              :level="0"
              @file-click="handleFileClick"
              @delete-file="deleteFile"
            />
          </div>
        </div>
        
        <!-- 右侧代码编辑器 -->
        <div class="code-editor-panel">
          <div class="panel-header">
            <h4>{{ selectedFile || '请选择文件' }}</h4>
            <div class="panel-actions">
              <el-button 
                type="info" 
                size="small" 
                @click="showScriptHelp"
              >
                <el-icon><QuestionFilled /></el-icon>
                脚本帮助指南
              </el-button>
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
              :language="getLanguageFromFileName(selectedFile)"
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

  <!-- 脚本帮助指南对话框 -->
  <ScriptHelpGuide mode="dialog" v-model="scriptHelpVisible" />

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
import { Refresh, DocumentCopy, Plus } from '@element-plus/icons-vue';
import CodeEditor from '@/components/CodeEditor.vue';
import ScriptHelpGuide from '@/components/ScriptHelpGuide.vue';
import FileTreeNode from '@/components/FileTreeNode.vue';
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
const scriptHelpVisible = ref(false);

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
      // 构建树形结构
      files.value = buildFileTree(result.data);
      
      // 默认选择第一个文件
      const firstFile = findFirstFile(files.value);
      if (firstFile) {
        await selectFile(firstFile.path);
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

// 构建文件树结构
const buildFileTree = (fileList: any[]) => {
  const tree: any[] = [];
  const pathMap = new Map();
  
  // 按路径深度排序，确保父目录在子项之前处理
  const sortedFiles = fileList.sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    return aDepth - bDepth;
  });
  
  for (const item of sortedFiles) {
    const pathParts = item.path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    const treeNode = {
      name: fileName,
      path: item.path,
      type: item.type,
      extension: item.extension,
      size: item.size,
      lastModified: item.lastModified,
      children: item.type === 'directory' ? [] : undefined
    };
    
    if (pathParts.length === 1) {
      // 根级文件或目录
      tree.push(treeNode);
      pathMap.set(item.path, treeNode);
    } else {
      // 子文件或目录
      const parentPath = pathParts.slice(0, -1).join('/');
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(treeNode);
        pathMap.set(item.path, treeNode);
      }
    }
  }
  
  // 递归排序所有层级的节点：目录在前，文件在后，同类型按A-Z排序
  const sortTreeNodes = (nodes: any[]) => {
    nodes.sort((a, b) => {
      // 目录优先
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      
      // 同类型按名称A-Z排序
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    // 递归排序子节点
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortTreeNodes(node.children);
      }
    });
  };
  
  sortTreeNodes(tree);
  return tree;
};

// 查找第一个文件
const findFirstFile = (tree: any[]): any => {
  for (const node of tree) {
    if (node.type === 'file') {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
};

// 根据文件扩展名获取语言模式
const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'json': 'json',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'md': 'markdown',
    'markdown': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'py': 'python',
    'php': 'php',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'txt': 'plaintext',
    'log': 'plaintext'
  };
  return languageMap[ext || ''] || 'javascript';
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
  // 只有文件可以被选择，目录不处理点击事件
  if (data.type === 'file' && data.path) {
    selectFile(data.path);
  }
  // 目录的展开/折叠由el-tree自动处理
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

// 显示脚本帮助
const showScriptHelp = () => {
  scriptHelpVisible.value = true;
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
      border-right: 1px solid #3c3c3c;
      background: #252526;
      
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #3c3c3c;
        background: #2d2d30;
        
        h4 {
          margin: 0;
          font-size: 14px;
          color: #cccccc;
          font-weight: 600;
        }
        
        .panel-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .custom-file-tree {
        background-color: #252526;
        color: #cccccc;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        overflow-y: auto;
        height: calc(100% - 60px);
        
        &::-webkit-scrollbar {
          width: 10px;
        }
        
        &::-webkit-scrollbar-track {
          background: #2d2d30;
        }
        
        &::-webkit-scrollbar-thumb {
          background: #424242;
          border-radius: 5px;
          
          &:hover {
            background: #4f4f4f;
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