<template>
  <div class="book-rss-container">
    <div class="header">
      <h2>图书章节RSS订阅</h2>
      <div class="header-actions">
        <el-button type="primary" @click="addConfig">
          <el-icon><Plus /></el-icon>
          添加订阅
        </el-button>
        <el-button @click="exportSelectedConfigs" :disabled="selectedConfigs.length === 0">
          导出选中({{ selectedConfigs.length || 0 }})
        </el-button>
        <el-button @click="fetchConfigs" :loading="configsLoading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 配置列表 -->
    <el-table
      :data="configs"
      v-loading="configsLoading"
      stripe
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="title" label="订阅标题" min-width="150" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="订阅书籍" min-width="300">
        <template #default="{ row }">
          <div v-if="row.bookInfo" class="book-info-container">
            <div class="book-cover-container">
              <img 
                v-if="row.bookInfo.coverUrl" 
                :src="row.bookInfo.coverUrl" 
                :alt="row.bookInfo.title"
                class="book-cover"
                @error="handleImageError"
              />
              <div v-else class="book-cover-placeholder">
                <el-icon><Document /></el-icon>
              </div>
            </div>
            <div class="book-details">
              <div class="font-medium book-title">{{ row.bookInfo.title }}</div>
              <div class="text-sm text-gray-500">作者: {{ row.bookInfo.author }}</div>
              <div class="text-xs text-blue-500 mt-1">
                <el-tag size="small" :type="getSourceTypeTag(row.bookInfo.sourceType)">
                  {{ getSourceTypeText(row.bookInfo.sourceType) }}
                </el-tag>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-400">未选择书籍</div>
        </template>
      </el-table-column>
      <el-table-column label="章节设置" min-width="150">
        <template #default="{ row }">
          <div class="text-sm">

            <div>包含内容: {{ row.includeContent ? '是' : '否' }}</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="updateInterval" label="更新间隔(天)" width="120" />
      <el-table-column label="最后更新" width="150">
        <template #default="{ row }">
          {{ row.lastUpdateTime ? formatDate(row.lastUpdateTime) : '未更新' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="editConfig(row)">编辑</el-button>
          <el-button size="small" @click="refreshConfig(row.id)" :loading="refreshing === row.id">
            刷新
          </el-button>
          <el-dropdown @command="(command: string) => handleDropdownCommand(command, row)">
            <el-button size="small">
              更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="copy-rss">复制RSS链接</el-dropdown-item>
                <el-dropdown-item command="copy-json">复制JSON链接</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑对话框 -->
    <el-drawer 
      v-model="dialogVisible"
      :title="dialogTitle"
      size="900px"
      :close-on-click-modal="false"
      class="book-rss-dialog"
    >
      <div class="form-container">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="book-rss-form"
        >
          <!-- 基础信息卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Edit /></el-icon>
                <span class="section-title">基础信息</span>
              </div>
            </template>
            
            <div class="form-grid">
              <el-form-item label="订阅标题" prop="title" class="form-item-full">
                <el-input 
                  v-model="form.title" 
                  placeholder="请输入图书RSS标题"
                  size="large"
                  clearable
                >
                  <template #prefix>
                    <el-icon><Document /></el-icon>
                  </template>
                </el-input>
              </el-form-item>
              
              <el-form-item label="订阅描述" prop="description" class="form-item-full">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入图书RSS描述"
                  resize="none"
                  show-word-limit
                  maxlength="200"
                />
              </el-form-item>
            </div>
          </el-card>

          <!-- 书籍配置卡片 -->
           <el-card class="form-section" shadow="never">
             <template #header>
               <div class="section-header">
                 <el-icon class="section-icon"><Reading /></el-icon>
                 <span class="section-title">书籍配置</span>
               </div>
             </template>
             
             <div class="form-grid">
                <el-form-item label="选择模式" class="form-item-full">
                  <el-radio-group v-model="bookSelectionMode" @change="handleModeChange" size="large">
                    <el-radio value="upload">手动上传</el-radio>
                    <el-radio value="opds">OPDS服务</el-radio>
                  </el-radio-group>
                  <div class="form-tip">
                    {{ bookSelectionMode === 'upload' ? '从已上传的书籍中选择' : '从OPDS服务中选择书籍' }}
                  </div>
                </el-form-item>
        
                <!-- 手动上传模式 -->
                <template v-if="bookSelectionMode === 'upload'">
                  <!-- 书籍上传 -->
                  <el-form-item label="上传书籍" class="form-item-full">
                    <div class="upload-section">
                      <el-upload
                        ref="uploadRef"
                        class="book-upload"
                        drag
                        :action="uploadAction"
                        :headers="uploadHeaders"
                        :before-upload="beforeUpload"
                        :on-success="handleUploadSuccess"
                        :on-error="handleUploadError"
                        :on-progress="handleUploadProgress"
                        :show-file-list="false"
                        accept=".epub,.txt,.pdf,.mobi,.azw,.azw3"
                      >
                        <el-icon class="upload-icon"><upload-filled /></el-icon>
                        <div class="upload-text">
                          将书籍文件拖到此处，或<em>点击上传</em>
                        </div>
                        <template #tip>
                          <div class="upload-tip">
                            支持格式：epub、txt、pdf、mobi、azw、azw3，文件大小不超过100MB
                          </div>
                        </template>
                      </el-upload>
                      
                      <!-- 上传进度 -->
                      <el-progress 
                        v-if="uploadProgress > 0 && uploadProgress < 100"
                        :percentage="uploadProgress"
                        :status="uploadStatus"
                        class="upload-progress"
                      />
                    </div>
                  </el-form-item>
        
                </template>
        
                <!-- OPDS模式 -->
                <el-form-item v-if="bookSelectionMode === 'opds'" label="OPDS书籍" class="form-item-full">
                  <OpdsBookSelector
                    v-model="selectedOpdsBook"
                    @book-selected="handleOpdsBookSelected"
                  />
                </el-form-item>
             </div>
           </el-card>

          <!-- 订阅设置卡片 -->
          <el-card class="form-section" shadow="never">
            <template #header>
              <div class="section-header">
                <el-icon class="section-icon"><Setting /></el-icon>
                <span class="section-title">订阅设置</span>
              </div>
            </template>
              
              <el-form-item label="更新间隔" prop="updateInterval" class="form-item-half">
                <el-input-number
                  v-model="form.updateInterval"
                  :min="1"
                  :max="365"
                  placeholder="更新间隔"
                  size="large"
                  style="width: 100%"
                />
                <div class="form-tip">检查新章节的时间间隔（天）</div>
              </el-form-item>
              
              <el-form-item label="每次更新章节数" prop="chaptersPerUpdate" class="form-item-half">
                <el-input-number
                  v-model="form.chaptersPerUpdate"
                  :min="1"
                  :max="20"
                  placeholder="章节数"
                  size="large"
                  style="width: 100%"
                />
                <div class="form-tip">每次更新时返回的新章节数量</div>
              </el-form-item>
              <el-form-item label="最小返回章节数" prop="minReturnChapters" class="form-item-half">
                <el-input-number
                  v-model="form.minReturnChapters"
                  :min="1"
                  :max="20"
                  placeholder="章节数"
                  size="large"
                  style="width: 100%"
                />
                <div class="form-tip">当没有新章节时，返回的最少章节数量</div>
              </el-form-item>
          </el-card>
         </el-form>
       </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-drawer >
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, ArrowDown, UploadFilled, Document, Edit, Reading, Setting } from '@element-plus/icons-vue';
import { Book, OpdsBook } from '@feedhub/shared';
import * as bookRssApi from '@/api/bookRss';
import { formatDate } from '@feedhub/shared/src/utils/date';
import OpdsBookSelector from '@/components/OpdsBookSelector.vue';

// 书籍选择模式
type BookSelectionMode = 'upload' | 'opds';

// 响应式数据 - OPDS相关
const bookSelectionMode = ref<BookSelectionMode>('upload');
const selectedOpdsBook = ref<OpdsBook | null>(null);

// OPDS相关方法
const handleModeChange = async (mode: BookSelectionMode) => {
  if (mode === 'opds') {
    // OpdsBookSelector组件会自动处理OPDS状态检查
  } else {
    selectedOpdsBook.value = null;
    form.value.bookId = null;
  }
};

const handleOpdsBookSelected = (book: OpdsBook) => {
  selectedOpdsBook.value = book;
  // 为OPDS书籍设置特殊的bookId格式
  form.value.bookId = `opds:${book.id}` as any;
  
  // 设置bookInfo以便在表格中正确显示
  form.value.bookInfo = {
    id: parseInt(book.id) || 0,
    title: book.title,
    author: book.author,
    description: book.description || '',
    sourceType: 'opds',
    totalChapters: 0, // OPDS书籍暂时设为0
    updateFrequency: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Book;
  
  // 自动填充标题和描述
  if (!form.value.title) {
    form.value.title = `${book.title} - 章节订阅`;
  }
  if (!form.value.description) {
    form.value.description = `${book.title} 的章节更新订阅`;
  }
};

// 章节订阅配置类型
interface BookChapterRssConfig {
  id: number;
  key: string;
  title: string;
  description: string;
  bookId: number | null;
  bookInfo?: Book;
  includeContent: boolean;
  updateInterval: number;
  minReturnChapters?: number;
  chaptersPerUpdate?: number;
  forceFullUpdate?: boolean;
  lastUpdateTime?: string;
  createdAt: string;
  updatedAt: string;
}

// 响应式数据
const configs = ref<BookChapterRssConfig[]>([]);
const configsLoading = ref(false);
const dialogVisible = ref(false);
const submitLoading = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const refreshing = ref<number | null>(null);
const availableBooks = ref<Book[]>([]);
const currentEditId = ref<number | null>(null);

// 选择相关
const selectedConfigs = ref<BookChapterRssConfig[]>([]);

// 上传相关
const uploadRef = ref();
const uploadProgress = ref(0);
const uploadStatus = ref<'success' | 'exception' | 'warning' | ''>('');
const uploadAction = '/api/book-rss/books/upload';
const uploadHeaders = {
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
};

const getInitialFormState = (): Omit<BookChapterRssConfig, 'id' | 'key' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  description: '',
  bookId: null,
  includeContent: true,
  updateInterval: 1,
  minReturnChapters: 3,
  chaptersPerUpdate: 3,
  forceFullUpdate: false
});

const form = ref<Omit<BookChapterRssConfig, 'id' | 'key' | 'createdAt' | 'updatedAt'>>(getInitialFormState());

const rules = reactive<FormRules>({
  title: [{ required: true, message: '请输入订阅标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  bookId: [
    {
      required: true,
      validator: (_rule: any, value: any, callback: any) => {
        if (bookSelectionMode.value === 'upload' && !value) {
          callback(new Error('请选择书籍'));
        } else if (bookSelectionMode.value === 'opds' && !selectedOpdsBook.value) {
          callback(new Error('请选择OPDS书籍'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    }
  ],

  updateInterval: [{ required: true, message: '请输入更新间隔', trigger: 'blur' }],
});

const fetchConfigs = async () => {
  configsLoading.value = true;
  try {
    const res = await bookRssApi.getAllConfigs();
    configs.value = (res.data || []).map((config: any) => ({
      ...config,
      bookInfo: config.bookInfo || null
    }));
  } catch (error: any) {
    console.error('获取配置列表失败:', error);
    ElMessage.error(`获取配置列表失败: ${error.message || '网络错误'}`);
  } finally {
    configsLoading.value = false;
  }
};

// 获取书籍来源类型的标签样式
const getSourceTypeTag = (sourceType: string) => {
  switch (sourceType) {
    case 'upload':
      return 'success';
    case 'opds':
      return 'primary';
    case 'url':
      return 'warning';
    default:
      return 'info';
  }
};

// 获取书籍来源类型的文本
const getSourceTypeText = (sourceType: string) => {
  switch (sourceType) {
    case 'upload':
      return '用户上传';
    case 'opds':
      return 'OPDS服务';
    case 'url':
      return '在线链接';
    default:
      return '未知来源';
  }
};

// 获取可用书籍列表
const fetchBooks = async () => {
  try {
    const res = await bookRssApi.getAllBooks();
    // 后端返回的是分页数据，需要从data中获取书籍列表
    availableBooks.value = res.data || [];
  } catch (error: any) {
    console.error('获取书籍列表失败:', error);
    ElMessage.error(`获取书籍列表失败: ${error.message || '网络错误'}`);
  }
};

onMounted(() => {
  fetchConfigs();
  fetchBooks();
});

const resetForm = () => {
  form.value = getInitialFormState();
  bookSelectionMode.value = 'upload';
  selectedOpdsBook.value = null;
};

const addConfig = () => {
  isEdit.value = false;
  dialogTitle.value = '添加图书RSS配置';
  resetForm();
  dialogVisible.value = true;
};

const editConfig = (config: BookChapterRssConfig) => {
  isEdit.value = true;
  dialogTitle.value = '编辑图书RSS配置';
  form.value = {
    title: config.title,
    description: config.description,
    bookId: config.bookId,
    bookInfo: config.bookInfo,
    includeContent: config.includeContent,
    updateInterval: config.updateInterval,
    minReturnChapters: config.minReturnChapters || 3,
    chaptersPerUpdate: config.chaptersPerUpdate || 3,
    forceFullUpdate: config.forceFullUpdate || false
  };
  // 存储当前编辑的配置ID
  currentEditId.value = config.id;
  dialogVisible.value = true;
};

// 处理书籍选择变化
const handleBookChange = (bookId: number) => {
  const selectedBook = availableBooks.value.find(book => book.id === bookId);
  if (selectedBook) {
    form.value.bookInfo = selectedBook;
    // 自动填充标题
    if (!form.value.title) {
      form.value.title = `${selectedBook.title} - 章节订阅`;
    }
    // 自动填充描述
    if (!form.value.description) {
      form.value.description = `${selectedBook.title} 的章节更新订阅`;
    }
  }
};

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
};

const submitForm = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    submitLoading.value = true;
    
    const configData = form.value;
    let finalData: any;
    
    if (bookSelectionMode.value === 'opds' && selectedOpdsBook.value) {
      // OPDS模式：从OPDS服务添加书籍
      finalData = {
        title: configData.title,
        description: configData.description,
        opdsBook: {
          id: selectedOpdsBook.value.id,
          title: selectedOpdsBook.value.title,
          author: selectedOpdsBook.value.author,
          description: selectedOpdsBook.value.description,
          link: selectedOpdsBook.value.link
        },
        includeContent: configData.includeContent,
  
        updateInterval: configData.updateInterval,
        minReturnChapters: configData.minReturnChapters,
        chaptersPerUpdate: configData.chaptersPerUpdate,
  
        sourceType: 'opds'
      };
    } else {
      // 手动上传模式：使用现有书籍
      finalData = {
        title: configData.title,
        description: configData.description,
        bookFilter: {
          title: '',
          author: '',
          categories: [],
          language: '',
          fileFormats: []
        },
  
        updateInterval: configData.updateInterval,
        bookId: configData.bookId,
        includeContent: configData.includeContent,
  
        minReturnChapters: configData.minReturnChapters,
        chaptersPerUpdate: configData.chaptersPerUpdate,
  
        sourceType: 'upload'
      };
    }
     
    if (isEdit.value && currentEditId.value) {
      await bookRssApi.updateConfig(currentEditId.value, finalData);
      ElMessage.success('更新配置成功');
    } else {
      await bookRssApi.addConfig(finalData);
      ElMessage.success('添加配置成功');
    }
    
    dialogVisible.value = false;
    fetchConfigs();
    // 重置表单状态
    resetForm();
  } catch (error: any) {
    console.error('提交表单失败:', error);
    ElMessage.error(`操作失败: ${error.message || '网络错误'}`);
  } finally {
    submitLoading.value = false;
  }
};

const refreshConfig = async (id: number) => {
  refreshing.value = id;
  try {
    await bookRssApi.refreshConfig(id);
    ElMessage.success('刷新配置成功');
    fetchConfigs();
  } catch (error: any) {
    console.error('刷新配置失败:', error);
    ElMessage.error(`刷新配置失败: ${error.message || '网络错误'}`);
  } finally {
    refreshing.value = null;
  }
};

const handleDropdownCommand = async (command: string, row: BookChapterRssConfig) => {
  switch (command) {
    case 'copy-rss':
      if (row.key) copyLink('rss', row.key);
      break;
    case 'copy-json':
      if (row.key) copyLink('json', row.key);
      break;
    case 'delete':
      await deleteConfig(row);
      break;
  }
};

const deleteConfig = async (config: BookChapterRssConfig) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除图书RSS配置 "${config.title}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await bookRssApi.deleteConfig(config.id);
    ElMessage.success('删除配置成功');
    fetchConfigs();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除配置失败:', error);
      ElMessage.error(`删除配置失败: ${error.message || '网络错误'}`);
    }
  }
};

const copyLink = (type: 'rss' | 'json', key: string) => {
  const baseUrl = window.location.origin;
  const link = type === 'rss' 
    ? `${baseUrl}/api/book-rss/feed/${key}`
    : `${baseUrl}/api/book-rss/feed/${key}/json`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      ElMessage.success(`${type.toUpperCase()}链接已复制到剪贴板`);
    }).catch(() => {
      ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
    });
  } else {
    ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
  }
};

// 处理选择变化
const handleSelectionChange = (selection: BookChapterRssConfig[]) => {
  selectedConfigs.value = selection;
};

// 导出选中的配置
const exportSelectedConfigs = async () => {
  try {
    if (selectedConfigs.value.length === 0) {
      ElMessage.warning('请先选择要导出的配置');
      return;
    }

    const exportData = selectedConfigs.value.map((config) => ({
      ...config,
      id: undefined, // 导出时移除ID
      key: undefined, // 导出时移除key
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedhub-book-rss-configs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success(`成功导出 ${selectedConfigs.value.length} 个配置`);
  } catch (error: any) {
    console.error('导出配置失败:', error);
    ElMessage.error(`导出配置失败: ${error.message || '网络错误'}`);
  }
};

// 上传相关方法
const beforeUpload = (file: File) => {
  const isValidFormat = [
    'application/epub+zip',
    'text/plain',
    'application/pdf',
    'application/x-mobipocket-ebook',
    'application/vnd.amazon.ebook'
  ].includes(file.type) || /\.(epub|txt|pdf|mobi|azw|azw3)$/i.test(file.name);
  
  if (!isValidFormat) {
    ElMessage.error('只支持 epub、txt、pdf、mobi、azw、azw3 格式的文件');
    return false;
  }
  
  const isLt100M = file.size / 1024 / 1024 < 100;
  if (!isLt100M) {
    ElMessage.error('文件大小不能超过 100MB');
    return false;
  }
  
  uploadProgress.value = 0;
  uploadStatus.value = '';
  return true;
};

const handleUploadProgress = (event: any) => {
  uploadProgress.value = Math.round((event.loaded / event.total) * 100);
};

const handleUploadSuccess = async (response: any) => {
  uploadProgress.value = 100;
  uploadStatus.value = 'success';
  
  if (response.success) {
    ElMessage.success('书籍上传成功');
    // 刷新书籍列表
    await fetchBooks();
    // 自动选中刚上传的书籍
    if (response.data && response.data.id) {
      form.value.bookId = response.data.id;
      handleBookChange(response.data.id);
    }
  } else {
    ElMessage.error(response.error || '上传失败');
    uploadStatus.value = 'exception';
  }
  
  // 3秒后隐藏进度条
  setTimeout(() => {
    uploadProgress.value = 0;
    uploadStatus.value = '';
  }, 3000);
};

const handleUploadError = (error: any) => {
  uploadProgress.value = 0;
  uploadStatus.value = 'exception';
  console.error('上传失败:', error);
  ElMessage.error('书籍上传失败，请重试');
};


</script>

<style scoped>
.book-rss-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.header h2 {
  margin: 0;
  color: #303133;
  font-weight: 600;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.batch-actions {
  margin-top: 16px;
}

/* 对话框样式 */
.book-rss-dialog {
  border-radius: 16px;
}

.book-rss-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.book-rss-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 24px;
  margin: 0;
}

.book-rss-dialog :deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.book-rss-dialog :deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 20px;
}

.book-rss-dialog :deep(.el-dialog__body) {
  padding: 0;
  background: #f8fafc;
}

.form-container {
  padding: 24px;
}

.book-rss-form {
  max-width: none;
}

/* 表单区域卡片 */
.form-section {
  margin-bottom: 20px;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  transition: all 0.3s ease;
}

.form-section:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.form-section :deep(.el-card__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-bottom: 1px solid #e4e7ed;
  padding: 16px 20px;
}

.form-section :deep(.el-card__body) {
  padding: 24px;
  background: white;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
  color: #667eea;
}

.section-title {
  font-weight: 600;
  font-size: 16px;
  color: #2d3748;
}

/* 表单网格布局 */
.form-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: 1fr;
}

.form-item-full {
  grid-column: 1 / -1;
}

.form-item-half {
  grid-column: span 1;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* 表单项样式 */
.form-grid :deep(.el-form-item) {
  margin-bottom: 20px;
}

.form-grid :deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
  margin-bottom: 8px;
  display: block;
  line-height: 1.5;
  width: auto !important;
}

.form-grid :deep(.el-form-item__content) {
  line-height: normal;
  margin-left: 0 !important;
}

.form-tip {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
  line-height: 1.4;
}

/* 上传区域样式 */
.upload-section {
  width: 100%;
}

.book-upload {
  width: 100%;
}

.book-upload :deep(.el-upload-dragger) {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  transition: all 0.3s ease;
  padding: 40px 20px;
}

.book-upload :deep(.el-upload-dragger:hover) {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-icon {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 16px;
  color: #374151;
  margin-bottom: 8px;
}

.upload-text em {
  color: #667eea;
  font-style: normal;
  font-weight: 500;
}

.upload-tip {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

.upload-progress {
  margin-top: 16px;
}

/* 空状态样式 */
.empty-books-notice {
  text-align: center;
  padding: 40px 20px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
}

/* 对话框底部 */
.dialog-footer {
  text-align: right;
  padding: 20px 24px;
  background: white;
  border-top: 1px solid #e4e7ed;
}

/* 工具类 */
.text-sm {
  font-size: 12px;
}

.text-gray-500 {
  color: #6b7280;
}

.ml-2 {
  margin-left: 8px;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-2 {
  gap: 8px;
}

.mt-1 {
  margin-top: 4px;
}

/* OPDS书籍选择样式 */
.opds-book-selection {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  background: #f9fafb;
}

.opds-controls {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
}

.opds-disabled-notice {
  margin: 16px 0;
}

.opds-empty {
  margin: 16px 0;
  text-align: center;
}

.opds-book-list {
  margin: 16px 0;
}

.selected-opds-book {
  margin-top: 16px;
}

/* 书籍封面样式 */
.book-info-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.book-cover-container {
  flex-shrink: 0;
  width: 48px;
  height: 64px;
}

.book-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.book-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  color: #999;
  font-size: 20px;
}

.book-details {
  flex: 1;
  min-width: 0;
}

.book-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .book-rss-container {
    padding: 12px;
  }
  
  .header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .header-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .form-container {
    padding: 16px;
  }
  
  .form-section :deep(.el-card__body) {
    padding: 16px;
  }
}
</style>