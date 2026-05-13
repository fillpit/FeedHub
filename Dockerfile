# Stage 1: Build frontend
FROM node:24-slim AS frontend-build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install
COPY frontend/ .
RUN pnpm run build

# Stage 2: Build backend
FROM node:24-slim AS backend-build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app/backend
# 安装原生模块编译工具链（better-sqlite3 需要）
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install
COPY backend/ .
RUN pnpm run build
# 清理开发依赖，仅保留生产依赖
RUN pnpm prune --prod

# Stage 3: Production
FROM node:24-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# 安装运行时的原生依赖所需的最小工具（better-sqlite3 可能在运行时需要部分库，
# 虽然通常编译好的二进制文件可以运行，但为了保险安装一下）
RUN apt-get update && apt-get install -y python3 curl \
    && rm -rf /var/lib/apt/lists/*

# 复制后端产物和生产依赖
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/package.json
COPY backend/templates ./backend/templates

# 复制前端产物
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/nowen-note.db
ENV FRONTEND_DIST=/app/frontend/dist
ENV PORT=3001

EXPOSE 3001

# 运行从 /app 目录启动，这样相对路径能正确对应
CMD ["node", "backend/dist/index.js"]
