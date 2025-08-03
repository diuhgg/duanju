# 部署指南

## 🚀 快速部署

### 环境要求
- Python 3.8+
- 内存: 512MB+
- 磁盘: 100MB+

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 环境配置
创建 `.env` 文件：
```bash
# 生产环境配置
FLASK_ENV=production
FLASK_DEBUG=false
LOG_LEVEL=WARNING

# 缓存配置
CACHE_TIMEOUT=7200
CACHE_MAX_SIZE=2000

# 性能配置
REQUEST_TIMEOUT=10
ASYNC_TIMEOUT=5
MAX_EPISODES=50
MAX_CONCURRENT_REQUESTS=20

# 安全配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=30
RATE_LIMIT_PER_HOUR=100
MAX_SEARCH_LENGTH=100
```

### 3. 启动方式

#### 开发环境
```bash
python app.py
```

#### 生产环境 (推荐)
```bash
# 使用 Gunicorn (推荐)
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app

# 或者使用更多配置
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 30 --keep-alive 2 wsgi:app
```

## 🐳 Docker 部署

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "wsgi:app"]
```

### 构建和运行
```bash
# 构建镜像
docker build -t video-player .

# 运行容器
docker run -d -p 5000:5000 --name video-player-app video-player
```

## ☁️ 云平台部署

### Vercel 部署
1. 创建 `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "wsgi.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "wsgi.py"
    }
  ]
}
```

2. 部署:
```bash
vercel --prod
```

### Heroku 部署
1. 创建 `Procfile`:
```
web: gunicorn wsgi:app
```

2. 部署:
```bash
git add .
git commit -m "Ready for deployment"
heroku create your-app-name
git push heroku main
```

## 🔧 性能优化

### Nginx 反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 系统服务 (systemd)
创建 `/etc/systemd/system/video-player.service`:
```ini
[Unit]
Description=Video Player Web App
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/your/app
Environment=PATH=/path/to/your/venv/bin
ExecStart=/path/to/your/venv/bin/gunicorn -w 4 -b 127.0.0.1:5000 wsgi:app
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl enable video-player
sudo systemctl start video-player
```

## 📊 监控和维护

### 健康检查
```bash
# 检查应用状态
curl http://localhost:5000/health

# 检查缓存统计
curl http://localhost:5000/cache/stats
```

### 日志管理
```bash
# 查看应用日志
tail -f /var/log/video-player.log

# 使用 journalctl (systemd)
journalctl -u video-player -f
```

### 缓存管理
```bash
# 清除缓存
curl -X GET http://localhost:5000/cache/clear
```

## 🔒 安全配置

### 1. 防火墙设置
```bash
# 只开放必要端口
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. SSL 证书 (Let's Encrypt)
```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

### 3. 环境变量安全
- 不要在代码中硬编码敏感信息
- 使用 `.env` 文件管理配置
- 在生产环境中使用环境变量

## 🚨 故障排除

### 常见问题

1. **端口占用**
```bash
# 查找占用端口的进程
lsof -i :5000
# 杀死进程
kill -9 <PID>
```

2. **内存不足**
```bash
# 检查内存使用
free -h
# 减少 worker 数量
gunicorn -w 2 -b 0.0.0.0:5000 wsgi:app
```

3. **权限问题**
```bash
# 检查文件权限
ls -la
# 修改权限
chmod 755 app.py
```

4. **依赖问题**
```bash
# 重新安装依赖
pip install --upgrade -r requirements.txt
```

## 📈 性能监控

### 推荐监控工具
- **Prometheus + Grafana**: 系统监控
- **New Relic**: 应用性能监控
- **Sentry**: 错误追踪
- **Uptime Robot**: 可用性监控

### 性能指标
- 响应时间: < 2秒
- 内存使用: < 512MB
- CPU 使用: < 80%
- 缓存命中率: > 70%

---

## 📞 技术支持

如果在部署过程中遇到问题，请检查：
1. 日志文件中的错误信息
2. 系统资源使用情况
3. 网络连接状态
4. 配置文件语法

**部署成功后访问**: `http://your-domain.com`