<template>
  <div class="file-tree-node">
    <div 
      class="node-content"
      :class="{
        'is-selected': node.type === 'file' && selectedFile === node.path,
        'is-directory': node.type === 'directory',
        'is-file': node.type === 'file'
      }"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      @click="handleClick"
      @contextmenu.prevent="showContextMenu"
    >
      <!-- 展开/折叠箭头 -->
      <div 
        class="expand-arrow"
        v-if="node.type === 'directory'"
        @click.stop="toggleExpanded"
      >
        <svg 
          class="arrow-icon"
          :class="{ 'expanded': isExpanded }"
          width="16" 
          height="16" 
          viewBox="0 0 16 16"
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div v-else class="expand-spacer"></div>
      
      <!-- 文件/目录图标 -->
      <div class="file-icon">
        <!-- 目录图标 -->
        <svg v-if="node.type === 'directory'" class="folder-icon" :class="{ 'expanded': isExpanded }" width="16" height="16" viewBox="0 0 16 16">
          <path v-if="!isExpanded" d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A.5.5 0 0 0 9.415 3.5H13A1.5 1.5 0 0 1 14.5 5v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3z" fill="#dcb67a"/>
          <path v-else d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A.5.5 0 0 0 9.415 3.5H13A1.5 1.5 0 0 1 14.5 5v8a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 13V3z" fill="#dcb67a"/>
          <path v-if="isExpanded" d="M1.5 4.5h13v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8z" fill="#b8a082"/>
        </svg>
        
        <!-- 文件图标 -->
        <template v-else>
          <!-- JavaScript 文件 -->
          <svg v-if="node.extension === '.js'" class="file-icon-svg js" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#f7df1e"/>
            <text x="8" y="11" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#000">JS</text>
          </svg>
          
          <!-- JSON 文件 -->
          <svg v-else-if="node.extension === '.json'" class="file-icon-svg json" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#00d4aa"/>
            <text x="8" y="11" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#fff">{}</text>
          </svg>
          
          <!-- TypeScript 文件 -->
          <svg v-else-if="node.extension === '.ts'" class="file-icon-svg ts" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#3178c6"/>
            <text x="8" y="11" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#fff">TS</text>
          </svg>
          
          <!-- CSS 文件 -->
          <svg v-else-if="node.extension === '.css'" class="file-icon-svg css" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#1572b6"/>
            <text x="8" y="11" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#fff">CSS</text>
          </svg>
          
          <!-- HTML 文件 -->
          <svg v-else-if="node.extension === '.html'" class="file-icon-svg html" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#e34f26"/>
            <text x="8" y="11" text-anchor="middle" font-family="Arial, sans-serif" font-size="7" font-weight="bold" fill="#fff">HTML</text>
          </svg>
          
          <!-- Markdown 文件 -->
          <svg v-else-if="node.extension === '.md'" class="file-icon-svg md" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#083fa1"/>
            <text x="8" y="11" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#fff">MD</text>
          </svg>
          
          <!-- 其他文件 -->
          <svg v-else class="file-icon-svg default" width="16" height="16" viewBox="0 0 16 16">
            <rect width="16" height="16" rx="2" fill="#6c757d"/>
            <rect x="3" y="3" width="10" height="10" rx="1" fill="none" stroke="#fff" stroke-width="1"/>
            <line x1="5" y1="6" x2="11" y2="6" stroke="#fff" stroke-width="1"/>
            <line x1="5" y1="8" x2="11" y2="8" stroke="#fff" stroke-width="1"/>
            <line x1="5" y1="10" x2="9" y2="10" stroke="#fff" stroke-width="1"/>
          </svg>
        </template>
      </div>
      
      <!-- 文件名 -->
      <span class="file-name">{{ node.name }}</span>
      
      <!-- 文件大小 -->
      <span v-if="node.type === 'file' && node.size" class="file-size">
        {{ formatFileSize(node.size) }}
      </span>
      
      <!-- 操作按钮 -->
      <div 
        class="file-actions"
        v-if="node.type === 'file' && node.name !== 'main.js' && node.name !== 'index.js' && node.name != 'package.json' "
      >
        <button 
          class="action-btn delete-btn"
          @click.stop="handleDelete"
          title="删除文件"
        >
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 1.152l.557 10.032A1.5 1.5 0 0 0 4.55 15h6.9a1.5 1.5 0 0 0 1.497-1.316l.557-10.032a.58.58 0 0 0-.01-1.152H11Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 子节点 -->
    <div v-if="node.type === 'directory' && isExpanded && node.children" class="children">
      <FileTreeNode 
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected-file="selectedFile"
        :level="level + 1"
        @file-click="$emit('file-click', $event)"
        @delete-file="$emit('delete-file', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  node: any;
  selectedFile: string;
  level: number;
}

interface Emits {
  (e: 'file-click', node: any): void;
  (e: 'delete-file', path: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isExpanded = ref(true); // 默认展开

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const handleClick = () => {
  if (props.node.type === 'file') {
    emit('file-click', props.node);
  } else {
    toggleExpanded();
  }
};

const handleDelete = () => {
  emit('delete-file', props.node.path);
};

const showContextMenu = () => {
  // 可以在这里添加右键菜单功能
  console.log('Right click on:', props.node.name);
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
</script>

<style lang="scss" scoped>
.file-tree-node {
  user-select: none;
  
  .node-content {
    display: flex;
    align-items: center;
    height: 22px;
    padding-right: 8px;
    cursor: pointer;
    position: relative;
    transition: background-color 0.1s ease;
    
    &:hover {
      background-color: rgba(90, 93, 94, 0.31);
    }
    
    &.is-selected {
      background-color: #094771;
      color: #ffffff;
      
      .file-name {
        font-weight: 500;
      }
    }
    
    &.is-directory {
      font-weight: 500;
      
      .file-name {
        color: #cccccc;
      }
    }
    
    &.is-file {
      .file-name {
        color: #cccccc;
      }
    }
  }
  
  .expand-arrow {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 2px;
    
    .arrow-icon {
      width: 12px;
      height: 12px;
      color: #cccccc;
      transition: transform 0.1s ease;
      transform: rotate(0deg);
      
      &.expanded {
        transform: rotate(90deg);
      }
    }
  }
  
  .expand-spacer {
    width: 18px;
    height: 16px;
  }
  
  .file-icon {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .folder-icon {
      width: 16px;
      height: 16px;
      
      &.expanded {
        // 可以添加展开状态的样式
      }
    }
    
    .file-icon-svg {
      width: 16px;
      height: 16px;
    }
  }
  
  .file-name {
    flex: 1;
    font-size: 13px;
    line-height: 22px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .file-size {
    font-size: 11px;
    color: #858585;
    margin-left: 8px;
    white-space: nowrap;
  }
  
  .file-actions {
    opacity: 0;
    transition: opacity 0.1s ease;
    margin-left: 4px;
    
    .action-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      &.delete-btn {
        color: #f48771;
        
        &:hover {
          background-color: rgba(244, 135, 113, 0.2);
        }
      }
    }
  }
  
  .node-content:hover .file-actions {
    opacity: 1;
  }
  
  .children {
    // 子节点容器，无需额外样式
  }
}
</style>