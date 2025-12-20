<template>
  <div class="curl-converter-trigger">
    <el-tooltip content="Curl 转 Fetch" effect="customized">
      <el-link type="info" size="small" underline="never" @click="openDialog">
        <el-icon>
          <Connection />
        </el-icon>
      </el-link>
    </el-tooltip>

    <el-dialog
      v-model="visible"
      title="Curl 转 utils.fetchApi"
      width="600px"
      append-to-body
      :close-on-click-modal="false"
    >
      <div class="converter-body">
        <div class="input-section">
          <div class="section-label">粘贴 Curl 命令:</div>
          <el-input
            v-model="curlInput"
            type="textarea"
            :rows="6"
            placeholder="curl 'https://api.example.com' -H 'Authorization: Bearer ...'"
            @input="handleConvert"
          />
        </div>

        <div class="output-section" v-if="generatedCode">
          <div class="section-label">生成的代码:</div>
          <div class="code-preview">
            <pre><code>{{ generatedCode }}</code></pre>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="handleCopy" :disabled="!generatedCode">
            复制代码
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Connection } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const visible = ref(false);
const curlInput = ref('');
const generatedCode = ref('');

const openDialog = () => {
  visible.value = true;
  curlInput.value = '';
  generatedCode.value = '';
};

const handleConvert = () => {
  if (!curlInput.value.trim()) {
    generatedCode.value = '';
    return;
  }
  try {
    generatedCode.value = parseCurl(curlInput.value);
  } catch (error) {
    console.error('Parse error:', error);
    generatedCode.value = '// 解析 Curl 命令失败，请检查格式是否正确';
  }
};

const handleCopy = async () => {
  if (generatedCode.value) {
    try {
      await navigator.clipboard.writeText(generatedCode.value);
      ElMessage.success('代码已复制到剪贴板');
      visible.value = false;
    } catch (err) {
      ElMessage.error('复制失败，请手动复制');
    }
  }
};

/**
 * 简单的 Curl 解析器
 */
function parseCurl(curl: string): string {
  const result: any = {
    method: 'GET',
    headers: {},
    url: '',
    data: null
  };

  // 预处理：合并续行符，处理引号
  let processedCurl = curl.replace(/\\\n/g, ' ').trim();
  
  // 使用更健壮的参数解析
  const parts = splitCurl(processedCurl);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part === '-X' || part === '--request') {
      result.method = parts[++i]?.toUpperCase() || 'GET';
    } else if (part === '-H' || part === '--header') {
      const headerStr = parts[++i] || '';
      const [key, ...valueParts] = headerStr.split(':');
      if (key && valueParts.length > 0) {
        result.headers[key.trim()] = valueParts.join(':').trim();
      }
    } else if (part === '-d' || part === '--data' || part === '--data-raw' || part === '--data-binary') {
      result.method = result.method === 'GET' ? 'POST' : result.method;
      result.data = parts[++i] || '';
    } else if (!part.startsWith('-') && !result.url) {
      // 尝试识别 URL
      if (part.startsWith('http') || part.includes('://')) {
        result.url = part;
      }
    }
  }

  // 如果没找到 URL，尝试再次匹配
  if (!result.url) {
    const urlMatch = processedCurl.match(/(?:['"])(https?:\/\/[^\s'"]+)(?:['"])|(https?:\/\/[^\s'"]+)/);
    if (urlMatch) {
      result.url = urlMatch[1] || urlMatch[2];
    }
  }

  // 分解 URL 和参数
  let baseUrl = result.url;
  let params: any = null;
  if (result.url && result.url.includes('?')) {
    const urlObj = new URL(result.url);
    baseUrl = `${urlObj.origin}${urlObj.pathname}`;
    params = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  // 生成格式化代码
  let output = '';
  
  // URL 变量
  output += `const apiUrl = '${baseUrl}';\n`;

  // Params 变量
  if (params && Object.keys(params).length > 0) {
    output += `const params = ${JSON.stringify(params, null, 2)};\n`;
  }

  // Headers 变量
  if (Object.keys(result.headers).length > 0) {
    output += `const headers = ${JSON.stringify(result.headers, null, 2)};\n`;
  }

  // Data 变量
  let dataVarName = '';
  if (result.data) {
    dataVarName = 'payload';
    let parsedData = result.data;
    try {
      parsedData = JSON.parse(result.data);
    } catch (e) {
      // Keep as string
    }
    output += `const ${dataVarName} = ${JSON.stringify(parsedData, null, 2)};\n`;
  }

  output += '\n';
  output += 'const response = await utils.fetchApi(';
  
  // 处理带参数的 URL
  if (params && Object.keys(params).length > 0) {
    output += '`${apiUrl}?${utils.queryParams(params)}`';
  } else {
    output += 'apiUrl';
  }

  const options: any = {};
  if (result.method !== 'GET') options.method = result.method;
  
  if (Object.keys(options).length > 0 || Object.keys(result.headers).length > 0 || dataVarName) {
    output += ', {\n';
    if (options.method) output += `  method: '${options.method}',\n`;
    if (Object.keys(result.headers).length > 0) output += `  headers,\n`;
    if (dataVarName) output += `  data: ${dataVarName},\n`;
    output = output.replace(/,\n$/, '\n');
    output += '});';
  } else {
    output += ');';
  }

  return output;
}

/**
 * 将 curl 命令拆分为参数数组，考虑引号
 */
function splitCurl(curl: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < curl.length; i++) {
    const char = curl[i];
    if ((char === '"' || char === "'") && (i === 0 || curl[i-1] !== '\\')) {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else if (char === ' ' && !inQuote) {
      if (current) {
        args.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current) args.push(current);
  
  // 过滤掉 'curl' 开头的单词
  if (args[0]?.toLowerCase() === 'curl') args.shift();
  
  return args;
}
</script>

<style scoped>
.curl-converter-trigger {
  display: inline-flex;
  margin-right: 12px;
}

.section-label {
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.input-section {
  margin-bottom: 20px;
}

.code-preview {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  overflow-x: auto;
  max-height: 200px;
}

.code-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
