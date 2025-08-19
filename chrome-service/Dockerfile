# Chrome 服务容器 - 专门提供浏览器渲染服务
FROM node:20-alpine

# 安装 Chromium 和相关依赖
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S chrome && \
    adduser -S -D -H -u 1001 -h /tmp -s /sbin/nologin -G chrome -g chrome chrome

# 安装 puppeteer
RUN npm install -g puppeteer

# 设置环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 创建启动脚本
RUN echo '#!/bin/sh' > /start-chrome.sh && \
    echo 'exec chromium-browser \' >> /start-chrome.sh && \
    echo '  --headless \' >> /start-chrome.sh && \
    echo '  --no-sandbox \' >> /start-chrome.sh && \
    echo '  --disable-setuid-sandbox \' >> /start-chrome.sh && \
    echo '  --disable-dev-shm-usage \' >> /start-chrome.sh && \
    echo '  --disable-accelerated-2d-canvas \' >> /start-chrome.sh && \
    echo '  --no-first-run \' >> /start-chrome.sh && \
    echo '  --no-zygote \' >> /start-chrome.sh && \
    echo '  --single-process \' >> /start-chrome.sh && \
    echo '  --disable-gpu \' >> /start-chrome.sh && \
    echo '  --remote-debugging-address=0.0.0.0 \' >> /start-chrome.sh && \
    echo '  --remote-debugging-port=9222' >> /start-chrome.sh && \
    chmod +x /start-chrome.sh

# 切换到非root用户
USER chrome

# 暴露调试端口
EXPOSE 9222

# 启动Chrome
CMD ["/start-chrome.sh"]