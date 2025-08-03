# 短剧搜索播放系统 Docker 镜像
FROM python:3.9-slim

# 设置标签
LABEL maintainer="duanju-team"
LABEL description="短剧搜索播放系统"
LABEL version="1.0.0"

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 复制依赖文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p logs \
    && mkdir -p static/assets/images \
    && mkdir -p static/assets/fonts

# 创建非root用户
RUN useradd -m -u 1000 appuser \
    && chown -R appuser:appuser /app
USER appuser

# 暴露端口
EXPOSE 3366

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3366/health || exit 1

# 设置环境变量
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 启动命令
CMD ["gunicorn", "--bind", "0.0.0.0:3366", "--workers", "4", "--timeout", "30", "--keep-alive", "2", "--max-requests", "1000", "--access-logfile", "logs/access.log", "--error-logfile", "logs/error.log", "--log-level", "warning", "wsgi:app"]