# 1Panel 快速部署指南

## 🚀 一键部署

### 方法一：使用自动化脚本（推荐）

```bash
# 1. 上传项目到服务器 /opt/duanju
# 2. 执行一键部署脚本
cd /opt/duanju
chmod +x 1panel-deploy.sh
./1panel-deploy.sh
```

### 方法二：手动在1Panel中部署

1. **登录1Panel管理面板**

2. **进入容器 → 编排**

3. **创建新编排**
   - 名称：`duanju-app`
   - 工作目录：`/opt/duanju`

4. **使用以下配置**：
   ```yaml
   services:
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
       volumes:
         - ./logs:/app/logs
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

5. **启动编排**

## 📋 部署清单

- [x] 上传项目文件到 `/opt/duanju`
- [x] 设置脚本执行权限 `chmod +x 1panel-deploy.sh`
- [x] 运行部署脚本 `./1panel-deploy.sh`
- [x] 在1Panel防火墙中开放端口 3366
- [x] 在云服务器安全组中开放端口 3366
- [x] 访问 `http://服务器IP:3366` 测试

## 🔧 常见问题

### 端口冲突
如果3366端口被占用，脚本会自动使用3367端口

### 构建失败
检查网络连接和Docker服务状态：
```bash
systemctl status docker
docker info
```

### 访问不了
1. 检查防火墙设置
2. 检查云服务器安全组
3. 检查容器状态：`docker ps`

## 📊 监控和管理

- **健康检查**：`http://IP:3366/health`
- **查看日志**：在1Panel容器管理中查看
- **重启服务**：在1Panel编排管理中重启

## 🛡️ 安全建议

1. 定期更新系统和Docker
2. 配置HTTPS（可选）
3. 设置访问白名单（如需要）

---

**部署完成后访问**：`http://your-server-ip:3366`