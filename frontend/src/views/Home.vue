<template>
  <div class="pc-home" :class="{ 'is-loading': resourcStore.loading }">
    <!-- 主布局容器 -->
    <el-container class="pc-home__container">
      <!-- 侧边栏 -->
      <el-aside width="220px" class="pc-home__aside">
        <aside-menu />
      </el-aside>

      <!-- 主内容区 -->
      <el-container class="pc-home__main">
        <!-- 顶部搜索栏 -->
        <!-- <el-header class="pc-home__header" :class="{ 'is-scrolled': !store.scrollTop }">
          <search-bar />
        </el-header> -->

        <!-- 内容区域 -->
        <el-main class="pc-home__content">
          <div class="content-wrapper">
            <router-view v-slot="{ Component }">
              <transition name="fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </el-main>
      </el-container>
    </el-container>

    <!-- 全局加载 -->
    <div v-if="resourcStore.loading" class="pc-home__loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span class="loading-text">加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useResourceStore } from "@/stores/resource";
import { useStore } from "@/stores/index";
import { useUserSettingStore } from "@/stores/userSetting";
import { throttle } from "@/utils/index";
import { Loading } from "@element-plus/icons-vue";
import "element-plus/es/components/loading/style/css";
import AsideMenu from "@/components/AsideMenu.vue";

// 状态管理
const resourcStore = useResourceStore();
const store = useStore();
const settingStore = useUserSettingStore();

// 初始化设置
onMounted(() => {
  settingStore.getSettings();
  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
});

// 滚动处理
const handleScroll = throttle(() => {
  const scrollTop = window.scrollY;
  store.setScrollTop(scrollTop <= 50);
}, 100);
</script>

<style lang="scss" scoped>
@use "@/styles/common.scss";

.pc-home {
  position: relative;
  height: 100vh;
  background: var(--theme-bg);
  color: var(--theme-text-primary);

  // 主容器
  &__container {
    height: 100%;
  }

  // 侧边栏
  &__aside {
    background: var(--theme-card-bg);
    backdrop-filter: var(--theme-blur);
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: var(--theme-transition);

    &:hover {
      box-shadow: var(--theme-shadow);
    }
  }

  // 主内容区
  &__main {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
    height: 100%;
  }

  // 顶部搜索栏
  &__header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: auto;
    padding: 16px;
    background: var(--theme-card-bg);
    backdrop-filter: var(--theme-blur);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    transition: var(--theme-transition);

    &.is-scrolled {
      padding: 12px;
      box-shadow: var(--theme-shadow-sm);
    }
  }

  // 内容区域
  &__content {
    flex: 1;
    padding: 20px;
    height: 0;

    .content-wrapper {
      height: 100%;
    }
  }

  // 加载状态
  &__loading {
    @include common.flex-center;
    position: fixed;
    inset: 0;
    z-index: 2000;
    flex-direction: column;
    gap: 16px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    animation: fadeIn 0.3s ease;

    .loading-text {
      color: var(--theme-text-primary);
      font-size: 14px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }

    .is-loading {
      font-size: 24px;
      color: var(--theme-primary);
      animation: rotating 2s linear infinite;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1));
    }
  }
}

// 加载动画
@keyframes fadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
}

// 路由过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
