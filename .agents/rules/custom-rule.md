---
trigger: always_on
---

1. 每次修改代码后必须要执行 `pnpm build && pnpm lint`, 如有错误、警告, 必须修复, 直至没有为止才算任务完成

3. 每次在 `.env` 文件种添加变量后, 也需要在 `.env.example` 中加一份