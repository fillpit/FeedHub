<template>
  <div class="user-header">
    <!-- 用户头像和信息 -->
    <div class="user-info" @click="toggleDropdown">
      <el-avatar :size="36" :src="userAvatar" class="user-avatar">
        <template #default>
          <el-icon><User /></el-icon>
        </template>
      </el-avatar>
      <div class="user-details">
        <div class="username">{{ user?.username || '未登录' }}</div>
        <div class="user-role">{{ userRoleText }}</div>
      </div>
      <el-icon class="dropdown-icon" :class="{ 'is-open': dropdownVisible }">
        <ArrowDown />
      </el-icon>
    </div>

    <!-- 下拉菜单 -->
    <transition name="dropdown">
      <div v-if="dropdownVisible" class="dropdown-menu" @click.stop>
        <div class="dropdown-item" @click="goToProfile">
          <el-icon><User /></el-icon>
          <span>个人资料</span>
        </div>
        <div class="dropdown-item" @click="goToSettings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item logout" @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </div>
      </div>
    </transition>

    <!-- 点击遮罩关闭下拉菜单 -->
    <div v-if="dropdownVisible" class="dropdown-overlay" @click="closeDropdown"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, Setting, SwitchButton, ArrowDown } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// 响应式数据
const dropdownVisible = ref(false);

// 计算属性
const user = computed(() => authStore.user);
const userAvatar = computed(() => authStore.userAvatar);
const userRoleText = computed(() => {
  if (!user.value) return '游客';
  return user.value.role === 1 ? '管理员' : '普通用户';
});

// 方法
function toggleDropdown() {
  dropdownVisible.value = !dropdownVisible.value;
}

function closeDropdown() {
  dropdownVisible.value = false;
}

// 跳转到个人资料页面
function goToProfile() {
  closeDropdown();
  // TODO: 实现个人资料页面
  ElMessage.info('个人资料功能开发中...');
}

// 跳转到设置页面
function goToSettings() {
  closeDropdown();
  router.push('/setting');
}

// 处理登出
async function handleLogout() {
  closeDropdown();
  
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    authStore.logout();
    ElMessage.success('已退出登录');
  } catch {
    // 用户取消操作
  }
}

// 点击外部关闭下拉菜单
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  const userHeader = document.querySelector('.user-header');
  
  if (userHeader && !userHeader.contains(target)) {
    closeDropdown();
  }
}

// 生命周期
onMounted(() => {
  // 初始化认证状态
  authStore.initAuth();
  
  // 添加全局点击事件监听
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  // 移除全局点击事件监听
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style lang="scss" scoped>
.user-header {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  .user-avatar {
    flex-shrink: 0;
    border: 2px solid var(--el-border-color-lighter);
    transition: border-color 0.2s ease;

    &:hover {
      border-color: var(--el-color-primary);
    }
  }

  .user-details {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .username {
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 12px;
      color: var(--el-text-color-secondary);
      line-height: 1.2;
    }
  }

  .dropdown-icon {
    flex-shrink: 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
    transition: transform 0.2s ease;

    &.is-open {
      transform: rotate(180deg);
    }
  }
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  min-width: 160px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  backdrop-filter: blur(10px);
  overflow: hidden;
  margin-top: 4px;

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: 14px;
    color: var(--el-text-color-primary);
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    &.logout {
      color: var(--el-color-danger);

      &:hover {
        background-color: var(--el-color-danger-light-9);
      }
    }

    .el-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    span {
      flex: 1;
      white-space: nowrap;
    }
  }

  .dropdown-divider {
    height: 1px;
    background-color: var(--el-border-color-lighter);
    margin: 4px 0;
  }
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

// 下拉菜单动画
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

// 响应式设计
@media (max-width: 768px) {
  .user-info {
    padding: 6px 12px;
    gap: 8px;

    .user-details {
      display: none; // 在小屏幕上隐藏用户详情
    }
  }

  .dropdown-menu {
    min-width: 140px;
    right: -8px;

    .dropdown-item {
      padding: 10px 12px;
      font-size: 13px;
    }
  }
}
</style>