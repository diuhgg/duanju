#!/bin/bash

# API服务检查脚本
echo "=== API服务状态检查 ==="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查函数
check_service() {
    echo -e "${BLUE}[检查]${NC} systemd服务状态..."
    if sudo systemctl is-active --quiet duanju.service; then
        echo -e "${GREEN}✅ 服务正在运行${NC}"
        sudo systemctl status duanju.service --no-pager -l
    else
        echo -e "${RED}❌ 服务未运行${NC}"
        return 1
    fi
}

check_port() {
    echo -e "${BLUE}[检查]${NC} 端口监听状态..."
    if sudo netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
        echo -e "${GREEN}✅ 端口5000正在监听${NC}"
        sudo netstat -tlnp | grep ":5000"
    else
        echo -e "${RED}❌ 端口5000未监听${NC}"
        return 1
    fi
}

check_health() {
    echo -e "${BLUE}[检查]${NC} 健康检查端点..."
    if curl -s -f http://localhost:5000/health > /dev/null; then
        echo -e "${GREEN}✅ 健康检查通过${NC}"
        echo "响应内容："
        curl -s http://localhost:5000/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5000/health
    else
        echo -e "${RED}❌ 健康检查失败${NC}"
        return 1
    fi
}

check_cache() {
    echo -e "${BLUE}[检查]${NC} 缓存统计端点..."
    if curl -s -f http://localhost:5000/cache/stats > /dev/null; then
        echo -e "${GREEN}✅ 缓存统计正常${NC}"
        echo "缓存统计："
        curl -s http://localhost:5000/cache/stats | python3 -m json.tool 2>/dev/null || curl -s http://localhost:5000/cache/stats
    else
        echo -e "${RED}❌ 缓存统计失败${NC}"
        return 1
    fi
}

check_homepage() {
    echo -e "${BLUE}[检查]${NC} 主页访问..."
    if curl -s -f http://localhost:5000/ > /dev/null; then
        echo -e "${GREEN}✅ 主页可访问${NC}"
    else
        echo -e "${RED}❌ 主页访问失败${NC}"
        return 1
    fi
}

check_firewall() {
    echo -e "${BLUE}[检查]${NC} 防火墙状态..."
    if sudo ufw status | grep -q "5000/tcp"; then
        echo -e "${GREEN}✅ 防火墙已开放端口5000${NC}"
    else
        echo -e "${YELLOW}⚠️ 防火墙未开放端口5000${NC}"
        echo "建议运行: sudo ufw allow 5000/tcp"
    fi
}

check_logs() {
    echo -e "${BLUE}[检查]${NC} 最近日志..."
    echo "最近10条日志："
    sudo journalctl -u duanju.service -n 10 --no-pager
}

# 主检查流程
main() {
    echo "开始API服务检查..."
    echo
    
    local all_passed=true
    
    # 执行各项检查
    check_service || all_passed=false
    echo
    
    check_port || all_passed=false
    echo
    
    check_health || all_passed=false
    echo
    
    check_cache || all_passed=false
    echo
    
    check_homepage || all_passed=false
    echo
    
    check_firewall
    echo
    
    check_logs
    echo
    
    # 总结
    if $all_passed; then
        echo -e "${GREEN}🎉 所有检查通过！API服务正常运行${NC}"
        echo
        echo "访问地址："
        echo "  - 本地: http://localhost:5000"
        echo "  - 外部: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP'):5000"
    else
        echo -e "${RED}❌ 部分检查失败，请查看上述错误信息${NC}"
        echo
        echo "故障排除建议："
        echo "1. 重启服务: sudo systemctl restart duanju.service"
        echo "2. 查看详细日志: sudo journalctl -u duanju.service -f"
        echo "3. 检查防火墙: sudo ufw status"
        echo "4. 检查端口占用: sudo netstat -tlnp | grep 5000"
    fi
}

# 执行主函数
main "$@" 