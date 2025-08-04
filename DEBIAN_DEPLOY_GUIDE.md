# Debian服务器部署指南

## 🎯 快速部署

### 方法一：自动化部署（推荐）

```bash
# 1. 上传项目文件到服务器
# 2. 运行部署脚本
chmod +x debian-deploy.sh
./debian-deploy.sh
```

### 方法二：手动部署

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 安装Python环境
sudo apt install -y python3 python3-pip python3-venv curl

# 3. 创建项目目录
sudo mkdir -p /opt/duanju
sudo chown $USER:$USER /opt/duanju
cd /opt/duanju

# 4. 复制项目文件
# 将项目文件上传到 /opt/duanju/

# 5. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 6. 创建systemd服务
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
ExecStart=/opt/duanju/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. 启动服务
sudo systemctl daemon-reload
sudo systemctl enable duanju.service
sudo systemctl start duanju.service

# 8. 配置防火墙
sudo ufw allow 3366/tcp
```

## 🔧 管理命令

### 服务管理
```bash
# 查看服务状态
sudo systemctl status duanju.service

# 启动服务
sudo systemctl start duanju.service

# 停止服务
sudo systemctl stop duanju.service

# 重启服务
sudo systemctl restart duanju.service

# 查看日志
sudo journalctl -u duanju.service -f
```

### 应用管理
```bash
# 进入项目目录
cd /opt/duanju

# 激活虚拟环境
source venv/bin/activate

# 手动运行（开发模式）
python app.py

# 使用Gunicorn（生产推荐）
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:3366 wsgi:app
```

## 📊 访问地址

- **主页**: http://your-server-ip:3366
- **健康检查**: http://your-server-ip:3366/health
- **缓存统计**: http://your-server-ip:3366/cache/stats

## 🛠️ 故障排除

### 问题1：服务启动失败
```bash
# 查看详细错误
sudo journalctl -u duanju.service -n 50

# 检查端口占用
sudo netstat -tlnp | grep 3366

# 检查文件权限
ls -la /opt/duanju/
```

### 问题2：依赖安装失败
```bash
# 更新pip
pip install --upgrade pip

# 清理缓存
pip cache purge

# 重新安装
pip install -r requirements.txt --no-cache-dir
```

### 问题3：防火墙问题
```bash
# 检查防火墙状态
sudo ufw status

# 开放端口
sudo ufw allow 3366/tcp

# 重新加载防火墙
sudo ufw reload
```

### 问题4：权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER /opt/duanju
chmod +x /opt/duanju/*.sh

# 修复日志目录权限
chmod 755 /opt/duanju/logs
```

## 📈 性能优化

### 使用Gunicorn
```bash
# 安装Gunicorn
pip install gunicorn

# 创建Gunicorn配置
cat > gunicorn.conf.py << EOF
bind = "0.0.0.0:3366"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
EOF

# 使用Gunicorn启动
gunicorn -c gunicorn.conf.py wsgi:app
```

### 使用Nginx反向代理
```bash
# 安装Nginx
sudo apt install -y nginx

# 创建Nginx配置
sudo tee /etc/nginx/sites-available/duanju << EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3366;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 启用站点
sudo ln -s /etc/nginx/sites-available/duanju /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔍 监控和日志

### 查看应用日志
```bash
# 实时查看日志
tail -f /opt/duanju/logs/*.log

# 查看系统日志
sudo journalctl -u duanju.service -f
```

### 监控命令
```bash
# 检查服务状态
sudo systemctl is-active duanju.service

# 检查端口监听
sudo ss -tlnp | grep 3366

# 检查进程
ps aux | grep python
```

## 🛡️ 安全建议

1. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade
   ```

2. **配置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 3366/tcp
   ```

3. **使用HTTPS**
   - 配置SSL证书
   - 使用Let's Encrypt免费证书

4. **定期备份**
   ```bash
   # 备份项目文件
   tar -czf duanju-backup-$(date +%Y%m%d).tar.gz /opt/duanju/
   ```

## 📋 部署检查清单

- [ ] 系统已更新
- [ ] Python3和pip已安装
- [ ] 项目文件已上传到/opt/duanju/
- [ ] 虚拟环境已创建
- [ ] 依赖已安装
- [ ] systemd服务已创建
- [ ] 服务已启动
- [ ] 防火墙已配置
- [ ] 端口已开放
- [ ] 应用可正常访问

## 🎉 部署完成

部署成功后，您将获得：

- ✅ 生产级别的Python应用
- ✅ 自动重启的systemd服务
- ✅ 完整的日志记录
- ✅ 防火墙保护
- ✅ 性能监控
- ✅ 故障恢复机制

**访问地址**: `http://your-server-ip:3366`

---

## 📞 技术支持

如果遇到问题：

1. 查看服务状态：`sudo systemctl status duanju.service`
2. 查看错误日志：`sudo journalctl -u duanju.service -n 50`
3. 检查网络连接：`curl http://localhost:3366/health`
4. 验证防火墙：`sudo ufw status`

**祝您部署成功！** 🎊 