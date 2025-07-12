#!/bin/bash

# Docker 构建脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 镜像名称和标签
IMAGE_NAME="rss-bot"
TAG=${1:-latest}

echo -e "${YELLOW}开始构建 RSS Bot Docker 镜像...${NC}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行或无法访问${NC}"
    exit 1
fi

# 构建镜像
echo -e "${YELLOW}构建镜像: ${IMAGE_NAME}:${TAG}${NC}"
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 镜像构建成功!${NC}"
    echo -e "${GREEN}镜像名称: ${IMAGE_NAME}:${TAG}${NC}"
    
    # 显示镜像信息
    echo -e "${YELLOW}镜像信息:${NC}"
    docker images ${IMAGE_NAME}:${TAG}
    
    echo -e "${YELLOW}运行容器:${NC}"
    echo "docker run -d -p 8008:8008 --name rss-bot ${IMAGE_NAME}:${TAG}"
    echo ""
    echo -e "${YELLOW}或使用 docker-compose:${NC}"
    echo "docker-compose up -d"
    
else
    echo -e "${RED}❌ 镜像构建失败!${NC}"
    exit 1
fi 