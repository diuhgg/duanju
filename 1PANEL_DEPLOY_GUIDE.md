# 1Panel 部署指南 - 短剧搜索播放系统

## 🎯 部署概览

本指南提供在1Panel上部署短剧搜索播放系统的详细步骤。

## 📋 系统要求

- 1Panel 版本：1.8.0+
- 服务器：Linux（Ubuntu 20.04+ / CentOS 7+ / Debian 10+）
- 内存：至少 2GB
- 磁盘空间：至少 10GB
- Docker 版本：20.10+
- Docker Compose 版本：2.0+

## 🚀 部署步骤

### 步骤 1：准备项目文件

1. **上传项目文件到服务器**
   - 通过1Panel文件管理器上传整个项目文件夹到 `/opt/duanju/`
   - 或使用SFTP/Git上传

2. **设置文件权限**
   ```bash
   # 在1Panel终端中执行
   cd /opt/duanju
   chmod +x 1panel-deploy.sh
   chmod +x fix-permissions.sh
   ```

### 步骤 2：自动化部署（推荐）

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

### 步骤 3：手动部署（备选方案）

如果自动化脚本失败，可以手动部署：

1. **在1Panel中创建编排**
   - 进入 "容器" → "编排"
   - 点击 "创建编排"
   - 编排名称：`duanju-app`
   - 工作目录：`/opt/duanju`

2. **使用以下配置**：
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
         - ./logs:/app/logs:rw
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

### 步骤 4：配置防火墙

1. **在1Panel中配置防火墙**
   - 进入 "主机" → "防火墙"
   - 添加规则：端口 `3366`，协议 `TCP`，来源 `0.0.0.0/0`

2. **云服务器安全组**
   - 如果使用云服务器，需要在控制台开放 3366 端口

### 步骤 5：验证部署

1. **检查容器状态**
   - 在1Panel容器管理中查看容器是否正常运行

2. **访问应用**
   - 主页：`http://服务器IP:3366`
   - 健康检查：`http://服务器IP:3366/health`

## 🔧 常见问题解决

### 问题 1：权限被拒绝

```bash
# 运行权限修复脚本
chmod +x fix-permissions.sh
./fix-permissions.sh
```

### 问题 2：端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep 3366

# 脚本会自动切换到3367端口
```

### 问题 3：构建失败

```bash
# 检查Docker状态
systemctl status docker

# 清理缓存重新构建
docker system prune -f
docker-compose build --no-cache
```

### 问题 4：SELinux限制

```bash
# 检查SELinux状态
getenforce

# 设置SELinux权限
sudo setsebool -P container_manage_cgroup on
sudo chcon -Rt svirt_sandbox_file_t ./logs

# 或临时禁用SELinux
sudo setenforce 0
```

## 📊 管理命令

```bash
# 查看服务状态
docker-compose -f docker-compose.1panel.yml ps

# 查看日志
docker-compose -f docker-compose.1panel.yml logs -f

# 重启服务
docker-compose -f docker-compose.1panel.yml restart

# 停止服务
docker-compose -f docker-compose.1panel.yml down

# 重新构建
docker-compose -f docker-compose.1panel.yml build --no-cache
```

## 🔍 日志管理

1. **查看应用日志**
   ```bash
   # 在1Panel终端中
   cd /opt/duanju
   tail -f logs/access.log
   tail -f logs/error.log
   ```

2. **查看容器日志**
   ```bash
   docker-compose -f docker-compose.1panel.yml logs -f
   ```

## 🛡️ 安全建议

1. **定期更新**
   - 定期更新1Panel版本
   - 定期更新Docker镜像

2. **访问控制**
   - 配置IP白名单（如有需要）
   - 使用HTTPS（推荐）

3. **监控告警**
   - 设置资源使用告警
   - 设置应用可用性监控

## 📈 性能优化

1. **服务器配置**
   - 推荐：2核4GB内存起步
   - 生产环境：4核8GB内存

2. **监控设置**
   - 在1Panel中启用容器监控
   - 设置资源使用告警

## 📋 部署检查清单

- [ ] 服务器满足最低要求
- [ ] Docker和Docker Compose已安装
- [ ] 项目文件已上传到 `/opt/duanju/`
- [ ] 脚本权限已设置
- [ ] 部署脚本执行成功
- [ ] 防火墙端口已开放
- [ ] 云服务器安全组已配置
- [ ] 应用可正常访问
- [ ] 健康检查端点正常

## 🎉 部署完成

部署成功后，您将获得：

- ✅ 完整的短剧搜索播放系统
- ✅ 移动端适配的响应式界面
- ✅ 高性能的异步视频加载
- ✅ 智能缓存和性能优化
- ✅ 健康监控和日志记录
- ✅ 生产级别的安全配置

**访问地址**：`http://your-server-ip:3366`

---

## 📞 技术支持

如果在部署过程中遇到问题：

1. 查看权限修复指南：`PERMISSION_FIX_GUIDE.md`
2. 检查故障排除章节
3. 查看应用日志和容器状态
4. 确认网络和防火墙配置

**祝您部署成功！** 🎊