<template>
  <div class="icon-selector">
    <el-input
      v-model="searchQuery"
      placeholder="搜索图标"
      clearable
      @input="filterIcons"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    
    <div class="icon-grid">
      <div
        v-for="icon in filteredSocialIcons"
        :key="icon.name"
        class="icon-item"
        :class="{ active: modelValue === icon.name }"
        @click="selectIcon(icon.name)"
      >
        <simple-icon :name="icon.name" />
        <span class="icon-name">{{ formatIconName(icon.name) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Search } from '@element-plus/icons-vue';
import * as SimpleIcons from 'simple-icons';

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

// 状态变量
const searchQuery = ref('');

// 图标集合
const socialIcons = ref<{name: string, title: string}[]>([]);

// 初始化图标列表
onMounted(() => {
  // Simple Icons (社交媒体图标)
  const siKeys = Object.keys(SimpleIcons);
  socialIcons.value = siKeys
    .filter(key => key.startsWith('si'))
    .map(key => ({
      name: key,
      title: (SimpleIcons as any)[key].title
    }));
});

// 过滤图标
const filterIcons = () => {
  // 过滤逻辑在计算属性中实现
};

// 格式化图标名称
const formatIconName = (name: string) => {
  // 移除'si'前缀，并添加空格
  return name.replace('si', '').replace(/([A-Z])/g, ' $1').trim();
};

// 选择图标
const selectIcon = (iconName: string) => {
  emit('update:modelValue', iconName);
};

// 过滤后的图标列表
const filteredSocialIcons = computed(() => {
  if (!searchQuery.value) return socialIcons.value;
  return socialIcons.value.filter(icon => 
    icon.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    icon.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});
</script>

<style scoped>
.icon-selector {
  width: 100%;
  height: 400px;
  display: flex;
  flex-direction: column;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 10px;
  padding: 10px;
  overflow-y: auto;
  max-height: 350px;
  margin-top: 10px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.icon-item:hover {
  background-color: #f5f7fa;
}

.icon-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.icon-name {
  font-size: 12px;
  margin-top: 5px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
</style>