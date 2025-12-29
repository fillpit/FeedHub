<template>
  <div class="settings-page">
    <el-tabs v-model="activeTab" class="settings-tabs" type="border-card">
      <!-- 项目配置标签页 -->
      <el-tab-pane label="基础配置" name="base">
        <template #label>
          <div class="tab-label">
            <el-icon><Setting /></el-icon>
            <span>基础配置</span>
          </div>
        </template>
        <div class="tab-content">
          <div class="settings-section">
            <!-- 代理配置组 -->
            <div class="settings-group">
              <div class="group-header">
                <h3>HTTP 代理配置</h3>
                <el-switch
                  v-model="localGlobalSetting.isProxyEnabled"
                  active-text="已启用"
                  @change="handleProxyChange"
                />
              </div>

              <div class="form-row">
                <div class="form-item">
                  <label for="proxyDomain">代理服务器IP</label>
                  <el-input
                    id="proxyDomain"
                    v-model="localGlobalSetting.httpProxyHost"
                    placeholder="127.0.0.1"
                    :disabled="!localGlobalSetting.isProxyEnabled"
                    @input="handleProxyHostChange"
                  >
                    <template #prefix>
                      <el-icon><Monitor /></el-icon>
                    </template>
                  </el-input>
                </div>

                <div class="form-item">
                  <label for="proxyPort">代理端口</label>
                  <el-input
                    id="proxyPort"
                    v-model="localGlobalSetting.httpProxyPort"
                    placeholder="7890"
                    :disabled="!localGlobalSetting.isProxyEnabled"
                  >
                    <template #prefix>
                      <el-icon><Position /></el-icon>
                    </template>
                  </el-input>
                </div>
              </div>
            </div>

            

            <!-- 数据备份还原组 -->
            <div class="settings-group">
              <div class="group-header">
                <h3>数据备份与还原</h3>
              </div>

              <div class="backup-restore-section">
                <div class="backup-section">
                  <h4>完整数据备份</h4>
                  <p class="section-description">
                    导出所有配置数据，包括订阅源、用户设置、通知配置等
                  </p>
                  <el-button type="primary" @click="handleBackupData" :loading="backupLoading">
                    <el-icon><Download /></el-icon>
                    导出备份文件
                  </el-button>
                </div>

                <div class="backup-section">
                  <h4>分享配置导出</h4>
                  <p class="section-description">
                    导出动态路由和网站RSS配置（不包含授权信息），用于分享给他人
                  </p>
                  <el-button
                    type="success"
                    @click="handleShareConfigExport"
                    :loading="shareExportLoading"
                  >
                    <el-icon><Download /></el-icon>
                    导出分享配置
                  </el-button>
                </div>

                <div class="restore-section">
                  <h4>数据还原</h4>
                  <p class="section-description">从备份文件中恢复配置数据（将覆盖当前设置）</p>
                  <div class="restore-controls">
                    <el-upload
                      ref="uploadRef"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept=".json"
                      :on-change="handleFileSelect"
                    >
                      <el-button>
                        <el-icon><Upload /></el-icon>
                        选择备份文件
                      </el-button>
                    </el-upload>

                    <el-button
                      type="warning"
                      @click="handleRestoreData"
                      :loading="restoreLoading"
                      :disabled="!selectedFile"
                    >
                      <el-icon><RefreshRight /></el-icon>
                      开始还原
                    </el-button>
                  </div>

                  <div v-if="selectedFile" class="selected-file">
                    <span>已选择文件：{{ selectedFile.name }}</span>
                    <el-button type="text" @click="clearSelectedFile" size="small">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </div>

                <div class="restore-section">
                  <h4>分享配置导入</h4>
                  <p class="section-description">导入他人分享的动态路由和网站RSS配置</p>
                  <div class="restore-controls">
                    <el-upload
                      ref="shareUploadRef"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept=".json"
                      :on-change="handleShareFileSelect"
                    >
                      <el-button>
                        <el-icon><Upload /></el-icon>
                        选择分享配置文件
                      </el-button>
                    </el-upload>

                    <el-button
                      type="success"
                      @click="handleShareConfigImport"
                      :loading="shareImportLoading"
                      :disabled="!selectedShareFile"
                    >
                      <el-icon><RefreshRight /></el-icon>
                      导入分享配置
                    </el-button>
                  </div>

                  <div v-if="selectedShareFile" class="selected-file">
                    <span>已选择文件：{{ selectedShareFile.name }}</span>
                    <el-button type="text" @click="clearSelectedShareFile" size="small">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 项目配置保存按钮 -->
          <div class="settings-actions">
            <el-button type="primary" @click="handleSave">
              <el-icon><Check /></el-icon>
              保存项目配置
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 通知设置标签页 -->
      <el-tab-pane label="通知设置" name="notification">
        <template #label>
          <div class="tab-label">
            <el-icon><Bell /></el-icon>
            <span>通知设置</span>
          </div>
        </template>
        <div class="tab-content">
          <NotificationSettingsComponent
            v-model="localNotificationSettings"
            @save="handleNotificationSave"
          />
        </div>
      </el-tab-pane>

      <!-- 翻译设置标签页 -->
      <el-tab-pane label="翻译配置" name="translation">
        <template #label>
          <div class="tab-label">
            <el-icon><Setting /></el-icon>
            <span>翻译配置</span>
          </div>
        </template>
        <div class="tab-content">
          <div class="settings-section">
            <div class="settings-group">
              <h3>模型接口设置</h3>
              <div class="form-row">
                <div class="form-item" style="width: 100%">
                  <label for="template">配置模版</label>
                  <el-select v-model="selectedTemplate" placeholder="请选择模版" @change="applyTemplate">
                    <el-option label="OpenAI 官方" value="openai" />
                    <el-option label="Azure OpenAI" value="azure" />
                    <el-option label="火山方舟" value="volcengine" />
                    <el-option label="Moonshot" value="moonshot" />
                    <el-option label="DeepSeek" value="deepseek" />
                    <el-option label="OpenRouter" value="openrouter" />
                    <el-option label="自定义" value="custom" />
                  </el-select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-item">
                  <label for="apiBase">接口地址</label>
                  <el-input id="apiBase" v-model="localGlobalSetting.translationApiBase" placeholder="例如：https://api.openai.com" />
                </div>
                <div class="form-item">
                  <label for="model">模型名称</label>
                  <el-input id="model" v-model="localGlobalSetting.translationModel" placeholder="例如：gpt-4o-mini" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-item" style="width: 100%">
                  <label for="apiKey">接口密钥</label>
                  <el-input id="apiKey" v-model="localGlobalSetting.translationApiKey" type="password" show-password placeholder="请输入密钥" />
                </div>
              </div>
              
            </div>

            <div class="settings-group">
              <h3>翻译行为设置</h3>
              <div class="form-row">
                <div class="form-item">
                  <label for="targetLanguage">目标语言</label>
                  <el-input id="targetLanguage" v-model="localGlobalSetting.translationTargetLanguage" placeholder="例如：en-US、ja-JP、zh-CN" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-item" style="width:100%">
                  <label for="translationPrompt">翻译提示词</label>
                  <el-input id="translationPrompt" v-model="localGlobalSetting.translationPrompt" type="textarea" :rows="3" placeholder="用于指导AI翻译风格的提示语" />
                </div>
              </div>
              <div class="test-block">
                <label>示例翻译</label>
                <el-input v-model="sampleText" placeholder="输入示例文本，如：你好，世界" />
                <div class="test-actions">
                  <el-button type="success" @click="handleTestTranslation" :loading="testing">测试翻译</el-button>
                </div>
                <el-input v-model="testResult" type="textarea" :rows="5" placeholder="测试结果将在此显示" readonly />
              </div>
            </div>
          </div>

          <div class="settings-actions">
            <el-button type="primary" @click="handleSave">
              <el-icon><Check /></el-icon>
              保存翻译配置
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 用户设置标签页 -->
      <el-tab-pane label="用户设置" name="user">
        <template #label>
          <div class="tab-label">
            <el-icon><User /></el-icon>
            <span>用户设置</span>
          </div>
        </template>
        <div class="tab-content">
          <div class="settings-section">
            <!-- 账户信息设置组 -->
            <div class="settings-group">
              <h3>账户信息</h3>
              <div class="form-row">
                <div class="form-item">
                  <label for="username">用户名</label>
                  <el-input
                    id="username"
                    v-model="localUserSettings.username"
                    placeholder="请输入用户名"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><User /></el-icon>
                    </template>
                  </el-input>
                </div>
                <div class="form-item">
                  <label for="email">邮箱地址</label>
                  <el-input
                    id="email"
                    v-model="localUserSettings.email"
                    placeholder="请输入邮箱地址"
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Message /></el-icon>
                    </template>
                  </el-input>
                </div>
              </div>
            </div>

            <!-- 密码修改设置组 -->
            <div class="settings-group">
              <h3>密码修改</h3>
              <div class="form-row">
                <div class="form-item">
                  <label for="currentPassword">当前密码</label>
                  <el-input
                    id="currentPassword"
                    v-model="passwordForm.currentPassword"
                    type="password"
                    placeholder="请输入当前密码"
                    show-password
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </div>
              </div>
              <div class="form-row">
                <div class="form-item">
                  <label for="newPassword">新密码</label>
                  <el-input
                    id="newPassword"
                    v-model="passwordForm.newPassword"
                    type="password"
                    placeholder="请输入新密码"
                    show-password
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </div>
                <div class="form-item">
                  <label for="confirmPassword">确认新密码</label>
                  <el-input
                    id="confirmPassword"
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                    clearable
                  >
                    <template #prefix>
                      <el-icon><Lock /></el-icon>
                    </template>
                  </el-input>
                </div>
              </div>
              <div class="password-actions">
                <el-button type="primary" @click="handlePasswordChange" :loading="passwordChanging">
                  <el-icon><Key /></el-icon>
                  修改密码
                </el-button>
              </div>
            </div>
          </div>

          <!-- 用户设置保存按钮 -->
          <div class="settings-actions">
            <el-button type="primary" @click="handleUserSave" :loading="userSaving">
              <el-icon><Check /></el-icon>
              保存用户设置
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useUserSettingStore } from "@/stores/userSetting";
import { ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type {
  GlobalSettingAttributes,
  UserSettingAttributes,
  NotificationSettings,
} from "@feedhub/shared";
import NotificationSettingsComponent from "@/components/NotificationSettings.vue";
import { backupApi, downloadBackupFile, readBackupFile } from "@/api/backup";
import { userApi } from "@/api/user";
import { settingApi } from "@/api/setting";
import {
  Monitor,
  Position,
  Bell,
  Setting,
  User,
  Check,
  Message,
  Lock,
  Key,
  Download,
  Upload,
  RefreshRight,
  Close,
  
} from "@element-plus/icons-vue";

const settingStore = useUserSettingStore();

// 当前激活的标签页
const activeTab = ref("translation");

// 本地状态
const localGlobalSetting = ref({
  httpProxyHost: "127.0.0.1",
  httpProxyPort: "7890",
  isProxyEnabled: false,
  AdminUserCode: 230713,
  CommonUserCode: 9527,
  // OPDS 设置默认值
  opdsEnabled: false,
  opdsServerUrl: "",
  opdsUsername: "",
  opdsPassword: "",
  // 翻译配置默认值
  translationTargetLanguage: "en-US",
  translationPrompt:
    "请将输入内容翻译为目标语言，并保留原文，输出格式为：原文\n\n译文",
  translationApiBase: "",
  translationApiKey: "",
  translationModel: "gpt-4o-mini",
} as GlobalSettingAttributes);

// 引导与模版
const selectedTemplate = ref<string>("");
const sampleText = ref("你好，世界");
const testing = ref(false);
const testResult = ref("");

// 常见服务商模版映射
const templatePresets: Record<string, { base: string; model: string; help?: string }> = {
  openai: { base: "https://api.openai.com", model: "gpt-4o-mini", help: "在OpenAI后台获取API Key" },
  azure: { base: "https://{your-resource-name}.openai.azure.com", model: "gpt-4o-mini", help: "在Azure门户创建OpenAI资源并获取密钥" },
  volcengine: { base: "https://api.volcengineapi.com", model: "ep-translate", help: "在火山引擎控制台开通并获取密钥" },
  moonshot: { base: "https://api.moonshot.cn", model: "moonshot-v1-8k", help: "在Moonshot控制台获取API Key" },
  deepseek: { base: "https://api.deepseek.com", model: "deepseek-chat", help: "在DeepSeek控制台获取API Key" },
  openrouter: { base: "https://openrouter.ai/api", model: "openrouter/auto", help: "在OpenRouter获取API Key并选择模型" },
  custom: { base: "", model: "", help: "自定义兼容OpenAI的接口地址与模型" },
};

const applyTemplate = (val: string) => {
  const t = templatePresets[val];
  if (!t) return;
  localGlobalSetting.value.translationApiBase = t.base;
  localGlobalSetting.value.translationModel = t.model;
};

const handleTestTranslation = async () => {
  testing.value = true;
  try {
    const res = await settingApi.testTranslation(sampleText.value);
    const data = res.data as { translatedText?: string };
    testResult.value = data?.translatedText || "";
    ElMessage.success("测试成功");
  } catch (error: any) {
    ElMessage.error(error?.message || "测试失败");
  } finally {
    testing.value = false;
  }
};

const localUserSettings = ref<UserSettingAttributes>({
  userId: "",
  cloud115Cookie: "",
  quarkCookie: "",
  username: "",
  email: "",
});

// 密码修改表单
const passwordForm = ref({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});

// 状态管理
const passwordChanging = ref(false);
const userSaving = ref(false);
const backupLoading = ref(false);
const restoreLoading = ref(false);
const selectedFile = ref<File | null>(null);
const uploadRef = ref();

// 分享配置相关状态
const shareExportLoading = ref(false);
const shareImportLoading = ref(false);
const selectedShareFile = ref<File | null>(null);
const shareUploadRef = ref();

const localNotificationSettings = ref<NotificationSettings>(
  settingStore.getDefaultNotificationSettings()
);

// 监听 store 变化,更新本地状态
watch(
  () => settingStore.globalSetting,
  (newVal) => {
    if (newVal) {
      localGlobalSetting.value = { ...newVal };
    }
  },
  { immediate: true }
);

watch(
  () => settingStore.userSettings,
  (newVal) => {
    if (newVal) {
      localUserSettings.value = { ...newVal };
    }
  },
  { immediate: true }
);

watch(
  () => settingStore.notificationSettings,
  (newVal) => {
    if (newVal) {
      localNotificationSettings.value = { ...newVal };
    }
  },
  { immediate: true }
);

// 初始化获取设置
settingStore.getSettings();

// 处理代理开关变化并立即保存
const handleProxyChange = async (val: boolean) => {
  try {
    localGlobalSetting.value.isProxyEnabled = val;
    await settingStore.saveSettings({
      globalSetting: localGlobalSetting.value,
      userSettings: localUserSettings.value,
    });
    ElMessage.success("设置保存成功");
  } catch (error) {
    // 保存失败时恢复开关状态
    ElMessage.error("设置保存失败");
    localGlobalSetting.value.isProxyEnabled = !val;
  }
};

// 处理代理地址,去除协议前缀
const handleProxyHostChange = (val: string) => {
  // 移除 http:// 或 https:// 前缀
  const cleanHost = val.replace(/^(https?:\/\/)/i, "");
  // 更新状态
  localGlobalSetting.value.httpProxyHost = cleanHost;
};

// 其他设置的保存
const handleSave = async () => {
  try {
    await settingStore.saveSettings({
      globalSetting: localGlobalSetting.value,
      userSettings: localUserSettings.value,
    });
    ElMessage.success("设置保存成功");
  } catch (error) {
    console.error("保存设置失败:", error);
  }
};

const handleNotificationSave = async () => {
  try {
    await settingStore.saveNotificationSettings(localNotificationSettings.value);
  } catch (error) {
    console.error("保存通知设置失败:", error);
  }
};

// 处理密码修改
const handlePasswordChange = async () => {
  // 验证表单
  if (!passwordForm.value.currentPassword) {
    ElMessage.error("请输入当前密码");
    return;
  }
  if (!passwordForm.value.newPassword) {
    ElMessage.error("请输入新密码");
    return;
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    ElMessage.error("两次输入的密码不一致");
    return;
  }
  if (passwordForm.value.newPassword.length < 6) {
    ElMessage.error("新密码长度不能少于6位");
    return;
  }

  passwordChanging.value = true;
  try {
    // 调用密码修改API
    await userApi.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    });

    // 清空表单
    passwordForm.value = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
  } catch (error) {
    ElMessage.error("密码修改失败，请检查当前密码是否正确");
  } finally {
    passwordChanging.value = false;
  }
};

// 处理用户设置保存
const handleUserSave = async () => {
  userSaving.value = true;
  try {
    await settingStore.saveSettings({
      globalSetting: localGlobalSetting.value,
      userSettings: localUserSettings.value,
    });
    ElMessage.success("用户设置保存成功");
  } catch (error) {
    ElMessage.error("用户设置保存失败");
    console.error("保存用户设置失败:", error);
  } finally {
    userSaving.value = false;
  }
};

// 处理数据备份
const handleBackupData = async () => {
  backupLoading.value = true;
  try {
    const response = await backupApi.exportBackup();
    // 下载备份文件
    if (response.data) {
      downloadBackupFile(response.data);
      ElMessage.success("数据备份成功！");
    } else {
      throw new Error("备份数据为空");
    }
  } catch (error) {
    console.error("备份失败:", error);
    ElMessage.error("数据备份失败！");
  } finally {
    backupLoading.value = false;
  }
};

// 处理文件选择
const handleFileSelect = (file: File) => {
  selectedFile.value = file;
  return false; // 阻止自动上传
};

// 清除选择的文件
const clearSelectedFile = () => {
  selectedFile.value = null;
  if (uploadRef.value) {
    uploadRef.value.clearFiles();
  }
};

// 处理数据还原
const handleRestoreData = async () => {
  if (!selectedFile.value) {
    ElMessage.warning("请先选择备份文件！");
    return;
  }

  try {
    const result = await ElMessageBox.confirm(
      "恢复数据将覆盖当前所有设置，是否继续？",
      "确认恢复",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    if (result === "confirm") {
      restoreLoading.value = true;

      // 读取备份文件
      const backupData = await readBackupFile(selectedFile.value);

      // 调用恢复API
      await backupApi.importBackup(backupData);

      ElMessage.success("数据恢复成功！");
      clearSelectedFile();

      // 刷新页面以加载新数据
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("恢复失败:", error);
      ElMessage.error(error instanceof Error ? error.message : "数据恢复失败！");
    }
  } finally {
    restoreLoading.value = false;
  }
};

// 处理分享配置导出
const handleShareConfigExport = async () => {
  shareExportLoading.value = true;
  try {
    const response = await backupApi.exportShareConfig();
    // 下载分享配置文件
    if (response.data) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `feedhub-share-config-${timestamp}.json`;
      downloadBackupFile(response.data, filename);
      ElMessage.success("分享配置导出成功！");
    } else {
      throw new Error("分享配置数据为空");
    }
  } catch (error) {
    console.error("分享配置导出失败:", error);
    ElMessage.error("分享配置导出失败！");
  } finally {
    shareExportLoading.value = false;
  }
};

// 处理分享配置文件选择
const handleShareFileSelect = (file: File) => {
  selectedShareFile.value = file;
  return false; // 阻止自动上传
};

// 清除选择的分享配置文件
const clearSelectedShareFile = () => {
  selectedShareFile.value = null;
  if (shareUploadRef.value) {
    shareUploadRef.value.clearFiles();
  }
};

// 处理分享配置导入
const handleShareConfigImport = async () => {
  if (!selectedShareFile.value) {
    ElMessage.warning("请先选择分享配置文件！");
    return;
  }

  try {
    const result = await ElMessageBox.confirm(
      "导入分享配置将添加新的动态路由和网站RSS配置，是否继续？",
      "确认导入",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "info",
      }
    );

    if (result === "confirm") {
      shareImportLoading.value = true;

      // 读取分享配置文件
      const shareData = await readBackupFile(selectedShareFile.value);

      // 调用导入API
      await backupApi.importShareConfig(shareData);

      ElMessage.success("分享配置导入成功！");
      clearSelectedShareFile();

      // 刷新页面以加载新数据
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  } catch (error) {
    if (error !== "cancel") {
      console.error("分享配置导入失败:", error);
      ElMessage.error(error instanceof Error ? error.message : "分享配置导入失败！");
    }
  } finally {
    shareImportLoading.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use "@/styles/common.scss";

.settings-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.settings-tabs {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  background-color: #fff;

  :deep(.el-tabs__header) {
    margin: 0;
    background-color: #fafbfc;
    border-radius: 12px 12px 0 0;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 20px;
  }

  :deep(.el-tabs__content) {
    padding: 0;
  }

  :deep(.el-tabs__item) {
    color: #606266;
    font-weight: 500;

    &.is-active {
      color: #409eff;
    }

    &:hover {
      color: #409eff;
    }
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.tab-content {
  padding: 24px;
  min-height: 500px;
}

.settings-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
}

.card-header {
  @include common.flex-center;
  gap: 12px;
  color: #303133;

  .el-icon {
    font-size: 20px;
    color: var(--theme-primary);
  }

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--theme-text-primary);
  }
}

.settings-section {
  padding: 0;
}

.settings-group {
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 500;
    color: #606266;
  }

  .group-header {
    @include common.flex-center;
    justify-content: space-between;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;

    h3 {
      margin: 0;
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;

  &.full-width {
    width: 100%;
  }

  label {
    display: block;
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #606266;
  }

  :deep(.el-input),
  :deep(.el-input-number) {
    width: 100%;

    .el-input__wrapper {
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
      transition: var(--theme-transition);

      &:hover {
        box-shadow: 0 0 0 1px var(--theme-primary);
      }

      &.is-focus {
        box-shadow:
          0 0 0 1px var(--theme-primary),
          0 0 0 3px rgba(0, 102, 204, 0.1);
      }
    }

    .el-input__prefix-inner {
      .el-icon {
        margin-right: 8px;
        color: var(--theme-text-secondary);
      }
    }
  }
}

.settings-help {
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);

  .help-links {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-top: 16px;
  }

  :deep(.el-link) {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;

    .el-icon {
      font-size: 16px;
    }

    &:hover {
      transform: translateX(4px);
    }
  }
}

.password-actions {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
  margin-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);

  .el-button {
    min-width: 100px;
    height: 36px;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;

    .el-icon {
      margin-right: 4px;
      font-size: 14px;
    }

    &.el-button--primary {
      background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
      border: none;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);

      &:hover {
        background: linear-gradient(135deg, #3a8ee6 0%, #337ecc 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}

.settings-actions {
  display: flex;
  justify-content: center;
  padding: 24px 0;
  border-top: 1px solid #e4e7ed;
  background-color: #fff;
  border-radius: 0 0 12px 12px;
  margin-top: 24px;

  .el-button {
    min-width: 120px;
    height: 40px;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    transition: var(--theme-transition);

    .el-icon {
      margin-right: 6px;
      font-size: 16px;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--theme-shadow-sm);
    }
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }

  .tab-content {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .settings-tabs :deep(.el-tabs__nav-wrap) {
    padding: 0 10px;
  }
}

/* 备份还原功能样式 */
.backup-restore-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  margin-top: 20px;

  .backup-section,
  .restore-section {
    padding: 20px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    background-color: #fafbfc;
    transition: all 0.3s ease;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
    }

    h4 {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .section-description {
      margin: 0 0 16px;
      font-size: 14px;
      color: #606266;
      line-height: 1.5;
    }
  }

  .restore-controls {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .selected-file {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background-color: #f0f9ff;
    border: 1px solid #b3d8ff;
    border-radius: 6px;
    font-size: 14px;
    color: #0066cc;

    span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .el-button {
      margin-left: 8px;
      padding: 4px;
      min-width: auto;
      height: auto;

      .el-icon {
        margin: 0;
        font-size: 12px;
      }
    }
  }
}

@media (max-width: 768px) {
  .backup-restore-section {
    grid-template-columns: 1fr;
    gap: 20px;

    .restore-controls {
      flex-direction: column;
      gap: 8px;
    }
  }
}

/* 网络设置卡片特殊样式 */
.network-card .card-header {
  color: #409eff;
}

.network-card .el-card__header {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

/* 用户设置卡片特殊样式 */
.user-card .card-header {
  color: #67c23a;
}

.user-card .el-card__header {
  background: linear-gradient(135deg, #f0f9ff 0%, #f0f9ff 100%);
}
</style>
