# CloudSaver Docker 部署指南

## 🎉 构建成功！

您的 CloudSaver 项目已经成功打包成 Docker 镜像并运行。

## 📋 当前状态

- ✅ Docker 镜像构建成功
- ✅ 容器运行正常
- ✅ 前端服务可访问
- ✅ 后端 API 服务正常
- ✅ 数据库初始化完成

## 🌐 访问地址

- **前端界面**: http://localhost:8008
- **后端 API**: http://localhost:8008/api/

## 🚀 使用方法

### 1. 使用构建脚本（推荐）
```bash
# 构建镜像
./build-docker.sh

# 运行容器
docker run -d -p 8008:8008 --name cloud-saver cloud-saver:latest
```

### 2. 使用 Docker Compose
```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 3. 直接使用 Docker 命令
```bash
# 构建镜像
docker build -t cloud-saver:latest .

# 运行容器
docker run -d -p 8008:8008 --name cloud-saver cloud-saver:latest

# 查看容器状态
docker ps

# 查看日志
docker logs cloud-saver

# 停止容器
docker stop cloud-saver

# 删除容器
docker rm cloud-saver
```

## 🔧 容器管理

### 查看容器状态
```bash
docker ps
```

### 查看容器日志
```bash
docker logs cloud-saver
```

### 进入容器
```bash
docker exec -it cloud-saver sh
```

### 停止和删除容器
```bash
docker stop cloud-saver
docker rm cloud-saver
```

## 📁 数据持久化

如果需要持久化数据，可以挂载以下目录：

```bash
docker run -d -p 8008:8008 \
  -v $(pwd)/backend/data:/app/backend/data \
  -v $(pwd)/backend/logs:/app/backend/logs \
  --name cloud-saver cloud-saver:latest
```

## 🏗️ 架构说明

- **前端**: Vue.js 应用，由 Nginx 服务
- **后端**: Node.js/Express API 服务
- **数据库**: SQLite（内置）
- **端口**: 8008（前端访问端口）

## 🔍 故障排除

### 1. 端口冲突
如果 8008 端口被占用，可以修改端口映射：
```bash
docker run -d -p 8080:8008 --name cloud-saver cloud-saver:latest
```

### 2. 查看详细日志
```bash
docker logs -f cloud-saver
```

### 3. 重新构建镜像
```bash
docker build --no-cache -t cloud-saver:latest .
```

## 📝 注意事项

1. 首次启动会自动初始化数据库
2. 默认管理员代码：230713
3. 默认普通用户代码：9527
4. 容器内后端服务运行在端口 8009，通过 Nginx 代理到 8008

## 🎯 下一步

现在您可以：
1. 在浏览器中访问 http://localhost:8008
2. 使用默认管理员代码登录系统
3. 开始使用 CloudSaver 功能

祝您使用愉快！🎉 