# Stage 1: Build frontend
FROM node:24-slim AS frontend-build
RUN npm install -g pnpm@11.1.2
WORKDIR /app/frontend
COPY pnpm-workspace.yaml ../
COPY frontend/package.json frontend/.npmrc ./
ENV CI=true
RUN echo "only-built-dependencies=esbuild" >> .npmrc && pnpm install
COPY frontend/ .
RUN corepack enable
RUN pnpm run build

# Stage 2: Build backend
FROM node:24-slim AS backend-build
RUN npm install -g pnpm@11.1.2
WORKDIR /app/backend
ENV CI=true
# 安装原生模块编译工具链（better-sqlite3 需要）
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/pnpm-lock.yaml backend/.npmrc backend/pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile
COPY backend/ .
# 编译
RUN pnpm run build
# 重新安装生产依赖，清理开发依赖
RUN pnpm install --prod --no-frozen-lockfile



# Stage 3: Production
FROM node:24-slim
WORKDIR /app

# 安装运行时的原生依赖与媒体下载工具（ffmpeg、python3、pip 以及最新的 yt-dlp 及其 EJS 解密依赖）
RUN apt-get update && apt-get install -y python3 curl \
    && rm -rf /var/lib/apt/lists/*

# 复制后端产物和生产依赖
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/package.json ./backend/package.json

# 复制前端产物
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/data.db
ENV FRONTEND_DIST=/app/frontend/dist
ENV PORT=3001

EXPOSE 3001

# 运行从 /app 目录启动，这样相对路径能正确对应
CMD ["node", "backend/dist/index.js"]
