<template>
  <div class="code-editor-container">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import * as monaco from "monaco-editor";

interface Props {
  modelValue: string;
  language?: string;
  theme?: string;
  height?: string | number;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  readonly?: boolean;
  enableSyntaxCheck?: boolean;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "syntax-errors", errors: monaco.editor.IMarkerData[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  language: "javascript",
  theme: "vs-dark",
  height: "300px",
  readonly: false,
  enableSyntaxCheck: true,
  options: () => ({}),
});

const emit = defineEmits<Emits>();

const editorContainer = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let isEditorReady = false;
let syntaxCheckTimer: number | null = null;

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value) return;

  try {
    // 设置 JavaScript 语言的默认配置
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      strict: false, // 降低严格模式以避免浏览器环境问题
      noImplicitAny: false,
      noImplicitReturns: false,
      noUnusedLocals: false,
      noUnusedParameters: false,
    });

    // 启用语法检查
    if (props.enableSyntaxCheck) {
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true, // 禁用语义验证以避免模块解析问题
        noSyntaxValidation: false,
        noSuggestionDiagnostics: true, // 禁用建议诊断
      });
    }

    // 添加自定义类型定义
    const customTypes = `
      declare const utils: {
        getRouteParams(): Record<string, any>;
        getQueryParams(): Record<string, any>;
        fetchApi(url: string, options?: RequestInit): Promise<Response>;
        getAuthInfo(): Promise<any>;
        log(message: any, level?: 'info' | 'warn' | 'error' | 'debug'): void;
        parseDate(dateString: string): Date;
        parseHTML(html: string): Document;
        stripHtml(html: string): string;
        truncate(str: string, length: number): string;
        resolveUrl(base: string, relative: string): string;
        unique<T>(array: T[]): T[];
        sortBy<T>(array: T[], key: keyof T): T[];
        formatDate(date: Date | string, format?: string): string;
        uuid(): string;
        dayjs: any;
        parseJson(jsonString: string): any;
        chunk<T>(array: T[], size: number): T[][];
        pick<T>(obj: T, keys: (keyof T)[]): Partial<T>;
        safeGet(obj: any, path: string, defaultValue?: any): any;
        safeArray(value: any): any[];
        safeObject(value: any): Record<string, any>;
        validateItem(item: any, schema: any): boolean;
      };
      
      declare const fetch: (url: string, options?: RequestInit) => Promise<Response>;
      declare const console: {
        log(...args: any[]): void;
        warn(...args: any[]): void;
        error(...args: any[]): void;
        info(...args: any[]): void;
        debug(...args: any[]): void;
      };
      
      // 动态路由脚本必须导出的函数
      declare function handler(params: {
        routeParams: Record<string, any>;
        queryParams: Record<string, any>;
        utils: typeof utils;
        console: typeof console;
        secrets: Record<string, string>;
      }): Promise<any> | any;
    `;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      customTypes,
      "ts:filename/utils.d.ts"
    );

    // 创建编辑器实例
    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: props.language,
      theme: props.theme,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: "on",
      roundedSelection: false,
      scrollbar: {
        vertical: "auto",
        horizontal: "auto",
      },
      folding: true,
      foldingStrategy: "indentation",
      showFoldingControls: "always",
      wordWrap: "on",
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
      readOnly: props.readonly,
      ...props.options,
    });

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      if (editor && isEditorReady) {
        const value = editor.getValue();
        emit("update:modelValue", value);
        emit("change", value);
        
        // 延迟语法检查
        if (props.enableSyntaxCheck) {
          if (syntaxCheckTimer) {
            clearTimeout(syntaxCheckTimer);
          }
          syntaxCheckTimer = setTimeout(() => {
            checkSyntaxErrors();
          }, 500);
        }
      }
    });

    // 监听语法错误变化
    if (props.enableSyntaxCheck) {
      monaco.editor.onDidChangeMarkers((uris) => {
        if (editor && isEditorReady) {
          const model = editor.getModel();
          if (model && uris.some(uri => uri.toString() === model.uri.toString())) {
            const markers = monaco.editor.getModelMarkers({ resource: model.uri });
            const errors = markers.filter(marker => 
              marker.severity === monaco.MarkerSeverity.Error ||
              marker.severity === monaco.MarkerSeverity.Warning
            );
            emit("syntax-errors", errors);
          }
        }
      });
    }

    isEditorReady = true;
  } catch (error) {
    console.error("Failed to initialize Monaco Editor:", error);
  }
};

// 设置编辑器高度
const setEditorHeight = () => {
  if (!editorContainer.value) return;

  const height = typeof props.height === "number" ? `${props.height}px` : props.height;
  editorContainer.value.style.height = height;
};

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && isEditorReady && editor.getValue() !== newValue) {
      editor.setValue(newValue || "");
    }
  }
);

// 监听语言变化
watch(
  () => props.language,
  (newLanguage) => {
    if (editor && isEditorReady) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, newLanguage);
      }
    }
  }
);

// 监听主题变化
watch(
  () => props.theme,
  (newTheme) => {
    if (editor && isEditorReady) {
      monaco.editor.setTheme(newTheme);
    }
  }
);

// 监听只读状态变化
watch(
  () => props.readonly,
  (readonly) => {
    if (editor && isEditorReady) {
      editor.updateOptions({ readOnly: readonly });
    }
  }
);

// 监听高度变化
watch(
  () => props.height,
  () => {
    setEditorHeight();
    if (editor) {
      nextTick(() => {
        editor?.layout();
      });
    }
  }
);

// 组件挂载
onMounted(async () => {
  setEditorHeight();
  await nextTick();
  await initEditor();
});

// 语法检查函数
const checkSyntaxErrors = () => {
  if (!editor || !isEditorReady || !props.enableSyntaxCheck) return;
  
  const model = editor.getModel();
  if (!model) return;
  
  // 获取当前模型的错误标记
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  const errors = markers.filter(marker => 
    marker.severity === monaco.MarkerSeverity.Error ||
    marker.severity === monaco.MarkerSeverity.Warning
  );
  
  emit("syntax-errors", errors);
};

// 自定义验证动态路由脚本
const validateDynamicRouteScript = (code: string): monaco.editor.IMarkerData[] => {
  const errors: monaco.editor.IMarkerData[] = [];
  
  // 检查是否包含handler函数
  if (!code.includes('function handler') && !code.includes('const handler') && !code.includes('export')) {
    errors.push({
      severity: monaco.MarkerSeverity.Warning,
      message: '动态路由脚本应该包含一个handler函数或导出函数',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    });
  }
  
  // 检查是否使用了不安全的函数
  const unsafeFunctions = ['eval', 'Function', 'setTimeout', 'setInterval'];
  unsafeFunctions.forEach(func => {
    if (code.includes(func)) {
      const lines = code.split('\n');
      lines.forEach((line, index) => {
        if (line.includes(func)) {
          errors.push({
            severity: monaco.MarkerSeverity.Warning,
            message: `不建议在动态路由脚本中使用 ${func} 函数`,
            startLineNumber: index + 1,
            startColumn: line.indexOf(func) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(func) + func.length + 1,
          });
        }
      });
    }
  });
  
  return errors;
};

// 组件卸载
onBeforeUnmount(() => {
  if (syntaxCheckTimer) {
    clearTimeout(syntaxCheckTimer);
    syntaxCheckTimer = null;
  }
  if (editor) {
    editor.dispose();
    editor = null;
  }
  isEditorReady = false;
});

// 暴露编辑器实例方法
defineExpose({
  getEditor: () => editor,
  focus: () => editor?.focus(),
  layout: () => editor?.layout(),
  setValue: (value: string) => editor?.setValue(value),
  getValue: () => editor?.getValue() || "",
  insertText: (text: string) => {
    if (editor) {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("", [
          {
            range: selection,
            text: text,
          },
        ]);
      }
    }
  },
  checkSyntax: () => checkSyntaxErrors(),
  validateScript: (code: string) => validateDynamicRouteScript(code),
  getSyntaxErrors: () => {
    if (!editor || !isEditorReady) return [];
    const model = editor.getModel();
    if (!model) return [];
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    return markers.filter(marker => 
      marker.severity === monaco.MarkerSeverity.Error ||
      marker.severity === monaco.MarkerSeverity.Warning
    );
  },
});
</script>

<style scoped>
.code-editor-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.editor-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
}

/* 深色主题适配 */
n.dark .code-editor-container {
  border-color: var(--el-border-color-dark);
}
</style>
