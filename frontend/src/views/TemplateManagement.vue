<template>
  <div class="template-management">
    <div class="header">
      <h1>RSS模板管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        创建模板
      </el-button>
    </div>

    <!-- 模板列表 -->
    <div class="template-list">
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
              <el-button type="primary" size="small" @click="useTemplate(template)">
                使用模板
              </el-button>
              <el-button type="info" size="small" @click="editTemplate(template)">
                编辑
              </el-button>
              <el-button type="warning" size="small" @click="openDebugDialog(template)">
                调试
              </el-button>
              <el-button type="danger" size="small" @click="deleteTemplate(template.id)">
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
          <el-button type="primary" @click="saveTemplate">
            {{ editingTemplate ? '更新' : '创建' }}
          </el-button>
          <el-button type="warning" @click="openDebugDialog(editingTemplate ? editingTemplate : templateForm)">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { authCredentialApi } from '@/api/authCredential'
import type { AuthCredential } from '@/types'
import DebugResultDialog from '@/components/DebugResultDialog.vue'
import { createWebsiteRss } from '@/api/websiteRss'
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
const showCreateDialog = ref(false)
const showUseDialog = ref(false)
const showIconSelector = ref(false)
const editingTemplate = ref<RssTemplate | null>(null)
const selectedTemplate = ref<RssTemplate | null>(null)

const authCredentials = ref<AuthCredential[]>([])

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
  try {
    const response = await request.get<RssTemplate[]>('/api/rss-template')
    if (response.code === 0) {
      templates.value = response.data
    }
  } catch (error) {
    ElMessage.error('获取模板列表失败')
  }
}

// 获取授权信息列表
const fetchAuthCredentials = async () => {
  try {
    const res = await authCredentialApi.getAll()
    authCredentials.value = res.data || []
  } catch {}
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

// 使用模板
const useTemplate = (template: RssTemplate) => {
  selectedTemplate.value = template
  useForm.templateId = template.id
  useForm.parameters = {}
  
  // 初始化参数
  template.parameters.forEach(param => {
    useForm.parameters[param.name] = param.defaultValue || ''
  })
  
  showUseDialog.value = true
}

// 保存模板
const saveTemplate = async () => {
  try {
    await templateFormRef.value.validate()
    
    const url = editingTemplate.value 
      ? `/api/rss-template/${editingTemplate.value.id}`
      : '/api/rss-template'
    
    if (editingTemplate.value) {
      const response = await request.put<RssTemplate>(url, templateForm)
      if (response.code === 0) {
        ElMessage.success('更新模板成功')
        closeDialog()
        fetchTemplates()
      }
    } else {
      const response = await request.post<RssTemplate>(url, templateForm)
      if (response.code === 0) {
        ElMessage.success('创建模板成功')
        closeDialog()
        fetchTemplates()
      }
    }
  } catch (error) {
    ElMessage.error('保存模板失败')
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
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除模板失败')
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
    }
  } catch (error) {
    ElMessage.error('生成RSS配置失败')
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
  try {
    const response = await request.post('/api/rss-template/init', {})
    if (response.code === 0) {
      ElMessage.success('初始化默认模板成功')
      fetchTemplates()
    }
  } catch (error) {
    ElMessage.error('初始化默认模板失败')
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
    const response = await request.post('/api/rss-template/debug', {
      template: debugTemplate.value,
      parameters: debugForm.parameters,
      authCredentialId: debugForm.authCredentialId
    })
    console.log('response.data', response.data)
    if (response.code === 0) {
      debugResult.value = response.data
    } else {
      debugResult.value = { error: response.message }
    }
  } catch (error: any) {
    debugResult.value = { error: error.message || '调试失败' }
  } finally {
    debugLoading.value = false
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
  gap: 10px;
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
</style>