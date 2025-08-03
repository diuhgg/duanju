@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 1Panel 部署脚本 - 短剧搜索播放系统 (Windows版本)
:: 使用方法: 1panel-deploy.bat

echo.
echo ==================================
echo   短剧搜索播放系统 - 1Panel部署
echo ==================================
echo.

:: 检查Docker是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 未安装或未启动，请先安装并启动Docker
    pause
    exit /b 1
)

:: 检查Docker Compose是否可用
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if !errorlevel! neq 0 (
        echo [错误] Docker Compose 未安装，请先安装Docker Compose
        pause
        exit /b 1
    )
)

echo [信息] Docker环境检查完成

:: 检查端口占用
netstat -an | findstr ":3366" >nul 2>&1
if %errorlevel% equ 0 (
    echo [警告] 端口3366已被占用，将使用端口3367
    set DEPLOY_PORT=3367
) else (
    set DEPLOY_PORT=3366
)

:: 创建日志目录
if not exist "logs" mkdir logs

:: 生成1Panel专用的docker-compose文件
echo [信息] 生成1Panel专用配置文件...

(
echo services:
echo   # 短剧搜索播放系统
echo   duanju:
echo     build: 
echo       context: .
echo       dockerfile: Dockerfile
echo     container_name: duanju_app_1panel
echo     ports:
echo       - "%DEPLOY_PORT%:3366"
echo     environment:
echo       - FLASK_ENV=production
echo       - LOG_LEVEL=WARNING
echo       - CACHE_TIMEOUT=7200
echo       - CACHE_MAX_SIZE=5000
echo       - MAX_EPISODES=50
echo       - REQUEST_TIMEOUT=8
echo       - ASYNC_TIMEOUT=15
echo       - MAX_CONCURRENT_REQUESTS=30
echo       - RATE_LIMIT_ENABLED=true
echo       - RATE_LIMIT_PER_MINUTE=60
echo       - RATE_LIMIT_PER_HOUR=1000
echo     volumes:
echo       - ./logs:/app/logs
echo     restart: unless-stopped
echo     healthcheck:
echo       test: ["CMD", "curl", "-f", "http://localhost:3366/health"]
echo       interval: 30s
echo       timeout: 10s
echo       retries: 3
echo       start_period: 30s
echo     deploy:
echo       resources:
echo         limits:
echo           cpus: '2.0'
echo           memory: 2G
echo         reservations:
echo           cpus: '0.5'
echo           memory: 512M
echo.
echo networks:
echo   default:
echo     name: duanju_network
echo     driver: bridge
) > docker-compose.1panel.yml

echo [成功] 1Panel配置文件生成完成

:: 停止已存在的容器
echo [信息] 检查并停止已存在的容器...
docker ps -a | findstr "duanju_app_1panel" >nul 2>&1
if %errorlevel% equ 0 (
    echo [信息] 停止已存在的容器...
    docker-compose -f docker-compose.1panel.yml down 2>nul
)

:: 构建镜像
echo [信息] 构建Docker镜像...
docker-compose -f docker-compose.1panel.yml build --no-cache
if %errorlevel% neq 0 (
    echo [错误] 镜像构建失败
    pause
    exit /b 1
)

:: 启动服务
echo [信息] 启动服务...
docker-compose -f docker-compose.1panel.yml up -d
if %errorlevel% neq 0 (
    echo [错误] 服务启动失败
    pause
    exit /b 1
)

echo [成功] 服务部署完成

:: 等待服务启动
echo [信息] 等待服务启动...
set /a attempt=1
set /a max_attempts=30

:wait_loop
if %attempt% gtr %max_attempts% (
    echo [错误] 服务启动超时，请检查日志
    goto show_logs
)

:: 使用PowerShell检查服务状态（Windows兼容）
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:%DEPLOY_PORT%/health' -UseBasicParsing -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo [成功] 服务已成功启动
    goto show_info
)

echo [信息] 等待服务启动... (%attempt%/%max_attempts%)
timeout /t 10 /nobreak >nul
set /a attempt+=1
goto wait_loop

:show_info
echo.
echo [成功] === 部署完成 ===
echo.
echo [信息] 访问地址：
echo   - 本地访问: http://localhost:%DEPLOY_PORT%
echo   - 服务器访问: http://YOUR_SERVER_IP:%DEPLOY_PORT%
echo.
echo [信息] 管理命令：
echo   - 查看状态: docker-compose -f docker-compose.1panel.yml ps
echo   - 查看日志: docker-compose -f docker-compose.1panel.yml logs -f
echo   - 停止服务: docker-compose -f docker-compose.1panel.yml down
echo   - 重启服务: docker-compose -f docker-compose.1panel.yml restart
echo.
echo [信息] 健康检查：
echo   - 健康状态: http://localhost:%DEPLOY_PORT%/health
echo   - 缓存统计: http://localhost:%DEPLOY_PORT%/cache/stats
echo.
echo [警告] 请确保在1Panel防火墙中开放端口 %DEPLOY_PORT%
echo.

:: 创建1Panel导入配置
echo [信息] 创建1Panel导入配置...

(
echo {
echo   "name": "短剧搜索播放系统",
echo   "description": "基于Flask的短剧搜索和播放系统",
echo   "version": "1.0.0",
echo   "compose_file": "docker-compose.1panel.yml",
echo   "env_file": ".env.1panel",
echo   "port": %DEPLOY_PORT%,
echo   "health_check": "/health",
echo   "tags": ["entertainment", "video", "flask"],
echo   "requirements": {
echo     "memory": "512MB",
echo     "cpu": "0.5",
echo     "disk": "2GB"
echo   },
echo   "features": [
echo     "短剧搜索",
echo     "在线播放",
echo     "移动端适配",
echo     "缓存优化",
echo     "健康监控"
echo   ]
echo }
) > 1panel-import.json

:: 创建环境变量文件
(
echo # 1Panel 环境变量配置
echo DEPLOY_PORT=%DEPLOY_PORT%
echo FLASK_ENV=production
echo LOG_LEVEL=WARNING
echo CACHE_TIMEOUT=7200
echo CACHE_MAX_SIZE=5000
echo MAX_EPISODES=50
echo REQUEST_TIMEOUT=8
echo ASYNC_TIMEOUT=15
echo MAX_CONCURRENT_REQUESTS=30
echo RATE_LIMIT_ENABLED=true
echo RATE_LIMIT_PER_MINUTE=60
echo RATE_LIMIT_PER_HOUR=1000
) > .env.1panel

echo [成功] 1Panel导入配置创建完成

:: 测试基本功能
echo [信息] 测试基本功能...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:%DEPLOY_PORT%' -UseBasicParsing -TimeoutSec 10; if ($response.Content -match '短剧搜索') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo [成功] 功能测试通过
) else (
    echo [警告] 功能测试失败，请检查应用状态
)

goto end

:show_logs
echo.
echo [信息] 故障排除：
echo 1. 查看容器日志: docker-compose -f docker-compose.1panel.yml logs
echo 2. 检查端口占用: netstat -an ^| findstr ":%DEPLOY_PORT%"
echo 3. 检查防火墙设置
echo 4. 检查Docker服务状态
echo.

:end
echo.
echo 部署脚本执行完成！
echo 如需上传到Linux服务器，请将以下文件上传：
echo - docker-compose.1panel.yml
echo - 1panel-import.json
echo - .env.1panel
echo - 整个项目目录
echo.
pause