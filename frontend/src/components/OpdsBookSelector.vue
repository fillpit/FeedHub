<template>
  <div class="opds-book-selector">
    <div class="opds-controls">
      <el-input
        v-model="searchQuery"
        placeholder="搜索书籍标题或作者"
        style="width: 300px; margin-right: 10px"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <el-button @click="handleSearch" :loading="loading">
        <el-icon><Search /></el-icon>
        搜索
      </el-button>
      <el-button @click="handleRefresh" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <div v-if="!opdsEnabled" class="opds-disabled-notice">
      <el-alert
        title="OPDS服务未启用"
        type="warning"
        description="请先在系统设置中配置并启用OPDS服务"
        show-icon
        :closable="false"
      />
    </div>
    
    <div v-else-if="books.length === 0 && !loading" class="opds-empty">
      <el-empty description="暂无书籍数据，请点击搜索或刷新" />
    </div>
    
    <div v-else class="opds-book-list">
      <el-table
        :data="books"
        v-loading="loading"
        style="width: 100%"
        max-height="300px"
        @row-click="handleSelectBook"
        highlight-current-row
      >
        <el-table-column prop="title" label="书名" min-width="200" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" width="150" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click.stop="handleSelectBook(row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <div v-if="selectedBook" class="selected-opds-book">
      <el-alert
        :title="`已选择: ${selectedBook.title}`"
        type="success"
        show-icon
        :closable="false"
      >
        <template #default>
          <div>作者: {{ selectedBook.author }}</div>
          <div v-if="selectedBook.description">描述: {{ selectedBook.description }}</div>
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import type { OpdsBook, Book } from '@feedhub/shared';
import * as bookRssApi from '@/api/bookRss';
import { settingApi } from '@/api/setting';

// OPDS书籍类型（从API返回的格式）
type OpdsBookFromApi = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;

// Props
interface Props {
  modelValue?: OpdsBook | null;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
});

// Emits
interface Emits {
  (e: 'update:modelValue', value: OpdsBook | null): void;
  (e: 'book-selected', book: OpdsBook): void;
}

const emit = defineEmits<Emits>();

// 响应式数据
const searchQuery = ref('');
const books = ref<OpdsBookFromApi[]>([]);
const loading = ref(false);
const opdsEnabled = ref(false);
const selectedBook = ref<OpdsBook | null>(props.modelValue);

// 监听props变化
watch(() => props.modelValue, (newValue) => {
  selectedBook.value = newValue;
});

// 检查OPDS状态
const checkOpdsStatus = async () => {
  try {
    const response = await settingApi.getSetting();
    if (response.data?.globalSetting) {
      opdsEnabled.value = response.data.globalSetting.opdsEnabled || false;
    }
  } catch (error) {
    console.error('检查OPDS状态失败:', error);
    opdsEnabled.value = false;
  }
};

// 搜索书籍
const handleSearch = async () => {
  if (!opdsEnabled.value) {
    ElMessage.warning('OPDS服务未启用');
    return;
  }
  
  loading.value = true;
  try {
    const response = await bookRssApi.fetchBooksFromOpds(searchQuery.value);
    books.value = response.data?.books || [];
  } catch (error) {
    console.error('搜索OPDS书籍失败:', error);
    ElMessage.error('搜索书籍失败');
  } finally {
    loading.value = false;
  }
};

// 刷新书籍列表
const handleRefresh = async () => {
  if (!opdsEnabled.value) {
    ElMessage.warning('OPDS服务未启用');
    return;
  }
  
  loading.value = true;
  try {
    const response = await bookRssApi.fetchBooksFromOpds('');
    books.value = response.data?.books || [];
  } catch (error) {
    console.error('获取OPDS书籍失败:', error);
    ElMessage.error('获取书籍列表失败');
  } finally {
    loading.value = false;
  }
};

// 选择书籍
const handleSelectBook = (book: OpdsBookFromApi) => {
  // 转换为OpdsBook格式
  const opdsBook: OpdsBook = {
    id: book.sourceUrl || book.title, // 使用sourceUrl或title作为id
    title: book.title,
    author: book.author,
    description: book.description,
    link: book.sourceUrl
  };
  selectedBook.value = opdsBook;
  emit('update:modelValue', opdsBook);
  emit('book-selected', opdsBook);
};

// 组件挂载时检查OPDS状态
onMounted(async () => {
  await checkOpdsStatus();
  handleRefresh();
});

// 暴露方法给父组件
defineExpose({
  refresh: handleRefresh,
  search: handleSearch,
  checkStatus: checkOpdsStatus
});
</script>

<style scoped>
.opds-book-selector {
  width: 100%;
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
</style>