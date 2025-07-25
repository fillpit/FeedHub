<template>
  <div class="code-editor-container">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import * as monaco from 'monaco-editor';
import loader from '@monaco-editor/loader';

interface Props {
  modelValue: string;
  language?: string;
  theme?: string;
  height?: string | number;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  readonly?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  language: 'javascript',
  theme: 'vs-dark',
  height: '300px',
  readonly: false,
  options: () => ({})
});

const emit = defineEmits<Emits>();

const editorContainer = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let isEditorReady = false;

// 配置 Monaco Editor
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value) return;

  try {
    const monacoInstance = await loader.init();
    
    // 设置 JavaScript 语言的默认配置
    monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monacoInstance.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monacoInstance.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monacoInstance.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });

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
      };
      
      declare const fetch: (url: string, options?: RequestInit) => Promise<Response>;
    `;
    
    monacoInstance.languages.typescript.javascriptDefaults.addExtraLib(
      customTypes,
      'ts:filename/utils.d.ts'
    );

    // 创建编辑器实例
    editor = monacoInstance.editor.create(editorContainer.value, {
      value: props.modelValue,
      language: props.language,
      theme: props.theme,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto'
      },
      folding: true,
      foldingStrategy: 'indentation',
      showFoldingControls: 'always',
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
      readOnly: props.readonly,
      ...props.options
    });

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      if (editor && isEditorReady) {
        const value = editor.getValue();
        emit('update:modelValue', value);
        emit('change', value);
      }
    });

    isEditorReady = true;
  } catch (error) {
    console.error('Failed to initialize Monaco Editor:', error);
  }
};

// 设置编辑器高度
const setEditorHeight = () => {
  if (!editorContainer.value) return;
  
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height;
  editorContainer.value.style.height = height;
};

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && isEditorReady && editor.getValue() !== newValue) {
      editor.setValue(newValue || '');
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

// 组件卸载
onBeforeUnmount(() => {
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
  getValue: () => editor?.getValue() || '',
  insertText: (text: string) => {
    if (editor) {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('', [{
          range: selection,
          text: text
        }]);
      }
    }
  }
});
</script>

<style scoped>
.code-editor-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  width: 100%;
}

.editor-container {
  width: 100%;
  min-height: 200px;
}

/* 深色主题适配 */n.dark .code-editor-container {
  border-color: var(--el-border-color-dark);
}
</style>