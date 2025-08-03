#!/bin/bash

# Docker部署修复脚本

echo "🔧 修复Docker部署问题..."

# 停止现有容器
echo "停止现有容器..."
docker compose down 2>/dev/null || true

# 清理无用的镜像和容器
echo "清理Docker资源..."
docker system prune -f

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p logs
mkdir -p nginx
mkdir -p static/assets/images
mkdir -p static/assets/fonts

# 检查必要文件是否存在
echo "检查配置文件..."
if [ ! -f "nginx/default.conf" ]; then
    echo "❌ nginx/default.conf 不存在"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    echo "❌ Dockerfile 不存在"
    exit 1
fi

# 选择部署方式
echo "选择部署方式:"
echo "1) 简单部署 (仅应用，端口5000)"
echo "2) 完整部署 (应用+Nginx+Redis，端口80)"

read -p "请选择 (1 或 2): " choice

case $choice in
    1)
        echo "🚀 使用简单部署..."
        docker compose -f docker-compose.simple.yml build
        docker compose -f docker-compose.simple.yml up -d
        echo "✅ 部署完成！访问 http://your-server-ip:5000"
        ;;
    2)
        echo "🚀 使用完整部署..."
        docker compose build
        docker compose up -d
        echo "✅ 部署完成！访问 http://your-server-ip"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 检查部署状态
echo ""
echo "📊 检查部署状态..."
sleep 5
docker compose ps

echo ""
echo "🔍 检查应用健康状态..."
if [ "$choice" = "1" ]; then
    curl -f http://localhost:5000/health && echo "✅ 应用运行正常" || echo "❌ 应用运行异常"
else
    curl -f http://localhost/health && echo "✅ 应用运行正常" || echo "❌ 应用运行异常"
fi

echo ""
echo "📝 查看日志命令:"
if [ "$choice" = "1" ]; then
    echo "docker compose -f docker-compose.simple.yml logs -f duanju"
else
    echo "docker compose logs -f duanju"
fi