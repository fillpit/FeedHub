<template>
  <div class="package-management">
    <div class="header">
      <h2>npm 包管理</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索包名..."
          prefix-icon="el-icon-search"
          style="width: 300px; margin-right: 16px;"
          clearable
        />
        <el-button type="success" @click="exportPackages">
          <el-icon><Download /></el-icon>
          导出配置
        </el-button>
        <el-button type="warning" @click="triggerImport">
          <el-icon><Upload /></el-icon>
          导入配置
        </el-button>
        <el-button type="primary" @click="showInstallDialog = true">
          <el-icon><Plus /></el-icon>
          安装新包
        </el-button>
        <el-button @click="refreshPackages">
          <el-icon><Refresh /></el-icon>
          刷新
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

    <!-- 统计信息 -->
    <div class="stats-cards">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ stats.totalPackages }}</div>
          <div class="stat-label">总包数</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ stats.installedPackages }}</div>
          <div class="stat-label">已安装</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ formatSize(stats.totalSize) }}</div>
          <div class="stat-label">总大小</div>
        </div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-number">{{ stats.totalUsage }}</div>
          <div class="stat-label">总使用次数</div>
        </div>
      </el-card>
    </div>

    <!-- 包列表 -->
    <el-card class="package-list-card">
      <template #header>
        <div class="card-header">
          <span>包列表</span>
          <div class="filter-tabs">
            <el-radio-group v-model="filterType" @change="handleFilterChange">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="installed">已安装</el-radio-button>
              <el-radio-button label="whitelist">白名单</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredPackages"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="包名" min-width="200">
          <template #default="{ row }">
            <div class="package-name">
              <span class="name">{{ row.name }}</span>
              <el-tag v-if="row.isWhitelisted" type="success" size="small">白名单</el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="version" label="版本" width="120" />
        
        <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'installed' ? 'success' : 'info'" size="small">
              {{ row.status === 'installed' ? '已安装' : '未安装' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="size" label="大小" width="100">
          <template #default="{ row }">
            {{ row.size ? formatSize(row.size) : '-' }}
          </template>
        </el-table-column>
        
        <el-table-column prop="usageCount" label="使用次数" width="100">
          <template #default="{ row }">
            {{ row.usageCount || 0 }}
          </template>
        </el-table-column>
        
        <el-table-column prop="installedAt" label="安装时间" width="160">
          <template #default="{ row }">
            {{ row.installedAt ? formatDate(row.installedAt) : '-' }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'installed'"
              type="primary"
              size="small"
              @click="installPackage(row.name)"
              :loading="installing === row.name"
            >
              安装
            </el-button>
            <el-button
              v-else
              type="danger"
              size="small"
              @click="confirmUninstall(row)"
              :loading="uninstalling === row.name"
            >
              卸载
            </el-button>
            <el-button
              type="info"
              size="small"
              @click="showPackageDetails(row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 安装包对话框 -->
    <el-dialog
      v-model="showInstallDialog"
      title="安装新包"
      width="500px"
    >
      <el-form :model="installForm" :rules="installRules" ref="installFormRef">
        <el-form-item label="包名" prop="packageName">
          <el-input
            v-model="installForm.packageName"
            placeholder="请输入npm包名，如: lodash"
          />
        </el-form-item>
        <el-form-item label="版本" prop="version">
          <el-input
            v-model="installForm.version"
            placeholder="留空安装最新版本"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showInstallDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleInstall"
        >
          安装
        </el-button>
      </template>
    </el-dialog>

    <!-- 包详情对话框 -->
    <el-dialog
      v-model="showDetailsDialog"
      title="包详情"
      width="800px"
    >
      <div v-if="selectedPackage" class="package-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="包名">{{ selectedPackage.name }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selectedPackage.version }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ selectedPackage.description }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedPackage.status === 'installing' ? 'success' : 'info'">
              {{ selectedPackage.status === 'installing' ? '安装中' : '已安装' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="白名单状态">
            <el-tag :type="selectedPackage.isWhitelisted ? 'success' : 'warning'">
              {{ selectedPackage.isWhitelisted ? '已加入' : '未加入' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="大小">{{ selectedPackage.size ? formatSize(selectedPackage.size) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="使用次数">{{ selectedPackage.usageCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="安装时间">{{ selectedPackage.installedAt ? formatDate(selectedPackage.installedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后使用">{{ selectedPackage.lastUsedAt ? formatDate(selectedPackage.lastUsedAt) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="安装路径" :span="2">{{ selectedPackage.installPath || '-' }}</el-descriptions-item>
          <el-descriptions-item label="依赖" :span="2">
            <div v-if="selectedPackage.dependencies && selectedPackage.dependencies.length > 0">
              <el-tag v-for="dep in selectedPackage.dependencies" :key="dep" size="small" style="margin-right: 8px; margin-bottom: 4px;">
                {{ dep }}
              </el-tag>
            </div>
            <span v-else>无依赖</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Download, Upload } from '@element-plus/icons-vue'
import { npmPackageApi, type NpmPackage, type PackageStats } from '@/api/npmPackage'

// 接口定义已从 @/api/npmPackage 导入

const loading = ref(false)
const packages = ref<NpmPackage[]>([])
const searchKeyword = ref('')
const filterType = ref('all')
const showInstallDialog = ref(false)
const showDetailsDialog = ref(false)
const selectedPackage = ref<NpmPackage | null>(null)
const installing = ref('')
const uninstalling = ref('')
const fileInputRef = ref<HTMLInputElement>()
const stats = ref<PackageStats>({
  totalPackages: 0,
  installedPackages: 0,
  totalSize: 0,
  totalUsage: 0
})

const installForm = reactive({
  packageName: '',
  version: ''
})

const installFormRef = ref()

const installRules = {
  packageName: [
    { required: true, message: '请输入包名', trigger: 'blur' },
    { pattern: /^(@[a-zA-Z0-9-~][a-zA-Z0-9-._~]*\/)?[a-zA-Z0-9-~][a-zA-Z0-9-._~]*$/, message: '包名格式不正确', trigger: 'blur' }
  ]
}

const filteredPackages = computed(() => {
  let result = packages.value
  
  // 根据筛选类型过滤
  if (filterType.value === 'installed') {
    result = result.filter(pkg => pkg.status === 'installed')
  } else if (filterType.value === 'whitelist') {
    result = result.filter(pkg => pkg.isWhitelisted)
  }
  
  // 根据搜索关键词过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(pkg => 
      pkg.name.toLowerCase().includes(keyword) ||
      (pkg.description && pkg.description.toLowerCase().includes(keyword))
    )
  }
  
  return result
})

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const loadPackages = async () => {
  loading.value = true
  try {
    const response = await npmPackageApi.getAllPackages()
    packages.value = response.data || []
  } catch (error) {
    ElMessage.error('加载包列表失败')
    console.error('加载包列表失败:', error)
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await npmPackageApi.getStats()
    if (response.data) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

const refreshPackages = async () => {
  await Promise.all([loadPackages(), loadStats()])
  ElMessage.success('刷新成功')
}

const handleFilterChange = () => {
  // 筛选类型改变时的处理
}

const installPackage = async (packageName: string) => {
  installing.value = packageName
  try {
    await npmPackageApi.installPackage({ packageName })
    await refreshPackages()
  } catch (error: any) {
    console.error('安装包失败:', error)
  } finally {
    installing.value = ''
  }
}

const handleInstall = async () => {
  if (!installFormRef.value) {
    ElMessage.error('表单引用不存在')
    return
  }
  
  if (!installForm.packageName || installForm.packageName.trim() === '') {
    ElMessage.error('包名不能为空')
    return
  }
  
  try {
    await installFormRef.value.validate()
  } catch (error) {
    ElMessage.error('表单验证失败，请检查输入')
    return
  }
  
  const packageName = installForm.version 
    ? `${installForm.packageName}@${installForm.version}`
    : installForm.packageName
    
  await installPackage(packageName)
  
  if (!installing.value) {
    showInstallDialog.value = false
    installForm.packageName = ''
    installForm.version = ''
  }
}

const confirmUninstall = async (pkg: NpmPackage) => {
  try {
    await ElMessageBox.confirm(
      `确定要卸载包 "${pkg.name}" 吗？此操作不可恢复。`,
      '确认卸载',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await uninstallPackage(pkg.name)
  } catch {
    // 用户取消
  }
}

const uninstallPackage = async (packageName: string) => {
  uninstalling.value = packageName
  try {
    await npmPackageApi.uninstallPackage(packageName)
    await refreshPackages()
  } catch (error: any) {
    console.error('卸载包失败:', error)
  } finally {
    uninstalling.value = ''
  }
}

const showPackageDetails = (pkg: NpmPackage) => {
  selectedPackage.value = pkg
  showDetailsDialog.value = true
}

// 导出包配置
const exportPackages = () => {
  try {
    const exportData = {
      exportTime: new Date().toISOString(),
      packages: packages.value.map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        isWhitelisted: pkg.isWhitelisted,
        status: pkg.status
      }))
    }
    
    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `npm-packages-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('包配置导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
    console.error('导出失败:', error)
  }
}

// 触发文件选择
const triggerImport = () => {
  fileInputRef.value?.click()
}

// 处理文件导入
const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  try {
    const text = await file.text()
    const importData = JSON.parse(text)
    
    if (!importData.packages || !Array.isArray(importData.packages)) {
      ElMessage.error('导入文件格式不正确')
      return
    }
    
    await ElMessageBox.confirm(
      `确定要导入 ${importData.packages.length} 个包的配置吗？这将会安装文件中标记为已安装的包。`,
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 批量安装包
    let successCount = 0
    let failCount = 0
    
    for (const pkg of importData.packages) {
      if (pkg.status === 'installed') {
        try {
          await npmPackageApi.installPackage({ 
            packageName: pkg.version ? `${pkg.name}@${pkg.version}` : pkg.name 
          })
          successCount++
        } catch (error) {
          failCount++
          console.error(`安装包 ${pkg.name} 失败:`, error)
        }
      }
    }
    
    await refreshPackages()
    
    if (failCount === 0) {
      ElMessage.success(`导入成功，共安装 ${successCount} 个包`)
    } else {
      ElMessage.warning(`导入完成，成功安装 ${successCount} 个包，失败 ${failCount} 个包`)
    }
    
  } catch (error) {
    ElMessage.error('导入文件解析失败，请检查文件格式')
    console.error('导入失败:', error)
  } finally {
    // 清空文件输入
    target.value = ''
  }
}

onMounted(() => {
  refreshPackages()
})
</script>

<style scoped>
.package-management {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 10px;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.package-list-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.package-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.package-name .name {
  font-weight: 500;
}

.package-details {
  margin-top: 16px;
}

.filter-tabs {
  margin-left: 16px;
}
</style>