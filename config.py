#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
应用配置管理
"""

import os
from datetime import timedelta

class Config:
    """基础配置类"""
    
    # Flask配置
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    # 缓存配置
    CACHE_TIMEOUT = int(os.environ.get('CACHE_TIMEOUT', 3600))  # 1小时
    CACHE_MAX_SIZE = int(os.environ.get('CACHE_MAX_SIZE', 1000))  # 最大缓存条目数
    
    # 请求配置
    REQUEST_TIMEOUT = int(os.environ.get('REQUEST_TIMEOUT', 5))  # 主请求超时
    ASYNC_TIMEOUT = int(os.environ.get('ASYNC_TIMEOUT', 3))     # 异步请求超时
    MAX_EPISODES = int(os.environ.get('MAX_EPISODES', 20))      # 默认最大剧集数
    MAX_CONCURRENT_REQUESTS = int(os.environ.get('MAX_CONCURRENT_REQUESTS', 10))
    
    # 频率限制配置
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'true').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', 60))
    RATE_LIMIT_PER_HOUR = int(os.environ.get('RATE_LIMIT_PER_HOUR', 200))
    
    # 用户代理
    USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    
    # 日志配置
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # 安全配置
    ALLOWED_VIDEO_ID_PATTERN = r'^[a-zA-Z0-9_-]+$'
    MAX_SEARCH_LENGTH = 100
    
    @classmethod
    def validate_config(cls):
        """验证配置的有效性"""
        errors = []
        
        if cls.CACHE_TIMEOUT < 60:
            errors.append("CACHE_TIMEOUT should be at least 60 seconds")
        
        if cls.MAX_EPISODES > 100:
            errors.append("MAX_EPISODES should not exceed 100")
        
        if cls.REQUEST_TIMEOUT < 1:
            errors.append("REQUEST_TIMEOUT should be at least 1 second")
        
        return errors

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    CACHE_TIMEOUT = 300  # 5分钟缓存，便于开发测试

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    CACHE_TIMEOUT = 3600  # 1小时缓存
    LOG_LEVEL = 'WARNING'

class TestingConfig(Config):
    """测试环境配置"""
    DEBUG = True
    CACHE_TIMEOUT = 60   # 1分钟缓存
    MAX_EPISODES = 5     # 减少测试时间

# 配置映射
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """获取配置对象"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    config_class = config_map.get(config_name, DevelopmentConfig)
    
    # 验证配置
    errors = config_class.validate_config()
    if errors:
        raise ValueError(f"配置验证失败: {', '.join(errors)}")
    
    return config_class