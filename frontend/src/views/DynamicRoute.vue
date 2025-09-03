<template>
  <div class="dynamic-route-container">
    <div class="page-header">
      <h1 class="page-title">动态路由管理</h1>
      <div class="page-actions">
        <el-button type="primary" @click="openAddDrawer">添加路由</el-button>
        <el-button @click="refreshRoutes">刷新</el-button>
        <el-button @click="exportRoutesWithScriptsHandler">导出</el-button>
        <el-button @click="triggerZipImport">导入</el-button>
        <input ref="fileInputRef" type="file" accept=".json" style="display: none" @change="handleFileImport" />
        <input ref="zipFileInputRef" type="file" accept=".zip" style="display: none" @change="handleZipFileImport" />
      </div>
    </div>

    <!-- 路由列表 -->
    <el-card class="route-list-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>动态路由列表</span>
          <el-input v-model="searchKeyword" placeholder="搜索路由名称或路径" clearable class="search-input">
            <template #prefix>
              <el-icon>
                <Search />
              </el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <!-- 空状态 -->
      <el-empty v-if="filteredRoutes.length === 0" description="暂无动态路由配置" />

      <!-- 路由列表 -->
      <el-table v-else :data="filteredRoutes" border style="width: 100%" @selection-change="handleSelectionChange">
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

        <el-table-column prop="script.folder" label="存放目录" min-width="70" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="row.id && row.script.folder" type="success" @click="openInlineScriptEditor(row.id)">
              {{ row.script.folder }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="订阅链接" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="subscription-link">
              <el-dropdown placement="top-end" trigger="hover" @command="(command: string) => copyDynamicLink(row, command as 'rss' | 'json')">
                <span class="subscription-link-text">
                  /dynamic{{ row.path }}
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rss">
                      <el-icon><Document /></el-icon>
                      复制 RSS 链接
                    </el-dropdown-item>
                    <el-dropdown-item command="json">
                      <el-icon><DataLine /></el-icon>
                      复制 JSON 链接
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="参数信息" min-width="200">
          <template #default="{ row }">
            <div class="route-info">
              <!-- 参数信息 -->
              <div v-if="row.params && row.params.length > 0" class="route-params">
                <div v-for="param in row.params" :key="param.name" class="param-item">
                  <div class="param-header">
                    <span class="param-name">{{ param.name }}</span>
                    <el-tag size="small" :type="param.required ? 'danger' : 'info'" class="param-required-tag">
                      {{ param.required ? '必需' : '可选' }}
                    </el-tag>
                  </div>
                  <div v-if="param.description" class="param-description">
                    {{ param.description }}
                  </div>
                </div>
              </div>
              <div v-else class="no-params">无参数</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="description-text">{{ row.description || "无描述" }}</span>
          </template>
        </el-table-column>

        <el-table-column label="Git信息" min-width="150">
          <template #default="{ row }">
            <div v-if="row.script.gitConfig" class="git-info">
              <div class="git-url">
                <el-icon>
                  <Link />
                </el-icon>
                <span class="git-repo">{{ getRepoName(row.script.gitConfig.gitUrl) }}</span>
              </div>
              <div class="git-details">
                <el-tag size="small" type="info">{{ row.script.gitConfig.gitBranch }}</el-tag>
                <span v-if="row.script.gitConfig.gitSubPath" class="git-subpath">{{ row.script.gitConfig.gitSubPath
                  }}</span>
              </div>
              <div v-if="row.script.gitConfig.lastSyncAt" class="git-sync-time">
                <span class="sync-time">{{ formatSyncTime(row.script.gitConfig.lastSyncAt) }}</span>
                <el-link class="sync-button" type="success" @click="syncGitRepo(row)"
                  :loading="syncingRoutes.includes(row.id)">
                  同步Git
                </el-link>
              </div>
            </div>
            <span v-else class="no-git-info">-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <div class="route-actions">
              <el-link type="primary" @click="openDebugDrawer(row)">调试</el-link>
              <el-link type="success" @click="openReadmeDialog(row)" v-if="row.script.sourceType === 'inline'">说明</el-link>
              <el-link type="primary" @click="openEditDrawer(row)">编辑</el-link>
              <el-popconfirm title="确定要删除此路由配置吗？" @confirm="deleteRoute(row.id)" confirm-button-text="确定"
                cancel-button-text="取消">
                <template #reference>
                  <el-link type="danger" link>删除</el-link>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="isEdit ? '编辑动态路由' : '添加动态路由'" direction="rtl" size="50%"
      :before-close="closeDrawer">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="route-form">
        <el-form-item label="路由名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入路由名称" />
        </el-form-item>

        <el-form-item label="路由路径" prop="path">
          <el-input v-model="form.path" placeholder="请输入路由路径，例如: /my-route 或 /bilibili/:uid">
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
          <el-input v-model="form.description" type="textarea" placeholder="请输入路由描述" :rows="2" />
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
            <el-option v-for="auth in authCredentials" :key="auth.id" :label="`${auth.name} (${auth.authType})`"
              :value="auth.id" />
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

        <el-form-item label="脚本目录">
          <!-- 内联脚本 -->
          <div>
            <el-input v-model="form.script.folder" placeholder="脚本目录标识符（系统自动生成）" readonly />
            <div class="script-help">
              <el-button v-if="form.id && form.script.folder" type="success" link
                @click="openInlineScriptEditor(form.id)">
                <el-icon>
                  <Edit />
                </el-icon>
                在线编辑
              </el-button>
              <el-button v-if="form.id && (!form.script.folder || form.script.folder.trim() === '')" type="warning" link
                @click="showInitScriptDialog" style="margin-left: 12px;">
                <el-icon>
                  <Setting />
                </el-icon>
                初始化脚本
              </el-button>

            </div>

            <div
              style="margin-top: 16px; padding: 12px; background-color: #f5f7fa; border-radius: 4px; font-size: 12px; color: #606266;">
              <el-icon style="margin-right: 4px;">
                <InfoFilled />
              </el-icon>
              先保存再初始化脚本，入口文件从 package.json 的 main 字段读取
            </div>
          </div>

        </el-form-item>

        <el-form-item label="超时时间" prop="script.timeout">
          <el-input-number v-model="form.script.timeout" :min="1000" :max="60000" :step="1000" :step-strictly="true" />
          <span class="timeout-unit">毫秒</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm">保存</el-button>
          <el-button @click="closeDrawer">取消</el-button>
        </el-form-item>
      </el-form>
    </el-drawer>

    <!-- 路由调试组件 -->
    <RouteDebugger v-model="debugDrawerVisible" :route="debugRoute" />

    <!-- 脚本初始化组件 -->
    <ScriptInitializer v-model="scriptInitVisible" :route-id="currentEditingRouteId" @success="onScriptInitSuccess"
      @skip="onScriptInitSkip" />

    <!-- 内联脚本在线编辑器组件 -->
    <InlineScriptEditor v-model="inlineScriptEditorVisible" :route-id="currentEditingRouteId" />

    <!-- README查看对话框 -->
    <el-dialog
      v-model="readmeDialogVisible"
      :title="`${currentReadmeRoute.name} - 使用说明`"
      width="60%"
      @close="closeReadmeDialog"
    >
      <div v-loading="readmeLoading" style="min-height: 200px;">
        <div v-if="!readmeLoading" style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; background: #f8f9fa; padding: 16px; border-radius: 4px; border: 1px solid #e9ecef;">
          {{ readmeContent }}
        </div>
      </div>
      <template #footer>
        <el-button @click="closeReadmeDialog">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from "vue";
import { ElMessage, FormInstance } from "element-plus";
import { Search, InfoFilled, Setting, Link, Document, ArrowDown, DataLine } from "@element-plus/icons-vue";
import {
  getAllDynamicRoutes,
  addDynamicRoute,
  updateDynamicRoute,
  syncGitRepository,
  deleteDynamicRoute,
  exportRoutesWithScripts,
  importRoutesWithScripts,
  getRouteReadme,
  type DynamicRouteConfig,
} from "@/api/dynamicRoute";
// 移除DEFAULT_TYPE_PARAM导入，不再自动添加type参数
import { authCredentialApi } from "@/api/authCredential";
import type { AuthCredential } from "@feedhub/shared";
import { copyToClipboard } from "@/utils";

import InlineScriptEditor from "@/components/InlineScriptEditor.vue";
import ScriptInitializer from "@/components/ScriptInitializer.vue";
import RouteDebugger from "@/components/RouteDebugger.vue";

// 状态
const loading = ref(false);
const routes = ref<DynamicRouteConfig[]>([]);
const authCredentials = ref<AuthCredential[]>([]);
const searchKeyword = ref("");
const drawerVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const debugDrawerVisible = ref(false);
// 模板管理相关
const debugRoute = ref<DynamicRouteConfig>({} as DynamicRouteConfig);
const fileInputRef = ref<HTMLInputElement>();
const zipFileInputRef = ref<HTMLInputElement>();
const selectedRoutes = ref<DynamicRouteConfig[]>([]);

// 内联脚本在线编辑相关
const inlineScriptEditorVisible = ref(false);
const currentEditingRouteId = ref<number>(0);

// README相关
const readmeDialogVisible = ref(false);
const readmeContent = ref("");
const readmeLoading = ref(false);
const currentReadmeRoute = ref<DynamicRouteConfig>({} as DynamicRouteConfig);

// 脚本初始化相关
const scriptInitVisible = ref(false);

// Git同步相关
const syncingRoutes = ref<number[]>([]);

// 基础URL
const baseUrl = window.location.origin;

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
    folder: "",
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

  // 确保params数组存在
  if (!form.params) {
    form.params = [];
  }

  drawerVisible.value = true;
};

// 打开调试抽屉
const openDebugDrawer = (row: any) => {
  debugRoute.value = row;
  debugDrawerVisible.value = true;
};

// 打开README对话框
const openReadmeDialog = async (row: DynamicRouteConfig) => {
  currentReadmeRoute.value = row;
  readmeDialogVisible.value = true;
  readmeLoading.value = true;
  
  try {
    const res = await getRouteReadme(row.id!);
    if (res.code === 0) {
      readmeContent.value = (res.data as string) || "暂无README内容";
    } else {
      readmeContent.value = "获取README内容失败: " + res.message;
    }
  } catch (error) {
    console.error("获取README内容出错:", error);
    readmeContent.value = "获取README内容出错";
  } finally {
    readmeLoading.value = false;
  }
};

// 关闭README对话框
const closeReadmeDialog = () => {
  readmeDialogVisible.value = false;
  readmeContent.value = "";
  currentReadmeRoute.value = {} as DynamicRouteConfig;
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
  form.params = []; // 不再自动添加type参数
  form.script = {
    sourceType: "inline",
    folder: "",
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

          // 如果是新建路由且脚本目录为空，提示用户初始化脚本
          if (!isEdit.value && (!form.script.folder || form.script.folder.trim() === '')) {
            currentEditingRouteId.value = (res.data as any)?.id;
            scriptInitVisible.value = true;
          }
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

// 复制动态路由链接
const copyDynamicLink = (row: DynamicRouteConfig, type: 'rss' | 'json') => {
  let link = `${baseUrl}/api/dynamic${row.path}?type=${type}`;
  
  // 检查是否有必填参数
  const requiredParams = row.params?.filter(param => param.required) || [];
  
  if (requiredParams.length > 0) {
    // 替换路径中的参数占位符
    requiredParams.forEach(param => {
      link = link.replace(`:${param.name}`, `{${param.name}}`);
    });
    
    // 复制链接
    copyToClipboard(link)
      .then((success) => {
        if (success) {
          const paramNames = requiredParams.map(p => p.name).join('、');
          ElMessage.success(`${type.toUpperCase()}链接已复制到剪贴板，请将 {${paramNames}} 替换为实际参数值`);
        } else {
          ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
        }
      })
      .catch(() => {
        ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
      });
  } else {
    // 原有逻辑，无必填参数
    copyToClipboard(link)
      .then((success) => {
        if (success) {
          ElMessage.success(`${type.toUpperCase()}链接已复制到剪贴板`);
        } else {
          ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
        }
      })
      .catch(() => {
        ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
      });
  }
};

// 打开内联脚本编辑器
const openInlineScriptEditor = async (id: number) => {
  if (!id) {
    ElMessage.warning('请先保存路由配置');
    return;
  }

  currentEditingRouteId.value = id!;
  inlineScriptEditorVisible.value = true;
};

// 关闭内联脚本编辑器


// 脚本初始化成功回调
const onScriptInitSuccess = () => {
  // 初始化成功后跳转到在线编辑器
  inlineScriptEditorVisible.value = true;
  // 刷新路由列表以更新脚本状态
  fetchRoutes();
};

// 跳过脚本初始化回调
const onScriptInitSkip = () => {
  // 直接进入在线编辑器
  inlineScriptEditorVisible.value = true;
};

// 显示初始化脚本对话框
const showInitScriptDialog = () => {
  if (form.id) {
    currentEditingRouteId.value = form.id;
    scriptInitVisible.value = true;
  } else {
    ElMessage.warning('请先保存路由配置后再初始化脚本');
  }
};

// Git相关方法
const getRepoName = (gitUrl: string) => {
  try {
    const url = new URL(gitUrl);
    const pathname = url.pathname;
    const parts = pathname.split('/');
    const repoName = parts[parts.length - 1].replace('.git', '');
    return repoName || 'Unknown';
  } catch {
    return 'Unknown';
  }
};

const formatSyncTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
};

const syncGitRepo = async (route: DynamicRouteConfig) => {
  if (!route.id) return;

  try {
    syncingRoutes.value.push(route.id);
    await syncGitRepository(route.id);
    ElMessage.success('Git仓库同步成功');
    await fetchRoutes(); // 刷新列表
  } catch (error) {
    console.error('Git同步失败:', error);
    ElMessage.error('Git仓库同步失败');
  } finally {
    const index = syncingRoutes.value.indexOf(route.id);
    if (index > -1) {
      syncingRoutes.value.splice(index, 1);
    }
  }
};


// 处理表格选择变化
const handleSelectionChange = (selection: DynamicRouteConfig[]) => {
  selectedRoutes.value = selection;
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

// 导出路由配置和脚本文件
const exportRoutesWithScriptsHandler = async () => {
  try {
    // 检查是否有选择的路由
    if (selectedRoutes.value.length === 0) {
      ElMessage.warning("请先选择要导出的路由配置");
      return;
    }

    const routeIds = selectedRoutes.value.map(route => route.id!).filter(id => id !== undefined);
    const response = await exportRoutesWithScripts(routeIds);

    // 创建下载链接
    const blob = response.data as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dynamic-routes-with-scripts-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success(`成功导出 ${selectedRoutes.value.length} 个路由配置和脚本文件`);
  } catch (error) {
    console.error("导出路由配置和脚本文件失败:", error);
    ElMessage.error("导出路由配置和脚本文件失败");
  }
};

// 触发ZIP文件导入
const triggerZipImport = () => {
  zipFileInputRef.value?.click();
};

// 处理ZIP文件导入
const handleZipFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  try {
    const result = await importRoutesWithScripts(file);

    if (result.code === 0) {
      const { successCount, failCount, errors } = result.data as { successCount: number; failCount: number; errors: string[] };

      // 刷新路由列表
      await fetchRoutes();

      // 显示导入结果
      if (successCount > 0) {
        ElMessage.success(
          `成功导入 ${successCount} 个路由配置和脚本文件${failCount > 0 ? `，失败 ${failCount} 个` : ""}`
        );
      } else {
        ElMessage.error(`导入失败，共 ${failCount} 个路由配置导入失败`);
      }

      // 如果有错误，显示详细信息
      if (errors && errors.length > 0) {
        console.warn('导入过程中的错误:', errors);
      }
    } else {
      ElMessage.error(result.message || '导入失败');
    }
  } catch (error) {
    console.error("导入ZIP文件失败:", error);
    ElMessage.error("导入ZIP文件失败，请检查文件格式");
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
    }

    .link-copy-options {
      .copy-option {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f7fa;
        }

        .el-icon {
          margin-right: 8px;
          font-size: 14px;
        }

        span {
          font-size: 14px;
          color: #606266;
        }
      }
    }

    .path-text {
      word-break: break-all;
    }

    .copy-btn {
      margin-left: auto;
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

// 路由信息样式
.route-info {
  .auth-info {
    margin-bottom: 8px;

    .auth-tag {
      margin: 0;
    }
  }

  .route-params {
    .param-item {
      margin-bottom: 6px;
      padding: 4px 6px;
      background: #e1e6f0;
      border-radius: 4px;
      border-left: 3px solid #9e9e9e;

      &:last-child {
        margin-bottom: 0;
      }

      .param-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 2px;

        .param-name {
          font-weight: 500;
          color: #303133;
          font-size: 12px;
        }

        .param-required-tag {
          margin: 0;
        }
      }

      .param-description {
        font-size: 11px;
        color: #606266;
        line-height: 1.4;
        overflow: hidden;
      }
    }
  }

  .no-params {
    color: #909399;
    font-size: 12px;
    margin-top: 4px;
  }
}

// Git信息样式
.git-info {
  .git-url {
    display: flex;
    align-items: center;
    margin-bottom: 4px;

    .el-icon {
      margin-right: 4px;
      color: #909399;
    }

    .git-repo {
      font-size: 12px;
      color: #606266;
      font-weight: 500;
    }
  }

  .git-details {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;

    .git-subpath {
      font-size: 11px;
      color: #909399;
      background: #f5f7fa;
      padding: 1px 4px;
      border-radius: 2px;
    }
  }

  .git-sync-time {
    .sync-time {
      font-size: 11px;
      color: #909399;
    }

    .sync-button {
      font-size: 11px;
      margin-left: 10px;
    }
  }
}

.no-git-info {
  color: #c0c4cc;
  font-size: 12px;
}

/* 订阅链接样式 */
.subscription-link {
  display: flex;
  align-items: center;
}

.subscription-link-text {
  cursor: pointer;
  color: #409eff;
  font-size: 14px;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.subscription-link-text:hover {
  background-color: #ecf5ff;
  color: #337ecc;
}

.subscription-link-text .el-icon {
  margin-left: 4px;
  font-size: 12px;
}
</style>
