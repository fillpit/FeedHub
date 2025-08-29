#!/bin/bash

# FeedHub 微服务架构部署脚本
# 支持两种Chrome服务部署方式

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== FeedHub 微服务架构部署脚本 ===${NC}"
echo -e "${YELLOW}此脚本将帮助您部署 FeedHub 的微服务架构版本${NC}"
echo -e "${YELLOW}主应用和Chrome服务将运行在独立的容器中${NC}"
echo ""

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"
echo ""

# 选择部署方式
echo -e "${BLUE}请选择Chrome服务部署方式:${NC}"
echo "1) 使用 browserless/chrome (推荐 - 专业优化，无需构建)"
echo "2) 使用自定义Chrome服务 (需要构建，更可控)"
echo ""
read -p "请输入选择 (1 或 2): " choice

# 如果选择 browserless，询问是否配置 token
if [ "$choice" = "1" ]; then
    read -p "是否配置 browserless token? (y/n): " use_token
    if [ "$use_token" = "y" ] || [ "$use_token" = "Y" ]; then
        read -p "请输入 browserless token: " browserless_token
        # 更新 docker-compose 文件中的 token
        sed -i.bak "s/your_browserless_token_here/$browserless_token/g" docker-compose.browserless.yml
        echo "已配置 browserless token"
    fi
fi

case $choice in
    1)
        echo -e "${GREEN}选择了 browserless/chrome 方式${NC}"
        COMPOSE_FILE="docker-compose.browserless.yml"
        
        # 下载配置文件
        if [ ! -f "$COMPOSE_FILE" ]; then
            echo -e "${YELLOW}下载 $COMPOSE_FILE ...${NC}"
            curl -o "$COMPOSE_FILE" "https://raw.githubusercontent.com/fillpit/FeedHub/refs/heads/main/$COMPOSE_FILE"
            if [ $? -ne 0 ]; then
                echo -e "${RED}下载配置文件失败${NC}"
                exit 1
            fi
        fi
        ;;
    2)
        echo -e "${GREEN}选择了自定义Chrome服务方式${NC}"
        COMPOSE_FILE="docker-compose.yml"
        
        # 检查是否有完整项目
        if [ ! -f "$COMPOSE_FILE" ] || [ ! -d "chrome-service" ]; then
            echo -e "${RED}错误: 需要完整的项目文件来构建自定义Chrome服务${NC}"
            echo -e "${YELLOW}请先克隆完整项目:${NC}"
            echo "git clone https://github.com/fillpit/FeedHub.git"
            echo "cd FeedHub"
            echo "./deploy-with-chrome-service.sh"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}无效选择，退出${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}开始部署...${NC}"

# 停止现有服务
echo -e "${YELLOW}停止现有服务...${NC}"
docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || true

# 拉取/构建镜像
echo -e "${YELLOW}准备镜像...${NC}"
if [ "$choice" = "1" ]; then
    echo -e "${YELLOW}拉取 ghcr.io/browserless/chromium 镜像...${NC}"
    docker pull ghcr.io/browserless/chromium:latest
    echo -e "${YELLOW}拉取 FeedHub 镜像...${NC}"
    docker pull fillpit/feedhub:latest
else
    echo -e "${YELLOW}构建自定义Chrome服务...${NC}"
    docker-compose -f "$COMPOSE_FILE" build chrome
    echo -e "${YELLOW}拉取 FeedHub 镜像...${NC}"
    docker pull fillpit/feedhub:latest
fi

# 启动服务
echo -e "${YELLOW}启动服务...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== 部署成功! ===${NC}"
    echo -e "${GREEN}✓ FeedHub 主应用已启动${NC}"
    echo -e "${GREEN}✓ Chrome 服务已启动${NC}"
    echo ""
    echo -e "${BLUE}访问信息:${NC}"
    echo -e "${YELLOW}• 管理界面: http://localhost:8008${NC}"
    echo -e "${YELLOW}• 默认用户名: admin${NC}"
    echo -e "${YELLOW}• 默认密码: admin@123${NC}"
    
    if [ "$choice" = "1" ]; then
        echo -e "${YELLOW}• Chrome服务: http://localhost:9222${NC}"
    else
        echo -e "${YELLOW}• Chrome服务: http://localhost:9222${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}常用命令:${NC}"
    echo -e "${YELLOW}• 查看日志: docker-compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "${YELLOW}• 停止服务: docker-compose -f $COMPOSE_FILE down${NC}"
    echo -e "${YELLOW}• 重启服务: docker-compose -f $COMPOSE_FILE restart${NC}"
    echo -e "${YELLOW}• 查看状态: docker-compose -f $COMPOSE_FILE ps${NC}"
    echo ""
    echo -e "${GREEN}现在您可以在管理界面中配置网站监控，并选择合适的渲染模式！${NC}"
else
    echo -e "${RED}部署失败，请检查错误信息${NC}"
    exit 1
fi