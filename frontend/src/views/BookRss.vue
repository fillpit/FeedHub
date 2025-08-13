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
      <el-table-column label="订阅书籍" min-width="250">
        <template #default="{ row }">
          <div v-if="row.bookInfo">
            <div class="font-medium">{{ row.bookInfo.title }}</div>
            <div class="text-sm text-gray-500">作者: {{ row.bookInfo.author }}</div>
            <div class="text-xs text-blue-500 mt-1">
              <el-tag size="small" :type="getSourceTypeTag(row.bookInfo.sourceType)">
                {{ getSourceTypeText(row.bookInfo.sourceType) }}
              </el-tag>
            </div>
          </div>
          <div v-else class="text-sm text-gray-400">未选择书籍</div>
        </template>
      </el-table-column>
      <el-table-column label="章节设置" min-width="150">
        <template #default="{ row }">
          <div class="text-sm">
            <div>最大章节: {{ row.maxChapters || 50 }}</div>
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
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="850px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="left"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入图书RSS标题" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入图书RSS描述"
          />
        </el-form-item>

        <!-- 书籍选择 -->
        <el-divider content-position="left">书籍选择</el-divider>
        
        <el-form-item label="选择模式">
          <el-radio-group v-model="bookSelectionMode" @change="handleModeChange">
            <el-radio value="upload">手动上传</el-radio>
            <el-radio value="opds">OPDS服务</el-radio>
          </el-radio-group>
          <div class="text-sm text-gray-500 mt-1">
            {{ bookSelectionMode === 'upload' ? '从已上传的书籍中选择' : '从OPDS服务中选择书籍' }}
          </div>
        </el-form-item>
        
        <!-- 手动上传模式 -->
        <template v-if="bookSelectionMode === 'upload'">
          <!-- 书籍上传 -->
          <el-form-item label="上传书籍">
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
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                  将书籍文件拖到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
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
          
          <!-- 书籍选择 -->
          <el-form-item label="选择书籍" prop="bookId">
            <div v-if="availableBooks.length === 0" class="empty-books-notice">
              <el-empty description="暂无已上传的书籍">
                <template #image>
                  <el-icon size="60" color="#909399"><document /></el-icon>
                </template>
                <el-button type="primary" @click="() => {}">
                  请先上传书籍文件
                </el-button>
              </el-empty>
            </div>
            <el-select
              v-else
              v-model="form.bookId"
              placeholder="请选择要订阅的书籍"
              style="width: 100%"
              filterable
              @change="handleBookChange"
            >
              <el-option
                v-for="book in availableBooks"
                :key="book.id"
                :label="`${book.title} - ${book.author}`"
                :value="book.id"
              >
                <div>
                  <div>{{ book.title }}</div>
                  <div class="text-sm text-gray-500">作者: {{ book.author }} | 章节: {{ book.totalChapters }}</div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </template>
        
        <!-- OPDS模式 -->
        <el-form-item v-if="bookSelectionMode === 'opds'" label="OPDS书籍">
          <OpdsBookSelector
            v-model="selectedOpdsBook"
            @book-selected="handleOpdsBookSelected"
          />
        </el-form-item>

        <!-- 章节订阅配置 -->
        <el-divider content-position="left">章节订阅配置</el-divider>
        
        <el-form-item label="包含章节内容">
          <el-switch
            v-model="form.includeContent"
            active-text="包含"
            inactive-text="仅标题"
          />
          <div class="text-sm text-gray-500 mt-1">开启后RSS将包含章节的完整内容</div>
        </el-form-item>
        
        <el-form-item label="最大章节数" prop="maxChapters">
          <el-input-number
            v-model="form.maxChapters"
            :min="1"
            :max="500"
            placeholder="最大章节数"
          />
          <div class="text-sm text-gray-500 mt-1">RSS中包含的最大章节数量</div>
        </el-form-item>

        <!-- 其他配置 -->
        <el-divider content-position="left">其他配置</el-divider>
        
        <el-form-item label="更新间隔" prop="updateInterval">
          <el-input-number
            v-model="form.updateInterval"
            :min="1"
            :max="365"
            placeholder="更新间隔(天)"
          />
          <span class="ml-2 text-sm text-gray-500">天</span>
          <div class="text-sm text-gray-500 mt-1">检查新章节的时间间隔</div>
        </el-form-item>

        <el-form-item label="最小返回章节数" prop="minReturnChapters">
          <el-input-number
            v-model="form.minReturnChapters"
            :min="1"
            :max="20"
            placeholder="最小返回章节数"
          />
          <span class="ml-2 text-sm text-gray-500">章</span>
          <div class="text-sm text-gray-500 mt-1">当没有新章节时，返回的最少章节数量</div>
        </el-form-item>

        <el-form-item label="强制全量更新">
          <el-switch
            v-model="form.forceFullUpdate"
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="text-sm text-gray-500 mt-1">开启后每次都返回最新的章节，忽略增量更新逻辑</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">
            {{ isEdit ? '更新' : '添加' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Refresh, ArrowDown, UploadFilled, Document } from '@element-plus/icons-vue';
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
  maxChapters: number;
  updateInterval: number;
  minReturnChapters?: number;
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
  maxChapters: 50,
  updateInterval: 1,
  minReturnChapters: 3,
  forceFullUpdate: false
});

const form = ref<Omit<BookChapterRssConfig, 'id' | 'key' | 'createdAt' | 'updatedAt'>>(getInitialFormState());

const rules = reactive<FormRules>({
  title: [{ required: true, message: '请输入订阅标题', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  bookId: [
    {
      required: true,
      validator: (rule: any, value: any, callback: any) => {
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
  maxChapters: [{ required: true, message: '请输入最大章节数', trigger: 'blur' }],
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
    maxChapters: config.maxChapters,
    updateInterval: config.updateInterval
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
        maxChapters: configData.maxChapters,
        updateInterval: configData.updateInterval,
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
        maxBooks: configData.maxChapters || 50,
        updateInterval: configData.updateInterval,
        bookId: configData.bookId,
        includeContent: configData.includeContent,
        maxChapters: configData.maxChapters,
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
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.batch-actions {
  margin-top: 16px;
}

.dialog-footer {
  text-align: right;
}

.text-sm {
  font-size: 12px;
}

.text-gray-500 {
  color: #909399;
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

/* OPDS书籍选择样式 */
.opds-book-selection {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 16px;
  background: #fafafa;
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

.mt-1 {
  margin-top: 4px;
}

/* 上传相关样式 */
.upload-section {
  width: 100%;
}

.book-upload {
  width: 100%;
}

.upload-progress {
  margin-top: 16px;
}

.empty-books-notice {
  text-align: center;
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background-color: #fafafa;
}
</style>