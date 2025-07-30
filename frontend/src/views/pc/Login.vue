<template>
  <div class="login-page">
    <div class="login-bg"></div>
    <div class="login-card">
      <div class="card-header">
        <!-- <img src="@/assets/images/logo.png" alt="Logo" class="logo" /> -->
        <h1 class="title">欢迎回来</h1>
        <p class="subtitle">登录您的账户以继续</p>
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <div class="form-options">
          <el-checkbox v-model="rememberPassword">记住密码</el-checkbox>
        </div>

        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { User, Lock } from "@element-plus/icons-vue";
import { userApi } from "@/api/user";
import { STORAGE_KEYS } from "@/constants/storage";

// 状态
const loading = ref(false);
const rememberPassword = ref(false);

const loginForm = ref({
  username: "",
  password: "",
});

// 表单校验规则
const loginRules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    { min: 3, max: 20, message: "长度在 3 到 20 个字符", trigger: "blur" },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    { min: 6, max: 20, message: "长度在 6 到 20 个字符", trigger: "blur" },
  ],
};

const router = useRouter();
const loginFormRef = ref();

// 记住密码相关
onMounted(() => {
  const savedUsername = localStorage.getItem(STORAGE_KEYS.USERNAME);
  const savedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);
  if (savedUsername && savedPassword) {
    loginForm.value.username = savedUsername;
    loginForm.value.password = savedPassword;
    rememberPassword.value = true;
  }
});

// 登录处理
const handleLogin = async () => {
  if (!loginFormRef.value) return;

  await loginFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true;
      try {
        const res = await userApi.login(loginForm.value);
        if (res.code === 0) {
          // 记住密码
          if (rememberPassword.value) {
            localStorage.setItem(STORAGE_KEYS.USERNAME, loginForm.value.username);
            localStorage.setItem(STORAGE_KEYS.PASSWORD, loginForm.value.password);
          } else {
            localStorage.removeItem(STORAGE_KEYS.USERNAME);
            localStorage.removeItem(STORAGE_KEYS.PASSWORD);
          }

          localStorage.setItem(STORAGE_KEYS.TOKEN, res.data?.token || "");
          router.push("/");
        } else {
          ElMessage.error(res.message || "登录失败");
        }
      } catch (error: unknown) {
        ElMessage.error(error instanceof Error ? error.message : "登录失败");
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped lang="scss">
@use "@/styles/common.scss";

.login-page {
  @include common.flex-center;
  min-height: 100vh;
  background: var(--theme-bg);
  position: relative;
}

.login-bg {
  position: fixed;
  inset: 0;
  background-image: url("@/assets/images/login-bg.jpg");
  background-size: cover;
  background-position: center;
  filter: blur(3px);
  z-index: 0;
}

.login-card {
  @include common.glass-effect;
  position: relative;
  width: 420px;
  padding: 32px;
  border-radius: var(--theme-radius);
  box-shadow: var(--theme-shadow);
  z-index: 1;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;

  .logo {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
  }

  .title {
    font-size: 24px;
    font-weight: 600;
    color: var(--theme-text-primary);
    margin-bottom: 8px;
  }

  .subtitle {
    font-size: 14px;
    color: var(--theme-text-secondary);
  }
}

.login-tabs {
  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__active-bar) {
    background-color: var(--theme-primary);
  }

  :deep(.el-tabs__item) {
    color: var(--theme-text-secondary);
    font-size: 16px;

    &.is-active {
      color: var(--theme-primary);
      font-weight: 500;
    }
  }
}

:deep(.el-form-item) {
  margin-bottom: 24px;

  .el-input__wrapper {
    background-color: rgba(255, 255, 255, 0.5);
    box-shadow: none;
    border: 1px solid rgba(0, 0, 0, 0.1);
    transition: var(--theme-transition);

    &:hover {
      border-color: var(--theme-primary);
    }

    &.is-focus {
      border-color: var(--theme-primary);
      box-shadow: 0 0 0 1px var(--theme-primary);
    }
  }

  .el-input__inner {
    height: 42px;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.submit-btn {
  width: 100%;
  height: 42px;
  font-size: 16px;
  border-radius: var(--theme-radius-sm);
  background: var(--theme-primary);
  transition: var(--theme-transition);

  &:hover {
    background: var(--theme-primary-hover);
  }

  &:active {
    transform: scale(0.98);
  }
}
</style>
