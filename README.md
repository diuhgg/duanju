# 短剧搜索播放系统

一个基于Flask的短剧搜索和播放系统，支持Docker一键部署。

## 🚀 快速部署

### 方法一：简化部署（推荐）

```bash
# 1. 克隆或上传项目文件
git clone <repository-url>
cd duanju

# 2. 一键部署
docker-compose -f docker-compose.simple.yml up -d
```

### 方法二：1Panel部署

```bash
# 1. 上传项目到服务器 /opt/duanju
# 2. 在1Panel终端中执行
cd /opt/duanju
chmod +x 1panel-deploy.sh
./1panel-deploy.sh
```

### 方法三：完整部署（包含Nginx）

```bash
docker-compose up -d
```

## 🔧 环境要求

- Docker 20.10+
- Docker Compose 2.0+
- 内存: 512MB+ (推荐2GB)
- 磁盘: 2GB+

## 📊 访问地址

- **主页**: http://localhost:3366
- **健康检查**: http://localhost:3366/health
- **缓存统计**: http://localhost:3366/cache/stats

## 📖 部署文档

- [1Panel部署指南](1PANEL_DEPLOY_GUIDE.md) - 详细的1Panel部署说明
- [权限问题修复](PERMISSION_FIX_GUIDE.md) - 解决常见权限问题

## 🛠️ 常见问题

### 权限问题
```bash
# 运行权限修复脚本
chmod +x fix-permissions.sh
./fix-permissions.sh
```

### 端口冲突
```bash
# 修改端口映射（在docker-compose文件中）
ports:
  - "3367:3366"  # 改为其他端口
```

### 查看日志
```bash
# 查看容器日志
docker-compose logs -f

# 查看应用日志
ls -la logs/
```

## 📁 项目结构

```
duanju/
├── app.py                    # 主应用文件
├── search.py                 # 搜索功能
├── video.py                  # 视频处理
├── config.py                 # 配置管理
├── requirements.txt          # Python依赖
├── Dockerfile               # Docker镜像
├── docker-compose.yml       # Docker编排
├── docker-compose.simple.yml # 简化部署
├── 1panel-deploy.sh         # 1Panel部署脚本
├── fix-permissions.sh       # 权限修复脚本
├── static/                  # 静态文件
├── templates/               # HTML模板
└── logs/                    # 日志目录
```

---

**部署完成后访问**: `http://your-server:3366` 开始使用！