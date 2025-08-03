"""
配置管理模块

支持多环境配置：
- development.py: 开发环境
- production.py: 生产环境
- testing.py: 测试环境
"""

# 为了保持向后兼容性，重新导出配置功能
import os

class Config:
    """应用配置类"""
    # 基础配置
    DEBUG = True
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # 缓存配置
    CACHE_TIMEOUT = 300  # 5分钟
    CACHE_MAX_SIZE = 1000  # 最大缓存项数
    MAX_EPISODES = 20
    
    # 请求配置
    REQUEST_TIMEOUT = 10
    ASYNC_TIMEOUT = 30
    MAX_CONCURRENT_REQUESTS = 10
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    
    # 限流配置
    RATE_LIMIT_ENABLED = True
    RATE_LIMIT_PER_MINUTE = 60
    RATE_LIMIT_PER_HOUR = 1000
    
    # 验证配置
    ALLOWED_VIDEO_ID_PATTERN = r'^[a-zA-Z0-9_-]+$'
    MAX_SEARCH_LENGTH = 100

def get_config():
    """获取配置实例"""
    return Config()

__all__ = ['get_config', 'Config']