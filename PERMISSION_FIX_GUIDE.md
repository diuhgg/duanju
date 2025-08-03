# 权限问题修复指南

## 🔍 问题描述

错误信息：`'logs/error.log' isn't writable [PermissionError(13, 'Permission denied')]`

这是因为Docker容器内的应用用户没有权限写入logs目录。

## 🛠️ 解决方案

### 方案一：使用权限修复脚本（推荐）

```bash
# 在1Panel终端中执行
cd /opt/duanju
chmod +x fix-permissions.sh
./fix-permissions.sh
```

### 方案二：手动修复权限

```bash
# 设置logs目录权限
mkdir -p logs
chmod 777 logs
chown -R 1000:1000 logs

# 重新构建容器
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 方案三：SELinux环境修复

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

## 🧪 测试验证

### 1. 检查权限设置
```bash
# 检查logs目录权限
ls -la logs/

# 检查容器内权限
docker exec -it duanju_app ls -la /app/logs/
```

### 2. 检查日志写入
```bash
# 查看容器日志
docker-compose logs

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

### 3. 文件系统挂载问题
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
- [ ] 磁盘空间充足

## 🔄 重新部署步骤

如果权限问题已修复，重新部署：

```bash
# 1. 停止现有服务
docker-compose down

# 2. 清理缓存
docker builder prune -f

# 3. 重新部署
./1panel-deploy.sh

# 4. 验证部署
curl http://localhost:3366/health
docker-compose logs
```

---

**注意**: 权限问题通常是由于Docker容器内外用户ID不匹配造成的。修复脚本会统一设置正确的权限和所有权。