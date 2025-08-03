#!/bin/bash

# 测试1Panel部署脚本的语法和逻辑

echo "=== 1Panel部署脚本检查 ==="

# 检查脚本语法
echo "1. 检查脚本语法..."
if bash -n 1panel-deploy.sh 2>/dev/null; then
    echo "✅ 语法检查通过"
else
    echo "❌ 语法检查失败"
    bash -n 1panel-deploy.sh
    exit 1
fi

# 检查关键函数是否定义
echo "2. 检查关键函数定义..."
functions=("check_root" "check_environment" "create_deploy_dir" "generate_1panel_compose" "deploy_service" "wait_for_service" "show_deploy_info" "create_1panel_import" "main")

for func in "${functions[@]}"; do
    if grep -q "^${func}()" 1panel-deploy.sh; then
        echo "✅ 函数 $func 已定义"
    else
        echo "❌ 函数 $func 未找到"
    fi
done

# 检查变量使用
echo "3. 检查变量使用..."
if grep -q 'DEPLOY_PORT' 1panel-deploy.sh; then
    echo "✅ DEPLOY_PORT 变量使用正确"
else
    echo "❌ DEPLOY_PORT 变量未使用"
fi

if grep -q 'COMPOSE_CMD' 1panel-deploy.sh; then
    echo "✅ COMPOSE_CMD 变量使用正确"
else
    echo "❌ COMPOSE_CMD 变量未使用"
fi

# 检查Docker Compose配置
echo "4. 检查Docker Compose配置生成..."
if grep -q "docker-compose.1panel.yml" 1panel-deploy.sh; then
    echo "✅ Docker Compose配置文件路径正确"
else
    echo "❌ Docker Compose配置文件路径错误"
fi

# 检查端口配置
echo "5. 检查端口配置..."
if grep -q '${DEPLOY_PORT}:3366' 1panel-deploy.sh; then
    echo "✅ 端口映射配置正确"
else
    echo "❌ 端口映射配置错误"
fi

# 检查健康检查配置
echo "6. 检查健康检查配置..."
if grep -q 'http://localhost:3366/health' 1panel-deploy.sh; then
    echo "✅ 健康检查配置正确"
else
    echo "❌ 健康检查配置错误"
fi

# 检查错误处理
echo "7. 检查错误处理..."
if grep -q 'set -e' 1panel-deploy.sh; then
    echo "✅ 错误处理已启用"
else
    echo "❌ 错误处理未启用"
fi

echo ""
echo "=== 检查完成 ==="
echo ""
echo "建议的改进："
echo "1. 确保在生产环境中测试脚本"
echo "2. 添加更多的错误恢复机制"
echo "3. 考虑添加备份功能"
echo "4. 添加更详细的日志记录"