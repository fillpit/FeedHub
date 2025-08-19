# Docker 环境下的渲染模式功能说明

## 概述

本项目新增了网页监控的渲染模式功能，支持两种模式：
- **静态页面模式 (static)**: 直接获取HTML源码，适用于服务端渲染的页面
- **浏览器渲染模式 (rendered)**: 使用独立的Chrome服务获取JavaScript渲染后的内容，适用于SPA应用

## 微服务架构设计

为了避免主应用容器臃肿，我们采用了微服务架构：
- **主应用容器**: 只包含业务逻辑，保持轻量
- **Chrome服务容器**: 独立提供浏览器渲染服务

### 架构优势

1. **容器分离**: 主应用容器保持轻量，Chrome服务独立运行
2. **资源隔离**: 浏览器渲染的内存和CPU消耗不影响主应用
3. **可扩展性**: 可以独立扩展Chrome服务实例数量
4. **维护性**: Chrome服务可以独立更新和重启

## 部署选项

### 选项1: 使用 browserless/chrome (推荐)

使用现成的专业Chrome服务镜像，无需自己构建：

```bash
# 下载配置文件
wget https://raw.githubusercontent.com/fillpit/FeedHub/refs/heads/main/docker-compose.browserless.yml

# 启动服务
docker-compose -f docker-compose.browserless.yml up -d

# 查看日志
docker-compose -f docker-compose.browserless.yml logs -f
```

**优势**:
- 无需构建，直接使用
- 专业优化，性能更好
- 支持更多浏览器功能
- 内置连接池和资源管理

### 选项2: 自定义Chrome服务

使用项目提供的自定义Chrome服务容器：

```bash
# 下载完整项目
git clone https://github.com/fillpit/FeedHub.git
cd FeedHub

# 启动服务（会自动构建Chrome服务容器）
docker-compose up -d

# 查看日志
docker-compose logs -f
```

**优势**:
- 完全可控的Chrome配置
- 可以自定义浏览器参数
- 更小的镜像体积

## 环境变量配置

主应用容器的关键环境变量：

```yaml
environment:
  - CHROME_SERVICE_URL=http://chrome:3000  # Chrome服务地址
  - NODE_ENV=production
  - PORT=8009
  # ... 其他配置
```

## 功能验证

部署完成后，验证渲染模式功能：

1. **访问管理界面**: http://your-server:8008
2. **添加网站监控**，在配置中选择渲染模式：
   - 对于静态网站选择"静态页面"
   - 对于React/Vue等SPA应用选择"浏览器渲染"
3. **查看抓取结果**，确认能正确获取动态内容

## 性能考虑

### 资源使用
- **主应用容器**: 约50-100MB内存
- **Chrome服务容器**: 约200-500MB内存（取决于并发数）
- **总体**: 比单容器方案更高效，资源隔离更好

### 并发控制
- browserless默认支持10个并发会话
- 可通过环境变量 `MAX_CONCURRENT_SESSIONS` 调整
- 建议根据服务器配置合理设置

## 故障排除

### 常见问题

1. **Chrome服务连接失败**
   ```bash
   # 检查Chrome服务状态
   docker-compose ps chrome
   
   # 查看Chrome服务日志
   docker-compose logs chrome
   ```

2. **渲染超时**
   - 检查网络连接
   - 增加 `CONNECTION_TIMEOUT` 值
   - 确认目标网站可访问

3. **内存不足**
   ```bash
   # 监控容器资源使用
   docker stats
   
   # 调整Chrome服务内存限制
   # 在docker-compose.yml中添加:
   # mem_limit: 1g
   ```

### 降级方案

如果Chrome服务出现问题，系统会自动降级到静态页面模式，确保基本功能正常运行。

## 生产环境建议

1. **使用 browserless/chrome**: 更稳定可靠
2. **配置健康检查**: 确保服务可用性
3. **设置资源限制**: 防止资源耗尽
4. **监控日志**: 及时发现问题
5. **定期重启**: 清理浏览器缓存和内存

```yaml
# 生产环境配置示例
chrome:
  image: browserless/chrome:latest
  deploy:
    resources:
      limits:
        memory: 1G
        cpus: '0.5'
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

通过这种微服务架构，您可以获得更好的性能、可维护性和扩展性，同时保持主应用容器的轻量化。