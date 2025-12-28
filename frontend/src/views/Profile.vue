<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人资料</span>
        </div>
      </template>

      <div class="profile-content">
        <div class="user-info-section">
          <div class="avatar-wrapper">
            <el-avatar :size="100" :src="authStore.userAvatar">
              <template #default>
                <el-icon :size="50"><User /></el-icon>
              </template>
            </el-avatar>
          </div>
          <div class="info-wrapper">
            <h2 class="username">{{ authStore.user?.username }}</h2>
            <el-tag :type="authStore.isAdmin ? 'danger' : 'info'" class="role-tag">
              {{ authStore.isAdmin ? '管理员' : '普通用户' }}
            </el-tag>
            <p class="user-id">ID: {{ authStore.user?.userId }}</p>
          </div>
        </div>

        <el-divider />

        <div class="security-section">
          <h3>安全设置</h3>
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="100px"
            class="password-form"
          >
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input
                v-model="passwordForm.currentPassword"
                type="password"
                show-password
                placeholder="请输入当前密码"
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                show-password
                placeholder="请输入新密码"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                show-password
                placeholder="请再次输入新密码"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loading" @click="submitPasswordChange(passwordFormRef)">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { User } from '@element-plus/icons-vue';
import { type FormInstance, type FormRules } from 'element-plus';
import { userApi } from '@/api/user';

const authStore = useAuthStore();
const loading = ref(false);
const passwordFormRef = ref<FormInstance>();

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const passwordRules = reactive<FormRules>({
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' },
  ],
});

const submitPasswordChange = async (formEl: FormInstance | undefined) => {
  if (!formEl) return;

  await formEl.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        await userApi.changePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });

        // 重置表单
        formEl.resetFields();
      } catch (error) {
        console.error('修改密码失败', error);
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}

.profile-content {
  padding: 20px;
}

.user-info-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;

  .avatar-wrapper {
    transition: transform 0.3s ease;
    &:hover {
      transform: scale(1.05);
    }
  }

  .info-wrapper {
    text-align: center;

    .username {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: var(--el-text-color-primary);
    }

    .role-tag {
      margin-bottom: 10px;
    }

    .user-id {
      margin: 0;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }
}

.security-section {
  h3 {
    margin-bottom: 20px;
    color: var(--el-text-color-primary);
    border-left: 4px solid var(--el-color-primary);
    padding-left: 10px;
  }

  .password-form {
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (min-width: 768px) {
  .user-info-section {
    flex-direction: row;
    align-items: flex-start;
    padding-left: 40px;

    .info-wrapper {
      text-align: left;
      margin-top: 10px;
    }
  }

  .password-form {
    margin: 0 !important;
  }
}
</style>
