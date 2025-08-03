"""
生产环境配置
优化性能和安全性
"""

import os

class ProductionConfig:
    """生产环境配置类"""
    
    # 基础配置
    DEBUG = False
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'WARNING')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # 缓存配置 - 生产环境更大的缓存
    CACHE_TIMEOUT = int(os.getenv('CACHE_TIMEOUT', '7200'))  # 2小时
    CACHE_MAX_SIZE = int(os.getenv('CACHE_MAX_SIZE', '5000'))  # 更大缓存
    MAX_EPISODES = int(os.getenv('MAX_EPISODES', '50'))
    
    # 请求配置 - 生产环境优化
    REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '8'))
    ASYNC_TIMEOUT = int(os.getenv('ASYNC_TIMEOUT', '15'))
    MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '30'))
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    
    # 限流配置 - 生产环境更严格
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', '60'))
    RATE_LIMIT_PER_HOUR = int(os.getenv('RATE_LIMIT_PER_HOUR', '1000'))
    
    # 验证配置
    ALLOWED_VIDEO_ID_PATTERN = r'^[a-zA-Z0-9_-]+$'
    MAX_SEARCH_LENGTH = int(os.getenv('MAX_SEARCH_LENGTH', '100'))
    
    # 安全配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'production-secret-key-change-me')
    
    # 服务器配置
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', '3366'))
    WORKERS = int(os.getenv('WORKERS', '4'))

def get_config():
    """获取生产环境配置"""
    return ProductionConfig()