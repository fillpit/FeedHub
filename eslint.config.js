import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // 1. 全局忽略
  { 
    ignores: [
      '**/dist/**', 
      '**/node_modules/**', 
      '**/build/**',
      '**/temp/**',
      '**/generated/**',    // 忽略所有自动生成的代码目录（如 Prisma Client 及其运行时代码）
      '**/scratch/**',      // 忽略临时草稿/调试脚本目录
      'scripts/**',
    ] 
  },
  
  // 2. 基础配置 (适用于所有 TS/TSX 文件)
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
    },
    rules: {
      // ===== 独立开发者友好定制规则 =====
      
      // 1. 允许使用 any 警告而不是报错。在处理外部 RSS、API、Capacitor/Electron 底层数据时，强定义类型会极大地延缓开发进程
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // 2. 允许未使用的变量、参数和 catch 错误仅发出警告，避免开发调试中断。
      // 支持以下划线（_）开头的变量命名，从而直接不报警告，极其方便代码占位或未完工功能
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],

      // 3. 调试与逻辑简化规则：
      // 允许空函数、空对象类型定义进行警告（或占位），不作硬性报错
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      
      // 允许空的 catch 或代码块，方便先编写主要流程，调试之后再行异常细化
      'no-empty': ['warn', { allowEmptyCatch: true }],

      // 允许调试时编写简写逻辑，例如：foo && bar()
      '@typescript-eslint/no-unused-expressions': 'warn',

      // 允许使用 @ts-expect-error 或 @ts-ignore 进行疑难复杂类型的绕过，仅给警告
      '@typescript-eslint/ban-ts-comment': 'warn',

      // 允许使用 ! 非空断言符号，仅给予警告提示
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // 允许使用 require() 的动态载入（在 Electron 或 Hono 中按需加载 Node.js 原生模块或条件模块时很常见）
      '@typescript-eslint/no-require-imports': 'off',

      // 允许重复导入或条件赋值（如 if (a = b)）仅给警告，保持灵活性
      'no-duplicate-imports': 'warn',
      'no-cond-assign': 'warn',

      // 4. 精准防范运行时 Bug 规则（这些设为 error 或更严格限制，防止出现严重事故）：
      'no-debugger': 'warn',                   // debugger 在打包前警告即可，防遗漏
      'no-unreachable': 'error',                // 阻止任何无法执行的代码，帮助尽早排查死逻辑
      'no-constant-condition': 'warn',          // 常量条件（例如 while(true)）发出警告
      '@typescript-eslint/no-duplicate-enum-values': 'error',   // 杜绝枚举常量值重复定义
      '@typescript-eslint/no-extra-non-null-assertion': 'error' // 拦截无意义的多余非空断言（如 foo!!）
    },
  },

  // 3. 前端专用配置 (React + Browser)
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 允许 React Hook 依赖项缺失仅发出警告。独开者更懂业务依赖周期，报错容易导致不必要的重渲染
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // 4. 后端专用配置 (Node.js)
  {
    files: ['backend/src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // 继承通用规则，可在此添加后端专有
    },
  },

  // 5. Electron 专用配置 (JS 文件)
  {
    files: ['electron/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser, // Electron 有时需要两者
      },
    },
  }
)
