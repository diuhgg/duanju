#!/bin/bash

# 短剧搜索播放系统部署脚本
# 支持多种部署方式：Docker、直接部署、Nginx反向代理

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_error() {
    print_message "$1" "$RED"
}

print_warning() {
    print_message "$1" "$YELLOW"
}

print_info() {
    print_message "$1" "$BLUE"
}

# 检查系统要求
check_requirements() {
    print_info "检查系统要求..."
    
    # 检查Python版本
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 未安装，请先安装 Python 3.8+"
        exit 1
    fi
    
    python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    print_info "Python 版本: $python_version"
    
    # 检查pip
    if ! command -v pip3 &> /dev/null; then
        print_error "pip3 未安装"
        exit 1
    fi
    
    print_message "系统要求检查通过"
}

# 安装依赖
install_dependencies() {
    print_info "安装Python依赖..."
    
    # 创建虚拟环境（如果不存在）
    if [ ! -d "venv" ]; then
        print_info "创建虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 升级pip
    pip install --upgrade pip
    
    # 安装依赖
    pip install -r requirements.txt
    
    # 安装生产环境依赖
    pip install gunicorn supervisor
    
    print_message "依赖安装完成"
}

# 创建生产环境配置
create_production_config() {
    print_info "创建生产环境配置..."
    
    cat > .env << EOF
# 生产环境配置
FLASK_ENV=production
FLASK_DEBUG=false
LOG_LEVEL=WARNING

# 缓存配置
CACHE_TIMEOUT=7200
CACHE_MAX_SIZE=5000

# 性能配置
REQUEST_TIMEOUT=8
ASYNC_TIMEOUT=15
MAX_EPISODES=50
MAX_CONCURRENT_REQUESTS=30

# 安全配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
MAX_SEARCH_LENGTH=100

# 服务器配置
HOST=0.0.0.0
PORT=5000
WORKERS=4
EOF
    
    print_message "生产环境配置创建完成"
}

# 创建Gunicorn配置
create_gunicorn_config() {
    print_info "创建Gunicorn配置..."
    
    cat > gunicorn.conf.py << EOF
# Gunicorn配置文件
import multiprocessing
import os

# 服务器套接字
bind = f"{os.getenv('HOST', '0.0.0.0')}:{os.getenv('PORT', '5000')}"
backlog = 2048

# 工作进程
workers = int(os.getenv('WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# 重启
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# 日志
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "warning"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# 进程命名
proc_name = "duanju_app"

# 安全
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# 性能
worker_tmp_dir = "/dev/shm"
EOF
    
    print_message "Gunicorn配置创建完成"
}

# 创建systemd服务文件
create_systemd_service() {
    print_info "创建systemd服务文件..."
    
    CURRENT_DIR=$(pwd)
    USER=$(whoami)
    
    sudo tee /etc/systemd/system/duanju.service > /dev/null << EOF
[Unit]
Description=Duanju Drama Search App
After=network.target

[Service]
Type=exec
User=$USER
Group=$USER
WorkingDirectory=$CURRENT_DIR
Environment=PATH=$CURRENT_DIR/venv/bin
ExecStart=$CURRENT_DIR/venv/bin/gunicorn -c gunicorn.conf.py wsgi:app
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新加载systemd配置
    sudo systemctl daemon-reload
    
    print_message "systemd服务文件创建完成"
}

# 创建Nginx配置
create_nginx_config() {
    print_info "创建Nginx配置..."
    
    cat > nginx.conf << EOF
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名
    
    # 静态文件缓存
    location /static/ {
        alias $(pwd)/static/;
        expires 7d;
        add_header Cache-Control "public, no-transform";
        
        # Gzip压缩
        gzip on;
        gzip_types text/css application/javascript text/javascript;
    }
    
    # API和页面请求
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
    
    # 安全头部
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # 限制请求大小
    client_max_body_size 1M;
}
EOF
    
    print_warning "请手动将 nginx.conf 复制到 /etc/nginx/sites-available/ 并启用"
    print_message "Nginx配置文件创建完成"
}

# 创建Docker配置
create_docker_config() {
    print_info "创建Docker配置..."
    
    # Dockerfile
    cat > Dockerfile << EOF
FROM python:3.9-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 复制应用代码
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 创建非root用户
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 5000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \\
    CMD curl -f http://localhost:5000/health || exit 1

# 启动命令
CMD ["gunicorn", "-c", "gunicorn.conf.py", "wsgi:app"]
EOF

    # docker-compose.yml
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  duanju:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - LOG_LEVEL=WARNING
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./static:/app/static:ro
    depends_on:
      - duanju
    restart: unless-stopped
EOF

    print_message "Docker配置文件创建完成"
}

# 部署函数
deploy_direct() {
    print_info "开始直接部署..."
    
    check_requirements
    install_dependencies
    create_production_config
    create_gunicorn_config
    
    # 创建日志目录
    mkdir -p logs
    
    # 创建systemd服务
    if command -v systemctl &> /dev/null; then
        create_systemd_service
        print_info "启用并启动服务..."
        sudo systemctl enable duanju
        sudo systemctl start duanju
        sudo systemctl status duanju
    else
        print_warning "systemctl 不可用，请手动启动应用"
        print_info "手动启动命令: source venv/bin/activate && gunicorn -c gunicorn.conf.py wsgi:app"
    fi
    
    print_message "直接部署完成！"
    print_info "应用地址: http://localhost:5000"
}

deploy_docker() {
    print_info "开始Docker部署..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    create_docker_config
    create_nginx_config
    
    print_info "构建Docker镜像..."
    docker-compose build
    
    print_info "启动服务..."
    docker-compose up -d
    
    print_info "检查服务状态..."
    docker-compose ps
    
    print_message "Docker部署完成！"
    print_info "应用地址: http://localhost"
}

deploy_with_nginx() {
    print_info "开始Nginx反向代理部署..."
    
    deploy_direct
    create_nginx_config
    
    print_warning "请按以下步骤配置Nginx:"
    print_info "1. sudo cp nginx.conf /etc/nginx/sites-available/duanju"
    print_info "2. sudo ln -s /etc/nginx/sites-available/duanju /etc/nginx/sites-enabled/"
    print_info "3. sudo nginx -t"
    print_info "4. sudo systemctl reload nginx"
    
    print_message "Nginx配置完成！"
}

# 主菜单
show_menu() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "     短剧搜索播放系统 - 部署工具"
    echo "=========================================="
    echo -e "${NC}"
    echo "请选择部署方式:"
    echo "1) 直接部署 (Python + Gunicorn)"
    echo "2) Docker部署 (推荐)"
    echo "3) Nginx反向代理部署"
    echo "4) 仅创建配置文件"
    echo "5) 退出"
    echo
}

# 主程序
main() {
    while true; do
        show_menu
        read -p "请输入选项 (1-5): " choice
        
        case $choice in
            1)
                deploy_direct
                break
                ;;
            2)
                deploy_docker
                break
                ;;
            3)
                deploy_with_nginx
                break
                ;;
            4)
                create_production_config
                create_gunicorn_config
                create_docker_config
                create_nginx_config
                print_message "所有配置文件创建完成！"
                break
                ;;
            5)
                print_info "退出部署工具"
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                ;;
        esac
    done
}

# 如果直接运行脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi