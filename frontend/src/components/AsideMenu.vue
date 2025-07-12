<template>
  <div class="pc-aside">
    <!-- Logo 区域 -->
    <div class="pc-aside__logo">
      <img :src="logo" alt="FeedHub Logo" class="logo__image" />
      <h1 class="logo__title">FeedHub</h1>
    </div>

    <!-- 菜单区域 -->
    <el-menu
      :default-active="currentMenu?.index || '1'"
      :default-openeds="currentMenuOpen"
      class="pc-aside__menu"
    >
      <template v-for="menu in menuList" :key="menu.index">
        <!-- 子菜单 -->
        <el-sub-menu v-if="menu.children" :index="menu.index">
          <template #title>
            <el-icon><component :is="menu.icon" /></el-icon>
            <span>{{ menu.title }}</span>
          </template>

          <el-menu-item
            v-for="child in menu.children"
            :key="child.index"
            :index="child.index"
            @click="handleMenuClick(child)"
          >
            <span>{{ child.title }}</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 普通菜单项 -->
        <el-menu-item
          v-else
          :index="menu.index"
          :disabled="menu.disabled"
          @click="handleMenuClick(menu)"
        >
          <el-icon><component :is="menu.icon" /></el-icon>
          <span>{{ menu.title }}</span>
        </el-menu-item>
      </template>
    </el-menu>

    <!-- GitHub 链接 -->
    <div class="pc-aside__footer">
      <a :href="PROJECT_GITHUB" target="_blank" rel="noopener noreferrer" class="github-link">
        <svg
          height="20"
          aria-hidden="true"
          viewBox="0 0 24 24"
          version="1.1"
          width="20"
          class="github-icon"
        >
          <path
            fill="currentColor"
            d="M12.5.75C6.146.75 1 5.896 1 12.25c0 5.089 3.292 9.387 7.863 10.91.575.101.79-.244.79-.546 0-.273-.014-1.178-.014-2.142-2.889.532-3.636-.704-3.866-1.35-.13-.331-.69-1.352-1.18-1.625-.402-.216-.977-.748-.014-.762.906-.014 1.553.834 1.769 1.179 1.035 1.74 2.688 1.25 3.349.948.1-.747.402-1.25.733-1.538-2.559-.287-5.232-1.279-5.232-5.678 0-1.25.445-2.285 1.178-3.09-.115-.288-.517-1.467.115-3.048 0 0 .963-.302 3.163 1.179.92-.259 1.897-.388 2.875-.388.977 0 1.955.13 2.875.388 2.2-1.495 3.162-1.179 3.162-1.179.633 1.581.23 2.76.115 3.048.733.805 1.179 1.825 1.179 3.09 0 4.413-2.688 5.39-5.247 5.678.417.36.776 1.05.776 2.128 0 1.538-.014 2.774-.014 3.162 0 .302.216.662.79.547C20.709 21.637 24 17.324 24 12.25 24 5.896 18.854.75 12.5.75Z"
          />
        </svg>
        <span>GitHub</span>
        <span class="version">v{{ pkg.version }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Search, Film, Setting, Link, Document, Collection, Key } from "@element-plus/icons-vue";
import logo from "/logo.svg";
import { PROJECT_GITHUB } from "@/constants/project";
import pkg from "../../package.json";

// 类型定义
interface MenuItem {
  index: string;
  title: string;
  icon?: typeof Search | typeof Film | typeof Setting | typeof Link | typeof Collection | typeof Key;
  router?: string;
  children?: MenuItem[];
  disabled?: boolean;
}

// 路由相关
const router = useRouter();
const route = useRoute();

// 菜单配置
const menuList: MenuItem[] = [
  {
    index: "1",
    title: "网站内容监控",
    icon: Document,
    router: "/website-rss",
  },
  {
    index: "2",
    title: "RSS模板管理",
    icon: Collection,
    router: "/template-management",
  },
  {
    index: "3",
    title: "授权管理",
    icon: Key,
    router: "/auth-credential",
  },
  {
    index: "99",
    title: "设置",
    icon: Setting,
    router: "/setting",
    disabled: false,
  }
];

// 计算当前激活的菜单
const currentMenu = computed(() => {
  const flatMenus = menuList.reduce<MenuItem[]>((acc, menu) => {
    if (!menu.children) {
      acc.push(menu);
    } else {
      acc.push(...menu.children);
    }
    return acc;
  }, []);

  return flatMenus.find((menu) => menu.router === decodeURIComponent(route.fullPath));
});

// 计算当前展开的子菜单
const currentMenuOpen = computed(() => {
  if (currentMenu.value?.index.includes("-")) {
    return [currentMenu.value.index.split("-")[0]];
  }
  return [];
});

// 菜单点击处理
const handleMenuClick = (menu: MenuItem) => {
  if (menu.router) {
    router.push(menu.router);
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/common.scss";

.pc-aside {
  height: 100%;
  background: var(--theme-card-bg);
  border-right: 1px solid rgba(0, 0, 0, 0.1);

  // Logo 区域
  &__logo {
    @include common.flex-center();
    padding: 24px 16px;
    gap: 12px;

    .logo__image {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .logo__title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--theme-text-primary);
      @include common.text-overflow;
    }
  }

  // 菜单区域
  &__menu {
    border-right: none;
    background: transparent;

    :deep(.el-menu-item) {
      height: 48px;
      line-height: 48px;
      color: var(--theme-text-regular);

      &.is-active {
        color: var(--theme-primary);
        background: rgba(0, 102, 204, 0.1);
      }

      &:hover {
        color: var(--theme-primary);
        background: rgba(0, 102, 204, 0.05);
      }
    }

    :deep(.el-sub-menu) {
      .el-sub-menu__title {
        color: var(--theme-text-regular);

        &:hover {
          color: var(--theme-primary);
          background: rgba(0, 102, 204, 0.05);
        }
      }
    }

    :deep(.el-icon) {
      font-size: 18px;
      margin-right: 12px;
      color: inherit;
    }
  }

  // GitHub 链接区域
  &__footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background: var(--theme-card-bg);

    .github-link {
      @include common.flex-center();
      gap: 8px;
      padding: 12px;
      color: var(--theme-text-regular);
      text-decoration: none;
      border-radius: var(--theme-radius);
      transition: var(--theme-transition);

      .github-icon {
        font-size: 20px;
        transition: var(--theme-transition);
      }

      .version {
        font-size: 12px;
        opacity: 0.7;
        margin-left: 4px;
      }

      &:hover {
        color: var(--theme-primary);
        background: rgba(0, 102, 204, 0.05);
        transform: translateY(-1px);

        .github-icon {
          transform: scale(1.1);
        }

        .version {
          opacity: 1;
        }
      }
    }
  }
}

// 自定义滚动条
.pc-aside__menu {
  height: calc(100vh - 80px - 69px); // 减去 logo 高度和 footer 高度
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}
</style>
