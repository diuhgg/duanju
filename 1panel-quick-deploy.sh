#!/bin/bash

# 1Panel 快速部署脚本
echo "=== 短剧搜索播放系统 - 1Panel快速部署 ==="

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请在1Panel中安装Docker"
    exit 1
fi

# 检查Docker Compose
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose未安装"
    exit 1
fi

echo "✅ 环境检查通过"

# 创建必要的目录
mkdir -p logs
chmod 777 logs

# 生成1Panel专用配置
cat > docker-compose.1panel.yml << 'EOF'
services:
  duanju:
    build: .
    container_name: duanju_app
    ports:
      - "3366:3366"
    environment:
      - FLASK_ENV=production
      - LOG_LEVEL=WARNING
      - CACHE_TIMEOUT=7200
      - CACHE_MAX_SIZE=5000
      - MAX_EPISODES=50
      - REQUEST_TIMEOUT=8
      - ASYNC_TIMEOUT=15
      - MAX_CONCURRENT_REQUESTS=30
      - RATE_LIMIT_ENABLED=true
      - RATE_LIMIT_PER_MINUTE=60
      - RATE_LIMIT_PER_HOUR=1000
    volumes:
      - ./logs:/app/logs:rw
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
EOF

echo "✅ 配置文件生成完成"

# 停止旧容器
echo "🔄 停止旧容器..."
$COMPOSE_CMD -f docker-compose.1panel.yml down 2>/dev/null || true

# 构建镜像
echo "🔨 构建Docker镜像..."
$COMPOSE_CMD -f docker-compose.1panel.yml build --no-cache

# 启动服务
echo "🚀 启动服务..."
$COMPOSE_CMD -f docker-compose.1panel.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
for i in {1..30}; do
    if curl -f http://localhost:3366/health &>/dev/null; then
        echo "✅ 服务启动成功！"
        break
    fi
    echo "等待中... ($i/30)"
    sleep 10
done

# 显示部署信息
echo ""
echo "🎉 部署完成！"
echo "📱 访问地址："
echo "   - 本地访问: http://localhost:3366"
echo "   - 服务器访问: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3366"
echo ""
echo "🔧 管理命令："
echo "   - 查看状态: $COMPOSE_CMD -f docker-compose.1panel.yml ps"
echo "   - 查看日志: $COMPOSE_CMD -f docker-compose.1panel.yml logs -f"
echo "   - 停止服务: $COMPOSE_CMD -f docker-compose.1panel.yml down"
echo "   - 重启服务: $COMPOSE_CMD -f docker-compose.1panel.yml restart"
echo ""
echo "⚠️  请确保在1Panel防火墙中开放端口 3366" 