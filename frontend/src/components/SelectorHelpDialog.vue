<template>
  <el-dialog v-model="visible" title="选择器使用说明" width="80%" top="5vh" @close="handleClose">
    <div class="selector-help-container">
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="CSS 选择器" name="css">
          <div class="help-content">
            <h3>CSS 选择器基础语法</h3>
            <el-table :data="cssExamples" size="small" border>
              <el-table-column prop="selector" label="选择器" width="200" />
              <el-table-column prop="description" label="说明" />
              <el-table-column prop="example" label="示例" show-overflow-tooltip />
            </el-table>

            <h3 style="margin-top: 20px">常用场景示例</h3>
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

            <h3 style="margin-top: 20px">重要概念</h3>
            <el-alert
              title="相对路径 vs 绝对路径"
              type="warning"
              show-icon
              :closable="false"
              style="margin-bottom: 15px"
            >
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
                  <li>
                    <code>//div[@id='content']//div[@class='posts']</code> -
                    选择id为content下的posts容器
                  </li>
                </ul>
              </el-collapse-item>

              <el-collapse-item title="标题选择器" name="xpath-title">
                <p><strong>作用：</strong>在每个容器项中选择标题元素</p>
                <p><strong>示例：</strong></p>
                <ul>
                  <li><code>.//h2</code> - 选择当前容器下的h2标签</li>
                  <li><code>.//div[@class='title']</code> - 选择当前容器下class为title的div</li>
                  <li>
                    <code>.//a[@class='headline']</code> - 选择当前容器下class为headline的链接
                  </li>
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
                <p>
                  <strong>注意：</strong>属性匹配支持忽略大小写，如"DateTime"和"datetime"都能匹配
                </p>
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

        <el-tab-pane label="正则处理" name="regex">
          <div class="help-content">
            <h3>正则表达式后处理功能</h3>
            <el-alert
              title="功能说明"
              type="info"
              show-icon
              :closable="false"
              style="margin-bottom: 15px"
            >
              <p>
                正则处理功能允许您对选择器抓取的结果进行进一步的文本提取和清洗，适用于需要从复杂文本中提取特定内容的场景。
              </p>
            </el-alert>

            <h3>配置参数</h3>
            <el-table
              :data="[
                {
                  param: '正则表达式',
                  description: '用于匹配和提取文本的正则表达式模式',
                  example: '^(.+?)\\s*-\\s*作者',
                },
                {
                  param: '标志',
                  description: '正则表达式标志，如 g(全局)、i(忽略大小写)、m(多行)',
                  example: 'gi',
                },
                {
                  param: '捕获组',
                  description: '要提取的捕获组索引，0表示整个匹配，1表示第一个括号内容',
                  example: '1',
                },
              ]"
              size="small"
              border
              style="margin-bottom: 20px"
            >
              <el-table-column prop="param" label="参数" width="120" />
              <el-table-column prop="description" label="说明" />
              <el-table-column prop="example" label="示例" width="200" />
            </el-table>

            <h3>使用场景示例</h3>
            <el-collapse>
              <el-collapse-item title="场景1：从混合文本中提取标题" name="regex-title">
                <p><strong>原始文本：</strong><code>【重要】Vue3新特性详解 - 作者：张三</code></p>
                <p><strong>目标：</strong>提取标题部分"Vue3新特性详解"</p>
                <p><strong>配置：</strong></p>
                <ul>
                  <li>正则表达式：<code>【.*?】(.+?)\\s*-</code></li>
                  <li>捕获组：<code>1</code></li>
                  <li>结果：<code>Vue3新特性详解</code></li>
                </ul>
              </el-collapse-item>

              <el-collapse-item title="场景2：从链接文本中提取URL" name="regex-link">
                <p>
                  <strong>原始文本：</strong
                  ><code>点击查看详情：https://example.com/article/123</code>
                </p>
                <p><strong>目标：</strong>提取URL部分</p>
                <p><strong>配置：</strong></p>
                <ul>
                  <li>正则表达式：<code>https?://[^\\s]+</code></li>
                  <li>捕获组：<code>0</code></li>
                  <li>结果：<code>https://example.com/article/123</code></li>
                </ul>
              </el-collapse-item>

              <el-collapse-item title="场景3：从作者信息中提取姓名" name="regex-author">
                <p><strong>原始文本：</strong><code>作者：张三 | 发布时间：2024-01-01</code></p>
                <p><strong>目标：</strong>提取作者姓名"张三"</p>
                <p><strong>配置：</strong></p>
                <ul>
                  <li>正则表达式：<code>作者：(.+?)\\s*\\|</code></li>
                  <li>捕获组：<code>1</code></li>
                  <li>结果：<code>张三</code></li>
                </ul>
              </el-collapse-item>

              <el-collapse-item title="场景4：从日期文本中提取标准格式" name="regex-date">
                <p><strong>原始文本：</strong><code>发布于2024年1月1日 星期一</code></p>
                <p><strong>目标：</strong>提取日期"2024年1月1日"</p>
                <p><strong>配置：</strong></p>
                <ul>
                  <li>正则表达式：<code>(\\d{4}年\\d{1,2}月\\d{1,2}日)</code></li>
                  <li>捕获组：<code>1</code></li>
                  <li>结果：<code>2024年1月1日</code></li>
                </ul>
              </el-collapse-item>

              <el-collapse-item title="场景5：清理HTML标签" name="regex-clean">
                <p>
                  <strong>原始文本：</strong
                  ><code>&lt;p&gt;这是一段&lt;strong&gt;重要&lt;/strong&gt;内容&lt;/p&gt;</code>
                </p>
                <p><strong>目标：</strong>提取纯文本内容</p>
                <p><strong>配置：</strong></p>
                <ul>
                  <li>正则表达式：<code>&gt;([^&lt;]+)&lt;</code></li>
                  <li>标志：<code>g</code></li>
                  <li>捕获组：<code>1</code></li>
                  <li>结果：<code>这是一段重要内容</code></li>
                </ul>
              </el-collapse-item>
            </el-collapse>

            <h3>注意事项</h3>
            <el-alert
              title="使用建议"
              type="warning"
              show-icon
              :closable="false"
              style="margin-top: 20px"
            >
              <ul>
                <li><strong>测试验证：</strong>使用"调试选择器"功能验证正则表达式是否正确工作</li>
                <li><strong>转义字符：</strong>在正则表达式中使用\\来表示反斜杠</li>
                <li><strong>性能考虑：</strong>复杂的正则表达式可能影响抓取性能</li>
                <li><strong>容错处理：</strong>如果正则匹配失败，系统会返回原始文本</li>
                <li><strong>调试日志：</strong>正则处理过程会在调试日志中显示详细信息</li>
              </ul>
            </el-alert>
          </div>
        </el-tab-pane>

        <el-tab-pane label="调试技巧" name="debug">
          <div class="help-content">
            <h3>选择器调试步骤</h3>
            <el-steps :active="4" direction="vertical">
              <el-step
                title="检查页面结构"
                description="使用浏览器开发者工具查看目标网页的HTML结构"
              />
              <el-step title="编写选择器" description="根据HTML结构编写CSS或XPath选择器" />
              <el-step title="使用调试工具" description="点击'调试选择器'按钮测试配置" />
              <el-step title="查看调试结果" description="检查抓取的数据是否符合预期" />
              <el-step title="优化选择器" description="根据调试结果调整选择器配置" />
            </el-steps>

            <h3 style="margin-top: 20px">浏览器调试技巧</h3>
            <el-card>
              <p><strong>Chrome/Edge 调试：</strong></p>
              <ol>
                <li>按F12打开开发者工具</li>
                <li>按Ctrl+Shift+C进入元素选择模式</li>
                <li>点击目标元素查看其HTML结构</li>
                <li>
                  在Console中测试选择器：
                  <ul>
                    <li>CSS: <code>document.querySelectorAll('your-selector')</code></li>
                    <li>XPath: <code>$x('your-xpath')</code></li>
                  </ul>
                </li>
              </ol>
            </el-card>

            <h3 style="margin-top: 20px">常见错误</h3>
            <el-alert
              title="选择器过于具体"
              type="warning"
              show-icon
              :closable="false"
              style="margin-bottom: 10px"
            >
              避免使用过于具体的路径，网站结构变化时容易失效
            </el-alert>
            <el-alert
              title="忘记使用相对路径"
              type="error"
              show-icon
              :closable="false"
              style="margin-bottom: 10px"
            >
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
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  modelValue: boolean;
  selectorType?: string;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectorType: "css",
});

const emit = defineEmits<Emits>();

const visible = ref(props.modelValue);
const activeTab = ref(props.selectorType);

// CSS选择器示例数据
const cssExamples = ref([
  { selector: ".class", description: "选择class属性", example: ".article-list" },
  { selector: "#id", description: "选择id属性", example: "#content" },
  { selector: "tag", description: "选择标签", example: "div, p, a" },
  { selector: "tag.class", description: "选择特定class的标签", example: "div.post" },
  { selector: "parent child", description: "选择子元素", example: ".container .item" },
  { selector: "parent > child", description: "选择直接子元素", example: "ul > li" },
  { selector: "[attr]", description: "选择有特定属性的元素", example: "[href]" },
  { selector: '[attr="value"]', description: "选择属性值匹配的元素", example: '[class="title"]' },
]);

// XPath选择器示例数据
const xpathExamples = ref([
  { selector: "//tag", description: "选择所有指定标签", example: "//div, //a" },
  { selector: ".//tag", description: "选择当前节点下的标签", example: ".//div, .//span" },
  {
    selector: '//*[@attr="value"]',
    description: "选择属性值匹配的元素",
    example: '//*[@class="title"]',
  },
  {
    selector: '//tag[contains(@attr, "value")]',
    description: "选择属性包含指定值的元素",
    example: '//div[contains(@class, "post")]',
  },
  { selector: "//tag[position()=1]", description: "选择第一个元素", example: "//li[position()=1]" },
  { selector: "//tag[last()]", description: "选择最后一个元素", example: "//li[last()]" },
  { selector: ".", description: "选择当前元素本身", example: "." },
  { selector: "..", description: "选择父元素", example: ".." },
]);

// 监听props变化
watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal;
  }
);

watch(
  () => props.selectorType,
  (newVal) => {
    activeTab.value = newVal;
  }
);

// 监听visible变化
watch(visible, (newVal) => {
  emit("update:modelValue", newVal);
});

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
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
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
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

.dialog-footer {
  text-align: right;
}
</style>
