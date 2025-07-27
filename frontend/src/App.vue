<template>
  <el-config-provider>
    <router-view
      v-loading.fullscreen.lock="isGlobalLoading"
      element-loading-text="加载中..."
      element-loading-spinner="el-icon-loading"
      element-loading-background="rgba(0, 0, 0, 0.8)"
    />
  </el-config-provider>
</template>

<script setup lang="ts">
import { useGlobalLoading } from "./utils/loading";

const { isGlobalLoading } = useGlobalLoading();
</script>

<style>
#app {
  height: 100vh;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
:root {
  --theme-color: #3e3e3e;
  --theme-theme: #133ab3;
  --theme-background: #fafafa;
  --theme-other_background: #ffffff;
}
html,
body {
  margin: 0;
  font-size: 15px;
  font-family:
    v-sans,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    Segoe UI,
    sans-serif,
    "Apple Color Emoji",
    "Segoe UI Emoji",
    Segoe UI Symbol;
  line-height: 1.6;
  color: var(--theme-color);
  background-color: var(--theme-background);
  word-wrap: break-word;
}

body {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 移动端全局样式 */
@media screen and (max-width: 768px) {
  #app {
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* 统一按钮样式 */
  .van-button {
    height: 40px;
    font-size: var(--font-size-base);
    border-radius: var(--border-radius-base);
  }

  /* 统一输入框样式 */
  .van-field {
    font-size: var(--font-size-base);
  }

  /* 统一卡片样式 */
  .van-card {
    border-radius: var(--border-radius-base);
    margin: var(--spacing-base) 0;
  }
}
</style>
