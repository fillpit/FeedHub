<template>
    <div class="notification-content">
      <!-- 通知触发条件 -->
      <div class="settings-group">
        <h3>通知触发条件</h3>
        <div class="trigger-options">
          <el-checkbox 
            v-model="localSettings.triggers.newFeedItems"
            label="新的订阅内容"
            @change="handleTriggerChange"
          />
          <el-checkbox 
            v-model="localSettings.triggers.feedUpdateErrors"
            label="订阅更新错误"
            @change="handleTriggerChange"
          />
          <el-checkbox 
            v-model="localSettings.triggers.systemAlerts"
            label="系统警告"
            @change="handleTriggerChange"
          />
        </div>
      </div>

      <!-- Bark 通知设置 -->
      <div class="settings-group">
        <div class="group-header">
          <div class="service-info">
            <el-icon class="service-icon bark-icon"><Iphone /></el-icon>
            <div>
              <h3>Bark 推送</h3>
              <p class="service-desc">iOS 设备推送通知服务</p>
            </div>
          </div>
          <el-switch v-model="localSettings.bark.enabled" />
        </div>
        
        <div v-if="localSettings.bark.enabled" class="service-config">
          <div class="form-row">
            <div class="form-item">
              <label>服务器地址</label>
              <el-input
                v-model="localSettings.bark.serverUrl"
                placeholder="https://api.day.app"
              >
                <template #prefix>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>设备密钥</label>
              <el-input
                v-model="localSettings.bark.deviceKey"
                placeholder="设备密钥"
                show-password
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>提示音</label>
              <el-select v-model="localSettings.bark.sound" placeholder="选择提示音">
                <el-option label="默认" value="" />
                <el-option label="Alarm" value="alarm" />
                <el-option label="Anticipate" value="anticipate" />
                <el-option label="Bell" value="bell" />
                <el-option label="Birdsong" value="birdsong" />
                <el-option label="Bloom" value="bloom" />
              </el-select>
            </div>
            <div class="form-item">
              <label>分组</label>
              <el-input
                v-model="localSettings.bark.group"
                placeholder="通知分组（可选）"
              />
            </div>
          </div>
          
          <div class="test-section">
            <el-button 
              type="primary" 
              size="small" 
              @click="testNotification('bark')"
              :loading="testingService === 'bark'"
            >
              <el-icon><Position /></el-icon>
              测试推送
            </el-button>
          </div>
        </div>
      </div>

      <!-- 邮件通知设置 -->
      <div class="settings-group">
        <div class="group-header">
          <div class="service-info">
            <el-icon class="service-icon email-icon"><Message /></el-icon>
            <div>
              <h3>邮件通知</h3>
              <p class="service-desc">SMTP 邮件推送服务</p>
            </div>
          </div>
          <el-switch  v-model="localSettings.email.enabled" />
        </div>
        
        <div v-if="localSettings.email.enabled" class="service-config">
          <div class="form-row">
            <div class="form-item">
              <label>SMTP 服务器</label>
              <el-input
                v-model="localSettings.email.smtpHost"
                placeholder="smtp.gmail.com"
              >
                <template #prefix>
                  <el-icon><Monitor /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>端口</label>
              <el-input-number
                v-model="localSettings.email.smtpPort"
                :min="1"
                :max="65535"
                placeholder="587"
              />
            </div>
            <div class="form-item">
              <label>安全连接</label>
              <el-switch
                v-model="localSettings.email.smtpSecure"
                active-text="SSL/TLS"
                inactive-text="普通"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>用户名</label>
              <el-input
                v-model="localSettings.email.username"
                placeholder="邮箱用户名"
              >
                <template #prefix>
                  <el-icon><User /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>密码/授权码</label>
              <el-input
                v-model="localSettings.email.password"
                type="password"
                placeholder="邮箱密码或授权码"
                show-password
              >
                <template #prefix>
                  <el-icon><Lock /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>发件人邮箱</label>
              <el-input
                v-model="localSettings.email.fromEmail"
                placeholder="sender@example.com"
              >
                <template #prefix>
                  <el-icon><Message /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>收件人邮箱</label>
              <el-input
                v-model="localSettings.email.toEmail"
                placeholder="receiver@example.com"
              >
                <template #prefix>
                  <el-icon><Message /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="test-section">
            <el-button 
              type="primary" 
              size="small" 
              @click="testNotification('email')"
              :loading="testingService === 'email'"
            >
              <el-icon><Position /></el-icon>
              测试邮件
            </el-button>
          </div>
        </div>
      </div>

      <!-- Gotify 通知设置 -->
      <div class="settings-group">
        <div class="group-header">
          <div class="service-info">
            <el-icon class="service-icon gotify-icon"><ChatDotRound /></el-icon>
            <div>
              <h3>Gotify 推送</h3>
              <p class="service-desc">自托管的推送通知服务</p>
            </div>
          </div>
          <el-switch v-model="localSettings.gotify.enabled" />
        </div>
        
        <div v-if="localSettings.gotify.enabled" class="service-config">
          <div class="form-row">
            <div class="form-item">
              <label>服务器地址</label>
              <el-input
                v-model="localSettings.gotify.serverUrl"
                placeholder="https://gotify.example.com"
              >
                <template #prefix>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>应用令牌</label>
              <el-input
                v-model="localSettings.gotify.appToken"
                placeholder="应用令牌"
                show-password
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>优先级</label>
              <el-select v-model="localSettings.gotify.priority" placeholder="选择优先级">
                <el-option label="低" :value="1" />
                <el-option label="普通" :value="5" />
                <el-option label="高" :value="8" />
                <el-option label="紧急" :value="10" />
              </el-select>
            </div>
          </div>
          
          <div class="test-section">
            <el-button 
              type="primary" 
              size="small" 
              @click="testNotification('gotify')"
              :loading="testingService === 'gotify'"
            >
              <el-icon><Position /></el-icon>
              测试推送
            </el-button>
          </div>
        </div>
      </div>

      <!-- 企业微信通知设置 -->
      <div class="settings-group">
        <div class="group-header">
          <div class="service-info">
            <el-icon class="service-icon wechat-icon"><ChatLineRound /></el-icon>
            <div>
              <h3>企业微信</h3>
              <p class="service-desc">企业微信群机器人推送</p>
            </div>
          </div>
          <el-switch v-model="localSettings.wechatWork.enabled"  />
        </div>
        
        <div v-if="localSettings.wechatWork.enabled" class="service-config">
          <div class="form-row">
            <div class="form-item full-width">
              <label>Webhook 地址</label>
              <el-input
                v-model="localSettings.wechatWork.webhookUrl"
                placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                type="textarea"
                :rows="2"
              >
                <template #prefix>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="test-section">
            <el-button 
              type="primary" 
              size="small" 
              @click="testNotification('wechatWork')"
              :loading="testingService === 'wechatWork'"
            >
              <el-icon><Position /></el-icon>
              测试推送
            </el-button>
          </div>
        </div>
      </div>

      <!-- 钉钉通知设置 -->
      <div class="settings-group">
        <div class="group-header">
          <div class="service-info">
            <el-icon class="service-icon dingtalk-icon"><ChatRound /></el-icon>
            <div>
              <h3>钉钉通知</h3>
              <p class="service-desc">钉钉群机器人推送</p>
            </div>
          </div>
          <el-switch v-model="localSettings.dingtalk.enabled" />
        </div>
        
        <div v-if="localSettings.dingtalk.enabled" class="service-config">
          <div class="form-row">
            <div class="form-item full-width">
              <label>Webhook 地址</label>
              <el-input
                v-model="localSettings.dingtalk.webhookUrl"
                placeholder="https://oapi.dingtalk.com/robot/send?access_token=..."
                type="textarea"
                :rows="2"
              >
                <template #prefix>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>签名密钥（可选）</label>
              <el-input
                v-model="localSettings.dingtalk.secret"
                placeholder="签名密钥"
                show-password
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>@所有人</label>
              <el-switch
                v-model="localSettings.dingtalk.isAtAll"
                active-text="是"
                inactive-text="否"
              />
            </div>
          </div>
          
          <div class="test-section">
            <el-button 
              type="primary" 
              size="small" 
              @click="testNotification('dingtalk')"
              :loading="testingService === 'dingtalk'"
            >
              <el-icon><Position /></el-icon>
              测试推送
            </el-button>
          </div>
        </div>
      </div>

      <!-- 飞书通知设置 -->
      <div class="settings-group">
        <div class="group-header">
          <div class="service-info">
            <el-icon class="service-icon feishu-icon"><ChatSquare /></el-icon>
            <div>
              <h3>飞书通知</h3>
              <p class="service-desc">飞书群机器人推送</p>
            </div>
          </div>
          <el-switch v-model="localSettings.feishu.enabled" />
        </div>
        
        <div v-if="localSettings.feishu.enabled" class="service-config">
          <div class="form-row">
            <div class="form-item full-width">
              <label>Webhook 地址</label>
              <el-input
                v-model="localSettings.feishu.webhookUrl"
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                type="textarea"
                :rows="2"
              >
                <template #prefix>
                  <el-icon><Link /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <label>签名密钥（可选）</label>
              <el-input
                v-model="localSettings.feishu.secret"
                placeholder="签名密钥"
                show-password
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="form-item">
              <label>@所有人</label>
              <el-switch
                v-model="localSettings.feishu.atAll"
                active-text="是"
                inactive-text="否"
              />
            </div>
          </div>
          
          <div class="test-section">
            <el-button 
              type="primary" 
              size="small" 
              @click="testNotification('feishu')"
              :loading="testingService === 'feishu'"
            >
              <el-icon><Position /></el-icon>
              测试推送
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 保存按钮区域 -->
      <div class="save-section">
        <el-button 
          type="primary" 
          size="large"
          @click="handleSave"
          :loading="saving"
        >
          <el-icon><Position /></el-icon>
          保存设置
        </el-button>
        <el-button 
          size="large"
          @click="handleReset"
        >
          重置
        </el-button>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, defineEmits, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import type { NotificationSettings } from '@/types';
import { notificationApi } from '@/api/notification';
import {
  Iphone,
  Message,
  ChatDotRound,
  ChatLineRound,
  ChatRound,
  ChatSquare,
  Link,
  Key,
  Monitor,
  User,
  Lock,
  Position
} from '@element-plus/icons-vue';

interface Props {
  modelValue: NotificationSettings;
}

interface Emits {
  (e: 'update:modelValue', value: NotificationSettings): void;
  (e: 'save'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 本地设置状态
const localSettings = ref<NotificationSettings>({
  bark: {
    enabled: false,
    serverUrl: 'https://api.day.app',
    deviceKey: '',
    sound: '',
    icon: '',
    group: ''
  },
  email: {
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    username: '',
    password: '',
    fromEmail: '',
    toEmail: ''
  },
  gotify: {
    enabled: false,
    serverUrl: '',
    appToken: '',
    priority: 5
  },
  wechatWork: {
    enabled: false,
    webhookUrl: '',
    mentionedList: [],
    mentionedMobileList: []
  },
  dingtalk: {
    enabled: false,
    webhookUrl: '',
    secret: '',
    atMobiles: [],
    atUserIds: [],
    isAtAll: false
  },
  feishu: {
    enabled: false,
    webhookUrl: '',
    secret: '',
    atUserIds: [],
    atMobiles: [],
    atAll: false
  },
  triggers: {
    newFeedItems: true,
    feedUpdateErrors: true,
    systemAlerts: true
  }
});

// 测试状态
const testingService = ref<string>('');

// 保存状态
const saving = ref<boolean>(false);

// 标记是否正在更新，避免循环
const isUpdating = ref(false);

// 保存设置
const handleSave = async () => {
  saving.value = true;
  try {
    emit('save');
    ElMessage.success('设置已保存');
  } catch (error) {
    ElMessage.error('保存失败，请重试');
  } finally {
    saving.value = false;
  }
};

// 重置设置
const handleReset = () => {
  if (props.modelValue) {
    isUpdating.value = true;
    localSettings.value = { ...props.modelValue };
    nextTick(() => {
      isUpdating.value = false;
    });
    ElMessage.info('设置已重置');
  }
};

// 监听 props 变化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && !isUpdating.value) {
      isUpdating.value = true;
      localSettings.value = { ...newVal };
      nextTick(() => {
        isUpdating.value = false;
      });
    }
  },
  { immediate: true, deep: true }
);

// 监听本地设置变化，同步到父组件
watch(
  localSettings,
  (newVal) => {
    if (!isUpdating.value) {
      emit('update:modelValue', newVal);
    }
  },
  { deep: true }
);

// 处理服务开关切换功能已移除，如需要可重新添加

// 处理触发条件变化
const handleTriggerChange = () => {
  // 自动保存
  emit('save');
};

// 获取服务名称
const getServiceName = (service: string): string => {
  const names: Record<string, string> = {
    bark: 'Bark',
    email: '邮件',
    gotify: 'Gotify',
    wechatWork: '企业微信',
    dingtalk: '钉钉',
    feishu: '飞书'
  };
  return names[service] || service;
};

// 测试通知
const testNotification = async (service: string) => {
  testingService.value = service;
  
  try {
    // 获取对应服务的配置
    let serviceConfig: any;
    let isEnabled = false;
    
    switch (service) {
      case 'bark':
        serviceConfig = localSettings.value.bark;
        isEnabled = serviceConfig.enabled;
        break;
      case 'email':
        serviceConfig = localSettings.value.email;
        isEnabled = serviceConfig.enabled;
        break;
      case 'gotify':
        serviceConfig = localSettings.value.gotify;
        isEnabled = serviceConfig.enabled;
        break;
      case 'wechatWork':
        serviceConfig = localSettings.value.wechatWork;
        isEnabled = serviceConfig.enabled;
        break;
      case 'dingtalk':
        serviceConfig = localSettings.value.dingtalk;
        isEnabled = serviceConfig.enabled;
        break;
      case 'feishu':
        serviceConfig = localSettings.value.feishu;
        isEnabled = serviceConfig.enabled;
        break;
      default:
        ElMessage.error('不支持的通知服务');
        return;
    }
    
    // 检查服务是否启用
    if (!isEnabled) {
      ElMessage.warning(`请先启用 ${getServiceName(service)} 通知`);
      return;
    }
    
    // 调用后端 API 发送测试通知
    const response = await notificationApi.test(service, serviceConfig);
    
    if (response.data?.success) {
      ElMessage.success(`${getServiceName(service)} 测试通知发送成功！`);
    } else {
      ElMessage.error(`${getServiceName(service)} 测试失败: ${response.data?.message || '未知错误'}`);
    }
  } catch (error: any) {
    console.error('测试通知失败:', error);
    const errorMessage = error.response?.data?.message || error.message || '未知错误';
    ElMessage.error(`${getServiceName(service)} 测试通知发送失败: ${errorMessage}`);
  } finally {
    testingService.value = '';
  }
};
</script>

<style lang="scss" scoped>
.notification-settings-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;

  .el-icon {
    font-size: 20px;
    color: #409eff;
  }

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.notification-content {
  padding: 20px;
}

.settings-group {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }

  h3 {
    margin: 0 0 16px;
    font-size: 14px;
    font-weight: 600;
    color: #606266;
  }
}

.trigger-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;

  .el-checkbox {
    margin-right: 0;
  }
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .service-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .service-icon {
      font-size: 24px;
      
      &.bark-icon {
        color: #007aff;
      }
      
      &.email-icon {
        color: #ea4335;
      }
      
      &.gotify-icon {
        color: #00acc1;
      }
      
      &.wechat-icon {
        color: #07c160;
      }
      
      &.dingtalk-icon {
        color: #0089ff;
      }
      
      &.feishu-icon {
        color: #00d4aa;
      }
    }

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .service-desc {
      margin: 0;
      font-size: 12px;
      color: #909399;
    }
  }
}

.service-config {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-top: 12px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.form-item {
  flex: 1;
  min-width: 0;

  &.full-width {
    width: 100%;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    color: #606266;
    font-weight: 500;
  }

  :deep(.el-input),
  :deep(.el-input-number),
  :deep(.el-select) {
    width: 100%;

    .el-input__wrapper {
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 0 0 1px #409eff;
      }

      &.is-focus {
        box-shadow: 0 0 0 1px #409eff, 0 0 0 3px rgba(64, 158, 255, 0.1);
      }
    }

    .el-input__prefix-inner {
      .el-icon {
        margin-right: 8px;
        color: #909399;
      }
    }
  }

  :deep(.el-switch) {
    .el-switch__label {
      font-size: 12px;
    }
  }
}

.test-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  text-align: right;

  .el-button {
    border-radius: 6px;
    font-size: 13px;
    padding: 8px 16px;
    
    .el-icon {
      margin-right: 4px;
    }
  }
}

.save-section {
  margin-top: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  .el-button {
    margin: 0 8px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    padding: 12px 24px;
    min-width: 120px;
    
    .el-icon {
      margin-right: 6px;
    }
    
    &.el-button--primary {
      background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
      border: none;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      
      &:hover {
        background: linear-gradient(135deg, #3a8ee6 0%, #337ecc 100%);
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
      }
      
      &:active {
        transform: translateY(0);
      }
    }
    
    &:not(.el-button--primary) {
      background: #ffffff;
      border: 1px solid #dcdfe6;
      color: #606266;
      
      &:hover {
        background: #f5f7fa;
        border-color: #c0c4cc;
        color: #409eff;
        transform: translateY(-1px);
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
  
  .group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .service-info {
    width: 100%;
  }
  
  .save-section {
    margin-top: 24px;
    padding: 16px;
    
    .el-button {
      margin: 4px;
      min-width: 100px;
      font-size: 13px;
      padding: 10px 20px;
    }
  }
}
</style>