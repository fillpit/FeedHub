<template>
  <div class="website-rss-container">
    <!-- Main content -->
    <div class="main-content">
      <div class="header">
        <h1>网站RSS源配置</h1>
        <div class="header-actions">
          <el-button type="primary" @click="addConfig">添加配置</el-button>
          <el-button type="success" @click="exportConfigs">
            <el-icon><Download /></el-icon>
            导出配置
          </el-button>
          <el-button type="warning" @click="showImportDialog = true">
            <el-icon><Upload /></el-icon>
            导入配置
          </el-button>
        </div>
      </div>
      <ul class="feed-list" v-loading="configsLoading">
        <li v-for="config in configs" :key="config.id" @click="config.key && copyRssLink(config.key, 'rss')">
          <div class="feed-item">
            <div class="feed-icon-wrapper">
              <img v-if="config.favicon" :src="config.favicon" class="feed-icon" alt="favicon" />
              <div v-else class="feed-icon-placeholder">
                <el-icon><Document /></el-icon>
              </div>
            </div>
            <div class="feed-info">
              <div class="feed-title">{{ config.title }}</div>
              <div class="feed-url">{{ config.url }}</div>
              <div v-if="config.key" class="feed-rss-url">
                <span>RSS链接: {{ getRssUrl(config.key) }}</span>
                <el-icon style="cursor:pointer" @click.stop="copyRssLink(config.key, 'rss')"><CopyDocument /></el-icon>
              </div>
              <div v-if="config.key" class="feed-json-url">
                <span>JSON链接: {{ getJsonUrl(config.key) }}</span>
                <el-icon style="cursor:pointer" @click.stop="copyRssLink(config.key, 'json')"><CopyDocument /></el-icon>
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
        
          <el-form-item label="选择器类型" prop="selector.selectorType">
            <div style="display: flex; align-items: center; gap: 12px;">
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
              <el-input v-model="form.selector.title.selector" placeholder="请输入标题选择器" style="flex: 1; margin-right: 8px;" />
              <el-select v-model="form.selector.title.extractType" style="width: 100px; margin-right: 8px;">
                <el-option label="文本" value="text" />
                <el-option label="属性" value="attr" />
              </el-select>
              <el-input 
                v-if="form.selector.title.extractType === 'attr'" 
                v-model="form.selector.title.attrName" 
                placeholder="属性名" 
                style="width: 120px;" 
              />
            </div>
          </el-form-item>
          <el-form-item label="链接选择器" prop="selector.link.selector">
             <div class="selector-field-group">
               <el-input v-model="form.selector.link!.selector" placeholder="请输入链接选择器" style="flex: 1; margin-right: 8px;" />
               <el-select v-model="form.selector.link!.extractType" style="width: 100px; margin-right: 8px;">
                 <el-option label="文本" value="text" />
                 <el-option label="属性" value="attr" />
               </el-select>
               <el-input 
                 v-if="form.selector.link!.extractType === 'attr'" 
                 v-model="form.selector.link!.attrName" 
                 placeholder="属性名" 
                 style="width: 120px;" 
               />
             </div>
           </el-form-item>
          <el-form-item label="内容选择器" prop="selector.content.selector">
            <div class="selector-field-group">
              <el-input v-model="form.selector.content.selector" placeholder="请输入内容选择器" style="flex: 1; margin-right: 8px;" />
              <el-select v-model="form.selector.content.extractType" style="width: 100px; margin-right: 8px;">
                <el-option label="文本" value="text" />
                <el-option label="属性" value="attr" />
              </el-select>
              <el-input 
                v-if="form.selector.content.extractType === 'attr'" 
                v-model="form.selector.content.attrName" 
                placeholder="属性名" 
                style="width: 120px;" 
              />
            </div>
          </el-form-item>
          <el-form-item label="作者选择器" prop="selector.author.selector">
             <div class="selector-field-group">
               <el-input v-model="form.selector.author!.selector" placeholder="请输入作者选择器" style="flex: 1; margin-right: 8px;" />
               <el-select v-model="form.selector.author!.extractType" style="width: 100px; margin-right: 8px;">
                 <el-option label="文本" value="text" />
                 <el-option label="属性" value="attr" />
               </el-select>
               <el-input 
                 v-if="form.selector.author!.extractType === 'attr'" 
                 v-model="form.selector.author!.attrName" 
                 placeholder="属性名" 
                 style="width: 120px;" 
               />
             </div>
           </el-form-item>
          <el-form-item label="发布日期选择器" prop="selector.date.selector">
             <div class="selector-field-group">
               <el-input v-model="form.selector.date!.selector" placeholder="请输入发布日期选择器" style="flex: 1; margin-right: 8px;" />
               <el-select v-model="form.selector.date!.extractType" style="width: 100px; margin-right: 8px;">
                 <el-option label="文本" value="text" />
                 <el-option label="属性" value="attr" />
               </el-select>
               <el-input 
                 v-if="form.selector.date!.extractType === 'attr'" 
                 v-model="form.selector.date!.attrName" 
                 placeholder="属性名" 
                 style="width: 120px;" 
               />
             </div>
           </el-form-item>

        <el-divider>授权设置</el-divider>
        <el-form-item label="选择授权">
          <el-select v-model="form.authCredentialId" clearable placeholder="选择已保存的授权信息">
            <el-option label="无授权" :value="undefined" />
            <el-option v-for="item in authCredentials" :key="item.id" :label="item.name + '（' + item.authType + '）'" :value="item.id" />
          </el-select>
        </el-form-item>

        <el-divider>调试工具</el-divider>
        <el-form-item>
          <el-button type="warning" @click="handleDebugSelector" :loading="debugging">
            <el-icon><Tools /></el-icon>
            调试选择器
          </el-button>
          <div class="debug-tip">
            <el-text type="info" size="small">点击调试按钮可以测试当前选择器配置是否能正确抓取内容</el-text>
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
                <div class="el-upload__tip">
                  只能上传 <em>JSON</em> 文件
                </div>
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
                  {{ row.exists ? '已存在' : '新配置' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="import-options">
            <el-checkbox v-model="importOptions.overwrite">
              覆盖已存在的配置
            </el-checkbox>
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
                {{ debugResult.success ? '成功' : '失败' }}
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
              <el-statistic title="目标URL" :value="debugResult.url" value-style="font-size: 14px; word-break: break-all;" />
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
        <el-card v-if="debugResult.items && debugResult.items.length > 0" class="debug-items" shadow="never">
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
                <span>{{ row.content ? (row.content.length > 100 ? row.content.substring(0, 100) + '...' : row.content) : '无内容' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="author" label="作者" width="80" show-overflow-tooltip />
            <el-table-column prop="pubDate" label="发布时间" width="150" show-overflow-tooltip />
          </el-table>
          <div v-if="debugResult.items.length > 5" class="more-items-tip">
            <el-text type="info" size="small">还有 {{ debugResult.items.length - 5 }} 条数据未显示</el-text>
          </div>
        </el-card>

        <!-- 调试日志 -->
        <el-card v-if="debugResult.logs && debugResult.logs.length > 0" class="debug-logs" shadow="never">
          <template #header>
            <span>调试日志 ({{ debugResult.logs.length }} 条)</span>
          </template>
          <div class="logs-container">
            <div v-for="(log, index) in debugResult.logs" :key="index" class="log-item" :class="`log-${log.level}`">
              <el-tag :type="getLogTagType(log.level)" size="small" class="log-level">{{ log.level.toUpperCase() }}</el-tag>
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
    <el-dialog v-model="showSelectorHelp" title="选择器使用说明" width="80%" top="5vh">
      <div class="selector-help-container">
        <el-tabs v-model="selectorHelpActiveTab" type="border-card">
          <el-tab-pane label="CSS 选择器" name="css">
            <div class="help-content">
              <h3>CSS 选择器基础语法</h3>
              <el-table :data="cssExamples" size="small" border>
                <el-table-column prop="selector" label="选择器" width="200" />
                <el-table-column prop="description" label="说明" />
                <el-table-column prop="example" label="示例" show-overflow-tooltip />
              </el-table>
              
              <h3 style="margin-top: 20px;">常用场景示例</h3>
              <el-collapse>
                <el-collapse-item title="容器选择器" name="container">
                  <p><strong>作用：</strong>定位包含文章列表的容器元素</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>.article-list</code> - 选择class为article-list的元素</li>
                    <li><code>#content .posts</code> - 选择id为content下的class为posts的元素</li>
                    <li><code>ul.news-list</code> - 选择class为news-list的ul元素</li>
                  </ul>
                </el-collapse-item>
                
                <el-collapse-item title="标题选择器" name="title">
                  <p><strong>作用：</strong>在每个容器项中选择标题元素</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>h2</code> - 选择h2标签</li>
                    <li><code>.title</code> - 选择class为title的元素</li>
                    <li><code>a.headline</code> - 选择class为headline的链接</li>
                    <li><code>.post-title a</code> - 选择.post-title下的链接</li>
                  </ul>
                </el-collapse-item>
                
                <el-collapse-item title="链接选择器" name="link">
                  <p><strong>作用：</strong>选择文章链接，通常提取href属性</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>a</code> - 选择链接元素，提取href属性</li>
                    <li><code>.title a</code> - 选择.title下的链接</li>
                    <li><code>h2 a</code> - 选择h2标签下的链接</li>
                  </ul>
                  <p><strong>注意：</strong>链接选择器通常设置为提取"属性"模式，属性名为"href"</p>
                </el-collapse-item>
                
                <el-collapse-item title="内容选择器" name="content">
                  <p><strong>作用：</strong>选择文章摘要或内容</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>.summary</code> - 选择class为summary的元素</li>
                    <li><code>.excerpt</code> - 选择摘要元素</li>
                    <li><code>p.description</code> - 选择class为description的段落</li>
                  </ul>
                </el-collapse-item>
                
                <el-collapse-item title="日期选择器" name="date">
                  <p><strong>作用：</strong>选择发布日期</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>.date</code> - 选择class为date的元素</li>
                    <li><code>time</code> - 选择time标签，可提取datetime属性</li>
                    <li><code>.publish-time</code> - 选择发布时间元素</li>
                  </ul>
                  <p><strong>注意：</strong>对于time标签，可以提取"datetime"属性获取标准时间格式</p>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="XPath 选择器" name="xpath">
            <div class="help-content">
              <h3>XPath 选择器基础语法</h3>
              <el-table :data="xpathExamples" size="small" border>
                <el-table-column prop="selector" label="选择器" width="200" />
                <el-table-column prop="description" label="说明" />
                <el-table-column prop="example" label="示例" show-overflow-tooltip />
              </el-table>
              
              <h3 style="margin-top: 20px;">重要概念</h3>
              <el-alert title="相对路径 vs 绝对路径" type="warning" show-icon :closable="false" style="margin-bottom: 15px;">
                <p><strong>绝对路径（//）：</strong>从整个文档开始搜索，可能匹配到容器外的元素</p>
                <p><strong>相对路径（.// 或 ./）：</strong>从当前容器开始搜索，推荐使用</p>
              </el-alert>
              
              <h3>常用场景示例</h3>
              <el-collapse>
                <el-collapse-item title="容器选择器" name="xpath-container">
                  <p><strong>作用：</strong>定位包含文章列表的容器元素</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>//div[@class='article-list']</code> - 选择class为article-list的div</li>
                    <li><code>//ul[contains(@class, 'news')]</code> - 选择class包含news的ul</li>
                    <li><code>//div[@id='content']//div[@class='posts']</code> - 选择id为content下的posts容器</li>
                  </ul>
                </el-collapse-item>
                
                <el-collapse-item title="标题选择器" name="xpath-title">
                  <p><strong>作用：</strong>在每个容器项中选择标题元素</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>.//h2</code> - 选择当前容器下的h2标签</li>
                    <li><code>.//div[@class='title']</code> - 选择当前容器下class为title的div</li>
                    <li><code>.//a[@class='headline']</code> - 选择当前容器下class为headline的链接</li>
                    <li><code>.</code> - 选择当前元素本身（当容器就是标题元素时）</li>
                  </ul>
                  <p><strong>注意：</strong>使用相对路径（.//）避免选择到其他容器的标题</p>
                </el-collapse-item>
                
                <el-collapse-item title="链接选择器" name="xpath-link">
                  <p><strong>作用：</strong>选择文章链接，通常提取href属性</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>.//a</code> - 选择当前容器下的第一个链接</li>
                    <li><code>.//h2/a</code> - 选择当前容器下h2标签内的链接</li>
                    <li><code>.//div[@class='title']/a</code> - 选择title容器内的链接</li>
                  </ul>
                  <p><strong>注意：</strong>链接选择器通常设置为提取"属性"模式，属性名为"href"</p>
                </el-collapse-item>
                
                <el-collapse-item title="属性提取" name="xpath-attr">
                  <p><strong>作用：</strong>提取元素的属性值</p>
                  <p><strong>示例：</strong></p>
                  <ul>
                    <li><code>.//time</code> + 属性名"datetime" - 提取time标签的datetime属性</li>
                    <li><code>.//img</code> + 属性名"src" - 提取图片的src属性</li>
                    <li><code>.//a</code> + 属性名"href" - 提取链接的href属性</li>
                  </ul>
                  <p><strong>注意：</strong>属性匹配支持忽略大小写，如"DateTime"和"datetime"都能匹配</p>
                </el-collapse-item>
                
                <el-collapse-item title="常见问题" name="xpath-issues">
                  <p><strong>问题1：只能获取第一条数据</strong></p>
                  <p>原因：使用了绝对路径选择器（如//div/div[2]/div[1]/h3/span）</p>
                  <p>解决：改为相对路径（如.//div[2]/div[1]/h3/span 或 .//h3/span）</p>
                  
                  <p><strong>问题2：无法获取属性值</strong></p>
                  <p>原因：属性名大小写不匹配或元素选择错误</p>
                  <p>解决：检查元素选择器和属性名，系统支持忽略大小写匹配</p>
                </el-collapse-item>
              </el-collapse>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="调试技巧" name="debug">
            <div class="help-content">
              <h3>选择器调试步骤</h3>
              <el-steps :active="4" direction="vertical">
                <el-step title="检查页面结构" description="使用浏览器开发者工具查看目标网页的HTML结构" />
                <el-step title="编写选择器" description="根据HTML结构编写CSS或XPath选择器" />
                <el-step title="使用调试工具" description="点击'调试选择器'按钮测试配置" />
                <el-step title="查看调试结果" description="检查抓取的数据是否符合预期" />
                <el-step title="优化选择器" description="根据调试结果调整选择器配置" />
              </el-steps>
              
              <h3 style="margin-top: 20px;">浏览器调试技巧</h3>
              <el-card>
                <p><strong>Chrome/Edge 调试：</strong></p>
                <ol>
                  <li>按F12打开开发者工具</li>
                  <li>按Ctrl+Shift+C进入元素选择模式</li>
                  <li>点击目标元素查看其HTML结构</li>
                  <li>在Console中测试选择器：
                    <ul>
                      <li>CSS: <code>document.querySelectorAll('your-selector')</code></li>
                      <li>XPath: <code>$x('your-xpath')</code></li>
                    </ul>
                  </li>
                </ol>
              </el-card>
              
              <h3 style="margin-top: 20px;">常见错误</h3>
              <el-alert title="选择器过于具体" type="warning" show-icon :closable="false" style="margin-bottom: 10px;">
                避免使用过于具体的路径，网站结构变化时容易失效
              </el-alert>
              <el-alert title="忘记使用相对路径" type="error" show-icon :closable="false" style="margin-bottom: 10px;">
                XPath中使用绝对路径（//）可能导致只能获取第一条数据
              </el-alert>
              <el-alert title="属性名错误" type="info" show-icon :closable="false">
                检查属性名是否正确，系统支持忽略大小写匹配
              </el-alert>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSelectorHelp = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
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
  getRssUrl,
  getJsonUrl
} from '@/api/websiteRss';
import type { WebsiteRssConfig } from '@/types/websiteRss';
import { Document, Refresh, Edit, Delete, CopyDocument, Download, Upload, UploadFilled, Tools, QuestionFilled } from '@element-plus/icons-vue';
import { authCredentialApi } from '@/api/authCredential';
import type { AuthCredential } from '@/types';


const configs = ref<WebsiteRssConfig[]>([]);
const configsLoading = ref(false);
const dialogVisible = ref(false);
const submitLoading = ref(false);
const dialogTitle = ref('');
const formRef = ref<FormInstance>();
const isEdit = ref(false);
const authCredentials = ref<AuthCredential[]>([]);
const debugging = ref(false);
const debugDialogVisible = ref(false);
const debugResult = ref<any>(null);
const showSelectorHelp = ref(false);
const selectorHelpActiveTab = ref('css');

// CSS选择器示例数据
const cssExamples = ref([
  { selector: '.class', description: '选择class属性', example: '.article-list' },
  { selector: '#id', description: '选择id属性', example: '#content' },
  { selector: 'tag', description: '选择标签', example: 'div, p, a' },
  { selector: 'tag.class', description: '选择特定class的标签', example: 'div.post' },
  { selector: 'parent child', description: '选择子元素', example: '.container .item' },
  { selector: 'parent > child', description: '选择直接子元素', example: 'ul > li' },
  { selector: '[attr]', description: '选择有特定属性的元素', example: '[href]' },
  { selector: '[attr="value"]', description: '选择属性值匹配的元素', example: '[class="title"]' }
]);

// XPath选择器示例数据
const xpathExamples = ref([
  { selector: '//tag', description: '选择所有指定标签', example: '//div, //a' },
  { selector: './/tag', description: '选择当前节点下的标签', example: './/div, .//span' },
  { selector: '//*[@attr="value"]', description: '选择属性值匹配的元素', example: '//*[@class="title"]' },
  { selector: '//tag[contains(@attr, "value")]', description: '选择属性包含指定值的元素', example: '//div[contains(@class, "post")]' },
  { selector: '//tag[position()=1]', description: '选择第一个元素', example: '//li[position()=1]' },
  { selector: '//tag[last()]', description: '选择最后一个元素', example: '//li[last()]' },
  { selector: '.', description: '选择当前元素本身', example: '.' },
  { selector: '..', description: '选择父元素', example: '..' }
]);

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
    title: {
      selector: '',
      extractType: 'text',
      attrName: ''
    },
    link: {
      selector: '',
      extractType: 'attr',
      attrName: 'href'
    },
    content: {
      selector: '',
      extractType: 'text',
      attrName: ''
    },
    author: {
      selector: '',
      extractType: 'text',
      attrName: ''
    },
    date: {
      selector: '',
      extractType: 'text',
      attrName: ''
    },
    image: {
      selector: '',
      extractType: 'attr',
      attrName: 'src'
    },
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




const fetchConfigs = async () => {
  configsLoading.value = true;
  try {
    const res = await getWebsiteRssList();
    configs.value = res.data || [];
  } catch (error: any) {
    console.error('获取配置列表失败:', error);
    ElMessage.error(`获取配置列表失败: ${error.message || '网络错误'}`);
  } finally {
    configsLoading.value = false;
  }
};

const fetchAuthCredentials = async () => {
  try {
    const res = await authCredentialApi.getAll();
    authCredentials.value = res.data || [];
  } catch (error: any) {
    console.error('获取授权凭据失败:', error);
    ElMessage.error(`获取授权凭据失败: ${error.message || '网络错误'}`);
  }
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
  
  // 兼容旧版本选择器格式：将字符串类型转换为SelectorField对象
  const selector = form.value.selector as any;
  
  // 转换title字段
  if (typeof selector.title === 'string') {
    selector.title = {
      selector: selector.title,
      extractType: 'text',
      attrName: ''
    };
  }
  
  // 转换link字段
  if (typeof selector.link === 'string') {
    selector.link = {
      selector: selector.link,
      extractType: 'attr',
      attrName: 'href'
    };
  }
  
  // 转换content字段
  if (typeof selector.content === 'string') {
    selector.content = {
      selector: selector.content,
      extractType: 'text',
      attrName: ''
    };
  }
  
  // 转换author字段
  if (typeof selector.author === 'string') {
    selector.author = {
      selector: selector.author,
      extractType: 'text',
      attrName: ''
    };
  }
  
  // 转换date字段
  if (typeof selector.date === 'string') {
    selector.date = {
      selector: selector.date,
      extractType: 'text',
      attrName: ''
    };
  }
  
  // 转换image字段
  if (typeof selector.image === 'string') {
    selector.image = {
      selector: selector.image,
      extractType: 'attr',
      attrName: 'src'
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
      } catch (error: any) {
         console.error('操作失败:', error);
         ElMessage.error(`操作失败: ${error.message || '网络错误'}`);
       } finally {
         submitLoading.value = false;
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
  } catch (error: any) {
    console.error('刷新失败:', error);
    ElMessage.error(`刷新失败: ${error.message || '网络错误'}`);
  }
};



const copyRssLink = async (text: string, type: "rss" | "json" = "rss") => {
  const url = type === "rss" ? getRssUrl(text) : getJsonUrl(text);
  
  try {
    const success = await copyTextToClipboard(url);
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
const importMethod = ref('file');
const importJsonText = ref('');
const importPreview = ref<any[]>([]);
const importLoading = ref(false);
const importOptions = reactive({
  overwrite: false
});
const uploadRef = ref();


// 导出配置
const exportConfigs = async () => {
  try {
    if (configs.value.length === 0) {
      ElMessage.warning('没有配置可导出');
      return;
    }
    
    const exportData = configs.value.map(config => ({
      ...config,
      id: undefined, // 导出时移除ID
      key: undefined, // 导出时移除key
      userId: undefined // 导出时移除userId
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedhub-configs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    ElMessage.success(`已导出 ${configs.value.length} 个配置`);
  } catch (error: any) {
    console.error('导出配置失败:', error);
    ElMessage.error(`导出配置失败: ${error.message || '操作失败'}`);
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
      console.error('文件读取失败:', error);
      ElMessage.error(`文件读取失败: ${error.message || '文件格式错误'}`);
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
      const exists = configs.value.some(c => 
        c.title === config.title || c.url === config.url
      );
      
      return {
        title: config.title || '未命名',
        url: config.url || '',
        exists
      };
    });
  } catch (error) {
    importPreview.value = [];
    if (jsonText.trim()) {
      ElMessage.error('JSON格式错误');
    }
  }
};

// 导入配置
const importConfigs = async () => {
  if (importPreview.value.length === 0) {
    ElMessage.warning('没有有效的配置可导入');
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
        const exists = configs.value.find(c => 
          c.title === config.title || c.url === config.url
        );
        
        if (exists && !importOptions.overwrite) {
          continue; // 跳过已存在的配置
        }
        
        // 清理不需要的字段
        const cleanConfig = {
          ...config,
          id: undefined,
          key: undefined,
          userId: undefined
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
      ElMessage.warning('没有配置被导入');
    }
  } catch (error: any) {
    console.error('导入配置失败:', error);
    ElMessage.error(`导入配置失败: ${error.message || '网络错误'}`);
  } finally {
    importLoading.value = false;
  }
};

// 调试选择器
const handleDebugSelector = async () => {
  if (!form.value.url) {
    ElMessage.warning('请先输入网站URL');
    return;
  }
  
  debugging.value = true;
  try {
    const debugConfig = {
      url: form.value.url,
      selector: form.value.selector,
      authCredentialId: form.value.authCredentialId,
      useProxy: form.value.useProxy
    };
    
    const result = await debugSelector(debugConfig);
    
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
            message: match[2]
          };
        }
        return {
          level: 'info',
          message: log
        };
      }),
      error: data.error,
      url: form.value.url,
      selectorType: form.value.selector.selectorType
    };
    
    // 显示调试对话框
    debugDialogVisible.value = true;
    
    if (data.error) {
      ElMessage.error('调试失败，请检查配置');
    } else {
      ElMessage.success('调试完成');
    }
    
  } catch (error: any) {
    console.error('调试失败:', error);
    ElMessage.error(`调试失败: ${error.message || '网络错误'}`);
  } finally {
    debugging.value = false;
  }
};

// 获取日志标签类型
const getLogTagType = (level: string) => {
  switch (level.toLowerCase()) {
    case 'error':
    case 'fatal':
      return 'danger';
    case 'warn':
      return 'warning';
    case 'info':
      return 'info';
    case 'debug':
      return 'info';
    default:
      return 'info';
  }
};

// 关闭导入对话框
const closeImportDialog = () => {
  showImportDialog.value = false;
  importJsonText.value = '';
  importPreview.value = [];
  importOptions.overwrite = false;
  importMethod.value = 'file';
};

// 打开选择器帮助对话框
const openSelectorHelp = () => {
  // 根据当前选择器类型设置默认tab
  selectorHelpActiveTab.value = form.value.selector.selectorType || 'css';
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
.feed-rss-url, .feed-json-url {
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
.log-error { color: #f56c6c; }
.log-warn { color: #e6a23c; }
.log-info { color: #67c23a; }
.log-debug { color: #409eff; }
.log-fatal { color: #fff; background: #f56c6c; }

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
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
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

/* 选择器帮助对话框样式 */
.selector-help-container {
  padding: 0;
}

.help-content {
  padding: 20px;
}

.help-content h3 {
  color: #303133;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
}

.help-content ul {
  margin: 10px 0;
  padding-left: 20px;
}

.help-content li {
  margin: 5px 0;
  line-height: 1.6;
}

.help-content code {
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #e6a23c;
}

.help-content p {
  margin: 8px 0;
  line-height: 1.6;
  color: #606266;
}

.help-content .el-collapse {
  border: none;
}

.help-content .el-collapse-item__header {
  background-color: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 8px;
  padding: 0 15px;
  font-weight: 500;
}

.help-content .el-collapse-item__content {
  padding: 15px;
  background-color: #fafbfc;
  border: 1px solid #e4e7ed;
  border-top: none;
  border-radius: 0 0 4px 4px;
  margin-bottom: 8px;
}

.help-content .el-table {
  margin-bottom: 20px;
}

.help-content .el-steps {
  margin: 20px 0;
}

.help-content .el-card {
  margin: 15px 0;
}

.help-content .el-alert {
  margin: 10px 0;
}
</style>