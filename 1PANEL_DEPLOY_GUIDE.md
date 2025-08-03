# 1Panel 部署指南 - 短剧搜索播放系统

## 系统要求

- 1Panel 版本：1.8.0+
- 服务器：Linux（Ubuntu 20.04+ / CentOS 7+ / Debian 10+）
- 内存：至少 2GB
- 磁盘空间：至少 10GB
- Docker 版本：20.10+
- Docker Compose 版本：2.0+

## 部署步骤

### 步骤 1：准备项目文件

#### 方法一：直接上传（推荐）

1. **打包项目文件**
   - 在Windows上运行 `1panel-deploy.bat` 生成部署文件
   - 或手动打包所有项目文件

2. **上传到服务器**
   - 通过1Panel文件管理器上传到 `/opt/duanju/`
   - 或使用SFTP/SCP上传

3. **设置文件权限**
   ```bash
   # 在1Panel终端中执行
   cd /opt/duanju
   chmod +x deploy.sh
   chmod +x 1panel-deploy.sh
   chmod +x fix-docker.sh
   ```

#### 方法二：使用Git（如果有仓库）

```bash
# 在1Panel终端中执行
cd /opt
git clone https://github.com/your-username/duanju.git
cd duanju
chmod +x *.sh
```

### 步骤 2：部署应用

#### 方法一：使用自动化脚本（最简单）

1. **运行部署脚本**
   ```bash
   # 在1Panel终端中执行
   cd /opt/duanju
   ./1panel-deploy.sh
   ```

2. **等待部署完成**
   - 脚本会自动检测环境
   - 生成1Panel专用配置
   - 构建和启动容器
   - 显示访问信息

3. **验证部署**
   - 访问显示的URL测试功能
   - 检查健康状态端点

#### 方法二：使用Docker Compose（手动）

1. **登录1Panel管理面板**
   - 访问：`http://your-server-ip:port`

2. **进入容器管理**
   - 点击左侧菜单 "容器" → "编排"

3. **创建新的编排**
   - 点击 "创建编排"
   - 编排名称：`duanju-app`
   - 工作目录：`/opt/duanju`
   - 选择 "上传文件" 或 "在线编辑"

4. **上传或编辑docker-compose.yml**
   
   **选择简化版本（推荐）：**
   ```yaml
   services:
     # 主应用服务
     duanju:
       build: 
         context: .
         dockerfile: Dockerfile
       container_name: duanju_app
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
         - ./logs:/app/logs
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 30s
   ```

5. **启动编排**
   - 点击 "创建并启动"
   - 等待构建和启动完成（首次构建可能需要5-10分钟）

#### 方法二：使用单个容器

1. **进入容器管理**
   - 点击左侧菜单 "容器" → "容器"

2. **创建容器**
   - 点击 "创建容器"
   - 容器名称：`duanju-app`
   - 镜像来源：选择 "构建"
   - 构建路径：`/opt/duanju`
   - Dockerfile路径：`Dockerfile`

3. **配置端口映射**
   - 容器端口：`3366`
   - 服务器端口：`3366`

4. **配置环境变量**
   ```
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
   ```

5. **配置卷映射**
   - 容器路径：`/app/logs`
   - 服务器路径：`/opt/duanju/logs`

6. **启动容器**
   - 点击 "创建并启动"

### 步骤 3：配置防火墙和安全组

1. **在1Panel中配置防火墙**
   - 进入 "主机" → "防火墙"
   - 添加规则：端口 `3366`，协议 `TCP`，来源 `0.0.0.0/0`

2. **云服务器安全组**
   - 如果使用阿里云/腾讯云等，需要在控制台开放 3366 端口

### 步骤 4：配置反向代理（可选）

如果需要使用域名访问，可以在1Panel中配置Nginx反向代理：

1. **进入网站管理**
   - 点击左侧菜单 "网站"

2. **创建网站**
   - 域名：`your-domain.com`
   - 类型：选择 "反向代理"
   - 代理地址：`http://127.0.0.1:3366`

3. **配置SSL证书**（可选）
   - 可以申请Let's Encrypt免费证书

### 步骤 5：验证部署

1. **检查容器状态**
   - 在1Panel容器管理中查看容器是否正常运行
   - 查看日志是否有错误

2. **访问应用**
   - 直接访问：`http://your-server-ip:3366`
   - 通过域名访问：`http://your-domain.com`（如果配置了反向代理）

3. **健康检查**
   - 访问：`http://your-server-ip:3366/health`
   - 应该返回 JSON 格式的健康状态

## 常见问题解决

### 问题 1：端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3366

# 修改端口（在docker-compose.yml中）
ports:
  - "3367:3366"  # 改为其他端口
```

### 问题 2：构建失败

1. **检查网络连接**
   ```bash
   # 测试网络
   ping pypi.org
   ```

2. **使用国内镜像源**
   - 修改Dockerfile，添加pip镜像源：
   ```dockerfile
   RUN pip install --no-cache-dir --upgrade pip -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

### 问题 3：容器启动失败

1. **查看容器日志**
   - 在1Panel容器管理中查看详细日志

2. **检查文件权限**
   ```bash
   cd /opt/duanju
   chown -R 1000:1000 .
   chmod +x deploy.sh
   ```

### 问题 4：访问超时

1. **检查防火墙设置**
2. **检查云服务器安全组**
3. **检查应用是否正常启动**

## 性能优化建议

1. **服务器配置**
   - 推荐：2核4GB内存起步
   - 生产环境：4核8GB内存

2. **Docker资源限制**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2.0'
         memory: 2G
       reservations:
         cpus: '0.5'
         memory: 512M
   ```

3. **监控设置**
   - 在1Panel中启用容器监控
   - 设置资源使用告警

## 日志管理

1. **查看应用日志**
   ```bash
   # 在1Panel终端中
   cd /opt/duanju
   tail -f logs/access.log
   tail -f logs/error.log
   ```

2. **日志轮转配置**
   - 1Panel会自动处理Docker容器日志轮转

## 备份和恢复

1. **数据备份**
   ```bash
   # 备份整个应用目录
   tar -czf duanju-backup-$(date +%Y%m%d).tar.gz /opt/duanju
   ```

2. **恢复数据**
   ```bash
   # 恢复备份
   tar -xzf duanju-backup-YYYYMMDD.tar.gz -C /
   ```

## 更新部署

1. **更新代码**
   - 上传新代码到 `/opt/duanju`

2. **重新构建**
   - 在1Panel编排管理中点击 "重新构建"
   - 或使用命令：`docker-compose build --no-cache`

3. **重启服务**
   - 在1Panel中重启编排或容器

## 技术支持

- 应用健康检查：`http://your-server-ip:3366/health`
- 缓存统计：`http://your-server-ip:3366/cache/stats`
- 清理缓存：`http://your-server-ip:3366/cache/clear`

## 安全建议

1. **定期更新**
   - 定期更新1Panel版本
   - 定期更新Docker镜像

2. **访问控制**
   - 配置IP白名单（如有需要）
   - 使用HTTPS（推荐）

3. **监控告警**
   - 设置资源使用告警
   - 设置应用可用性监控

---

## 快速部署命令

如果您熟悉命令行，可以使用以下快速部署命令：

```bash
# 1. 上传代码到服务器
cd /opt
git clone your-repo duanju  # 或上传文件

# 2. 进入目录
cd duanju

# 3. 设置权限
chmod +x deploy.sh

# 4. 快速部署
./deploy.sh simple

# 5. 检查状态
docker-compose -f docker-compose.simple.yml ps
```

部署完成后访问：`http://your-server-ip:3366`