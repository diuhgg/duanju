# 🚀 部署检查清单

## 📋 部署前准备

### ✅ 服务器要求
- [ ] 服务器系统：Ubuntu 18.04+ / CentOS 7+ / Amazon Linux 2
- [ ] 内存：至少 1GB RAM
- [ ] 磁盘：至少 20GB 可用空间
- [ ] 网络：可访问外网（用于下载依赖）
- [ ] 端口：80, 443 可用

### ✅ 域名和SSL (可选)
- [ ] 域名已购买并解析到服务器IP
- [ ] SSL证书已准备（或使用Let's Encrypt）

### ✅ 代码准备
- [ ] 代码已推送到Git仓库
- [ ] 配置文件已检查
- [ ] 敏感信息已使用环境变量

---

## 🐳 Docker 部署清单

### ✅ 环境准备
```bash
# 检查Docker版本
docker --version  # 应该 >= 20.10

# 检查docker-compose版本
docker-compose --version  # 应该 >= 2.0
```

### ✅ 部署步骤
- [ ] 1. 克隆代码到服务器
- [ ] 2. 创建 `.env` 文件
- [ ] 3. 构建镜像：`docker-compose build`
- [ ] 4. 启动服务：`docker-compose up -d`
- [ ] 5. 检查服务状态：`docker-compose ps`

### ✅ 验证检查
- [ ] 容器运行正常：`docker-compose ps`
- [ ] 应用响应正常：`curl http://localhost/health`
- [ ] 日志无错误：`docker-compose logs duanju`

---

## 🖥️ 传统部署清单

### ✅ 环境准备
```bash
# 检查Python版本
python3 --version  # 应该 >= 3.8

# 检查系统包管理器
apt --version || yum --version
```

### ✅ 部署步骤
- [ ] 1. 运行部署脚本：`./deploy.sh`
- [ ] 2. 选择部署方式
- [ ] 3. 等待自动配置完成
- [ ] 4. 启动服务：`sudo systemctl start duanju`
- [ ] 5. 设置开机启动：`sudo systemctl enable duanju`

### ✅ 验证检查
- [ ] 服务运行正常：`sudo systemctl status duanju`
- [ ] 应用响应正常：`curl http://localhost:5000/health`
- [ ] 日志无错误：`sudo journalctl -u duanju`

---

## 🌐 Nginx 反向代理清单

### ✅ Nginx 配置
- [ ] 1. 安装Nginx：`sudo apt install nginx`
- [ ] 2. 复制配置文件到 `/etc/nginx/sites-available/`
- [ ] 3. 创建软链接到 `/etc/nginx/sites-enabled/`
- [ ] 4. 测试配置：`sudo nginx -t`
- [ ] 5. 重载Nginx：`sudo systemctl reload nginx`

### ✅ SSL 配置 (可选)
- [ ] 1. 安装Certbot：`sudo apt install certbot python3-certbot-nginx`
- [ ] 2. 申请证书：`sudo certbot --nginx -d your-domain.com`
- [ ] 3. 测试自动续期：`sudo certbot renew --dry-run`

---

## 🔒 安全配置清单

### ✅ 防火墙设置
```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### ✅ 系统安全
- [ ] SSH密钥登录已配置
- [ ] root登录已禁用
- [ ] 系统包已更新到最新版本
- [ ] 不必要的服务已关闭

---

## 📊 监控配置清单

### ✅ 日志配置
- [ ] 应用日志轮转已配置
- [ ] Nginx日志轮转已配置
- [ ] 系统日志监控已设置

### ✅ 性能监控
- [ ] CPU使用率监控
- [ ] 内存使用率监控
- [ ] 磁盘空间监控
- [ ] 网络流量监控

### ✅ 应用监控
- [ ] 健康检查端点正常：`/health`
- [ ] 缓存状态端点正常：`/cache/stats`
- [ ] 错误日志监控已设置

---

## 🧪 测试验证清单

### ✅ 功能测试
- [ ] 主页加载正常
- [ ] 搜索功能正常
- [ ] 播放页面正常
- [ ] 移动端适配正常

### ✅ 性能测试
```bash
# 使用ab进行简单压力测试
ab -n 100 -c 10 http://your-server/

# 检查响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://your-server/
```

### ✅ 安全测试
- [ ] HTTPS重定向正常
- [ ] 安全头部设置正确
- [ ] 敏感信息未暴露
- [ ] 频率限制功能正常

---

## 🚨 故障排除清单

### ✅ 常见问题检查
- [ ] 端口是否被占用：`sudo lsof -i :80`
- [ ] 磁盘空间是否充足：`df -h`
- [ ] 内存使用是否正常：`free -h`
- [ ] 网络连接是否正常：`ping 8.8.8.8`

### ✅ 日志检查
- [ ] 应用错误日志：`tail -f logs/error.log`
- [ ] Nginx错误日志：`tail -f /var/log/nginx/error.log`
- [ ] 系统日志：`tail -f /var/log/syslog`

---

## 📝 部署完成后

### ✅ 文档更新
- [ ] 更新部署文档
- [ ] 记录服务器信息
- [ ] 更新监控配置
- [ ] 备份重要配置文件

### ✅ 通知和交接
- [ ] 通知相关人员部署完成
- [ ] 提供访问地址和监控地址
- [ ] 交接运维相关信息

---

## 🎯 验证命令汇总

```bash
# 快速验证脚本
#!/bin/bash
echo "🔍 验证部署状态..."

echo "1. 检查服务状态"
curl -s http://localhost/health | jq .

echo "2. 检查缓存状态"
curl -s http://localhost/cache/stats | jq .

echo "3. 检查响应时间"
curl -w "Response Time: %{time_total}s\n" -o /dev/null -s http://localhost/

echo "4. 检查SSL (如果配置)"
curl -I https://your-domain.com 2>/dev/null | head -1

echo "✅ 验证完成！"
```

---

**📌 提示：建议将此清单打印出来，在部署过程中逐项检查，确保不遗漏任何重要步骤。**