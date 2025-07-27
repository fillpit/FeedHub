# 多阶段构建 Dockerfile
FROM node:18-alpine AS base

# 设置工作目录
WORKDIR /app

# 复制 package 文件和 lock 文件
COPY package*.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# 复制 TypeScript 配置文件
COPY frontend/tsconfig*.json ./frontend/
COPY backend/tsconfig*.json ./backend/
COPY shared/tsconfig*.json ./shared/

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install

# 构建共享代码库
FROM base AS shared-builder
WORKDIR /app
COPY shared ./shared
RUN cd shared && pnpm run build

# 构建前端
FROM base AS frontend-builder
WORKDIR /app
COPY . .
# 复制已构建的共享代码库
COPY --from=shared-builder /app/shared/dist ./shared/dist
RUN pnpm run build:frontend

# 构建后端
FROM base AS backend-builder
WORKDIR /app
COPY . .
# 复制已构建的共享代码库
COPY --from=shared-builder /app/shared/dist ./shared/dist
RUN pnpm run build:backend

# 生产镜像
FROM node:18-alpine AS production

# 安装 nginx
RUN apk add --no-cache nginx

# 创建应用目录
WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=shared-builder /app/shared/dist ./shared/dist
COPY --from=shared-builder /app/shared/package*.json ./shared/

# 在生产镜像中重新安装后端依赖（只安装生产依赖）
WORKDIR /app/backend
RUN npm install --only=production

# 回到应用根目录
WORKDIR /app

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/backend && node dist/app.js &' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# 暴露端口
EXPOSE 8008

# 设置启动命令
CMD ["/app/start.sh"]