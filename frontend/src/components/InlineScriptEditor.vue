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
            <div class="header-left">
              <h4>
                {{ selectedFile || "请选择文件" }}
                <span v-if="selectedFile && hasUnsavedChanges" class="unsaved-indicator">*</span>
              </h4>
              <div v-if="selectedFile && syntaxErrors.length > 0" class="syntax-status">
                <el-badge :value="syntaxErrors.length" type="danger">
                  <el-icon class="error-icon"><Warning /></el-icon>
                </el-badge>
                <span class="error-text">{{ syntaxErrors.length }} 个语法问题</span>
              </div>
              <div v-else-if="selectedFile" class="syntax-status">
                <el-icon class="success-icon"><CircleCheck /></el-icon>
                <span class="success-text">语法正确</span>
              </div>
            </div>
            <div class="panel-actions">
              <el-button 
                v-if="selectedFile && syntaxErrors.length > 0" 
                type="warning" 
                size="small" 
                @click="toggleErrorPanel"
              >
                <el-icon><Warning /></el-icon>
                {{ showErrorPanel ? '隐藏' : '显示' }}错误
              </el-button>
              <el-button type="info" size="small" @click="showScriptHelp">
                <el-icon><QuestionFilled /></el-icon>
                脚本帮助指南
              </el-button>
              <el-button type="primary" size="small" @click="saveFile" :disabled="!selectedFile">
                <el-icon><DocumentCopy /></el-icon>
                保存
              </el-button>
              <el-button 
                :type="autoSaveEnabled ? 'success' : 'info'" 
                size="small" 
                @click="toggleAutoSave"
                :title="autoSaveEnabled ? `自动保存已开启 (${autoSaveInterval}秒)` : '点击开启自动保存'"
              >
                {{ autoSaveEnabled ? '自动保存: 开' : '自动保存: 关' }}
              </el-button>
              <el-button 
                type="text" 
                size="small" 
                @click="showAutoSaveSettings"
                title="自动保存设置"
              >
                <el-icon><Setting /></el-icon>
              </el-button>
              <el-button 
                type="warning" 
                size="small" 
                @click="showGitUploadDialog"
                :disabled="!selectedFile"
                title="上传脚本到Git仓库"
              >
                <el-icon><Upload /></el-icon>
                上传到Git
              </el-button>
            </div>
          </div>
          <div class="editor-container">
            <div v-if="selectedFile" class="editor-with-errors">
              <CodeEditor
                ref="codeEditorRef"
                v-model="fileContent"
                :language="getLanguageFromFileName(selectedFile)"
                theme="vs-dark"
                height="100%"
                :enable-syntax-check="true"
                :options="{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }"
                @syntax-errors="handleSyntaxErrors"
              />
              <!-- 错误面板 -->
              <div v-if="showErrorPanel && syntaxErrors.length > 0" class="error-panel">
                <div class="error-panel-header">
                  <h5>语法错误 ({{ syntaxErrors.length }})</h5>
                  <el-button size="small" text @click="showErrorPanel = false">
                    <el-icon><Close /></el-icon>
                  </el-button>
                </div>
                <div class="error-list">
                  <div 
                    v-for="(error, index) in syntaxErrors" 
                    :key="index" 
                    class="error-item"
                    @click="goToError(error)"
                  >
                    <div class="error-icon">
                      <el-icon v-if="error.severity === 8" class="error"><CircleCloseFilled /></el-icon>
                      <el-icon v-else class="warning"><WarningFilled /></el-icon>
                    </div>
                    <div class="error-content">
                      <div class="error-message">{{ error.message }}</div>
                      <div class="error-location">
                        第 {{ error.startLineNumber }} 行，第 {{ error.startColumn }} 列
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
          <p v-else-if="createFileForm.template === 'main'">
            创建一个主入口文件模板，包含完整的脚本结构
          </p>
          <p v-else-if="createFileForm.template === 'utils'">
            创建一个工具函数模板，包含常用的工具方法
          </p>
          <p v-else-if="createFileForm.template === 'package'">创建一个package.json文件模板</p>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="createFileDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createFile" :disabled="!createFileForm.fileName.trim()"
          >创建</el-button
        >
      </div>
    </template>
  </el-dialog>

  <!-- Git上传对话框 -->
  <el-dialog
    v-model="gitUploadDialogVisible"
    title="上传到Git仓库"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form :model="gitUploadForm" label-width="120px" label-position="left">
      <el-form-item label="仓库地址" required>
        <el-input
          v-model="gitUploadForm.gitUrl"
          placeholder="https://github.com/username/repo.git"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="分支">
        <el-input
          v-model="gitUploadForm.gitBranch"
          placeholder="main"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="子目录路径">
        <el-input
          v-model="gitUploadForm.gitSubPath"
          placeholder="可选，如：scripts/feedhub"
          clearable
        />
        <div class="form-tip">可选，指定上传到仓库中的子目录</div>
      </el-form-item>
      
      <el-form-item label="访问令牌" required>
        <el-input
          v-model="gitUploadForm.token"
          type="password"
          placeholder="Personal Access Token"
          show-password
          clearable
        />
        <div class="form-tip">
          <div style="margin-bottom: 8px;"><strong>如何获取 Personal Access Token：</strong></div>
          <div style="margin-bottom: 4px;">1. 登录 GitHub，进入 Settings → Developer settings → Personal access tokens → Tokens (classic)</div>
          <div style="margin-bottom: 4px;">2. 点击 "Generate new token" → "Generate new token (classic)"</div>
          <div style="margin-bottom: 4px;">3. 设置 Token 名称和过期时间</div>
          <div style="margin-bottom: 4px;">4. 选择权限范围（Scopes）：</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• <strong>repo</strong> - 完整的仓库访问权限（必需）</div>
          <div style="margin-left: 16px; margin-bottom: 4px;">• <strong>workflow</strong> - 更新 GitHub Actions 工作流（可选）</div>
          <div style="margin-bottom: 4px;">5. 点击 "Generate token" 并复制生成的 Token</div>
          <div style="color: #e6a23c; font-size: 12px;">⚠️ Token 只会显示一次，请妥善保存</div>
        </div>
      </el-form-item>
      
      <el-form-item label="邮箱地址" required>
        <el-input
          v-model="gitUploadForm.email"
          placeholder="用于Git提交的邮箱地址"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="提交信息" required>
        <el-input
          v-model="gitUploadForm.commitMessage"
          type="textarea"
          :rows="3"
          placeholder="描述本次提交的内容"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="gitUploadDialogVisible = false" :disabled="gitUploadLoading">
          取消
        </el-button>
        <el-button 
          type="primary" 
          @click="handleGitUpload" 
          :loading="gitUploadLoading"
        >
          {{ gitUploadLoading ? '上传中...' : '上传' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 自动保存设置对话框 -->
  <el-dialog
    v-model="autoSaveSettingsVisible"
    title="自动保存设置"
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form label-width="120px">
      <el-form-item label="保存间隔">
        <el-input-number
          v-model="tempAutoSaveInterval"
          :min="5"
          :max="300"
          :step="5"
          controls-position="right"
        />
        <span style="margin-left: 8px; color: #909399; font-size: 12px;">秒</span>
      </el-form-item>
      <el-form-item>
        <div style="font-size: 12px; color: #909399; line-height: 1.4;">
          自动保存间隔范围：5-300秒<br>
          建议设置：30-60秒
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="autoSaveSettingsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAutoSaveSettings">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { 
  Refresh, 
  DocumentCopy, 
  Plus, 
  QuestionFilled,
  Warning,
  CircleCheck,
  Close,
  CircleCloseFilled,
  WarningFilled,
  Setting,
  Upload
} from "@element-plus/icons-vue";
import CodeEditor from "@/components/CodeEditor.vue";
import ScriptHelpGuide from "@/components/ScriptHelpGuide.vue";
import FileTreeNode from "@/components/FileTreeNode.vue";
import {
  getInlineScriptFiles,
  getInlineScriptFileContent,
  updateInlineScriptFileContent,
  createInlineScriptFile,
  deleteInlineScriptFile,
} from "@/api/dynamicRoute";

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
  (e: "update:modelValue", value: boolean): void;
}

const emit = defineEmits<Emits>();

// 状态
const visible = ref(false);
const loading = ref(false);
const files = ref<any[]>([]);
const selectedFile = ref<string>("");
const fileContent = ref<string>("");
const scriptHelpVisible = ref(false);

// 未保存状态跟踪
const hasUnsavedChanges = ref(false);
const originalContent = ref<string>("");

// 自动保存功能
const autoSaveEnabled = ref(false);
const autoSaveInterval = ref(30); // 自动保存间隔（秒）
let autoSaveTimer: NodeJS.Timeout | null = null;
const autoSaveSettingsVisible = ref(false);
const tempAutoSaveInterval = ref(30);

// 语法检查相关状态
const syntaxErrors = ref<any[]>([]);
const showErrorPanel = ref(false);
const codeEditorRef = ref<any>(null);

// 新建文件对话框状态
const createFileDialogVisible = ref(false);
const createFileForm = ref({
  fileName: "",
  template: "blank",
});

// Git上传对话框状态
const gitUploadDialogVisible = ref(false);
const gitUploadForm = ref({
  gitUrl: "",
  gitBranch: "main",
  gitSubPath: "",
  token: "",
  email: "",
  commitMessage: "",
});
const gitUploadLoading = ref(false);

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
  emit("update:modelValue", newValue);
});

// 监听文件内容变化，跟踪未保存状态
watch(fileContent, (newContent) => {
  if (selectedFile.value && originalContent.value !== undefined) {
    hasUnsavedChanges.value = newContent !== originalContent.value;
  }
});

// 加载文件列表
const loadFiles = async () => {
  if (!props.routeId) return;

  try {
    loading.value = true;
    const result = (await getInlineScriptFiles(props.routeId)) as any;
    if (result.success) {
      // 构建树形结构
      files.value = buildFileTree(result.data);

      // 优先选择main.js文件，如果没有则选择第一个文件
      const mainFile = findFileByName(files.value, "main.js");
      const targetFile = mainFile || findFirstFile(files.value);
      if (targetFile) {
        await selectFile(targetFile.path);
      }
    } else {
      ElMessage.error(result.message || "获取文件列表失败");
    }
  } catch (error) {
    console.error("加载文件列表失败:", error);
    ElMessage.error("加载文件列表失败");
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
    const aDepth = a.path.split("/").length;
    const bDepth = b.path.split("/").length;
    return aDepth - bDepth;
  });

  for (const item of sortedFiles) {
    const pathParts = item.path.split("/");
    const fileName = pathParts[pathParts.length - 1];

    const treeNode = {
      name: fileName,
      path: item.path,
      type: item.type,
      extension: item.extension,
      size: item.size,
      lastModified: item.lastModified,
      children: item.type === "directory" ? [] : undefined,
    };

    if (pathParts.length === 1) {
      // 根级文件或目录
      tree.push(treeNode);
      pathMap.set(item.path, treeNode);
    } else {
      // 子文件或目录
      const parentPath = pathParts.slice(0, -1).join("/");
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
      if (a.type === "directory" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "directory") return 1;

      // 同类型按名称A-Z排序
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    // 递归排序子节点
    nodes.forEach((node) => {
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
    if (node.type === "file") {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
};

// 根据文件名查找文件
const findFileByName = (tree: any[], fileName: string): any => {
  for (const node of tree) {
    if (node.type === "file" && node.name === fileName) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findFileByName(node.children, fileName);
      if (found) return found;
    }
  }
  return null;
};

// 根据文件扩展名获取语言模式
const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    md: "markdown",
    markdown: "markdown",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    py: "python",
    php: "php",
    java: "java",
    c: "c",
    cpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    rb: "ruby",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    txt: "plaintext",
    log: "plaintext",
  };
  return languageMap[ext || ""] || "javascript";
};

// 选择文件
const selectFile = async (fileName: string) => {
  if (!props.routeId) return;

  // 检查当前文件是否有未保存的修改
  if (hasUnsavedChanges.value && selectedFile.value) {
    try {
      await ElMessageBox.confirm(
        `文件 "${selectedFile.value}" 有未保存的修改，是否要保存？`,
        '未保存的修改',
        {
          confirmButtonText: '保存并切换',
          cancelButtonText: '丢弃并切换',
          distinguishCancelAndClose: true,
          type: 'warning',
        }
      );
      // 用户选择保存
      await saveFile();
    } catch (action) {
      if (action === 'cancel') {
        // 用户选择丢弃修改，继续切换
      } else {
        // 用户点击了关闭按钮，取消切换
        return;
      }
    }
  }

  try {
    selectedFile.value = fileName;
    const result = (await getInlineScriptFileContent(props.routeId, fileName)) as any;
    if (result.success) {
      fileContent.value = result.data.content;
      originalContent.value = result.data.content;
      hasUnsavedChanges.value = false;
      // 重新启动自动保存
      if (autoSaveEnabled.value) {
        startAutoSave();
      }
    } else {
      ElMessage.error(result.message || "获取文件内容失败");
    }
  } catch (error) {
    console.error("获取文件内容失败:", error);
    ElMessage.error("获取文件内容失败");
  }
};

// 保存文件
const saveFile = async () => {
  if (!props.routeId || !selectedFile.value) return;

  try {
    const result = (await updateInlineScriptFileContent(
      props.routeId,
      selectedFile.value,
      fileContent.value
    )) as any;

    if (result.success) {
      ElMessage.success("文件保存成功");
      // 更新原始内容并重置未保存状态
      originalContent.value = fileContent.value;
      hasUnsavedChanges.value = false;
    } else {
      ElMessage.error(result.message || "文件保存失败");
    }
  } catch (error) {
    console.error("保存文件失败:", error);
    ElMessage.error("保存文件失败");
  }
};

// 处理文件点击
const handleFileClick = (data: any) => {
  // 只有文件可以被选择，目录不处理点击事件
  if (data.type === "file" && data.path) {
    selectFile(data.path);
  }
  // 目录的展开/折叠由el-tree自动处理
};

// 显示新建文件对话框
const showCreateFileDialog = () => {
  createFileForm.value = {
    fileName: "",
    template: "blank",
  };
  createFileDialogVisible.value = true;
};

// 创建文件
const createFile = async () => {
  if (!props.routeId || !createFileForm.value.fileName.trim()) return;

  try {
    const result = (await createInlineScriptFile(
      props.routeId,
      createFileForm.value.fileName.trim(),
      createFileForm.value.template
    )) as any;

    if (result.success) {
      ElMessage.success("文件创建成功");
      createFileDialogVisible.value = false;
      await loadFiles();
      // 自动选择新创建的文件
      await selectFile(createFileForm.value.fileName.trim());
    } else {
      ElMessage.error(result.message || "文件创建失败");
    }
  } catch (error) {
    console.error("创建文件失败:", error);
    ElMessage.error("创建文件失败");
  }
};

// 删除文件
const deleteFile = async (fileName: string) => {
  if (!props.routeId) return;

  try {
    await ElMessageBox.confirm(`确定要删除文件 "${fileName}" 吗？此操作不可恢复。`, "确认删除", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const result = (await deleteInlineScriptFile(props.routeId, fileName)) as any;

    if (result.success) {
      ElMessage.success("文件删除成功");
      // 如果删除的是当前选中的文件，清空选择
      if (selectedFile.value === fileName) {
        selectedFile.value = "";
        fileContent.value = "";
      }
      await loadFiles();
    } else {
      ElMessage.error(result.message || "文件删除失败");
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("删除文件失败:", error);
      ElMessage.error("删除文件失败");
    }
  }
};

// 显示脚本帮助
const showScriptHelp = () => {
  scriptHelpVisible.value = true;
};

// 处理语法错误
const handleSyntaxErrors = (errors: any[]) => {
  syntaxErrors.value = errors;
  // 如果有错误且错误面板未显示，自动显示
  if (errors.length > 0 && !showErrorPanel.value) {
    showErrorPanel.value = true;
  }
};

// 切换错误面板显示
const toggleErrorPanel = () => {
  showErrorPanel.value = !showErrorPanel.value;
};

// 跳转到错误位置
const goToError = (error: any) => {
  if (codeEditorRef.value) {
    const editor = codeEditorRef.value.getEditor();
    if (editor) {
      editor.setPosition({
        lineNumber: error.startLineNumber,
        column: error.startColumn
      });
      editor.focus();
    }
  }
};

// 自动保存函数
const startAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }
  if (autoSaveEnabled.value && selectedFile.value) {
    autoSaveTimer = setInterval(() => {
      if (hasUnsavedChanges.value && selectedFile.value) {
        saveFile();
      }
    }, autoSaveInterval.value * 1000);
  }
};

// 停止自动保存
const stopAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

// 切换自动保存状态
const toggleAutoSave = () => {
  autoSaveEnabled.value = !autoSaveEnabled.value;
  if (autoSaveEnabled.value) {
    startAutoSave();
    ElMessage.success(`自动保存已开启，每${autoSaveInterval.value}秒自动保存`);
  } else {
    stopAutoSave();
    ElMessage.info('自动保存已关闭');
  }
};

// 显示自动保存设置对话框
const showAutoSaveSettings = () => {
  tempAutoSaveInterval.value = autoSaveInterval.value;
  autoSaveSettingsVisible.value = true;
};

// 保存自动保存设置
const saveAutoSaveSettings = () => {
  autoSaveInterval.value = tempAutoSaveInterval.value;
  autoSaveSettingsVisible.value = false;
  
  // 如果自动保存已开启，重新启动定时器
  if (autoSaveEnabled.value) {
    startAutoSave();
    ElMessage.success(`自动保存间隔已更新为${autoSaveInterval.value}秒`);
  } else {
    ElMessage.success('自动保存设置已保存');
  }
};

// 键盘事件处理
const handleKeyDown = (event: KeyboardEvent) => {
  // 检测 Ctrl+S (Windows/Linux) 或 Cmd+S (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault(); // 阻止浏览器默认保存行为
    if (selectedFile.value) {
      saveFile();
    }
  }
};

// 组件挂载时添加键盘事件监听
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

// 组件卸载时移除键盘事件监听和清理定时器
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  stopAutoSave();
});

// 显示Git上传对话框
const showGitUploadDialog = () => {
  // 从路由配置中加载已保存的Git配置
  loadGitUploadConfig();
  gitUploadDialogVisible.value = true;
};

// 加载Git上传配置
const loadGitUploadConfig = async () => {
  if (!props.routeId) {
    // 使用默认值
    gitUploadForm.value = {
      gitUrl: "",
      gitBranch: "main",
      gitSubPath: "",
      token: "",
      email: "",
      commitMessage: `Update scripts at ${new Date().toLocaleString()}`,
    };
    return;
  }

  try {
    // 从后端获取路由配置
    const result = await fetch(`/api/dynamic/${props.routeId}`);
    const response = await result.json();
    
    if (response.success && response.data && response.data.script && response.data.script.gitUploadConfig) {
      const savedConfig = response.data.script.gitUploadConfig;
      // 加载已保存的配置，但不包含敏感信息
      gitUploadForm.value = {
        gitUrl: savedConfig.gitUrl || "",
        gitBranch: savedConfig.gitBranch || "main",
        gitSubPath: savedConfig.gitSubPath || "",
        token: "", // 令牌不从后端加载，需要重新输入
        email: savedConfig.email || "",
        commitMessage: savedConfig.defaultCommitMessage || `Update scripts at ${new Date().toLocaleString()}`,
      };
    } else {
      // 使用默认值
      gitUploadForm.value = {
        gitUrl: "",
        gitBranch: "main",
        gitSubPath: "",
        token: "",
        email: "",
        commitMessage: `Update scripts at ${new Date().toLocaleString()}`,
      };
    }
  } catch (error) {
    console.error("加载Git配置失败:", error);
    // 使用默认值
    gitUploadForm.value = {
      gitUrl: "",
      gitBranch: "main",
      gitSubPath: "",
      token: "",
      email: "",
      commitMessage: `Update scripts at ${new Date().toLocaleString()}`,
    };
  }
};

// 执行Git上传
const handleGitUpload = async () => {
  if (!props.routeId) return;
  
  // 验证必填字段
  if (!gitUploadForm.value.gitUrl.trim()) {
    ElMessage.error("请填写Git仓库地址");
    return;
  }
  
  if (!gitUploadForm.value.token.trim()) {
    ElMessage.error("请填写访问令牌");
    return;
  }
  
  if (!gitUploadForm.value.email.trim()) {
    ElMessage.error("请填写邮箱地址");
    return;
  }
  
  if (!gitUploadForm.value.commitMessage.trim()) {
    ElMessage.error("请填写提交信息");
    return;
  }

  gitUploadLoading.value = true;
  
  try {
    const uploadData = {
      routeId: props.routeId,
      gitConfig: {
        gitUrl: gitUploadForm.value.gitUrl.trim(),
        gitBranch: gitUploadForm.value.gitBranch.trim() || "main",
        gitSubPath: gitUploadForm.value.gitSubPath.trim(),
        authType: "token",
        token: gitUploadForm.value.token,
        email: gitUploadForm.value.email.trim(),
      },
      commitMessage: gitUploadForm.value.commitMessage.trim(),
    };
    
    const result = await fetch(`/api/dynamic/${props.routeId}/upload-to-git`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gitConfig: uploadData.gitConfig,
        commitMessage: uploadData.commitMessage
      }),
    });
    
    const response = await result.json();
    
    if (response.success) {
      ElMessage.success("脚本上传到Git仓库成功！");
      gitUploadDialogVisible.value = false;
    } else {
      ElMessage.error(response.message || "上传失败");
    }
  } catch (error) {
    console.error("Git上传失败:", error);
    ElMessage.error("上传失败，请检查网络连接和配置");
  } finally {
    gitUploadLoading.value = false;
  }
};

// 关闭对话框
const handleClose = async () => {
  // 检查是否有未保存的修改
  if (hasUnsavedChanges.value && selectedFile.value) {
    try {
      await ElMessageBox.confirm(
        `文件 "${selectedFile.value}" 有未保存的修改，是否要保存？`,
        '未保存的修改',
        {
          confirmButtonText: '保存并关闭',
          cancelButtonText: '丢弃并关闭',
          distinguishCancelAndClose: true,
          type: 'warning',
        }
      );
      // 用户选择保存
      await saveFile();
    } catch (action) {
      if (action === 'cancel') {
        // 用户选择丢弃修改，继续关闭
      } else {
        // 用户点击了关闭按钮，取消关闭
        return;
      }
    }
  }

  visible.value = false;
  selectedFile.value = "";
  fileContent.value = "";
  originalContent.value = "";
  hasUnsavedChanges.value = false;
  files.value = [];
  syntaxErrors.value = [];
  showErrorPanel.value = false;
  createFileDialogVisible.value = false;
  // 停止自动保存
  stopAutoSave();
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
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
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

          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;

            h4 {
              margin: 0;
              font-size: 14px;
              font-weight: 500;
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .syntax-status {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              flex-shrink: 0;

              .error-icon {
                color: #f56c6c;
              }

              .success-icon {
                color: #67c23a;
              }

              .error-text {
                color: #f56c6c;
              }

              .success-text {
                color: #67c23a;
              }
            }
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

        .editor-with-errors {
          height: 100%;
          display: flex;
          flex-direction: column;

          .error-panel {
            height: 200px;
            border-top: 1px solid #3c3c3c;
            background: #1e1e1e;
            display: flex;
            flex-direction: column;

            .error-panel-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 12px;
              border-bottom: 1px solid #3c3c3c;
              background: #2d2d30;

              h5 {
                margin: 0;
                font-size: 13px;
                color: #cccccc;
                font-weight: 500;
              }
            }

            .error-list {
              flex: 1;
              overflow-y: auto;
              padding: 4px 0;

              .error-item {
                display: flex;
                align-items: flex-start;
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #2d2d30;
                transition: background-color 0.2s;

                &:hover {
                  background: #2d2d30;
                }

                .error-icon {
                  margin-right: 8px;
                  margin-top: 2px;
                  flex-shrink: 0;

                  .error {
                    color: #f56c6c;
                  }

                  .warning {
                    color: #e6a23c;
                  }
                }

                .error-content {
                  flex: 1;
                  min-width: 0;

                  .error-message {
                    font-size: 13px;
                    color: #cccccc;
                    line-height: 1.4;
                    margin-bottom: 2px;
                  }

                  .error-location {
                    font-size: 11px;
                    color: #858585;
                  }
                }
              }
            }
          }
        }

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

// 未保存标识样式
.unsaved-indicator {
  color: #f56c6c;
  font-weight: bold;
  margin-left: 4px;
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.3; }
}

// Git上传对话框样式
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
