<template>
  <div class="website-rss-container">
    <!-- Main content -->
    <div class="main-content">
      <div class="header">
        <h1>网站RSS源配置</h1>
        <el-button type="primary" @click="addConfig">添加配置</el-button>
      </div>
      <ul class="feed-list">
        <li v-for="config in configs" :key="config.id" @click="config.key && copyToClipboard(config.key)">
          <div class="feed-item">
            <div class="feed-icon-wrapper">
              <img v-if="config.favicon" :src="config.favicon" class="feed-icon" alt="favicon" />
              <div v-else class="feed-icon-placeholder">
                <el-icon><Document /></el-icon>
              </div>
              <el-button
                icon="el-icon-edit"
                size="small"
                circle
                @click.stop="openFaviconEdit(config)"
                style="margin-left: 4px; vertical-align: middle;"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
            <div class="feed-info">
              <div class="feed-title">{{ config.title }}</div>
              <div class="feed-url">{{ config.url }}</div>
              <div v-if="config.key" class="feed-rss-url">
                <span>RSS链接: {{ getRssUrl(config.key) }}</span>
                <el-icon style="cursor:pointer" @click.stop="copyToClipboard(config.key)"><CopyDocument /></el-icon>
              </div>
            </div>
            <div class="feed-actions">
              <el-tooltip content="刷新" placement="top">
                <el-link type="primary" :underline="false" @click.stop="refreshConfig(config.id)">
                  <el-icon><Refresh /></el-icon>
                </el-link>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-link type="success" :underline="false" @click.stop="editConfig(config)">
                  <el-icon><Edit /></el-icon>
                </el-link>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-link type="warning" :underline="false" @click.stop="deleteConfig(config.id)">
                  <el-icon><Delete /></el-icon>
                </el-link>
              </el-tooltip>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Add/Edit Drawer -->
    <el-drawer v-model="dialogVisible" :title="dialogTitle" direction="rtl" size="50%" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" label-position="right">
        <!-- Form items from the original component, adapted for the new data model -->
        <el-form-item label="网站名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入网站名称" />
        </el-form-item>
        <el-form-item label="网站URL" prop="url">
          <el-input v-model="form.url" placeholder="请输入网站URL" />
        </el-form-item>
        <el-form-item label="刷新间隔(分钟)" prop="fetchInterval">
          <el-input-number v-model="form.fetchInterval" :min="1" />
        </el-form-item>
        <el-form-item label="最大条目数" prop="maxFeeds">
          <el-input-number v-model="form.maxFeeds" :min="1" :max="200" />
        </el-form-item>
        <el-form-item label="启用代理" prop="useProxy">
          <el-switch v-model="form.useProxy" />
        </el-form-item>

        <el-divider>抓取设置</el-divider>
        <el-form-item label="抓取模式" prop="script.enabled">
           <el-radio-group v-model="form.script.enabled">
             <el-radio-button :value="false">选择器模式</el-radio-button>
             <el-radio-button :value="true">脚本模式</el-radio-button>
           </el-radio-group>
         </el-form-item>

        <template v-if="!form.script.enabled">
          <el-form-item label="选择器类型" prop="selector.selectorType">
            <el-radio-group v-model="form.selector.selectorType">
              <el-radio-button label="css">CSS</el-radio-button>
              <el-radio-button label="xpath">XPath</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="容器选择器" prop="selector.container">
            <el-input v-model="form.selector.container" placeholder="请输入容器选择器" />
          </el-form-item>
          <el-form-item label="标题选择器" prop="selector.title">
            <el-input v-model="form.selector.title" placeholder="请输入标题选择器" />
          </el-form-item>
          <el-form-item label="链接选择器" prop="selector.link">
            <el-input v-model="form.selector.link" placeholder="请输入链接选择器" />
          </el-form-item>
          <el-form-item label="内容选择器" prop="selector.content">
            <el-input v-model="form.selector.content" placeholder="请输入内容选择器" />
          </el-form-item>
          <el-form-item label="作者选择器" prop="selector.author">
            <el-input v-model="form.selector.author" placeholder="请输入作者选择器" />
          </el-form-item>
          <el-form-item label="发布日期选择器" prop="selector.date">
            <el-input v-model="form.selector.date" placeholder="请输入发布日期选择器" />
          </el-form-item>
          <el-form-item label="封面图片选择器" prop="selector.image">
            <el-input v-model="form.selector.image" placeholder="请输入封面图片选择器" />
          </el-form-item>
        </template>
        
        <template v-if="form.script.enabled">
          <el-form-item label="脚本超时时间(ms)" prop="script.timeout">
            <el-input-number v-model="form.script.timeout" :min="5000" :max="120000" :step="1000" placeholder="默认30000毫秒" />
          </el-form-item>
          <el-form-item label="JavaScript脚本" prop="script.script">
            <el-input v-model="form.script.script" type="textarea" :rows="15" placeholder="请输入JavaScript脚本代码" />
            <!-- Script Help Content -->
          </el-form-item>
        </template>
        
        <el-divider>授权设置</el-divider>
        <el-form-item label="选择授权">
          <el-select v-model="form.authCredentialId" @change="handleSelectAuth" clearable placeholder="选择已保存的授权信息">
            <el-option label="自定义" :value="undefined" />
            <el-option v-for="item in authCredentials" :key="item.id" :label="item.name + '（' + item.authType + '）'" :value="item.id" />
          </el-select>
        </el-form-item>

        <template v-if="!form.authCredentialId">
          <el-form-item label="授权方式" prop="auth.authType">
            <el-select v-model="form.auth.authType" placeholder="请选择授权方式">
              <el-option label="无" value="none" />
              <el-option label="Cookie" value="cookie" />
              <el-option label="Basic Auth" value="basic" />
              <el-option label="Bearer Token" value="bearer" />
              <el-option label="自定义请求头" value="custom" />
            </el-select>
          </el-form-item>
          <template v-if="form.auth.authType === 'cookie'">
            <el-form-item label="Cookie" prop="auth.cookie">
              <el-input v-model="form.auth.cookie" type="textarea" :rows="3" placeholder="请输入Cookie" />
            </el-form-item>
          </template>
          <template v-if="form.auth.authType === 'basic' && form.auth.basicAuth">
            <el-form-item label="用户名" prop="auth.basicAuth.username">
              <el-input v-model="form.auth.basicAuth.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码" prop="auth.basicAuth.password">
              <el-input v-model="form.auth.basicAuth.password" type="password" placeholder="请输入密码" show-password />
            </el-form-item>
          </template>
          <template v-if="form.auth.authType === 'bearer'">
            <el-form-item label="Bearer Token" prop="auth.bearerToken">
              <el-input v-model="form.auth.bearerToken" type="textarea" :rows="3" placeholder="请输入Bearer Token" />
            </el-form-item>
          </template>
          <template v-if="form.auth.authType === 'custom'">
            <el-form-item label="自定义请求头">
              <!-- Custom Headers UI -->
            </el-form-item>
          </template>
        </template>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button v-if="form.script.enabled" type="warning" @click="handleDebugScript" :loading="debugging">调 试</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- Debug Result Dialog -->
    <DebugResultDialog :visible="debugDialogVisible" :result="debugResult" @close="debugDialogVisible=false" />

    <el-dialog v-model="faviconEditVisible" title="编辑图标" width="400px">
      <el-input v-model="faviconEditUrl" placeholder="请输入图标URL" />
      <template #footer>
        <el-button @click="faviconEditVisible = false">取消</el-button>
        <el-button type="primary" @click="saveFavicon">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import {
  getWebsiteRssList,
  createWebsiteRss,
  updateWebsiteRss,
  deleteWebsiteRss,
  refreshWebsiteRss,
  debugScript,
  getRssUrl,
  getConfigById
} from '@/api/websiteRss';
import type { WebsiteRssConfig } from '@/types/websiteRss';
import { Document, Refresh, Edit, Delete, CopyDocument } from '@element-plus/icons-vue';
import { authCredentialApi } from '@/api/authCredential';
import type { AuthCredential } from '@/types';
import DebugResultDialog from '@/components/DebugResultDialog.vue';

const configs = ref<WebsiteRssConfig[]>([]);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const authCredentials = ref<AuthCredential[]>([]);

const getInitialFormState = (): WebsiteRssConfig => ({
  id: 0,
  key: '',
  userId: 0,
  title: '',
  url: '',
  favicon: '',
  description: '',
  feedUrl: '',
  lastFetchedAt: '',
  fetchInterval: 60,
  maxFeeds: 50,
  useProxy: false,
  selector: {
    selectorType: 'css',
    container: '',
    title: '',
    link: '',
    content: '',
    author: '',
    date: '',
    image: '',
  },
  auth: {
    enabled: false,
    authType: 'none',
    cookie: '',
    basicAuth: {
      username: '',
      password: ''
    },
    bearerToken: '',
    customHeaders: {}
  },
  authCredentialId: undefined,
  script: {
    enabled: false,
    script: '',
    timeout: 30000
  },
  fetchMode: 'selector', // 新增字段
  createdAt: '',
  updatedAt: ''
});

const form = ref<WebsiteRssConfig>(getInitialFormState());

const rules = reactive<FormRules>({
  title: [{ required: true, message: '请输入网站名称', trigger: 'blur' }],
  url: [{ required: true, message: '请输入网站URL', trigger: 'blur' }],
});

const debugging = ref(false);
const debugDialogVisible = ref(false);
const activeTab = ref('result');
const debugResult = reactive({
  success: false,
  logs: [] as string[],
  result: null as any,
  error: '',
  stack: '',
  executionTime: 0,
});

const logLevel = ref<'debug'|'info'|'warn'|'error'|'fatal'>('info');
const logLevelOrder = ['debug', 'info', 'warn', 'error', 'fatal'];
const logLevelMap = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};
const filteredLogs = computed(() => {
  if (!debugResult.logs) return [];
  const minLevel = logLevelMap[logLevel.value];
  return debugResult.logs.filter((log: string) => {
    if (log.includes('[FATAL]') || log.includes('[FATAL')) return logLevel.value === 'fatal' ? true : minLevel <= 4;
    if (log.includes('[ERROR]') || log.includes('[ERROR')) return minLevel <= 3;
    if (log.includes('[WARN]') || log.includes('[WARN')) return minLevel <= 2;
    if (log.includes('[INFO]') || log.includes('[INFO')) return minLevel <= 1;
    if (log.includes('[DEBUG]') || log.includes('[DEBUG')) return minLevel <= 0;
    return true;
  });
});

const fetchConfigs = async () => {
  try {
    const res = await getWebsiteRssList();
    configs.value = res.data || [];
  } catch (error) {
    ElMessage.error('获取配置列表失败');
  }
};

const fetchAuthCredentials = async () => {
  try {
    const res = await authCredentialApi.getAll();
    authCredentials.value = res.data || [];
  } catch {}
};

onMounted(() => {
  fetchConfigs();
  fetchAuthCredentials();
});

const addConfig = () => {
  isEdit.value = false;
  dialogTitle.value = '添加配置';
  form.value = getInitialFormState();
  dialogVisible.value = true;
};

const editConfig = (config: WebsiteRssConfig) => {
  isEdit.value = true;
  dialogTitle.value = '编辑配置';
  form.value = JSON.parse(JSON.stringify(config));
  if (!form.value.selector) form.value.selector = getInitialFormState().selector;
  if (!form.value.selector.selectorType) form.value.selector.selectorType = 'css';
  if (!form.value.selector.container && (form.value.selector as any).item) form.value.selector.container = (form.value.selector as any).item;
  if (!form.value.selector.date && (form.value.selector as any).pubDate) form.value.selector.date = (form.value.selector as any).pubDate;
  if (!form.value.authCredentialId) form.value.authCredentialId = undefined;
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 结构转换：前端 selector 转为后端 selector
        let selector = form.value.selector;
        const backendSelector = {
          selectorType: selector.selectorType || 'css',
          container: selector.container || '',
          title: selector.title,
          link: selector.link,
          content: selector.content,
          author: selector.author,
          date: selector.date,
          image: selector.image,
        };
        let submitData: any = {
          ...form.value,
          selector: backendSelector
        };
        // 新增时不传 key 字段
        if (!isEdit.value) {
          delete submitData.key;
        }
        if (isEdit.value) {
          await updateWebsiteRss(form.value.id, submitData);
          ElMessage.success('更新成功');
        } else {
          await createWebsiteRss(submitData);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchConfigs();
      } catch (error) {
        ElMessage.error('操作失败');
      }
    }
  });
};

const deleteConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除此配置吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    const res = await deleteWebsiteRss(id);
    console.log('删除接口响应:', res);
    ElMessage.success('删除成功');
    fetchConfigs();
  } catch (error) {
    console.error('删除异常捕获:', error);
    if (error !== 'cancel') {
      ElMessage.error('删除失败' + error);
    }
  }
};

const refreshConfig = async (id: number) => {
  try {
    await refreshWebsiteRss(id);
    ElMessage.success('刷新任务已启动');
  } catch (error) {
    ElMessage.error('刷新失败');
  }
};

const handleDebugScript = async () => {
  if (!form.value.script.script) {
    ElMessage.warning('脚本内容不能为空');
    return;
  }
  debugging.value = true;
  try {
    const res: any = await debugScript(form.value);
    // 现在调试脚本返回标准的ApiResponse格式，数据在res.data中
    Object.assign(debugResult, res.data);
    debugDialogVisible.value = true;
    activeTab.value = res.data.success ? 'result' : 'error';
  } catch (error) {
    ElMessage.error('调试请求失败');
  } finally {
    debugging.value = false;
  }
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(getRssUrl(text)).then(() => {
    ElMessage.success('RSS链接已复制到剪贴板');
  });
};

const handleSelectAuth = (authId: number|null) => {
  form.value.authCredentialId = authId || undefined;
  if (authId) {
    form.value.auth = { enabled: false, authType: 'none', cookie: '', basicAuth: { username: '', password: '' }, bearerToken: '', customHeaders: {} };
  }
};

const faviconEditVisible = ref(false);
const faviconEditUrl = ref('');
const faviconEditId = ref<number | null>(null);

const openFaviconEdit = (config: WebsiteRssConfig) => {
  faviconEditId.value = config.id;
  faviconEditUrl.value = config.favicon || '';
  faviconEditVisible.value = true;
};

const saveFavicon = async () => {
  if (!faviconEditId.value) return;
  try {
    // 先获取原始配置
    const res = await getConfigById(faviconEditId.value);
    if (res.code !== 0 || !res.data) {
      ElMessage.error('获取原始配置失败');
      return;
    }
    const origin = res.data;
    // 合并新 favicon
    const newConfig = { ...origin, favicon: faviconEditUrl.value };
    await updateWebsiteRss(faviconEditId.value, newConfig);
    ElMessage.success('图标已更新');
    faviconEditVisible.value = false;
    fetchConfigs();
  } catch (e) {
    ElMessage.error('图标更新失败');
  }
};
</script>

<style scoped>
/* All styles from original component */
.website-rss-container {
  padding: 20px;
}
.main-content .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.feed-list {
  list-style: none;
  padding: 0;
}
.feed-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}
.feed-icon-wrapper {
  margin-right: 15px;
}
.feed-icon {
  width: 32px;
  height: 32px;
}
.feed-icon-placeholder {
  width: 32px;
  height: 32px;
  background-color: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.feed-info {
  flex-grow: 1;
}
.feed-title {
  font-weight: bold;
}
.feed-url {
  color: #888;
  font-size: 0.9em;
}
.feed-rss-url {
  font-size: 0.9em;
  color: #409eff;
  cursor: pointer;
}
.feed-actions {
  display: flex;
  gap: 15px;
}
.dialog-footer {
  text-align: right;
}
.debug-result-container .info {
  margin-bottom: 20px;
}
.logs-panel {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}
.log-item {
  font-family: monospace;
  white-space: pre-wrap;
  padding: 2px 0;
  border-bottom: 1px solid #eee;
}
.error-panel {
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 10px;
  border-radius: 4px;
}
.log-error { color: #f56c6c; }
.log-warn { color: #e6a23c; }
.log-info { color: #67c23a; }
.log-debug { color: #409eff; }
.log-fatal { color: #fff; background: #f56c6c; }
</style>