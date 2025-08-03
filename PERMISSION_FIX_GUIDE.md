# 权限问题修复指南

## 🔍 问题描述

错误信息：`'logs/error.log' isn't writable [PermissionError(13, 'Permission denied')]`

这是因为Docker容器内的应用用户(appuser, uid=1000)没有权限写入logs目录。

## 🛠️ 解决方案

### 方案一：使用权限修复脚本（推荐）

1. **上传并运行修复脚本**
   ```bash
   # 在1Panel终端中执行
   cd /opt/duanju
   chmod +x fix-permissions.sh
   ./fix-permissions.sh
   ```

2. **使用修复后的配置**
   ```bash
   # 测试部署
   docker-compose -f docker-compose.fixed.yml up -d
   ```

### 方案二：手动修复权限

1. **设置logs目录权限**
   ```bash
   mkdir -p logs
   chmod 777 logs
   chown -R 1000:1000 logs
   ```

2. **重新构建容器**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### 方案三：修改Docker配置（临时方案）

修改docker-compose文件，添加root用户运行：

```yaml
services:
  duanju:
    # ... 其他配置
    user: "0:0"  # 使用root用户
    volumes:
      - ./logs:/app/logs:rw  # 确保读写权限
```

### 方案四：SELinux环境修复

如果服务器启用了SELinux：

```bash
# 检查SELinux状态
getenforce

# 设置SELinux权限
sudo setsebool -P container_manage_cgroup on
sudo chcon -Rt svirt_sandbox_file_t ./logs

# 或临时禁用SELinux
sudo setenforce 0
```

## 📋 已修复的文件

### 1. Dockerfile
```dockerfile
# 修复前
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

# 修复后  
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app \
    && chmod -R 755 /app \
    && chmod -R 777 /app/logs
USER appuser
```

### 2. docker-compose.simple.yml
```yaml
# 修复前
volumes:
  - ./logs:/app/logs

# 修复后
volumes:
  - ./logs:/app/logs:rw
```

### 3. 1panel-deploy.sh
```bash
# 添加了权限设置
mkdir -p logs
chmod 777 logs
```

## 🧪 测试验证

### 1. 检查权限设置
```bash
# 检查logs目录权限
ls -la logs/

# 检查容器内权限
docker exec -it duanju_app_1panel ls -la /app/logs/
```

### 2. 检查日志写入
```bash
# 查看容器日志
docker-compose -f docker-compose.1panel.yml logs

# 检查应用日志文件
ls -la logs/
tail -f logs/access.log
tail -f logs/error.log
```

### 3. 健康检查
```bash
# 检查应用状态
curl http://localhost:3366/health

# 检查容器状态
docker ps
```

## 🚨 常见问题

### 1. 权限仍然被拒绝
```bash
# 尝试使用sudo
sudo ./fix-permissions.sh

# 或者临时使用root用户运行容器
# 在docker-compose.yml中添加: user: "0:0"
```

### 2. SELinux阻止访问
```bash
# 查看SELinux日志
sudo ausearch -m avc -ts recent

# 设置正确的SELinux上下文
sudo chcon -Rt svirt_sandbox_file_t ./logs
```

### 3. AppArmor限制
```bash
# 检查AppArmor状态
sudo aa-status

# 如果需要，可以暂时禁用
sudo aa-complain /usr/bin/docker
```

### 4. 文件系统挂载问题
```bash
# 检查挂载点权限
mount | grep logs

# 重新挂载（如果需要）
sudo mount -o remount,rw /path/to/logs
```

## 📝 部署检查清单

部署前请确认：

- [ ] logs目录已创建且权限为777
- [ ] Docker用户在docker组中
- [ ] SELinux配置正确（如果启用）
- [ ] 容器卷映射包含:rw标志
- [ ] 没有AppArmor限制
- [ ] 磁盘空间充足

## 🔄 重新部署步骤

如果权限问题已修复，重新部署：

```bash
# 1. 停止现有服务
docker-compose -f docker-compose.1panel.yml down

# 2. 清理缓存
docker builder prune -f

# 3. 重新部署
./1panel-deploy.sh

# 4. 验证部署
curl http://localhost:3366/health
docker-compose -f docker-compose.1panel.yml logs
```

## 📞 技术支持

如果问题仍然存在：

1. 检查系统日志：`journalctl -u docker`
2. 查看详细错误：`docker-compose logs -f`
3. 检查磁盘空间：`df -h`
4. 验证Docker版本：`docker --version`

---

**注意**: 权限问题通常是由于Docker容器内外用户ID不匹配造成的。修复脚本会统一设置正确的权限和所有权。