<template>
  <div class="template-management">
    <div class="header">
      <h1>RSS模板管理</h1>
      <div>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建模板
        </el-button>
        <el-button @click="initDefaultTemplates" :loading="initLoading">
          <el-icon><Refresh /></el-icon>
          初始化默认模板
        </el-button>
        <el-button @click="exportTemplates">
          <el-icon><Download /></el-icon>
          导出模板
        </el-button>
        <el-button @click="showImportDialog = true">
          <el-icon><Upload /></el-icon>
          导入模板
        </el-button>
      </div>
    </div>

    <!-- 模板列表 -->
    <div class="template-list" v-loading="templatesLoading">
      <el-row :gutter="20">
        <el-col :span="8" v-for="template in templates" :key="template.id">
          <el-card class="template-card" shadow="hover">
            <div class="template-header">
              <div class="template-icon">
                <el-icon v-if="isElementIcon(template.icon)" :size="24">
              <component :is="getIcon(template)" />
            </el-icon>
            <simple-icon v-else :name="template.icon" :size="24" />
              </div>
              <div class="template-info">
                <h3>{{ template.name }}</h3>
                <p>{{ template.description }}</p>
              </div>
            </div>
            
            <div class="template-actions">
              <el-button size="small" @click="openDebugDialog(template)">
                <el-icon><Football /></el-icon>
                调试
              </el-button>
              <el-button size="small" @click="createRssFromTemplate(template)">
                <el-icon><DocumentAdd /></el-icon>
                创建RSS
              </el-button>
              <el-button size="small" @click="viewTemplateConfigs(template)">
                <el-icon><View /></el-icon>
                查看配置
              </el-button>
              <!-- <el-button size="small" @click="batchUpdateConfigs(template)">
                <el-icon><Refresh /></el-icon>
                批量更新
              </el-button> -->
              <el-button size="small" @click="editTemplate(template)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button size="small" type="danger" @click="deleteTemplate(template.id)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 创建/编辑模板对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTemplate ? '编辑模板' : '创建模板'"
      width="80%"
      :before-close="closeDialog"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="templateRules"
        label-width="120px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="模板名称" prop="name">
              <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平台名称" prop="platform">
              <el-input v-model="templateForm.platform" placeholder="如：bilibili、youtube等" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="平台图标" prop="icon">
          <div class="icon-selector-container">
            <el-input v-model="templateForm.icon" placeholder="图标名称，如：bilibili、youtube等" />
            <el-button type="primary" @click="showIconSelector = true">选择图标</el-button>
          </div>
          <div v-if="templateForm.icon" class="selected-icon-preview">
            <span>预览：</span>
            <el-icon v-if="isElementIcon(templateForm.icon)">
              <component :is="templateForm.icon" />
            </el-icon>
            <simple-icon v-else :name="templateForm.icon" />
          </div>
        </el-form-item>

        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入模板描述"
          />
        </el-form-item>

        <el-form-item label="URL模板" prop="urlTemplate">
          <el-input
            v-model="templateForm.urlTemplate"
            type="textarea"
            :rows="3"
            placeholder="请输入URL模板，使用{{参数名}}表示参数"
          />
        </el-form-item>

        <el-form-item label="脚本模板" prop="scriptTemplate">
          <div class="script-input-container">
            <el-input
              v-model="templateForm.scriptTemplate"
              type="textarea"
              :rows="10"
              placeholder="请输入JavaScript脚本模板，使用{{参数名}}表示参数"
            />
            <div class="script-help-container">
              <ScriptHelpGuide />
            </div>
          </div>
        </el-form-item>

        <!-- 参数配置 -->
        <el-form-item label="模板参数">
          <div class="parameters-section">
            <div class="parameters-header">
              <h4>参数列表</h4>
              <el-button type="primary" size="small" @click="addParameter">
                添加参数
              </el-button>
            </div>
            
            <div class="parameters-list">
              <div
                v-for="(param, index) in templateForm.parameters"
                :key="index"
                class="parameter-item"
              >
                <el-row :gutter="10">
                  <el-col :span="6">
                    <el-input
                      v-model="param.name"
                      placeholder="参数名"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="6">
                    <el-input
                      v-model="param.label"
                      placeholder="显示名称"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="4">
                    <el-select v-model="param.type" placeholder="类型" size="small">
                      <el-option label="字符串" value="string" />
                      <el-option label="数字" value="number" />
                      <el-option label="选择" value="select" />
                    </el-select>
                  </el-col>
                  <el-col :span="3">
                    <el-checkbox v-model="param.required">必需</el-checkbox>
                  </el-col>
                  <el-col :span="3">
                    <el-button
                      type="danger"
                      size="small"
                      @click="removeParameter(index)"
                    >
                      删除
                    </el-button>
                  </el-col>
                </el-row>
                
                <el-row :gutter="10" style="margin-top: 10px;">
                  <el-col :span="12">
                    <el-input
                      v-model="param.description"
                      placeholder="参数描述"
                      size="small"
                    />
                  </el-col>
                  <el-col :span="12">
                    <el-input
                      v-model="param.defaultValue"
                      placeholder="默认值"
                      size="small"
                    />
                  </el-col>
                </el-row>
                
                <el-row v-if="param.type === 'select'" :gutter="10" style="margin-top: 10px;">
                  <el-col :span="24">
                    <el-input
                      v-model="param.options"
                      placeholder="选项，用逗号分隔"
                      size="small"
                    />
                  </el-col>
                </el-row>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="saveTemplate" :loading="saveLoading">
            {{ editingTemplate ? '更新' : '创建' }}
          </el-button>
          <el-button type="warning" @click="openDebugDialog(editingTemplate || templateForm)">
            调试
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 使用模板对话框 -->
    <el-dialog
      v-model="showUseDialog"
      title="使用模板"
      width="50%"
    >
      <el-form
        ref="useFormRef"
        :model="useForm"
        :rules="useRules"
        label-width="120px"
      >
        <el-form-item
          v-for="param in selectedTemplate?.parameters"
          :key="param.name"
          :label="param.label"
          :prop="`parameters.${param.name}`"
          :required="param.required"
        >
          <el-input
            v-if="param.type === 'string'"
            v-model="useForm.parameters[param.name]"
            :placeholder="param.description"
          />
          <el-input-number
            v-else-if="param.type === 'number'"
            v-model="useForm.parameters[param.name]"
            :placeholder="param.description"
          />
          <el-select
            v-else-if="param.type === 'select'"
            v-model="useForm.parameters[param.name]"
            :placeholder="param.description"
          >
            <el-option
              v-for="option in param.options"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showUseDialog = false">取消</el-button>
          <el-button type="primary" @click="generateRssConfig">
            生成RSS配置
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 调试参数输入表单 -->
    <el-dialog v-model="showDebugDialog" title="模板调试" width="60%" :before-close="closeDebugDialog">
      <el-form
        ref="debugFormRef"
        :model="debugForm"
        :rules="useRules"
        label-width="120px"
      >
        <el-form-item label="选择授权" prop="authCredentialId">
          <el-select v-model="debugForm.authCredentialId" placeholder="请选择授权" size="small">
            <el-option label="自定义" value="" />
            <el-option
              v-for="credential in authCredentials"
              :key="credential.id"
              :label="credential.name"
              :value="credential.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-for="param in debugTemplate?.parameters"
          :key="param.name"
          :label="param.label"
          :prop="`parameters.${param.name}`"
          :required="param.required"
        >
          <el-input
            v-if="param.type === 'string'"
            v-model="debugForm.parameters[param.name]"
            :placeholder="param.description"
          />
          <el-input-number
            v-else-if="param.type === 'number'"
            v-model="debugForm.parameters[param.name]"
            :placeholder="param.description"
          />
          <el-select
            v-else-if="param.type === 'select'"
            v-model="debugForm.parameters[param.name]"
            :placeholder="param.description"
          >
            <el-option
              v-for="option in param.options"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDebugDialog">关闭</el-button>
          <el-button type="primary" :loading="debugLoading" @click="doDebugTemplate">开始调试</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 调试结果弹窗 -->
    <DebugResultDialog :visible="!!debugResult" :result="debugResult" @close="debugResult=null" />

    <!-- 图标选择器对话框 -->
    <el-dialog
      v-model="showIconSelector"
      title="选择图标"
      width="60%"
    >
      <icon-selector v-model="templateForm.icon" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showIconSelector = false">取消</el-button>
          <el-button type="primary" @click="showIconSelector = false">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 从模板创建RSS配置对话框 -->
    <el-dialog v-model="showCreateRssDialog" title="从模板创建RSS配置" width="60%">
      <div v-if="selectedTemplate">
        <h3>{{ selectedTemplate.name }}</h3>
        <p>{{ selectedTemplate.description }}</p>
        
        <el-form :model="createRssForm" ref="createRssFormRef" label-width="120px">
          <!-- 基本信息 -->
          <el-form-item label="配置名称" prop="title" :rules="[{ required: true, message: '请输入配置名称', trigger: 'blur' }]">
            <el-input v-model="createRssForm.title" placeholder="请输入RSS配置名称" />
          </el-form-item>
          
          <el-form-item label="描述">
            <el-input v-model="createRssForm.description" type="textarea" placeholder="请输入描述" />
          </el-form-item>
          
          <!-- 授权凭据选择 -->
          <el-form-item label="授权凭据">
            <el-select v-model="createRssForm.authCredentialId" placeholder="选择授权凭据（可选）" clearable>
              <el-option
                v-for="credential in authCredentials"
                :key="credential.id"
                :label="credential.name"
                :value="credential.id"
              />
            </el-select>
          </el-form-item>
          
          <!-- 模板参数 -->
          <div v-if="selectedTemplate.parameters && selectedTemplate.parameters.length > 0">
            <h4>模板参数</h4>
            <el-form-item
              v-for="param in selectedTemplate.parameters"
              :key="param.name"
              :label="param.label || param.name"
              :required="param.required"
            >
              <el-input
                v-if="param.type === 'string'"
                v-model="createRssForm.parameters[param.name]"
                :placeholder="param.description"
              />
              <el-input-number
                v-else-if="param.type === 'number'"
                v-model="createRssForm.parameters[param.name]"
                :placeholder="param.description"
              />
              <el-select
                v-else-if="param.type === 'select'"
                v-model="createRssForm.parameters[param.name]"
                :placeholder="param.description"
              >
                <el-option
                  v-for="option in param.options"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </el-select>
            </el-form-item>
          </div>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateRssDialog = false">取消</el-button>
          <el-button type="primary" @click="doCreateRssFromTemplate" :loading="createRssLoading">
            创建RSS配置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 查看模板关联配置对话框 -->
    <el-dialog v-model="showConfigsDialog" title="模板关联的RSS配置" width="80%">
      <div v-if="selectedTemplate">
        <h3>{{ selectedTemplate.name }} 关联的配置</h3>
        
        <el-table :data="templateConfigs" v-loading="configsLoading">
          <el-table-column prop="title" label="配置名称" />
          <el-table-column prop="url" label="URL" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" @click="viewRssConfig(row.id)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showConfigsDialog = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量更新配置对话框 -->
    <el-dialog v-model="showBatchUpdateDialog" title="批量更新配置" width="60%">
      <div v-if="selectedTemplate">
        <h3>批量更新 {{ selectedTemplate.name }} 的所有配置</h3>
        <p>此操作将使用当前模板更新所有基于此模板创建的RSS配置</p>
        
        <el-alert
          title="注意"
          type="warning"
          description="批量更新将覆盖所有相关配置的URL和脚本内容，请确认操作"
          show-icon
          :closable="false"
          style="margin-bottom: 20px;"
        />
        
        <div v-if="templateConfigs.length > 0">
          <h4>将要更新的配置 ({{ templateConfigs.length }} 个):</h4>
          <el-table :data="templateConfigs" max-height="300">
            <el-table-column prop="title" label="配置名称" />
            <el-table-column prop="url" label="当前URL" show-overflow-tooltip />
          </el-table>
        </div>
        <div v-else>
          <el-empty description="没有找到基于此模板的配置" />
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showBatchUpdateDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="doBatchUpdateConfigs" 
            :loading="batchUpdateLoading"
            :disabled="templateConfigs.length === 0"
          >
            确认批量更新
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导入模板对话框 -->
    <el-dialog v-model="showImportDialog" title="导入模板" width="50%">
      <div class="import-section">
        <el-alert
          title="导入说明"
          type="info"
          description="请选择要导入的模板JSON文件，或直接粘贴模板JSON内容"
          show-icon
          :closable="false"
          style="margin-bottom: 20px;"
        />
        
        <el-tabs v-model="importMethod">
          <el-tab-pane label="文件上传" name="file">
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :show-file-list="false"
              accept=".json"
              :on-change="handleFileChange"
              drag
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将JSON文件拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  只支持JSON格式文件
                </div>
              </template>
            </el-upload>
          </el-tab-pane>
          
          <el-tab-pane label="JSON内容" name="text">
            <el-input
              v-model="importJsonText"
              type="textarea"
              :rows="10"
              placeholder="请粘贴模板JSON内容..."
              @input="watchImportText"
            />
          </el-tab-pane>
        </el-tabs>
        
        <div v-if="importPreview.length > 0" class="import-preview">
          <h4>预览导入的模板 ({{ importPreview.length }} 个):</h4>
          <el-table :data="importPreview" max-height="200" size="small">
            <el-table-column prop="name" label="模板名称" />
            <el-table-column prop="platform" label="平台" />
            <el-table-column prop="description" label="描述" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.exists ? 'warning' : 'success'" size="small">
                  {{ row.exists ? '已存在' : '新增' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="import-options" style="margin-top: 15px;">
            <el-checkbox v-model="importOptions.overwrite">
              覆盖已存在的同名模板
            </el-checkbox>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeImportDialog">取消</el-button>
          <el-button 
            type="primary" 
            @click="doImportTemplates" 
            :loading="importLoading"
            :disabled="importPreview.length === 0"
          >
            导入模板 ({{ importPreview.length }})
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Football, Delete, Refresh, DocumentAdd, View, Download, Upload, UploadFilled } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { authCredentialApi } from '@/api/authCredential'
import { createWebsiteRss } from '@/api/websiteRss'
import type { AuthCredential } from '@/types'
import DebugResultDialog from '@/components/DebugResultDialog.vue'
import IconSelector from '@/components/IconSelector.vue'
import ScriptHelpGuide from '@/components/ScriptHelpGuide.vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 类型定义
interface TemplateParameter {
  name: string
  label: string
  type: 'string' | 'number' | 'select'
  required: boolean
  defaultValue?: string
  options?: string[]
  description?: string
}

interface RssTemplate {
  id: number
  name: string
  description: string
  platform: string
  icon: string
  urlTemplate: string
  scriptTemplate: string
  parameters: TemplateParameter[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// 响应式数据
const templates = ref<RssTemplate[]>([])
const templatesLoading = ref(false)
const showCreateDialog = ref(false)
const showUseDialog = ref(false)
const showIconSelector = ref(false)
const editingTemplate = ref<RssTemplate | null>(null)
const selectedTemplate = ref<RssTemplate | null>(null)

const authCredentials = ref<AuthCredential[]>([])

// 新增的对话框状态
const showCreateRssDialog = ref(false)
const showConfigsDialog = ref(false)
const showBatchUpdateDialog = ref(false)
const showImportDialog = ref(false)

// 新增的数据状态
const templateConfigs = ref<any[]>([])
const configsLoading = ref(false)
const createRssLoading = ref(false)
const batchUpdateLoading = ref(false)

// 导入导出相关状态
const importMethod = ref('file')
const importJsonText = ref('')
const importPreview = ref<any[]>([])
const importLoading = ref(false)
const importOptions = reactive({
  overwrite: false
})
const uploadRef = ref()

// 创建RSS表单数据
const createRssForm = reactive({
  title: '',
  description: '',
  authCredentialId: undefined as number | undefined,
  parameters: {} as Record<string, any>
})

const createRssFormRef = ref()

// 表单数据
const templateForm = reactive({
  name: '',
  description: '',
  platform: '',
  icon: '',
  urlTemplate: '',
  scriptTemplate: '',
  parameters: [] as TemplateParameter[]
})

const useForm = reactive({
  templateId: 0,
  parameters: {} as Record<string, any>
})

// 表单验证规则
const templateRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入模板描述', trigger: 'blur' }],
  platform: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  icon: [{ required: true, message: '请输入平台图标', trigger: 'blur' }],
  urlTemplate: [{ required: true, message: '请输入URL模板', trigger: 'blur' }],
  scriptTemplate: [{ required: true, message: '请输入脚本模板', trigger: 'blur' }]
}

const useRules = {
  parameters: {}
}

// 表单引用
const templateFormRef = ref()
const useFormRef = ref()

// 调试相关
const showDebugDialog = ref(false)
const debugTemplate = ref<any>(null)
const debugForm = reactive({
  parameters: {} as Record<string, any>,
  authCredentialId: undefined as number | undefined
})
const debugFormRef = ref()
const debugResult = ref<any>(null)
const debugLoading = ref(false)

// 获取模板列表
const fetchTemplates = async () => {
  templatesLoading.value = true
  try {
    const response = await request.get<RssTemplate[]>('/api/rss-template')
    if (response.code === 0) {
      templates.value = response.data
    } else {
      ElMessage.error(response.message || '获取模板列表失败')
    }
  } catch (error: any) {
    console.error('获取模板列表失败:', error)
    ElMessage.error(`获取模板列表失败: ${error.message || '网络错误'}`)
  } finally {
    templatesLoading.value = false
  }
}

// 获取授权信息列表
const fetchAuthCredentials = async () => {
  try {
    const res = await authCredentialApi.getAll()
    authCredentials.value = res.data || []
  } catch (error: any) {
    console.error('获取授权信息失败:', error)
    ElMessage.error(`获取授权信息失败: ${error.message || '网络错误'}`)
  }
}

// 获取图标组件名称
const getIcon = (template: RssTemplate | undefined) => {
  // 返回模板中指定的图标名称，如果没有则使用默认图标
  const iconName = template?.icon || 'Document'
  return iconName
}

// 判断是否为Element Plus图标
const isElementIcon = (iconName: string) => {
  return Object.keys(ElementPlusIconsVue).includes(iconName)
}


// 添加参数
const addParameter = () => {
  templateForm.parameters.push({
    name: '',
    label: '',
    type: 'string',
    required: false,
    description: ''
  })
}

// 删除参数
const removeParameter = (index: number) => {
  templateForm.parameters.splice(index, 1)
}

// 编辑模板
const editTemplate = (template: RssTemplate) => {
  editingTemplate.value = template
  Object.assign(templateForm, template)
  showCreateDialog.value = true
}

// 保存模板加载状态
const saveLoading = ref(false)

// 初始化默认模板加载状态
const initLoading = ref(false)

// 保存模板
const saveTemplate = async () => {
  saveLoading.value = true
  try {
    await templateFormRef.value.validate()
    
    const url = editingTemplate.value 
      ? `/api/rss-template/${editingTemplate.value.id}`
      : '/api/rss-template'

      console.log('templateForm', templateForm)
    
    if (editingTemplate.value) {
      const response = await request.put<RssTemplate>(url, templateForm)
      if (response.code === 0) {
        ElMessage.success('更新模板成功')
        closeDialog()
        fetchTemplates()
      } else {
        ElMessage.error(response.message || '更新模板失败')
      }
    } else {
      const response = await request.post<RssTemplate>(url, templateForm)
      if (response.code === 0) {
        ElMessage.success('创建模板成功')
        closeDialog()
        fetchTemplates()
      } else {
        ElMessage.error(response.message || '创建模板失败')
      }
    }
  } catch (error: any) {
    console.error('保存模板失败:', error)
    ElMessage.error(`保存模板失败: ${error.message || '网络错误'}`)
  } finally {
    saveLoading.value = false
  }
}

// 删除模板
const deleteTemplate = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await request.delete(`/api/rss-template/${id}`)
    
    if (response.code === 0) {
      ElMessage.success('删除模板成功')
      fetchTemplates()
    } else {
      ElMessage.error(response.message || '删除模板失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除模板失败:', error)
      ElMessage.error(`删除模板失败: ${error.message || '网络错误'}`)
    }
  }
}

// 生成RSS配置
const generateRssConfig = async () => {
  try {
    await useFormRef.value.validate()
    const response = await request.post('/api/rss-template/generate', {
      templateId: useForm.templateId,
      parameters: useForm.parameters
    })
    if (response.code === 0) {
      // 生成配置成功，自动保存到网站内容监控
      const config = response.data as { name?: string; url?: string; script?: string }
      // 构造 WebsiteRssConfig 必需字段
      const saveRes = await createWebsiteRss({
        title: config.name || '',
        url: config.url || '',
        favicon: '',
        description: '',
        fetchInterval: 60,
        maxFeeds: 50,
        useProxy: false,
        fetchMode: 'script',
        selector: {
          selectorType: 'css',
          container: '',
          title: '',
          content: '',
        },
        auth: {
          enabled: false,
          authType: 'none',
        },
        script: {
          enabled: true,
          script: config.script || '',
          timeout: 30000
        },
        authCredentialId: undefined
      })
      if (saveRes.code === 0) {
        ElMessage.success('已添加到网站内容监控')
        showUseDialog.value = false
        // 可选：跳转到网站内容监控页
        // window.location.href = '/website-rss'
      } else {
        ElMessage.error(saveRes.message || '保存网站内容监控失败')
      }
    } else {
      ElMessage.error(response.message || '生成RSS配置失败')
    }
  } catch (error: any) {
    console.error('生成RSS配置失败:', error)
    ElMessage.error(`生成RSS配置失败: ${error.message || '网络错误'}`)
  }
}

// 关闭对话框
const closeDialog = () => {
  showCreateDialog.value = false
  editingTemplate.value = null
  Object.assign(templateForm, {
    name: '',
    description: '',
    platform: '',
    icon: '',
    urlTemplate: '',
    scriptTemplate: '',
    parameters: []
  })
}

// 初始化默认模板
const initDefaultTemplates = async () => {
  initLoading.value = true
  try {
    const response = await request.post('/api/rss-template/init', {})
    if (response.code === 0) {
      ElMessage.success('初始化默认模板成功')
      fetchTemplates()
    } else {
      ElMessage.error(response.message || '初始化默认模板失败')
    }
  } catch (error: any) {
    console.error('初始化默认模板失败:', error)
    ElMessage.error(`初始化默认模板失败: ${error.message || '网络错误'}`)
  } finally {
    initLoading.value = false
  }
}

// 打开调试弹窗
const openDebugDialog = (template: any) => {
  debugTemplate.value = JSON.parse(JSON.stringify(template))
  debugForm.parameters = {}
  debugForm.authCredentialId = undefined // 重置授权ID
  if (template.parameters) {
    template.parameters.forEach((param: any) => {
      debugForm.parameters[param.name] = param.defaultValue || ''
    })
  }
  // 清空授权相关字段
  delete debugForm.parameters['authType'];
  delete debugForm.parameters['cookie'];
  delete debugForm.parameters['bearerToken'];
  delete debugForm.parameters['username'];
  delete debugForm.parameters['password'];
  delete debugForm.parameters['customHeaders'];
  debugResult.value = null
  showDebugDialog.value = true
}

// 关闭调试弹窗
const closeDebugDialog = () => {
  showDebugDialog.value = false
  debugResult.value = null
  debugLoading.value = false
}

// 执行调试
const doDebugTemplate = async () => {
  if (!debugTemplate.value) return
  debugLoading.value = true
  debugResult.value = null
  try {
    console.log('debugTemplate.value', debugTemplate.value)
    const response = await request.post('/api/rss-template/debug', {
      template: debugTemplate.value,
      parameters: debugForm.parameters,
      authCredentialId: debugForm.authCredentialId
    })

    if (response.code === 0) {
      debugResult.value = response.data
      ElMessage.success('调试执行成功')
    } else {
      debugResult.value = { error: response.message }
      ElMessage.error(response.message || '调试失败')
    }
  } catch (error: any) {
    console.error('调试失败:', error)
    debugResult.value = { error: error.message || '调试失败' }
    ElMessage.error(`调试失败: ${error.message || '网络错误'}`)
  } finally {
    debugLoading.value = false
  }
}

// 新增的方法
const createRssFromTemplate = (template: RssTemplate) => {
  selectedTemplate.value = template
  createRssForm.title = ''
  createRssForm.description = ''
  createRssForm.authCredentialId = undefined
  createRssForm.parameters = {}
  
  // 初始化参数
  template.parameters.forEach(param => {
    createRssForm.parameters[param.name] = param.defaultValue || ''
  })
  
  showCreateRssDialog.value = true
}

const doCreateRssFromTemplate = async () => {
  try {
    await createRssFormRef.value.validate()
    createRssLoading.value = true
    
    const response = await request.post('/api/rss-template/generate', {
      templateId: selectedTemplate.value?.id,
      parameters: createRssForm.parameters
    })
    
    if (response.code === 0) {
      const config = response.data as { name?: string; url?: string; script?: string }
      
      const saveRes = await createWebsiteRss({
        title: createRssForm.title,
        url: config.url || '',
        favicon: '',
        description: createRssForm.description,
        fetchInterval: 60,
        maxFeeds: 50,
        useProxy: false,
        fetchMode: 'script',
        selector: {
          selectorType: 'css',
          container: '',
          title: '',
          content: '',
        },
        auth: {
          enabled: false,
          authType: 'none',
        },
        script: {
          enabled: true,
          script: config.script || '',
          timeout: 30000
        },
        authCredentialId: createRssForm.authCredentialId,
        templateId: selectedTemplate.value?.id
      })
      
      if (saveRes.code === 0) {
        ElMessage.success('RSS配置创建成功')
        showCreateRssDialog.value = false
      } else {
        ElMessage.error(saveRes.message || '创建RSS配置失败')
      }
    } else {
      ElMessage.error(response.message || '生成RSS配置失败')
    }
  } catch (error: any) {
    console.error('创建RSS配置失败:', error)
    ElMessage.error(`创建RSS配置失败: ${error.message || '网络错误'}`)
  } finally {
    createRssLoading.value = false
  }
}

const viewTemplateConfigs = async (template: RssTemplate) => {
  selectedTemplate.value = template
  configsLoading.value = true
  showConfigsDialog.value = true
  
  try {
    const response = await request.get<any[]>(`/api/rss-template/${template.id}/configs`)
    if (response.code === 0) {
      templateConfigs.value = response.data || []
    } else {
      ElMessage.error(response.message || '获取模板配置失败')
    }
  } catch (error: any) {
    console.error('获取模板配置失败:', error)
    ElMessage.error(`获取模板配置失败: ${error.message || '网络错误'}`)
  } finally {
    configsLoading.value = false
  }
}

const batchUpdateConfigs = async (template: RssTemplate) => {
   selectedTemplate.value = template
   configsLoading.value = true
   showBatchUpdateDialog.value = true
   
   try {
     const response = await request.get<any[]>(`/api/rss-template/${template.id}/configs`)
     if (response.code === 0) {
       templateConfigs.value = response.data || []
     } else {
       ElMessage.error(response.message || '获取模板配置失败')
     }
   } catch (error: any) {
     console.error('获取模板配置失败:', error)
     ElMessage.error(`获取模板配置失败: ${error.message || '网络错误'}`)
   } finally {
     configsLoading.value = false
   }
 }

const doBatchUpdateConfigs = async () => {
  try {
    batchUpdateLoading.value = true
    
    const response = await request.post<{updated: number}>(`/api/rss-template/${selectedTemplate.value?.id}/batch-update`, {
      templateId: selectedTemplate.value?.id,
      updateAll: true
    })
    
    if (response.code === 0) {
      const updatedCount = response.data?.updated || 0
      ElMessage.success(`成功更新 ${updatedCount} 个配置`)
      showBatchUpdateDialog.value = false
    } else {
      ElMessage.error(response.message || '批量更新失败')
    }
  } catch (error: any) {
    console.error('批量更新失败:', error)
    ElMessage.error(`批量更新失败: ${error.message || '网络错误'}`)
  } finally {
    batchUpdateLoading.value = false
  }
}

const viewRssConfig = (configId: number) => {
  // 跳转到RSS配置详情页
  window.open(`/website-rss/${configId}`, '_blank')
}

// 导出模板
const exportTemplates = () => {
  try {
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      templates: templates.value.map(template => ({
        name: template.name,
        description: template.description,
        platform: template.platform,
        icon: template.icon,
        urlTemplate: template.urlTemplate,
        scriptTemplate: template.scriptTemplate,
        parameters: template.parameters
      }))
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `feedhub-templates-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success(`已导出 ${templates.value.length} 个模板`)
  } catch (error: any) {
    console.error('导出模板失败:', error)
    ElMessage.error(`导出模板失败: ${error.message || '操作失败'}`)
  }
}

// 处理文件上传
const handleFileChange = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      importJsonText.value = e.target?.result as string
      parseImportData(importJsonText.value)
    } catch (error: any) {
      console.error('文件读取失败:', error)
      ElMessage.error(`文件读取失败: ${error.message || '文件格式错误'}`)
    }
  }
  reader.readAsText(file.raw)
}

// 解析导入数据
const parseImportData = (jsonText: string) => {
  try {
    if (!jsonText.trim()) {
      importPreview.value = []
      return
    }
    
    const data = JSON.parse(jsonText)
    let templatesToImport: any[] = []
    
    // 支持多种格式
    if (Array.isArray(data)) {
      templatesToImport = data
    } else if (data.templates && Array.isArray(data.templates)) {
      templatesToImport = data.templates
    } else if (data.name) {
      // 单个模板
      templatesToImport = [data]
    } else {
      throw new Error('不支持的JSON格式')
    }
    
    // 验证模板格式并检查是否已存在
    importPreview.value = templatesToImport.map(template => {
      // 基本验证
      if (!template.name || !template.platform) {
        throw new Error(`模板缺少必要字段: ${template.name || '未知模板'}`)
      }
      
      // 检查是否已存在
      const exists = templates.value.some(t => 
        t.name === template.name && t.platform === template.platform
      )
      
      return {
        ...template,
        exists
      }
    })
    
    ElMessage.success(`解析成功，找到 ${importPreview.value.length} 个模板`)
  } catch (error: any) {
    ElMessage.error(`解析失败: ${error.message}`)
    importPreview.value = []
  }
}

// 监听JSON文本变化
const watchImportText = () => {
  parseImportData(importJsonText.value)
}

// 执行导入
const doImportTemplates = async () => {
  try {
    importLoading.value = true
    let successCount = 0
    let skipCount = 0
    
    for (const template of importPreview.value) {
      // 如果已存在且不覆盖，跳过
      if (template.exists && !importOptions.overwrite) {
        skipCount++
        continue
      }
      
      // 准备模板数据
      const templateData = {
        name: template.name,
        description: template.description || '',
        platform: template.platform,
        icon: template.icon || 'Document',
        urlTemplate: template.urlTemplate || '',
        scriptTemplate: template.scriptTemplate || '',
        parameters: template.parameters || []
      }
      
      try {
        if (template.exists && importOptions.overwrite) {
          // 查找现有模板并更新
          const existingTemplate = templates.value.find(t => 
            t.name === template.name && t.platform === template.platform
          )
          if (existingTemplate) {
            await request.put(`/api/rss-template/${existingTemplate.id}`, templateData)
          }
        } else {
          // 创建新模板
          await request.post('/api/rss-template', templateData)
        }
        successCount++
      } catch (error: any) {
        console.error(`导入模板失败: ${template.name}`, error)
      }
    }
    
    if (successCount > 0) {
      ElMessage.success(`成功导入 ${successCount} 个模板${skipCount > 0 ? `，跳过 ${skipCount} 个` : ''}`)
      await fetchTemplates()
      closeImportDialog()
    } else {
      ElMessage.warning('没有模板被导入')
    }
  } catch (error: any) {
    console.error('导入模板失败:', error)
    ElMessage.error(`导入模板失败: ${error.message || '网络错误'}`)
  } finally {
    importLoading.value = false
  }
}

// 关闭导入对话框
const closeImportDialog = () => {
  showImportDialog.value = false
  importMethod.value = 'file'
  importJsonText.value = ''
  importPreview.value = []
  importOptions.overwrite = false
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

onMounted(() => {
  fetchTemplates()
  fetchAuthCredentials()
  // 如果没有模板，自动初始化默认模板
  if (templates.value.length === 0) {
    initDefaultTemplates()
  }
})
</script>

<style scoped>
.template-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  margin: 0;
  color: #333;
}

.template-list {
  margin-top: 20px;
}

.template-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.template-icon {
  margin-right: 15px;
  color: #409eff;
}

/* 为不同平台图标添加特定颜色 */
.icon-bilibili {
  color: #fb7299;
}

.icon-youtube {
  color: #ff0000;
}

.icon-twitter {
  color: #1da1f2;
}

.icon-weibo {
  color: #e6162d;
}

.icon-zhihu {
  color: #0084ff;
}

.icon-document {
  color: #409eff;
}

.template-info h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.template-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.template-actions {
  display: flex;
}

.parameters-section {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 15px;
}

.parameters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.parameters-header h4 {
  margin: 0;
  color: #333;
}

.parameter-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fafafa;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.icon-selector-container {
  display: flex;
  gap: 10px;
  align-items: center;
}

.selected-icon-preview {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.selected-icon-preview .el-icon,
.selected-icon-preview simple-icon,
.selected-icon-preview iconify-icon {
  font-size: 24px;
}

.script-input-container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.script-help-container {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
}

.import-section {
  padding: 10px 0;
}

.import-preview {
  margin-top: 20px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background-color: #fafafa;
}

.import-preview h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.import-options {
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.el-upload__text em {
  color: #409eff;
}
</style>