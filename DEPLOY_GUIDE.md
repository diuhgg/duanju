# 🚀 服务器部署指南

## 快速部署选择

### 方案一：Docker 部署 (推荐) ⭐

**适用场景**：大多数云服务器，简单快速

```bash
# 1. 克隆项目
git clone <your-repo> duanju
cd duanju

# 2. 直接启动
docker-compose up -d

# 3. 检查状态
docker-compose ps
```

访问：http://your-server-ip

---

### 方案二：传统部署

**适用场景**：需要更多控制权的服务器

```bash
# 1. 准备环境
chmod +x deploy.sh
./deploy.sh

# 2. 选择 "1) 直接部署"
# 脚本会自动完成所有配置

# 3. 启动服务
sudo systemctl start duanju
sudo systemctl enable duanju
```

---

### 方案三：手动部署

**适用场景**：自定义需求

```bash
# 1. 安装依赖
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt gunicorn

# 2. 创建配置
cp .env.example .env
# 编辑 .env 文件

# 3. 启动应用
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

---

## 🌐 云服务器部署

### 阿里云 ECS

```bash
# 1. 购买ECS实例 (1核2G即可)
# 2. 安装Docker
curl -fsSL https://get.docker.com | bash
sudo systemctl start docker
sudo systemctl enable docker

# 3. 安装docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. 部署应用
git clone <your-repo> duanju
cd duanju
docker-compose up -d
```

### 腾讯云 CVM

```bash
# 同阿里云步骤，或使用腾讯云Docker镜像
```

### AWS EC2

```bash
# Amazon Linux 2
sudo yum update -y
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# 安装docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 部署
git clone <your-repo> duanju
cd duanju
docker-compose up -d
```

---

## 🔧 配置说明

### 环境变量配置

创建 `.env` 文件：

```bash
# 基础配置
FLASK_ENV=production
LOG_LEVEL=WARNING

# 性能配置
CACHE_TIMEOUT=7200
MAX_EPISODES=50
MAX_CONCURRENT_REQUESTS=30

# 安全配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

### 端口配置

- **应用端口**：5000 (内部)
- **HTTP端口**：80 (外部访问)
- **HTTPS端口**：443 (如果配置SSL)

---

## 🛡️ 安全配置

### 防火墙设置

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### SSL证书 (可选)

```bash
# 使用 Let's Encrypt
sudo apt install certbot
sudo certbot --nginx -d your-domain.com
```

---

## 📊 监控和维护

### 查看日志

```bash
# Docker方式
docker-compose logs -f duanju

# 传统方式
sudo journalctl -u duanju -f
```

### 性能监控

```bash
# 访问监控端点
curl http://localhost/health
curl http://localhost/cache/stats
```

### 更新应用

```bash
# Docker方式
git pull
docker-compose build
docker-compose up -d

# 传统方式
git pull
sudo systemctl restart duanju
```

---

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **权限问题**
   ```bash
   sudo chown -R $USER:$USER /path/to/duanju
   ```

3. **内存不足**
   ```bash
   # 减少worker数量
   export WORKERS=2
   ```

4. **网络问题**
   ```bash
   # 检查防火墙
   sudo ufw status
   # 检查端口
   netstat -tlnp | grep :5000
   ```

### 日志位置

- **应用日志**：`logs/`
- **Nginx日志**：`/var/log/nginx/`
- **系统日志**：`/var/log/syslog`

---

## 📈 性能优化

### 服务器配置建议

| 用户量 | CPU | 内存 | 磁盘 | 带宽 |
|--------|-----|------|------|------|
| <1000  | 1核 | 1GB  | 20GB | 1M   |
| <5000  | 2核 | 2GB  | 40GB | 3M   |
| <10000 | 4核 | 4GB  | 80GB | 5M   |

### 缓存优化

```bash
# 增加缓存大小
export CACHE_MAX_SIZE=10000
export CACHE_TIMEOUT=14400
```

---

## 🎯 快速验证

部署完成后，访问以下地址验证：

- ✅ **主页**：http://your-server-ip
- ✅ **健康检查**：http://your-server-ip/health
- ✅ **缓存状态**：http://your-server-ip/cache/stats

看到正常响应即表示部署成功！🎉