#!/bin/bash

# 修复1Panel部署权限问题的脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}"
echo "=================================="
echo "  权限问题修复脚本"
echo "=================================="
echo -e "${NC}"

# 检查是否在项目根目录
if [[ ! -f "app.py" ]]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "开始修复权限问题..."

# 1. 创建logs目录并设置权限
log_info "创建并设置logs目录权限..."
mkdir -p logs
chmod 777 logs
chown -R 1000:1000 logs 2>/dev/null || true
log_success "logs目录权限设置完成"

# 2. 设置项目文件权限
log_info "设置项目文件权限..."
find . -type f -name "*.py" -exec chmod 644 {} \;
find . -type f -name "*.sh" -exec chmod +x {} \;
find . -type f -name "*.yml" -exec chmod 644 {} \;
find . -type f -name "*.yaml" -exec chmod 644 {} \;
find . -type f -name "*.json" -exec chmod 644 {} \;
find . -type f -name "*.md" -exec chmod 644 {} \;
find . -type f -name "*.txt" -exec chmod 644 {} \;
find . -type f -name "*.html" -exec chmod 644 {} \;
find . -type f -name "*.css" -exec chmod 644 {} \;
find . -type f -name "*.js" -exec chmod 644 {} \;
log_success "项目文件权限设置完成"

# 3. 设置目录权限
log_info "设置目录权限..."
find . -type d -exec chmod 755 {} \;
log_success "目录权限设置完成"

# 4. 特殊处理static目录
log_info "设置static目录权限..."
if [ -d "static" ]; then
    chmod -R 755 static
    log_success "static目录权限设置完成"
fi

# 5. 特殊处理templates目录
log_info "设置templates目录权限..."
if [ -d "templates" ]; then
    chmod -R 755 templates
    log_success "templates目录权限设置完成"
fi

# 6. 停止现有容器并清理
log_info "停止现有容器..."
if docker ps -a --format "table {{.Names}}" | grep -q "duanju_app"; then
    docker stop duanju_app 2>/dev/null || true
    docker rm duanju_app 2>/dev/null || true
    log_success "现有容器已停止并删除"
fi

if docker ps -a --format "table {{.Names}}" | grep -q "duanju_app_1panel"; then
    docker stop duanju_app_1panel 2>/dev/null || true
    docker rm duanju_app_1panel 2>/dev/null || true
    log_success "现有1Panel容器已停止并删除"
fi

# 7. 清理Docker镜像缓存
log_info "清理Docker构建缓存..."
docker builder prune -f 2>/dev/null || true
log_success "Docker缓存清理完成"

# 8. 检查Docker守护进程权限
log_info "检查Docker权限..."
if groups $USER | grep -q docker; then
    log_success "用户已在docker组中"
else
    log_warning "用户不在docker组中，可能需要使用sudo"
    log_info "建议运行: sudo usermod -aG docker $USER"
    log_info "然后重新登录或运行: newgrp docker"
fi

# 9. 创建修复后的docker-compose文件
log_info "创建权限修复版docker-compose文件..."
cat > docker-compose.fixed.yml << 'EOF'
services:
  duanju:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: duanju_app_fixed
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
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    user: "0:0"  # 临时使用root用户解决权限问题
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

networks:
  default:
    name: duanju_network_fixed
    driver: bridge
EOF

log_success "权限修复版配置文件创建完成"

# 10. 显示修复结果
echo ""
log_success "=== 权限修复完成 ==="
echo ""
log_info "修复内容："
echo "  ✅ logs目录权限设置为777"
echo "  ✅ 项目文件权限规范化"
echo "  ✅ 目录权限设置为755" 
echo "  ✅ 清理了现有容器"
echo "  ✅ 清理了Docker缓存"
echo "  ✅ 创建了权限修复版配置"
echo ""
log_info "测试部署："
echo "  docker-compose -f docker-compose.fixed.yml up -d"
echo ""
log_info "如果仍有权限问题，可以尝试："
echo "  1. 使用sudo运行部署脚本"
echo "  2. 检查SELinux设置: getenforce"
echo "  3. 临时禁用SELinux: sudo setenforce 0"
echo "  4. 检查AppArmor设置"
echo ""
log_warning "注意: 权限修复版使用root用户运行容器，仅用于测试"

# 11. 创建SELinux修复命令（如果需要）
if command -v getenforce &> /dev/null; then
    if [ "$(getenforce)" = "Enforcing" ]; then
        log_warning "检测到SELinux处于强制模式"
        log_info "SELinux修复命令:"
        echo "  sudo setsebool -P container_manage_cgroup on"
        echo "  sudo chcon -Rt svirt_sandbox_file_t ./logs"
        echo "  或临时禁用: sudo setenforce 0"
    fi
fi

echo ""
log_success "权限修复脚本执行完成！"