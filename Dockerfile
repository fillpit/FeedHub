# Stage 1: Base image
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Stage 2: Build frontend & backend
FROM base AS build
# 安装 better-sqlite3 和 isolated-vm 编译原生模块所需的工具链
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# 复制整个 monorepo 工作空间的声明文件及各子项目的 package.json
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# 安装全量依赖（包括编译和构建所需的 devDependencies）
RUN pnpm install --frozen-lockfile

# 复制前端和后端源文件
COPY frontend ./frontend
COPY backend ./backend

# 使用 pnpm workspace 过滤器分别编译前端和后端
RUN pnpm --filter node-template-frontend build
RUN pnpm --filter node-template-backend build

# 剪裁开发依赖，仅在全局和子项目中保留生产运行所需的 production 依赖
RUN pnpm install --prod --ignore-scripts

# Stage 3: Production runtime stage
FROM node:24-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# 安装 SQLite 运行时依赖
RUN apt-get update && apt-get install -y python3 curl && rm -rf /var/lib/apt/lists/*

# 复制已经过 pnpm prune 剪裁的根 node_modules 目录以及工作空间包声明
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# 复制后端编译产物、资产及依赖关系
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY backend/templates ./backend/templates

# 复制前端编译产物
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/nowen-note.db
ENV FRONTEND_DIST=/app/frontend/dist
ENV PORT=3001

EXPOSE 3001

# 启动服务端
CMD ["node", "backend/dist/index.js"]
