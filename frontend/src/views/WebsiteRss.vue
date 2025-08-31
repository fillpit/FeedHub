<template>
  <div class="website-rss-container">
    <!-- Main content -->
    <div class="main-content">
      <div class="header">
        <h1>网页监控</h1>
        <div class="header-actions">
          <el-button type="info" @click="refreshAllData" :loading="refreshingData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
          <el-button type="primary" @click="addConfig">添加配置</el-button>
          <el-button 
            type="success" 
            @click="exportSelectedConfigs"
            :disabled="selectedConfigs.length === 0"
          >
            <el-icon><Download /></el-icon>
            导出选中配置 ({{ selectedConfigs.length }})
          </el-button>
          <el-button type="warning" @click="showImportDialog = true">
            <el-icon><Upload /></el-icon>
            导入配置
          </el-button>
        </div>
      </div>
      <el-table 
        :data="configs" 
        border
        v-loading="configsLoading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="图标" width="60" align="center">
          <template #default="{ row }">
            <div class="feed-icon-wrapper">
              <img v-if="row.favicon" :src="row.favicon" class="feed-icon" alt="favicon" />
              <div v-else class="feed-icon-placeholder">
                <el-icon><Document /></el-icon>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="网站名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="url" label="网站URL" min-width="200" show-overflow-tooltip />
        <el-table-column label="订阅链接" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.key" class="subscription-link">
              <el-dropdown placement="top-end" trigger="hover" @command="(command: string) => copyRssLink(row.key, command as 'rss' | 'json')">
                <span class="subscription-link-text">
                  /website/sub/{{ row.key }}
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
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
            <span v-else class="text-gray-400">未生成</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="feed-actions">
              <el-tooltip content="刷新" placement="top">
                <el-button type="primary" size="small" circle @click="refreshConfig(row.id)">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button type="success" size="small" circle @click="editConfig(row)">
                  <el-icon><Edit /></el-icon>
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button type="danger" size="small" circle @click="deleteConfig(row.id)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Add/Edit Drawer -->
    <el-drawer
      v-model="dialogVisible"
      :title="dialogTitle"
      direction="rtl"
      size="50%"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="right"
      >
        <!-- Form items from the original component, adapted for the new data model -->
        <el-form-item label="网站名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入网站名称" />
        </el-form-item>
        <el-form-item label="网站URL" prop="url">
          <el-input v-model="form.url" placeholder="请输入网站URL" />
        </el-form-item>
        <el-form-item label="网站图标" prop="favicon">
          <el-input v-model="form.favicon" placeholder="请输入图标URL（可选）" />
        </el-form-item>
        <el-form-item label="刷新间隔(分钟)" prop="fetchInterval">
          <el-input-number v-model="form.fetchInterval" :min="1" />
        </el-form-item>
        <el-form-item label="启用代理" prop="useProxy">
          <el-switch v-model="form.useProxy" />
        </el-form-item>

        <el-divider>抓取设置</el-divider>

        <el-form-item label="渲染模式" prop="renderMode">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-radio-group v-model="form.renderMode">
              <el-radio-button label="static">静态页面</el-radio-button>
              <el-radio-button label="rendered">浏览器渲染</el-radio-button>
            </el-radio-group>
            <el-tooltip content="静态页面：直接请求HTML内容，速度快但无法获取JavaScript动态生成的内容；浏览器渲染：使用无头浏览器渲染页面，可获取JavaScript动态内容但速度较慢" placement="top">
              <el-icon style="color: #909399; cursor: help"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </el-form-item>
        <el-form-item label="选择器类型" prop="selector.selectorType">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-radio-group v-model="form.selector.selectorType">
              <el-radio-button label="css">CSS</el-radio-button>
              <el-radio-button label="xpath">XPath</el-radio-button>
            </el-radio-group>
            <el-button type="info" size="small" @click="openSelectorHelp">
              <el-icon><QuestionFilled /></el-icon>
              选择器说明
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="容器选择器" prop="selector.container">
          <el-input v-model="form.selector.container" placeholder="请输入容器选择器" />
        </el-form-item>
        <el-form-item label="标题选择器" prop="selector.title.selector">
          <div class="selector-field-group">
            <el-input
              v-model="form.selector.title.selector"
              placeholder="请输入标题选择器"
              style="flex: 1; margin-right: 8px"
            />
            <el-select
              v-model="form.selector.title.extractType"
              style="width: 120px; margin-right: 8px"
            >
              <el-option label="文本" value="text" />
              <el-option label="属性" value="attr" />
              <el-option label="HTML内容" value="html" />
            </el-select>
            <el-input
              v-if="form.selector.title.extractType === 'attr'"
              v-model="form.selector.title.attrName"
              placeholder="属性名"
              style="width: 120px; margin-right: 8px"
            />
            <el-popover placement="top" width="400" trigger="click">
              <template #reference>
                <el-button 
                  size="small" 
                  :type="form.selector.title.regexPattern ? 'success' : 'info'" 
                  :plain="!form.selector.title.regexPattern"
                >
                  <el-icon><Setting /></el-icon>
                  正则处理
                </el-button>
              </template>
              <div class="regex-config">
                <el-form-item label="正则表达式" size="small">
                  <el-input
                    v-model="form.selector.title.regexPattern"
                    placeholder="如: ^(.+?)\\s*-\\s*作者"
                    clearable
                  />
                </el-form-item>
                <el-form-item label="标志" size="small">
                  <el-input
                    v-model="form.selector.title.regexFlags"
                    placeholder="如: gi (可选)"
                    style="width: 80px; margin-right: 8px"
                    clearable
                  />
                  <el-input-number
                    v-model="form.selector.title.regexGroup"
                    placeholder="捕获组"
                    :min="0"
                    :max="9"
                    style="width: 100px"
                    controls-position="right"
                  />
                </el-form-item>
                <el-text type="info" size="small">
                  正则表达式用于从抓取结果中进一步提取所需内容，捕获组0表示整个匹配
                </el-text>
              </div>
            </el-popover>
          </div>
        </el-form-item>
        <el-form-item label="链接选择器" prop="selector.link.selector">
          <div class="selector-field-group">
            <el-input
              v-model="form.selector.link!.selector"
              placeholder="请输入链接选择器"
              style="flex: 1; margin-right: 8px"
            />
            <el-select
              v-model="form.selector.link!.extractType"
              style="width: 120px; margin-right: 8px"
            >
              <el-option label="文本" value="text" />
              <el-option label="属性" value="attr" />
              <el-option label="HTML内容" value="html" />
            </el-select>
            <el-input
              v-if="form.selector.link!.extractType === 'attr'"
              v-model="form.selector.link!.attrName"
              placeholder="属性名"
              style="width: 120px; margin-right: 8px"
            />
            <el-popover placement="top" width="400" trigger="click">
              <template #reference>
                <el-button 
                  size="small" 
                  :type="form.selector.link!.regexPattern ? 'success' : 'info'" 
                  :plain="!form.selector.link!.regexPattern"
                >
                  <el-icon><Setting /></el-icon>
                  正则处理
                </el-button>
              </template>
              <div class="regex-config">
                <el-form-item label="正则表达式" size="small">
                   <el-input
                     v-model="form.selector.link!.regexPattern"
                     placeholder="如: href=&quot;([^&quot;]+)&quot;"
                     clearable
                   />
                </el-form-item>
                <el-form-item label="标志" size="small">
                  <el-input
                    v-model="form.selector.link!.regexFlags"
                    placeholder="如: gi (可选)"
                    style="width: 80px; margin-right: 8px"
                    clearable
                  />
                  <el-input-number
                    v-model="form.selector.link!.regexGroup"
                    placeholder="捕获组"
                    :min="0"
                    :max="9"
                    style="width: 100px"
                    controls-position="right"
                  />
                </el-form-item>
                <el-text type="info" size="small">
                  正则表达式用于从抓取结果中进一步提取所需内容，捕获组0表示整个匹配
                </el-text>
              </div>
            </el-popover>
          </div>
        </el-form-item>
        <el-form-item label="内容选择器" prop="selector.content.selector">
          <div class="selector-field-group">
            <el-input
              v-model="form.selector.content.selector"
              placeholder="请输入内容选择器"
              style="flex: 1; margin-right: 8px"
            />
            <el-select
              v-model="form.selector.content.extractType"
              style="width: 120px; margin-right: 8px"
            >
              <el-option label="文本" value="text" />
              <el-option label="属性" value="attr" />
              <el-option label="HTML内容" value="html" />
            </el-select>
            <el-input
              v-if="form.selector.content.extractType === 'attr'"
              v-model="form.selector.content.attrName"
              placeholder="属性名"
              style="width: 120px; margin-right: 8px"
            />
            <el-popover placement="top" width="400" trigger="click">
              <template #reference>
                <el-button 
                  size="small" 
                  :type="form.selector.content.regexPattern ? 'success' : 'info'" 
                  :plain="!form.selector.content.regexPattern"
                >
                  <el-icon><Setting /></el-icon>
                  正则处理
                </el-button>
              </template>
              <div class="regex-config">
                <el-form-item label="正则表达式" size="small">
                  <el-input
                    v-model="form.selector.content.regexPattern"
                    placeholder="如: <p>(.+?)</p>"
                    clearable
                  />
                </el-form-item>
                <el-form-item label="标志" size="small">
                  <el-input
                    v-model="form.selector.content.regexFlags"
                    placeholder="如: gi (可选)"
                    style="width: 80px; margin-right: 8px"
                    clearable
                  />
                  <el-input-number
                    v-model="form.selector.content.regexGroup"
                    placeholder="捕获组"
                    :min="0"
                    :max="9"
                    style="width: 100px"
                    controls-position="right"
                  />
                </el-form-item>
                <el-text type="info" size="small">
                  正则表达式用于从抓取结果中进一步提取所需内容，捕获组0表示整个匹配
                </el-text>
              </div>
            </el-popover>
          </div>
        </el-form-item>
        <el-form-item label="作者选择器" prop="selector.author.selector">
          <div class="selector-field-group">
            <el-input
              v-model="form.selector.author!.selector"
              placeholder="请输入作者选择器"
              style="flex: 1; margin-right: 8px"
            />
            <el-select
              v-model="form.selector.author!.extractType"
              style="width: 120px; margin-right: 8px"
            >
              <el-option label="文本" value="text" />
              <el-option label="属性" value="attr" />
              <el-option label="HTML内容" value="html" />
            </el-select>
            <el-input
              v-if="form.selector.author!.extractType === 'attr'"
              v-model="form.selector.author!.attrName"
              placeholder="属性名"
              style="width: 120px; margin-right: 8px"
            />
            <el-popover placement="top" width="400" trigger="click">
              <template #reference>
                <el-button 
                  size="small" 
                  :type="form.selector.author!.regexPattern ? 'success' : 'info'" 
                  :plain="!form.selector.author!.regexPattern"
                >
                  <el-icon><Setting /></el-icon>
                  正则处理
                </el-button>
              </template>
              <div class="regex-config">
                <el-form-item label="正则表达式" size="small">
                  <el-input
                    v-model="form.selector.author!.regexPattern"
                    placeholder="如: 作者：(.+?)\s*\|"
                    clearable
                  />
                </el-form-item>
                <el-form-item label="标志" size="small">
                  <el-input
                    v-model="form.selector.author!.regexFlags"
                    placeholder="如: gi (可选)"
                    style="width: 80px; margin-right: 8px"
                    clearable
                  />
                  <el-input-number
                    v-model="form.selector.author!.regexGroup"
                    placeholder="捕获组"
                    :min="0"
                    :max="9"
                    style="width: 100px"
                    controls-position="right"
                  />
                </el-form-item>
                <el-text type="info" size="small">
                  正则表达式用于从抓取结果中进一步提取所需内容，捕获组0表示整个匹配
                </el-text>
              </div>
            </el-popover>
          </div>
        </el-form-item>
        <el-form-item label="发布日期选择器" prop="selector.date.selector">
          <div class="selector-field-group">
            <el-input
              v-model="form.selector.date!.selector"
              placeholder="请输入发布日期选择器"
              style="flex: 1; margin-right: 8px"
            />
            <el-select
              v-model="form.selector.date!.extractType"
              style="width: 120px; margin-right: 8px"
            >
              <el-option label="文本" value="text" />
              <el-option label="属性" value="attr" />
              <el-option label="HTML内容" value="html" />
            </el-select>
            <el-input
              v-if="form.selector.date!.extractType === 'attr'"
              v-model="form.selector.date!.attrName"
              placeholder="属性名"
              style="width: 120px; margin-right: 8px"
            />
            <el-popover placement="top" width="400" trigger="click">
              <template #reference>
                <el-button 
                  size="small" 
                  :type="form.selector.date!.regexPattern ? 'success' : 'info'" 
                  :plain="!form.selector.date!.regexPattern"
                >
                  <el-icon><Setting /></el-icon>
                  正则处理
                </el-button>
              </template>
              <div class="regex-config">
                <el-form-item label="正则表达式" size="small">
                  <el-input
                    v-model="form.selector.date!.regexPattern"
                    placeholder="如: 时间：(\d{4}-\d{2}-\d{2})"
                    clearable
                  />
                </el-form-item>
                <el-form-item label="标志" size="small">
                  <el-input
                    v-model="form.selector.date!.regexFlags"
                    placeholder="如: gi (可选)"
                    style="width: 80px; margin-right: 8px"
                    clearable
                  />
                  <el-input-number
                    v-model="form.selector.date!.regexGroup"
                    placeholder="捕获组"
                    :min="0"
                    :max="9"
                    style="width: 100px"
                    controls-position="right"
                  />
                </el-form-item>
                <el-text type="info" size="small">
                  正则表达式用于从抓取结果中进一步提取所需内容，捕获组0表示整个匹配
                </el-text>
              </div>
            </el-popover>
          </div>
        </el-form-item>

        <el-divider>授权设置</el-divider>
        <el-form-item label="选择授权">
          <el-select v-model="form.authCredentialId" clearable placeholder="选择已保存的授权信息">
            <el-option label="无授权" :value="undefined" />
            <el-option
              v-for="item in authCredentials"
              :key="item.id"
              :label="item.name + '（' + item.authType + '）'"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-divider>调试工具</el-divider>
        <el-form-item>
          <el-button type="warning" @click="handleDebugSelector" :loading="debugging">
            <el-icon><Tools /></el-icon>
            调试选择器
          </el-button>
          <div class="debug-tip">
            <el-text type="info" size="small"
              >点击调试按钮可以测试当前选择器配置是否能正确抓取内容</el-text
            >
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="submitForm" :loading="submitLoading">确 定</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- Import Config Dialog -->
    <el-dialog v-model="showImportDialog" title="导入配置" width="600px">
      <div class="import-section">
        <el-tabs v-model="importMethod">
          <el-tab-pane label="文件上传" name="file">
            <el-upload
              ref="uploadRef"
              :auto-upload="false"
              :show-file-list="false"
              accept=".json"
              @change="handleFileChange"
            >
              <el-button type="primary">
                <el-icon><UploadFilled /></el-icon>
                选择JSON文件
              </el-button>
              <template #tip>
                <div class="el-upload__tip">只能上传 <em>JSON</em> 文件</div>
              </template>
            </el-upload>
          </el-tab-pane>
          <el-tab-pane label="JSON内容" name="text">
            <el-input
              v-model="importJsonText"
              type="textarea"
              :rows="10"
              placeholder="请粘贴配置JSON内容..."
              @input="watchImportText"
            />
          </el-tab-pane>
        </el-tabs>

        <div v-if="importPreview.length > 0" class="import-preview">
          <h4>导入预览 ({{ importPreview.length }} 个配置)</h4>
          <el-table :data="importPreview" size="small" max-height="200">
            <el-table-column prop="title" label="配置名称" width="200" />
            <el-table-column prop="url" label="URL" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.exists ? 'warning' : 'success'" size="small">
                  {{ row.exists ? "已存在" : "新配置" }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div class="import-options">
            <el-checkbox v-model="importOptions.overwrite"> 覆盖已存在的配置 </el-checkbox>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeImportDialog">取消</el-button>
          <el-button
            type="primary"
            @click="importConfigs"
            :loading="importLoading"
            :disabled="importPreview.length === 0"
          >
            导入配置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Debug Result Dialog -->
    <el-dialog v-model="debugDialogVisible" title="调试结果" width="80%" top="5vh">
      <div v-if="debugResult" class="debug-result-container">
        <!-- 执行概览 -->
        <el-card class="debug-overview" shadow="never">
          <template #header>
            <div class="card-header">
              <span>执行概览</span>
              <el-tag :type="debugResult.success ? 'success' : 'danger'" size="small">
                {{ debugResult.success ? "成功" : "失败" }}
              </el-tag>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="执行时间" :value="debugResult.executionTime" suffix="ms" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="抓取条数" :value="debugResult.items?.length || 0" suffix="条" />
            </el-col>
            <el-col :span="6">
              <el-statistic
                title="目标URL"
                :value="debugResult.url"
                value-style="font-size: 14px; word-break: break-all;"
              />
            </el-col>
            <el-col :span="6">
              <el-statistic title="选择器类型" :value="debugResult.selectorType" />
            </el-col>
          </el-row>
        </el-card>

        <!-- 错误信息 -->
        <el-card v-if="debugResult.error" class="debug-error" shadow="never">
          <template #header>
            <span>错误信息</span>
          </template>
          <el-alert :title="debugResult.error" type="error" show-icon :closable="false" />
        </el-card>

        <!-- 抓取结果预览 -->
        <el-card
          v-if="debugResult.items && debugResult.items.length > 0"
          class="debug-items"
          shadow="never"
        >
          <template #header>
            <span>抓取结果预览 ({{ debugResult.items.length }} 条)</span>
          </template>
          <el-table :data="debugResult.items.slice(0, 5)" size="small" max-height="300">
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="link" label="链接" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <el-link :href="row.link" target="_blank" type="primary" :underline="false">
                  {{ row.link }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip>
              <template #default="{ row }">
                <span>{{
                  row.content
                    ? row.content.length > 100
                      ? row.content.substring(0, 100) + "..."
                      : row.content
                    : "无内容"
                }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="author" label="作者" width="80" show-overflow-tooltip />
            <el-table-column prop="pubDate" label="发布时间" width="150" show-overflow-tooltip />
          </el-table>
          <div v-if="debugResult.items.length > 5" class="more-items-tip">
            <el-text type="info" size="small"
              >还有 {{ debugResult.items.length - 5 }} 条数据未显示</el-text
            >
          </div>
        </el-card>

        <!-- 调试日志 -->
        <el-card
          v-if="debugResult.logs && debugResult.logs.length > 0"
          class="debug-logs"
          shadow="never"
        >
          <template #header>
            <span>调试日志 ({{ debugResult.logs.length }} 条)</span>
          </template>
          <div class="logs-container">
            <div
              v-for="(log, index) in debugResult.logs"
              :key="index"
              class="log-item"
              :class="`log-${log.level}`"
            >
              <el-tag :type="getLogTagType(log.level)" size="small" class="log-level">{{
                log.level.toUpperCase()
              }}</el-tag>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </el-card>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="debugDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Selector Help Dialog -->
    <SelectorHelpDialog 
      v-model="showSelectorHelp" 
      :selector-type="form.selector.selectorType" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { copyToClipboard as copyTextToClipboard } from "@/utils";
import {
  getWebsiteRssList,
  createWebsiteRss,
  updateWebsiteRss,
  deleteWebsiteRss,
  refreshWebsiteRss,
  debugSelector,
  getSubscribeUrl,
} from "@/api/websiteRss";
import type { WebsiteRssConfig } from "@/types/websiteRss";
import {
  Document,
  Refresh,
  Edit,
  Delete,
  Download,
  Upload,
  UploadFilled,
  Tools,
  QuestionFilled,
  ArrowDown,
  DataLine,
} from "@element-plus/icons-vue";
import { authCredentialApi } from "@/api/authCredential";
import type { AuthCredential } from "@/types";
import SelectorHelpDialog from "@/components/SelectorHelpDialog.vue";

const configs = ref<WebsiteRssConfig[]>([]);
const configsLoading = ref(false);
const refreshingData = ref(false);
const dialogVisible = ref(false);
const submitLoading = ref(false);
const dialogTitle = ref("");
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const authCredentials = ref<AuthCredential[]>([]);
const debugging = ref(false);
const debugDialogVisible = ref(false);
const debugResult = ref<any>(null);
const showSelectorHelp = ref(false);

// 选择相关
const selectedConfigs = ref<WebsiteRssConfig[]>([]);

const getInitialFormState = (): WebsiteRssConfig => ({
  id: 0,
  key: "",
  title: "",
  url: "",
  favicon: "",
  description: "",
  feedUrl: "",
  lastFetchedAt: "",
  fetchInterval: 60,
  maxFeeds: 50,
  useProxy: false,
  renderMode: "static",
  selector: {
    selectorType: "css",
    container: "",
    title: {
      selector: "",
      extractType: "text",
      attrName: "",
    },
    link: {
      selector: "",
      extractType: "attr",
      attrName: "href",
    },
    content: {
      selector: "",
      extractType: "text",
      attrName: "",
    },
    author: {
      selector: "",
      extractType: "text",
      attrName: "",
    },
    date: {
      selector: "",
      extractType: "text",
      attrName: "",
    },
    image: {
      selector: "",
      extractType: "attr",
      attrName: "src",
    },
  },
  auth: {
    enabled: false,
    authType: "none",
    cookie: "",
    basicAuth: {
      username: "",
      password: "",
    },
    bearerToken: "",
    customHeaders: {},
  },
  authCredentialId: undefined,
  createdAt: "",
  updatedAt: "",
});

const form = ref<WebsiteRssConfig>(getInitialFormState());

const rules = reactive<FormRules>({
  title: [{ required: true, message: "请输入网站名称", trigger: "blur" }],
  url: [{ required: true, message: "请输入网站URL", trigger: "blur" }],
});

const fetchConfigs = async () => {
  configsLoading.value = true;
  try {
    const res = await getWebsiteRssList();
    configs.value = res.data || [];
  } catch (error: any) {
    console.error("获取配置列表失败:", error);
    ElMessage.error(`获取配置列表失败: ${error.message || "网络错误"}`);
  } finally {
    configsLoading.value = false;
  }
};

const fetchAuthCredentials = async () => {
  try {
    const res = await authCredentialApi.getAll();
    authCredentials.value = res.data || [];
  } catch (error: any) {
    console.error("获取授权凭据失败:", error);
    ElMessage.error(`获取授权凭据失败: ${error.message || "网络错误"}`);
  }
};

onMounted(() => {
  fetchConfigs();
  fetchAuthCredentials();
});

const addConfig = () => {
  isEdit.value = false;
  dialogTitle.value = "添加配置";
  form.value = getInitialFormState();
  dialogVisible.value = true;
};

const editConfig = (config: WebsiteRssConfig) => {
  isEdit.value = true;
  dialogTitle.value = "编辑配置";
  form.value = JSON.parse(JSON.stringify(config));
  if (!form.value.selector) form.value.selector = getInitialFormState().selector;
  if (!form.value.selector.selectorType) form.value.selector.selectorType = "css";
  if (!form.value.selector.container && (form.value.selector as any).item)
    form.value.selector.container = (form.value.selector as any).item;
  if (!form.value.selector.date && (form.value.selector as any).pubDate)
    form.value.selector.date = (form.value.selector as any).pubDate;

  // 兼容旧版本选择器格式：将字符串类型转换为SelectorField对象
  const selector = form.value.selector as any;

  // 转换title字段
  if (typeof selector.title === "string") {
    selector.title = {
      selector: selector.title,
      extractType: "text",
      attrName: "",
    };
  }

  // 转换link字段
  if (typeof selector.link === "string") {
    selector.link = {
      selector: selector.link,
      extractType: "attr",
      attrName: "href",
    };
  }

  // 转换content字段
  if (typeof selector.content === "string") {
    selector.content = {
      selector: selector.content,
      extractType: "text",
      attrName: "",
    };
  }

  // 转换author字段
  if (typeof selector.author === "string") {
    selector.author = {
      selector: selector.author,
      extractType: "text",
      attrName: "",
    };
  }

  // 转换date字段
  if (typeof selector.date === "string") {
    selector.date = {
      selector: selector.date,
      extractType: "text",
      attrName: "",
    };
  }

  // 转换image字段
  if (typeof selector.image === "string") {
    selector.image = {
      selector: selector.image,
      extractType: "attr",
      attrName: "src",
    };
  }

  if (!form.value.authCredentialId) form.value.authCredentialId = undefined;
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true;
      try {
        // 结构转换：前端 selector 转为后端 selector
        let selector = form.value.selector;
        const backendSelector = {
          selectorType: selector.selectorType || "css",
          container: selector.container || "",
          title: selector.title,
          link: selector.link,
          content: selector.content,
          author: selector.author,
          date: selector.date,
          image: selector.image,
        };
        let submitData: any = {
          ...form.value,
          selector: backendSelector,
        };
        // 新增时不传 key 字段
        if (!isEdit.value) {
          delete submitData.key;
        }
        if (isEdit.value) {
          await updateWebsiteRss(form.value.id, submitData);
          ElMessage.success("更新成功");
        } else {
          await createWebsiteRss(submitData);
          ElMessage.success("添加成功");
        }
        dialogVisible.value = false;
        fetchConfigs();
      } catch (error: any) {
        console.error("操作失败:", error);
        ElMessage.error(`操作失败: ${error.message || "网络错误"}`);
      } finally {
        submitLoading.value = false;
      }
    }
  });
};

const deleteConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm("确定删除此配置吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });
    const res = await deleteWebsiteRss(id);
    console.log("删除接口响应:", res);
    ElMessage.success("删除成功");
    fetchConfigs();
  } catch (error) {
    console.error("删除异常捕获:", error);
    if (error !== "cancel") {
      ElMessage.error("删除失败" + error);
    }
  }
};

const refreshConfig = async (id: number) => {
  try {
    await refreshWebsiteRss(id);
    ElMessage.success("刷新任务已启动");
  } catch (error: any) {
    console.error("刷新失败:", error);
    ElMessage.error(`刷新失败: ${error.message || "网络错误"}`);
  }
};

const refreshAllData = async () => {
  refreshingData.value = true;
  try {
    await fetchConfigs();
    await fetchAuthCredentials();
    ElMessage.success("数据刷新成功");
  } catch (error: any) {
    console.error("刷新数据失败:", error);
    ElMessage.error(`刷新数据失败: ${error.message || "网络错误"}`);
  } finally {
    refreshingData.value = false;
  }
};

const copyRssLink = async (text: string, type: "rss" | "json" = "rss") => {
  const subscribeUrl = getSubscribeUrl(text, type);

  try {
    const success = await copyTextToClipboard(subscribeUrl);
    if (success) {
      ElMessage.success(`${type.toUpperCase()}链接已复制到剪贴板`);
    } else {
      ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
    }
  } catch (err) {
    console.error("复制失败:", err);
    ElMessage.warning(`无法复制${type.toUpperCase()}链接，请手动复制`);
  }
};

// 导入导出相关
const showImportDialog = ref(false);
const importMethod = ref("file");
const importJsonText = ref("");
const importPreview = ref<any[]>([]);
const importLoading = ref(false);
const importOptions = reactive({
  overwrite: false,
});
const uploadRef = ref();

// 处理选择变化
const handleSelectionChange = (selection: WebsiteRssConfig[]) => {
  selectedConfigs.value = selection;
};

// 导出选中的配置
const exportSelectedConfigs = async () => {
  try {
    if (selectedConfigs.value.length === 0) {
      ElMessage.warning("请先选择要导出的配置");
      return;
    }

    const exportData = selectedConfigs.value.map((config) => ({
      ...config,
      id: undefined, // 导出时移除ID
      // 保留 key 和 renderMode 字段
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedhub-selected-configs-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    ElMessage.success(`已导出 ${selectedConfigs.value.length} 个选中配置`);
  } catch (error: any) {
    console.error("导出配置失败:", error);
    ElMessage.error(`导出配置失败: ${error.message || "操作失败"}`);
  }
};

// 处理文件上传
const handleFileChange = (file: any) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      importJsonText.value = e.target?.result as string;
      parseImportData(importJsonText.value);
    } catch (error: any) {
      console.error("文件读取失败:", error);
      ElMessage.error(`文件读取失败: ${error.message || "文件格式错误"}`);
    }
  };
  reader.readAsText(file.raw);
};

// 监听JSON文本变化
const watchImportText = () => {
  parseImportData(importJsonText.value);
};

// 解析导入数据
const parseImportData = (jsonText: string) => {
  try {
    if (!jsonText.trim()) {
      importPreview.value = [];
      return;
    }

    const data = JSON.parse(jsonText);
    const configsData = Array.isArray(data) ? data : [data];

    importPreview.value = configsData.map((config: any) => {
      const exists = configs.value.some((c) => c.title === config.title || c.url === config.url);

      return {
        title: config.title || "未命名",
        url: config.url || "",
        exists,
      };
    });
  } catch (error) {
    importPreview.value = [];
    if (jsonText.trim()) {
      ElMessage.error("JSON格式错误");
    }
  }
};

// 导入配置
const importConfigs = async () => {
  if (importPreview.value.length === 0) {
    ElMessage.warning("没有有效的配置可导入");
    return;
  }

  importLoading.value = true;
  try {
    const data = JSON.parse(importJsonText.value);
    const configsData = Array.isArray(data) ? data : [data];

    let successCount = 0;

    for (const config of configsData) {
      try {
        // 检查是否已存在
        const exists = configs.value.find((c) => c.title === config.title || c.url === config.url);

        if (exists && !importOptions.overwrite) {
          continue; // 跳过已存在的配置
        }

        // 清理不需要的字段
        const cleanConfig = {
          ...config,
          id: undefined,
          key: undefined
        };

        if (exists && importOptions.overwrite) {
          // 更新现有配置
          await updateWebsiteRss(exists.id, cleanConfig);
        } else {
          // 创建新配置
          await createWebsiteRss(cleanConfig);
        }
        successCount++;
      } catch (error: any) {
        console.error(`导入配置失败: ${config.title}`, error);
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功导入 ${successCount} 个配置`);
      closeImportDialog();
      fetchConfigs();
    } else {
      ElMessage.warning("没有配置被导入");
    }
  } catch (error: any) {
    console.error("导入配置失败:", error);
    ElMessage.error(`导入配置失败: ${error.message || "网络错误"}`);
  } finally {
    importLoading.value = false;
  }
};

// 调试选择器
const handleDebugSelector = async () => {
  if (!form.value.url) {
    ElMessage.warning("请先输入网站URL");
    return;
  }

  debugging.value = true;
  try {
    // const debugConfig = {
    //   url: form.value.url,
    //   selector: form.value.selector,
    //   authCredentialId: form.value.authCredentialId,
    //   useProxy: form.value.useProxy,
    //   renderMode: form.value.renderMode,
    // };

    const result = await debugSelector(form.value);

    // 处理调试结果 - 后端返回的数据结构是嵌套的
    const data = result.data as any;
    debugResult.value = {
      success: data.success,
      executionTime: data.executionTime || 0,
      items: data.result || [], // 后端返回的是 result 字段，不是 items
      logs: (data.logs || []).map((log: string) => {
        // 解析日志格式，提取级别和消息
        const match = log.match(/^\[(\w+)\]\s*(.*)$/);
        if (match) {
          return {
            level: match[1].toLowerCase(),
            message: match[2],
          };
        }
        return {
          level: "info",
          message: log,
        };
      }),
      error: data.error,
      url: form.value.url,
      selectorType: form.value.selector.selectorType,
    };

    // 显示调试对话框
    debugDialogVisible.value = true;

    if (data.error) {
      ElMessage.error("调试失败，请检查配置");
    } else {
      ElMessage.success("调试完成");
    }
  } catch (error: any) {
    console.error("调试失败:", error);
    ElMessage.error(`调试失败: ${error.message || "网络错误"}`);
  } finally {
    debugging.value = false;
  }
};

// 获取日志标签类型
const getLogTagType = (level: string) => {
  switch (level.toLowerCase()) {
    case "error":
    case "fatal":
      return "danger";
    case "warn":
      return "warning";
    case "info":
      return "info";
    case "debug":
      return "info";
    default:
      return "info";
  }
};

// 关闭导入对话框
const closeImportDialog = () => {
  showImportDialog.value = false;
  importJsonText.value = "";
  importPreview.value = [];
  importOptions.overwrite = false;
  importMethod.value = "file";
};

// 打开选择器帮助对话框
const openSelectorHelp = () => {
  showSelectorHelp.value = true;
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

.header-actions {
  display: flex;
  gap: 10px;
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
.feed-rss-url,
.feed-json-url {
  font-size: 0.9em;
  color: #409eff;
  cursor: pointer;
}
.feed-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
}

.feed-actions .el-button {
  margin: 0 2px;
}

/* 表格相关样式 */
.feed-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.feed-icon {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.feed-icon-placeholder {
  width: 24px;
  height: 24px;
  background-color: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #909399;
}

.feed-rss-url,
.feed-json-url {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #409eff;
}

.text-gray-400 {
  color: #909399;
  font-size: 12px;
}
.dialog-footer {
  text-align: right;
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
.log-error {
  color: #f56c6c;
}
.log-warn {
  color: #e6a23c;
}
.log-info {
  color: #67c23a;
}
.log-debug {
  color: #409eff;
}
.log-fatal {
  color: #fff;
  background: #f56c6c;
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
  margin-top: 15px;
}

/* 选择器字段组样式 */
.selector-field-group {
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: #fafbfc;
  display: flex;
  align-items: center;
  width: 100%;
}

.selector-field-group .el-form-item {
  margin-bottom: 12px;
}

.selector-field-group .el-form-item:last-child {
  margin-bottom: 0;
}

.selector-field-group .el-form-item__label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.selector-field-group .el-input {
  font-size: 13px;
}

.selector-field-group .el-select {
  width: 100%;
}

/* 调试工具样式 */
.debug-tip {
  margin-top: 8px;
}

.debug-tip .el-text {
  font-size: 12px;
}

/* 调试结果对话框样式 */
.debug-result-container {
  padding: 0;
}

.debug-result-container .el-card {
  margin-bottom: 16px;
}

.debug-result-container .el-card:last-child {
  margin-bottom: 0;
}

.debug-overview .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.debug-error {
  border-left: 4px solid #f56c6c;
}

.debug-items .more-items-tip {
  text-align: center;
  padding: 10px;
  background-color: #f5f7fa;
  margin-top: 8px;
  border-radius: 4px;
}

.debug-logs .logs-container {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
}

.debug-logs .log-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 6px 0;
  border-bottom: 1px solid #e9ecef;
}

.debug-logs .log-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.debug-logs .log-level {
  margin-right: 12px;
  min-width: 60px;
  text-align: center;
}

.debug-logs .log-message {
  flex: 1;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.debug-logs .log-error {
  background-color: #fef0f0;
  border-left: 3px solid #f56c6c;
  padding-left: 8px;
}

.debug-logs .log-warn {
  background-color: #fdf6ec;
  border-left: 3px solid #e6a23c;
  padding-left: 8px;
}

.debug-logs .log-info {
  background-color: #f0f9ff;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}

.debug-logs .log-debug {
  background-color: #f5f7fa;
  border-left: 3px solid #909399;
  padding-left: 8px;
}

/* 正则配置弹窗样式 */
.regex-config {
  padding: 8px 0;
}

.regex-config .el-form-item {
  margin-bottom: 12px;
}

.regex-config .el-form-item:last-child {
  margin-bottom: 0;
}

.regex-config .el-form-item__label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  margin-bottom: 4px;
}

.regex-config .el-input {
  font-size: 13px;
}

.regex-config .el-text {
  display: block;
  margin-top: 8px;
  line-height: 1.4;
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
