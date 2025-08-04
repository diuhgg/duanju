#!/bin/bash

# Debian服务器部署脚本 - 短剧搜索播放系统
echo "=== Debian服务器部署脚本 ==="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
        log_warning "检测到root用户，建议使用普通用户运行"
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    sudo apt update
    sudo apt upgrade -y
    log_success "系统更新完成"
}

# 安装Python和依赖
install_python() {
    log_info "安装Python和依赖..."
    
    # 安装Python3和pip
    sudo apt install -y python3 python3-pip python3-venv
    
    # 安装系统依赖
    sudo apt install -y curl wget git
    
    # 验证安装
    python3 --version
    pip3 --version
    
    log_success "Python环境安装完成"
}

# 创建项目目录
setup_project() {
    log_info "设置项目目录..."
    
    # 创建项目目录
    sudo mkdir -p /opt/duanju
    sudo chown $USER:$USER /opt/duanju
    
    # 复制项目文件到部署目录
    if [[ -f "app.py" ]]; then
        log_info "复制项目文件到 /opt/duanju..."
        cp -r * /opt/duanju/
    else
        log_error "请在项目根目录运行此脚本"
        exit 1
    fi
    
    cd /opt/duanju
    
    # 创建日志目录
    mkdir -p logs
    chmod 755 logs
    
    log_success "项目目录设置完成"
}

# 创建虚拟环境
setup_venv() {
    log_info "创建Python虚拟环境..."
    
    cd /opt/duanju
    
    # 创建虚拟环境
    python3 -m venv venv
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 升级pip
    pip install --upgrade pip
    
    # 安装项目依赖
    pip install -r requirements.txt
    
    log_success "虚拟环境设置完成"
}

# 创建systemd服务
create_service() {
    log_info "创建systemd服务..."
    
    # 创建服务文件
    sudo tee /etc/systemd/system/duanju.service > /dev/null << EOF
[Unit]
Description=短剧搜索播放系统
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/duanju
Environment=PATH=/opt/duanju/venv/bin
Environment=FLASK_ENV=production
Environment=LOG_LEVEL=WARNING
Environment=FLASK_APP=app.py
ExecStart=/opt/duanju/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # 重新加载systemd
    sudo systemctl daemon-reload
    
    # 启用服务
    sudo systemctl enable duanju.service
    
    log_success "systemd服务创建完成"
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    # 检查ufw是否安装
    if command -v ufw &> /dev/null; then
        sudo ufw allow 3366/tcp
        log_success "防火墙规则已添加"
    else
        log_warning "ufw未安装，请手动开放3366端口"
    fi
}

# 创建管理脚本
create_management_scripts() {
    log_info "创建管理脚本..."
    
    cd /opt/duanju
    
    # 创建启动脚本
    cat > start.sh << 'EOF'
#!/bin/bash
cd /opt/duanju
source venv/bin/activate
python app.py
EOF

    # 创建停止脚本
    cat > stop.sh << 'EOF'
#!/bin/bash
sudo systemctl stop duanju.service
EOF

    # 创建重启脚本
    cat > restart.sh << 'EOF'
#!/bin/bash
sudo systemctl restart duanju.service
EOF

    # 创建状态查看脚本
    cat > status.sh << 'EOF'
#!/bin/bash
sudo systemctl status duanju.service
EOF

    # 创建日志查看脚本
    cat > logs.sh << 'EOF'
#!/bin/bash
sudo journalctl -u duanju.service -f
EOF

    # 设置执行权限
    chmod +x start.sh stop.sh restart.sh status.sh logs.sh
    
    log_success "管理脚本创建完成"
}

# 启动服务
start_service() {
    log_info "启动服务..."
    
    sudo systemctl start duanju.service
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if sudo systemctl is-active --quiet duanju.service; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        sudo systemctl status duanju.service
        return 1
    fi
}

# 显示部署信息
show_deploy_info() {
    log_success "=== 部署完成 ==="
    echo
    log_info "访问地址："
    echo "  - 本地访问: http://localhost:3366"
    echo "  - 服务器访问: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):3366"
    echo
    log_info "管理命令："
    echo "  - 查看状态: sudo systemctl status duanju.service"
    echo "  - 启动服务: sudo systemctl start duanju.service"
    echo "  - 停止服务: sudo systemctl stop duanju.service"
    echo "  - 重启服务: sudo systemctl restart duanju.service"
    echo "  - 查看日志: sudo journalctl -u duanju.service -f"
    echo
    log_info "快捷命令："
    echo "  - 查看状态: ./status.sh"
    echo "  - 查看日志: ./logs.sh"
    echo "  - 重启服务: ./restart.sh"
    echo
    log_info "健康检查："
    echo "  - 健康状态: curl http://localhost:3366/health"
    echo "  - 缓存统计: curl http://localhost:3366/cache/stats"
    echo
    log_warning "请确保在云服务器控制台开放3366端口"
    echo
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "  Debian服务器部署脚本"
    echo "=================================="
    echo -e "${NC}"
    
    check_root
    update_system
    install_python
    setup_project
    setup_venv
    create_service
    setup_firewall
    create_management_scripts
    
    if start_service; then
        show_deploy_info
    else
        log_error "部署失败，请检查错误信息"
        exit 1
    fi
}

# 执行主函数
main "$@" 