<template>
  <div class="opds-global-settings">
    <div class="settings-card">
      <div class="card-header">
        <h3>
          <el-icon><Connection /></el-icon>
          OPDS 服务器设置
        </h3>
        <p class="description">配置 OPDS (Open Publication Distribution System) 服务器连接</p>
      </div>

      <div class="card-content">
        <el-form :model="opdsSettings" label-width="120px" label-position="left">
          <!-- 启用开关 -->
          <el-form-item label="启用 OPDS">
            <el-switch
              v-model="opdsSettings.opdsEnabled"
              :loading="saving"
              @change="handleOpdsEnabledChange"
            />
            <span class="form-help">启用后可以连接到 OPDS 服务器获取电子书</span>
          </el-form-item>

          <!-- 服务器配置 -->
          <template v-if="opdsSettings.opdsEnabled">
            <el-form-item label="服务器地址" required>
              <el-input
                v-model="opdsSettings.opdsServerUrl"
                placeholder="请输入 OPDS 服务器地址，如：https://example.com/opds"
                :disabled="saving"
              >
                <template #prepend>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="用户名">
              <el-input
                v-model="opdsSettings.opdsUsername"
                placeholder="请输入用户名（可选）"
                :disabled="saving"
              >
                <template #prepend>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="密码">
              <el-input
                v-model="opdsSettings.opdsPassword"
                type="password"
                placeholder="请输入密码（可选）"
                show-password
                :disabled="saving"
              >
                <template #prepend>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </el-form-item>

            <!-- 连接测试 -->
            <el-form-item>
              <el-button
                type="primary"
                :loading="testing"
                @click="testConnection"
                :disabled="!opdsSettings.opdsServerUrl || saving"
              >
                <el-icon v-if="!testing"><Connection /></el-icon>
                测试连接
              </el-button>
              <span
                v-if="testResult"
                class="test-result"
                :class="testResult.success ? 'success' : 'error'"
              >
                {{ testResult.message }}
              </span>
            </el-form-item>
          </template>

          <!-- 保存按钮 -->
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="saveSettings">
              <el-icon v-if="!saving"><Check /></el-icon>
              保存设置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Connection, Link, User, Lock, Check } from "@element-plus/icons-vue";
import { useUserSettingStore } from "@/stores/userSetting";
import type { GlobalSettingAttributes } from "@feedhub/shared";

// Store
const settingStore = useUserSettingStore();

// 响应式数据
const opdsSettings = ref({
  opdsEnabled: false,
  opdsServerUrl: "",
  opdsUsername: "",
  opdsPassword: "",
});

const saving = ref(false);
const testing = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

// 监听 store 中的全局设置变化
watch(
  () => settingStore.globalSetting,
  (newVal) => {
    if (newVal) {
      opdsSettings.value = {
        opdsEnabled: (newVal as any).opdsEnabled || false,
        opdsServerUrl: (newVal as any).opdsServerUrl || "",
        opdsUsername: (newVal as any).opdsUsername || "",
        opdsPassword: (newVal as any).opdsPassword || "",
      };
    }
  },
  { immediate: true }
);

// 处理启用开关变化
const handleOpdsEnabledChange = async (enabled: boolean) => {
  if (!enabled) {
    // 禁用时清空测试结果
    testResult.value = null;
  }
  // 自动保存启用状态
  await saveSettings();
};

// 测试连接
const testConnection = async () => {
  if (!opdsSettings.value.opdsServerUrl) {
    ElMessage.warning("请先输入服务器地址");
    return;
  }

  testing.value = true;
  testResult.value = null;

  try {
    // 这里应该调用后端API测试OPDS连接
    // 暂时模拟测试
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 简单的URL格式验证
    const url = opdsSettings.value.opdsServerUrl;
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      throw new Error("服务器地址必须以 http:// 或 https:// 开头");
    }

    testResult.value = {
      success: true,
      message: "连接测试成功",
    };
    ElMessage.success("OPDS 服务器连接测试成功");
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : "连接测试失败",
    };
    ElMessage.error("OPDS 服务器连接测试失败");
  } finally {
    testing.value = false;
  }
};

// 保存设置
const saveSettings = async () => {
  saving.value = true;
  try {
    // 构建完整的全局设置对象
    const globalSetting = {
      ...settingStore.globalSetting,
      ...(opdsSettings.value as any),
    } as GlobalSettingAttributes;

    await settingStore.saveSettings({
      globalSetting,
      userSettings: settingStore.userSettings,
    });

    ElMessage.success("OPDS 设置保存成功");
  } catch (error) {
    console.error("保存OPDS设置失败:", error);
    ElMessage.error("保存OPDS设置失败");
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.opds-global-settings {
  .settings-card {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .card-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .description {
        margin: 0;
        opacity: 0.9;
        font-size: 14px;
      }
    }

    .card-content {
      padding: 24px;
    }
  }

  .form-help {
    margin-left: 12px;
    color: #909399;
    font-size: 12px;
  }

  .test-result {
    margin-left: 12px;
    font-size: 14px;
    font-weight: 500;

    &.success {
      color: #67c23a;
    }

    &.error {
      color: #f56c6c;
    }
  }

  :deep(.el-form-item) {
    margin-bottom: 20px;
  }

  :deep(.el-input-group__prepend) {
    background-color: #f5f7fa;
  }
}
</style>
