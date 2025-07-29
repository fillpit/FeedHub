<template>
  <div class="dynamic-route-container">
    <div class="page-header">
      <h1 class="page-title">动态路由管理</h1>
      <div class="page-actions">
        <el-button type="primary" @click="openAddDrawer">添加路由</el-button>
        <el-button @click="refreshRoutes">刷新</el-button>
        <el-button type="success" @click="exportRoutes" :disabled="selectedRoutes.length === 0">
          <el-icon><Download /></el-icon>
          导出选中配置 ({{ selectedRoutes.length }})
        </el-button>
        <el-button type="warning" @click="triggerImport">
          <el-icon><Upload /></el-icon>
          导入配置
        </el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileImport"
        />
      </div>
    </div>

    <!-- 路由列表 -->
    <el-card class="route-list-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>动态路由列表</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索路由名称或路径"
            clearable
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <!-- 空状态 -->
      <el-empty v-if="filteredRoutes.length === 0" description="暂无动态路由配置" />

      <!-- 路由列表 -->
      <el-table
        v-else
        :data="filteredRoutes"
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="名称" min-width="110">
          <template #default="{ row }">
            <div class="route-name">
              <span>{{ row.name }}</span>
              <el-tag size="small" type="success" v-if="row.method === 'GET'">GET</el-tag>
              <el-tag size="small" type="warning" v-else>{{ row.method }}</el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="path" label="路径" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="route-path">
              <el-tooltip :content="`${baseUrl}/api/dynamic${row.path}`" placement="top">
                <el-link type="primary" underline="never" @click="copyRssLink(row)">/dynamic{{ row.path }}</el-link>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="script.sourceType" label="脚本来源" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="getScriptSourceTagType(row.script.sourceType)">
              {{ getScriptSourceLabel(row.script.sourceType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">
            <span class="description-text">{{ row.description || "无描述" }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="route-actions">
              <el-button type="primary" link @click="openDebugDrawer(row)">调试</el-button>
              <el-button type="primary" link @click="openEditDrawer(row)">编辑</el-button>
              <el-popconfirm
                title="确定要删除此路由配置吗？"
                @confirm="deleteRoute(row.id)"
                confirm-button-text="确定"
                cancel-button-text="取消"
              >
                <template #reference>
                  <el-button type="danger" link>删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="isEdit ? '编辑动态路由' : '添加动态路由'"
      direction="rtl"
      size="50%"
      :before-close="closeDrawer"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="route-form">
        <el-form-item label="路由名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入路由名称" />
        </el-form-item>

        <el-form-item label="路由路径" prop="path">
          <el-input
            v-model="form.path"
            placeholder="请输入路由路径，例如: /my-route 或 /bilibili/:uid"
          >
            <template #prepend>/dynamic</template>
          </el-input>
          <div style="font-size: 12px; color: #909399; margin-top: 4px">
            路由路径格式说明：路径以 / 开头，支持动态参数（如
            :uid、:id），动态参数会自动传递给脚本的 routeParams 对象
          </div>
        </el-form-item>

        <el-form-item label="HTTP方法" prop="method">
          <el-select v-model="form.method" placeholder="请选择HTTP方法">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
          </el-select>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入路由描述"
            :rows="2"
          />
        </el-form-item>

        <el-form-item label="刷新间隔(分钟)" prop="refreshInterval">
          <el-input-number v-model="form.refreshInterval" :min="1" :max="1440" />
          <div style="font-size: 12px; color: #909399; margin-top: 4px">
            设置路由缓存刷新间隔，减少对目标网站的请求压力（1-1440分钟）
          </div>
        </el-form-item>

        <el-form-item label="授权信息" prop="authCredentialId">
          <el-select v-model="form.authCredentialId" placeholder="请选择授权信息（可选）" clearable>
            <el-option label="无授权" :value="undefined" />
            <el-option
              v-for="auth in authCredentials"
              :key="auth.id"
              :label="`${auth.name} (${auth.authType})`"
              :value="auth.id"
            />
          </el-select>
          <div style="font-size: 12px; color: #909399; margin-top: 4px">
            选择授权信息后，脚本中可以通过 utils.getAuthInfo() 获取授权信息，utils.fetchApi()
            会自动应用授权
          </div>
        </el-form-item>

        <!-- 参数配置 -->
        <el-divider content-position="left">参数配置</el-divider>

        <div v-for="(param, index) in form.params" :key="index" class="param-item">
          <div class="param-header">
            <span class="param-title">参数 {{ index + 1 }}</span>
            <el-button type="danger" link @click="removeParam(index)">删除</el-button>
          </div>

          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item :label="'名称'" :prop="`params.${index}.name`" label-width="60px">
                <el-input v-model="param.name" placeholder="参数名称" />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item :label="'类型'" :prop="`params.${index}.type`" label-width="60px">
                <el-select v-model="param.type" placeholder="参数类型">
                  <el-option label="字符串" value="string" />
                  <el-option label="数字" value="number" />
                  <el-option label="布尔值" value="boolean" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :span="4">
              <el-form-item :label="'必填'" :prop="`params.${index}.required`" label-width="60px">
                <el-switch v-model="param.required" />
              </el-form-item>
            </el-col>

            <el-col :span="6">
              <el-form-item :label="'默认值'" :prop="`params.${index}.default`" label-width="60px">
                <el-input v-model="param.defaultValue" placeholder="默认值" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item :label="'描述'" :prop="`params.${index}.description`" label-width="60px">
            <el-input v-model="param.description" placeholder="参数描述" />
          </el-form-item>

          <el-divider v-if="form.params && index < form.params.length - 1" />
        </div>

        <div class="add-param-btn">
          <el-button type="primary" plain @click="addParam">添加参数</el-button>
        </div>

        <!-- 脚本配置 -->
        <el-divider content-position="left">脚本配置</el-divider>

        <el-form-item label="脚本来源" prop="script.sourceType">
          <el-radio-group v-model="form.script.sourceType">
            <el-radio-button label="inline">内联脚本</el-radio-button>
          </el-radio-group>
          <div class="script-source-info">
            <el-icon><InfoFilled /></el-icon>
            <span>统一使用内联脚本管理，支持多文件项目结构</span>
          </div>
        </el-form-item>

        <el-form-item label="脚本内容" prop="script.content">
          <!-- 内联脚本 -->
          <el-input v-model="form.script.content" placeholder="脚本目录标识符（系统自动生成）" readonly/>
          <div class="script-help">
            <el-button type="primary" link @click="showScriptHelp">脚本帮助指南</el-button>
            <el-button v-if="form.id" type="success" link @click="openInlineScriptEditor" style="margin-left: 12px;">
              <el-icon><Edit /></el-icon>
              在线编辑
            </el-button>
            <span class="editor-tips">支持语法高亮、自动补全、错误检查等功能</span>
          </div>
          
          <div style="margin-top: 16px; padding: 12px; background-color: #f5f7fa; border-radius: 4px; font-size: 12px; color: #606266;">
            <el-icon style="margin-right: 4px;"><InfoFilled /></el-icon>
            使用内联脚本编辑器管理多文件项目，支持创建、编辑、删除文件，入口文件从 package.json 的 main 字段读取
          </div>
        </el-form-item>

        <el-form-item label="超时时间" prop="script.timeout">
          <el-input-number
            v-model="form.script.timeout"
            :min="1000"
            :max="60000"
            :step="1000"
            :step-strictly="true"
          />
          <span class="timeout-unit">毫秒</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm">保存</el-button>
          <el-button @click="closeDrawer">取消</el-button>
        </el-form-item>
      </el-form>
    </el-drawer>

    <!-- 调试抽屉 -->
    <el-drawer v-model="debugDrawerVisible" title="调试动态路由脚本" direction="rtl" size="50%">
      <div class="debug-container">
        <div class="debug-form">
          <h3>测试参数</h3>
          <div v-if="debugForm.params && debugForm.params.length > 0">
            <div v-for="(param, index) in debugForm.params" :key="index" class="debug-param-item">
              <el-form-item :label="param.name" :prop="`testParams.${param.name}`">
                <el-input
                  v-model="testParams[param.name]"
                  :placeholder="`${param.description || '请输入参数值'} ${param.required ? '(必填)' : ''}`"
                />
              </el-form-item>
            </div>
          </div>
          <div v-else class="no-params">该路由没有配置参数</div>

          <div class="debug-actions">
            <el-button type="primary" @click="debugScript" :loading="debugging">执行调试</el-button>
          </div>
        </div>

        <el-divider />

        <div class="debug-result" v-if="debugResult">
          <h3>调试结果</h3>
          <el-alert
            :type="debugResult.success ? 'success' : 'error'"
            :title="debugResult.success ? '脚本执行成功' : '脚本执行失败'"
            :description="
              debugResult.success ? `耗时: ${debugResult.executionTime}ms` : debugResult.error
            "
            show-icon
          />

          <el-tabs v-model="activeDebugTab" class="debug-tabs">
            <el-tab-pane label="执行结果" name="result">
              <div v-if="debugResult.success && debugResult.result">
                <el-table :data="debugResult.result.items" style="width: 100%">
                  <el-table-column prop="title" label="标题" min-width="150" />
                  <el-table-column prop="link" label="链接" min-width="200">
                    <template #default="{ row }">
                      <el-link :href="row.link" target="_blank" type="primary">{{
                        row.link
                      }}</el-link>
                    </template>
                  </el-table-column>
                  <el-table-column prop="pubDate" label="发布日期" width="180" />
                  <el-table-column prop="author" label="作者" width="120" />
                </el-table>
              </div>
              <div v-else-if="debugResult.success">
                <el-empty description="脚本执行成功，但没有返回数据" />
              </div>
              <div v-else>
                <el-empty description="脚本执行失败，请查看错误信息" />
              </div>
            </el-tab-pane>

            <el-tab-pane label="日志输出" name="logs">
              <div class="debug-logs">
                <div v-for="(log, index) in debugResult.logs" :key="index" class="log-item">
                  <span
                    :class="{
                      'log-info': typeof log === 'string' && log.includes('[INFO]'),
                      'log-warn': log.includes('[WARN]'),
                      'log-error': log.includes('[ERROR]') || log.includes('[FATAL]'),
                      'log-debug': log.includes('[DEBUG]'),
                    }"
                  >
                    {{ log }}
                  </span>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="JSON视图" name="json">
              <pre class="json-view">{{ JSON.stringify(debugResult.result, null, 2) }}</pre>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-drawer>

    <!-- 脚本帮助指南对话框 -->
    <ScriptHelpGuide mode="dialog" v-model="scriptHelpVisible" />







    <!-- 内联脚本在线编辑器组件 -->
    <InlineScriptEditor 
      v-model="inlineScriptEditorVisible" 
      :route-id="currentEditingRouteId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { ElMessage, FormInstance } from "element-plus";
import { Search, Download, Upload, Folder, Document, Warning, CircleClose, InfoFilled, Refresh, DocumentCopy, CaretRight } from "@element-plus/icons-vue";
import {
  getAllDynamicRoutes,
  addDynamicRoute,
  updateDynamicRoute,
  deleteDynamicRoute,
  debugDynamicRouteScript,
  type DynamicRouteConfig,
} from "@/api/dynamicRoute";
import { authCredentialApi } from "@/api/authCredential";
import type { AuthCredential } from "@feedhub/shared";
import { copyToClipboard } from "@/utils";
import { STORAGE_KEYS } from "@/constants/storage";
import ScriptHelpGuide from "@/components/ScriptHelpGuide.vue";
import CodeEditor from "@/components/CodeEditor.vue";
import InlineScriptEditor from "@/components/InlineScriptEditor.vue";

// 状态
const loading = ref(false);
const routes = ref<DynamicRouteConfig[]>([]);
const authCredentials = ref<AuthCredential[]>([]);
const searchKeyword = ref("");
const drawerVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const debugDrawerVisible = ref(false);
const debugging = ref(false);
const debugResult = ref<Record<string, any>>();
const activeDebugTab = ref("result");
const scriptHelpVisible = ref(false);

// 脚本包预览和验证相关


// 模板管理相关
const testParams = ref<Record<string, unknown>>({});
const debugForm = ref<DynamicRouteConfig>({} as DynamicRouteConfig);
const fileInputRef = ref<HTMLInputElement>();
const selectedRoutes = ref<DynamicRouteConfig[]>([]);

// 在线编辑相关


// 内联脚本在线编辑相关
const inlineScriptEditorVisible = ref(false);
const currentEditingRouteId = ref<number>(0);

// 基础URL
const baseUrl = window.location.origin;

// 上传认证头
const uploadHeaders = computed(() => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
});

// 表单数据
const form = reactive<DynamicRouteConfig>({
  id: undefined,
  name: "",
  path: "",
  method: "GET",
  description: "",
  refreshInterval: 60,
  authCredentialId: undefined,
  params: [],
  script: {
    sourceType: "inline",
    content: "",
    timeout: 30000,
  },
});

// 表单验证规则
const rules = {
  name: [
    { required: true, message: "请输入路由名称", trigger: "blur" },
    { max: 100, message: "路由名称不能超过100个字符", trigger: "blur" },
  ],
  path: [
    { required: true, message: "请输入路由路径", trigger: "blur" },
    { max: 100, message: "路由路径不能超过100个字符", trigger: "blur" },
    {
      pattern: /^\/[\w\-\/\:]*$/,
      message:
        "路由路径格式不正确，应以/开头，支持动态参数（如 :id），只能包含字母、数字、下划线、连字符、冒号和斜杠",
      trigger: "blur",
    },
  ],
  method: [{ required: true, message: "请选择HTTP方法", trigger: "change" }],
  refreshInterval: [
    { required: true, message: "请设置刷新间隔", trigger: "blur" },
    { type: "number", min: 1, max: 1440, message: "刷新间隔必须在1-1440分钟之间", trigger: "blur" },
  ],
  "script.sourceType": [{ required: true, message: "请选择脚本来源类型", trigger: "change" }],
  "script.content": [
    {
      required: true,
      validator: (rule: any, value: string, callback: Function) => {
        if (!value || value.trim() === '') {
          const sourceType = form.script.sourceType;
          if (sourceType === 'inline') {
            callback(new Error('请输入脚本内容'));
          } else if (sourceType === 'url') {
            callback(new Error('请输入脚本URL'));
          } else if (sourceType === 'file') {
            callback(new Error('请上传脚本文件'));
  
          } else {
            callback(new Error('请输入脚本内容'));
          }
        } else {
          callback();
        }
      },
       trigger: 'blur'
     }
   ],
   "script.timeout": [
    { required: true, message: "请输入超时时间", trigger: "blur" },
    {
      type: "number",
      min: 1000,
      max: 60000,
      message: "超时时间必须在1000-60000毫秒之间",
      trigger: "blur",
    },
  ],
};

// 过滤后的路由列表
const filteredRoutes = computed(() => {
  if (!searchKeyword.value) return routes.value;

  const keyword = searchKeyword.value.toLowerCase();
  return routes.value.filter(
    (route: DynamicRouteConfig) =>
      route.name.toLowerCase().includes(keyword) || route.path.toLowerCase().includes(keyword)
  );
});

// 获取所有路由
const fetchRoutes = async () => {
  loading.value = true;
  try {
    const res = await getAllDynamicRoutes();
    if (res.code === 0) {
      routes.value = res.data as DynamicRouteConfig[];
    } else {
      ElMessage.error(res.message || "获取动态路由列表失败");
    }
  } catch (error) {
    console.error("获取动态路由列表出错:", error);
    ElMessage.error("获取动态路由列表出错");
  } finally {
    loading.value = false;
  }
};

// 刷新路由列表
const refreshRoutes = () => {
  fetchRoutes();
};

// 打开添加抽屉
const openAddDrawer = () => {
  isEdit.value = false;
  resetForm();
  drawerVisible.value = true;
};

// 打开编辑抽屉
const openEditDrawer = (row: any) => {
  isEdit.value = true;
  resetForm();
  Object.assign(form, row);
  drawerVisible.value = true;
};

// 打开调试抽屉
const openDebugDrawer = (row: any) => {
  debugForm.value = row;
  testParams.value = {};
  debugResult.value = {};
  activeDebugTab.value = "result";
  debugDrawerVisible.value = true;
};

// 关闭抽屉
const closeDrawer = () => {
  drawerVisible.value = false;
  resetForm();
};

// 获取所有授权凭证
const fetchAuthCredentials = async () => {
  try {
    const res = await authCredentialApi.getAll();
    if (res.code === 0) {
      authCredentials.value = res.data as AuthCredential[];
    } else {
      console.error("获取授权凭证列表失败:", res.message);
    }
  } catch (error) {
    console.error("获取授权凭证列表出错:", error);
  }
};

// 重置表单
const resetForm = () => {
  form.id = undefined;
  form.name = "";
  form.path = "";
  form.method = "GET";
  form.description = "";
  form.refreshInterval = 60;
  form.authCredentialId = undefined;
  form.params = [];
  form.script = {
    sourceType: "inline",
    content: "",
    timeout: 30000,
  };
};

// 添加参数
const addParam = () => {
  form.params?.push({
    name: "",
    type: "string",
    required: false,
    defaultValue: "",
    description: "",
  });
};

// 删除参数
const removeParam = (index: number) => {
  form.params?.splice(index, 1);
};

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean): Promise<void> => {
    if (valid) {
      try {
        // 确保路径以/开头
        if (!form.path.startsWith("/")) {
          form.path = "/" + form.path;
        }

        const data = { ...form };
        let res;

        if (isEdit.value) {
          res = await updateDynamicRoute(form.id!, data);
        } else {
          res = await addDynamicRoute(data);
        }

        if (res.code === 0) {
          ElMessage.success(isEdit.value ? "更新成功" : "添加成功");
          drawerVisible.value = false;
          fetchRoutes();
        } else {
          ElMessage.error(res.message || (isEdit.value ? "更新失败" : "添加失败"));
        }
      } catch (error) {
        console.error(isEdit.value ? "更新动态路由出错:" : "添加动态路由出错:", error);
        ElMessage.error(isEdit.value ? "更新动态路由出错" : "添加动态路由出错");
      }
    }
  });
};

// 删除路由
const deleteRoute = async (id: number) => {
  try {
    const res = await deleteDynamicRoute(id);
    if (res.code === 0) {
      ElMessage.success("删除成功");
      fetchRoutes();
    } else {
      ElMessage.error(res.message || "删除失败");
    }
  } catch (error) {
    console.error("删除动态路由出错:", error);
    ElMessage.error("删除动态路由出错");
  }
};

// 复制RSS链接
const copyRssLink = (row: DynamicRouteConfig) => {
  const link = `${baseUrl}/api/dynamic${row.path}`;
  copyToClipboard(link)
    .then((success) => {
      if (success) {
        ElMessage.success("RSS链接已复制到剪贴板");
      } else {
        ElMessage.warning("无法复制RSS链接，请手动复制");
      }
    })
    .catch(() => {
      ElMessage.warning("无法复制RSS链接，请手动复制");
    });
};

// 获取脚本来源标签类型
const getScriptSourceTagType = (sourceType: string) => {
  return "";
};

// 获取脚本来源标签文本
const getScriptSourceLabel = (sourceType: string) => {
  return "内联脚本";
};



// 显示脚本帮助
const showScriptHelp = () => {
  scriptHelpVisible.value = true;
};








  



// 打开内联脚本编辑器
const openInlineScriptEditor = async () => {
  if (!form.id) {
    ElMessage.warning('请先保存路由配置');
    return;
  }
  
  currentEditingRouteId.value = form.id;
  inlineScriptEditorVisible.value = true;
};





// 调试脚本
const debugScript = async () => {
  debugging.value = true;
  try {
    const res = await debugDynamicRouteScript(debugForm.value!, testParams.value);

    if (res.code === 0) {
      debugResult.value = res.data as Record<string, unknown> | undefined;
      activeDebugTab.value = "result";
    } else {
      ElMessage.error(res.message || "脚本调试失败");
    }
  } catch (error) {
    console.error("调试脚本出错:", error);
    ElMessage.error("调试脚本出错");
  } finally {
    debugging.value = false;
  }
};

// 处理表格选择变化
const handleSelectionChange = (selection: DynamicRouteConfig[]) => {
  selectedRoutes.value = selection;
};

// 导出路由配置
const exportRoutes = () => {
  try {
    // 检查是否有选择的路由
    if (selectedRoutes.value.length === 0) {
      ElMessage.warning("请先选择要导出的路由配置");
      return;
    }

    const exportData = {
      version: "1.0",
      exportTime: new Date().toISOString(),
      routes: selectedRoutes.value.map((route) => ({
        name: route.name,
        path: route.path,
        method: route.method,
        description: route.description,
        authCredentialId: route.authCredentialId,
        params: route.params,
        script: route.script,
      })),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `dynamic-routes-selected-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success(`成功导出 ${selectedRoutes.value.length} 个选中的路由配置`);
  } catch (error) {
    console.error("导出路由配置失败:", error);
    ElMessage.error("导出路由配置失败");
  }
};

// 触发导入
const triggerImport = () => {
  fileInputRef.value?.click();
};

// 处理文件导入
const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  try {
    const text = await file.text();
    const importData = JSON.parse(text);

    // 验证导入数据格式
    if (!importData.routes || !Array.isArray(importData.routes)) {
      ElMessage.error("导入文件格式不正确，缺少routes数组");
      return;
    }

    // 批量添加路由
    let successCount = 0;
    let failCount = 0;

    for (const routeData of importData.routes) {
      try {
        // 确保路径以/开头
        if (!routeData.path.startsWith("/")) {
          routeData.path = "/" + routeData.path;
        }

        const res = await addDynamicRoute(routeData);
        if (res.code === 0) {
          successCount++;
        } else {
          failCount++;
          console.warn(`导入路由失败: ${routeData.name}`, res.message);
        }
      } catch (error) {
        failCount++;
        console.error(`导入路由出错: ${routeData.name}`, error);
      }
    }

    // 刷新路由列表
    await fetchRoutes();

    // 显示导入结果
    if (successCount > 0) {
      ElMessage.success(
        `成功导入 ${successCount} 个路由配置${failCount > 0 ? `，失败 ${failCount} 个` : ""}`
      );
    } else {
      ElMessage.error(`导入失败，共 ${failCount} 个路由配置导入失败`);
    }
  } catch (error) {
    console.error("解析导入文件失败:", error);
    ElMessage.error("导入文件格式不正确，请检查文件内容");
  } finally {
    // 清空文件输入
    target.value = "";
  }
};

// 初始化
onMounted(() => {
  fetchRoutes();
  fetchAuthCredentials();
});
</script>

<style lang="scss" scoped>
.dynamic-route-container {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .page-actions {
      display: flex;
      gap: 10px;
    }
  }

  .route-list-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .search-input {
        width: 300px;
      }
    }

    .route-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .route-path {
      display: flex;
      align-items: center;
      gap: 8px;

      .path-text {
        word-break: break-all;
      }

      .copy-btn {
        margin-left: auto;
      }
    }

    .description-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .route-actions {
      display: flex;
      gap: 8px;
    }
  }

  .route-form {
    padding: 20px;

    .param-item {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #ebeef5;
      border-radius: 4px;
      background-color: #f8f8f8;

      .param-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;

        .param-title {
          font-weight: 600;
        }
      }
    }

    .add-param-btn {
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
    }

    .script-textarea {
      font-family: monospace;
    }

    .script-help {
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .editor-tips {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .script-upload {
      width: 100%;
    }

    .file-info {
      margin-top: 10px;
      color: #606266;
    }

    .timeout-unit {
      margin-left: 10px;
      color: #606266;
    }
  }

  .debug-container {
    padding: 20px;

    .debug-form {
      margin-bottom: 20px;

      h3 {
        margin-top: 0;
        margin-bottom: 15px;
      }

      .debug-param-item {
        margin-bottom: 15px;
      }

      .no-params {
        color: #909399;
        font-style: italic;
      }

      .debug-actions {
        margin-top: 20px;
      }
    }

    .debug-result {
      h3 {
        margin-top: 20px;
        margin-bottom: 15px;
      }

      .debug-tabs {
        margin-top: 20px;
      }

      .debug-logs {
        height: 300px;
        overflow-y: auto;
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;

        .log-item {
          margin-bottom: 5px;
          white-space: pre-wrap;
          word-break: break-all;
        }

        .log-info {
          color: #6a9955;
        }

        .log-warn {
          color: #dcdcaa;
        }

        .log-error {
          color: #f44336;
        }

        .log-debug {
          color: #569cd6;
        }
      }

      .json-view {
        background-color: #1e1e1e;
        color: #d4d4d4;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
  }

  .script-help-content {
    h3 {
      margin-top: 0;
      margin-bottom: 15px;
    }

    h4 {
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .code-block {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 4px;
      font-family: monospace;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 10px 0;
    }
  }

  .validation-list {
    .validation-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .el-icon {
        margin-right: 8px;
        flex-shrink: 0;
      }
      
      span {
        flex: 1;
        line-height: 1.4;
      }
    }
  }





  // 内联脚本编辑器样式
  .inline-script-editor {
    .editor-layout {
      display: flex;
      gap: 16px;
      height: 600px;
      
      .file-tree-panel {
        width: 300px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        overflow: hidden;
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f5f7fa;
          border-bottom: 1px solid #e4e7ed;
          
          h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
          }
        }
        
        .el-tree {
          padding: 8px;
          
          .tree-node {
            display: flex;
            align-items: center;
            width: 100%;
            
            &.active {
              color: #409eff;
              font-weight: 500;
            }
            
            .file-size {
              margin-left: auto;
              font-size: 12px;
              color: #909399;
            }
          }
        }
      }
      
      .code-editor-panel {
        flex: 1;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        overflow: hidden;
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f5f7fa;
          border-bottom: 1px solid #e4e7ed;
          
          h4 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
          }
          
          .panel-actions {
            display: flex;
            gap: 8px;
          }
        }
        
        .editor-content {
          height: calc(100% - 49px);
          
          .no-file-selected {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
          }
        }
      }
    }
    
    .debug-result {
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      padding: 16px;
      
      h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .result-content {
        background: #f5f7fa;
        border-radius: 4px;
        padding: 12px;
        margin-top: 12px;
        
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
        }
      }
      
      .logs-content {
        background: #f5f7fa;
        border-radius: 4px;
        padding: 12px;
        max-height: 300px;
        overflow-y: auto;
        
        .log-item {
          padding: 4px 0;
          border-bottom: 1px solid #e4e7ed;
          font-family: monospace;
          font-size: 12px;
          
          &:last-child {
            border-bottom: none;
          }
        }
      }
    }
  }
}
</style>
