#!/bin/bash

# 1Panel 部署脚本 - 短剧搜索播放系统
# 使用方法: ./1panel-deploy.sh

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

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户，建议使用普通用户部署"
    fi
}

# 检查系统环境
check_environment() {
    log_info "检查系统环境..."
    
    # 检查操作系统
    if [[ ! -f /etc/os-release ]]; then
        log_error "不支持的操作系统"
        exit 1
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装Docker"
        exit 1
    fi
    
    # 检查Docker Compose (支持v1和v2)
    COMPOSE_CMD=""
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose 未安装，请先安装Docker Compose"
        exit 1
    fi
    
    log_info "使用Docker Compose命令: $COMPOSE_CMD"
    
    # 检查curl是否安装（用于健康检查）
    if ! command -v curl &> /dev/null; then
        log_warning "curl 未安装，将尝试安装..."
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y curl
        elif command -v yum &> /dev/null; then
            yum install -y curl
        elif command -v apk &> /dev/null; then
            apk add curl
        else
            log_warning "无法自动安装curl，健康检查可能失败"
        fi
    fi
    
    # 检查端口占用
    if ss -tlnp 2>/dev/null | grep -q ":3366 " || netstat -tlnp 2>/dev/null | grep -q ":3366 "; then
        log_warning "端口3366已被占用，将使用端口3367"
        export DEPLOY_PORT=3367
    else
        export DEPLOY_PORT=3366
    fi
    
    log_success "环境检查完成"
}

# 创建部署目录
create_deploy_dir() {
    log_info "创建部署目录..."
    
    # 如果当前不在项目目录，创建部署目录
    if [[ ! -f "app.py" ]]; then
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    # 创建日志目录
    mkdir -p logs
    
    log_success "部署目录创建完成"
}

# 生成1Panel专用的docker-compose文件
generate_1panel_compose() {
    log_info "生成1Panel专用配置文件..."
    
    cat > docker-compose.1panel.yml << EOF
services:
  # 短剧搜索播放系统
  duanju:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: duanju_app_1panel
    ports:
      - "${DEPLOY_PORT}:3366"
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
      - ./logs:/app/logs
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    # 注意: deploy 配置在单机模式下可能不生效，仅在Docker Swarm模式下有效
    # deploy:
    #   resources:
    #     limits:
    #       cpus: '2.0'
    #       memory: 2G
    #     reservations:
    #       cpus: '0.5'
    #       memory: 512M
    # labels:
    #   - "traefik.enable=true"
    #   - "traefik.http.routers.duanju.rule=Host(\`localhost\`)"
    #   - "traefik.http.services.duanju.loadbalancer.server.port=3366"

networks:
  default:
    name: duanju_network
    driver: bridge
EOF
    
    log_success "1Panel配置文件生成完成"
}

# 构建和启动服务
deploy_service() {
    log_info "开始构建和部署服务..."
    
    # 停止已存在的容器
    if docker ps -a --format "table {{.Names}}" | grep -q "duanju_app_1panel"; then
        log_info "停止已存在的容器..."
        $COMPOSE_CMD -f docker-compose.1panel.yml down 2>/dev/null || true
    fi
    
    # 构建镜像
    log_info "构建Docker镜像..."
    $COMPOSE_CMD -f docker-compose.1panel.yml build --no-cache
    
    # 启动服务
    log_info "启动服务..."
    $COMPOSE_CMD -f docker-compose.1panel.yml up -d
    
    log_success "服务部署完成"
}

# 等待服务启动
wait_for_service() {
    log_info "等待服务启动..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:${DEPLOY_PORT}/health" &>/dev/null; then
            log_success "服务已成功启动"
            return 0
        fi
        
        log_info "等待服务启动... (${attempt}/${max_attempts})"
        sleep 10
        ((attempt++))
    done
    
    log_error "服务启动超时，请检查日志"
    return 1
}

# 显示部署信息
show_deploy_info() {
    log_success "=== 部署完成 ==="
    echo
    log_info "访问地址："
    echo "  - 本地访问: http://localhost:${DEPLOY_PORT}"
    echo "  - 服务器访问: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):${DEPLOY_PORT}"
    echo
    log_info "管理命令："
    echo "  - 查看状态: $COMPOSE_CMD -f docker-compose.1panel.yml ps"
    echo "  - 查看日志: $COMPOSE_CMD -f docker-compose.1panel.yml logs -f"
    echo "  - 停止服务: $COMPOSE_CMD -f docker-compose.1panel.yml down"
    echo "  - 重启服务: $COMPOSE_CMD -f docker-compose.1panel.yml restart"
    echo
    log_info "健康检查："
    echo "  - 健康状态: curl http://localhost:${DEPLOY_PORT}/health"
    echo "  - 缓存统计: curl http://localhost:${DEPLOY_PORT}/cache/stats"
    echo
    log_info "日志文件："
    echo "  - 应用日志: ./logs/"
    echo "  - 容器日志: $COMPOSE_CMD -f docker-compose.1panel.yml logs"
    echo
    log_warning "请确保在1Panel防火墙中开放端口 ${DEPLOY_PORT}"
    echo
}

# 创建1Panel导入文件
create_1panel_import() {
    log_info "创建1Panel导入配置..."
    
    cat > 1panel-import.json << EOF
{
  "name": "短剧搜索播放系统",
  "description": "基于Flask的短剧搜索和播放系统",
  "version": "1.0.0",
  "compose_file": "docker-compose.1panel.yml",
  "env_file": ".env.1panel",
  "port": ${DEPLOY_PORT},
  "health_check": "/health",
  "tags": ["entertainment", "video", "flask"],
  "requirements": {
    "memory": "512MB",
    "cpu": "0.5",
    "disk": "2GB"
  },
  "features": [
    "短剧搜索",
    "在线播放",
    "移动端适配",
    "缓存优化",
    "健康监控"
  ]
}
EOF
    
    # 创建环境变量文件
    cat > .env.1panel << EOF
# 1Panel 环境变量配置
DEPLOY_PORT=${DEPLOY_PORT}
FLASK_ENV=production
LOG_LEVEL=WARNING
CACHE_TIMEOUT=7200
CACHE_MAX_SIZE=5000
MAX_EPISODES=50
REQUEST_TIMEOUT=8
ASYNC_TIMEOUT=15
MAX_CONCURRENT_REQUESTS=30
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
EOF
    
    log_success "1Panel导入配置创建完成"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "  短剧搜索播放系统 - 1Panel部署"
    echo "=================================="
    echo -e "${NC}"
    
    check_root
    check_environment
    create_deploy_dir
    generate_1panel_compose
    create_1panel_import
    deploy_service
    
    if wait_for_service; then
        show_deploy_info
        
        # 测试基本功能
        log_info "测试基本功能..."
        if curl -s "http://localhost:${DEPLOY_PORT}" | grep -q "短剧搜索" 2>/dev/null; then
            log_success "功能测试通过"
        else
            log_warning "功能测试失败，请检查应用状态"
        fi
        
    else
        log_error "部署失败，请检查错误信息"
        echo
        log_info "故障排除："
        echo "1. 查看容器日志: $COMPOSE_CMD -f docker-compose.1panel.yml logs"
        echo "2. 检查端口占用: ss -tlnp | grep ${DEPLOY_PORT} 或 netstat -tlnp | grep ${DEPLOY_PORT}"
        echo "3. 检查防火墙设置"
        echo "4. 检查Docker服务状态: systemctl status docker"
        exit 1
    fi
}

# 清理函数
cleanup() {
    log_info "执行清理操作..."
    # 这里可以添加清理逻辑
}

# 信号处理
trap cleanup EXIT

# 执行主函数
main "$@"