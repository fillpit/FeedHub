<template>
  <el-dropdown
    class="user-header"
    trigger="click"
    popper-class="user-dropdown-popper"
    @command="handleCommand"
    @visible-change="handleVisibleChange"
  >
    <div class="user-info">
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

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="profile">
          <el-icon><User /></el-icon>
          <span>个人资料</span>
        </el-dropdown-item>
        <el-dropdown-item command="settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-dropdown-item>
        <el-dropdown-item divided command="logout" class="logout-item">
          <el-icon><SwitchButton /></el-icon>
          <span>退出登录</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
function handleVisibleChange(visible: boolean) {
  dropdownVisible.value = visible;
}

function handleCommand(command: string) {
  switch (command) {
    case 'profile':
      router.push('/profile');
      break;
    case 'settings':
      router.push('/setting');
      break;
    case 'logout':
      handleLogout();
      break;
  }
}

// 处理登出
async function handleLogout() {
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

// 生命周期
onMounted(() => {
  // 初始化认证状态
  authStore.initAuth();
});
</script>

<style lang="scss" scoped>
.user-header {
  height: 100%;
  display: flex;
  align-items: center;

  :deep(.el-tooltip__trigger) {
    height: 100%;
    display: flex;
    align-items: center;
  }
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
  outline: none; // Remove default focus outline as we'll rely on element's focus visible or custom styles if needed

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  // Add focus styles for keyboard accessibility
  &:focus-visible {
    background-color: var(--el-fill-color-light);
    box-shadow: 0 0 0 2px var(--el-color-primary-light-5);
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

// 响应式设计
@media (max-width: 768px) {
  .user-info {
    padding: 6px 12px;
    gap: 8px;

    .user-details {
      display: none; // 在小屏幕上隐藏用户详情
    }
  }
}
</style>

<style lang="scss">
// Global styles for the dropdown popper
.user-dropdown-popper {
  // Apply glass effect similar to original if desired, or stick to standard Element Plus
  // standard Element Plus dropdown is usually white with shadow.

  .logout-item {
    color: var(--el-color-danger);

    &:hover {
      background-color: var(--el-color-danger-light-9) !important;
      color: var(--el-color-danger) !important;
    }
  }

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px; // Increase touch target

    .el-icon {
      margin-right: 0; // Reset default margin if any
    }
  }
}
</style>
