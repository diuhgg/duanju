"""
缓存服务模块

提供应用级别的缓存功能
"""

import time
import logging
from typing import Any, Optional, Dict

logger = logging.getLogger(__name__)

class TimedCache:
    """
    带过期时间的内存缓存
    """
    
    def __init__(self, default_timeout: int = 300):
        """
        初始化缓存
        
        Args:
            default_timeout: 默认过期时间（秒）
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_timeout = default_timeout
    
    def get(self, key: str) -> Optional[Any]:
        """
        获取缓存值
        
        Args:
            key: 缓存键
            
        Returns:
            缓存值，如果不存在或已过期则返回None
        """
        if key not in self.cache:
            return None
        
        item = self.cache[key]
        current_time = time.time()
        
        # 检查是否过期
        if current_time > item['expires_at']:
            del self.cache[key]
            logger.debug(f"缓存键 {key} 已过期，已删除")
            return None
        
        logger.debug(f"缓存命中: {key}")
        return item['value']
    
    def set(self, key: str, value: Any, timeout: Optional[int] = None) -> None:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            timeout: 过期时间（秒），None则使用默认值
        """
        if timeout is None:
            timeout = self.default_timeout
        
        expires_at = time.time() + timeout
        self.cache[key] = {
            'value': value,
            'expires_at': expires_at,
            'created_at': time.time()
        }
        
        logger.debug(f"缓存设置: {key}, 过期时间: {timeout}秒")
    
    def delete(self, key: str) -> bool:
        """
        删除缓存项
        
        Args:
            key: 缓存键
            
        Returns:
            是否成功删除
        """
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"缓存删除: {key}")
            return True
        return False
    
    def clear(self) -> int:
        """
        清空所有缓存
        
        Returns:
            清空的缓存项数量
        """
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"清空缓存，共删除 {count} 项")
        return count
    
    def cleanup_expired(self) -> int:
        """
        清理过期的缓存项
        
        Returns:
            清理的过期项数量
        """
        current_time = time.time()
        expired_keys = []
        
        for key, item in self.cache.items():
            if current_time > item['expires_at']:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"清理过期缓存，共删除 {len(expired_keys)} 项")
        
        return len(expired_keys)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计信息
        
        Returns:
            缓存统计信息
        """
        current_time = time.time()
        total_items = len(self.cache)
        expired_items = 0
        
        for item in self.cache.values():
            if current_time > item['expires_at']:
                expired_items += 1
        
        return {
            'total_items': total_items,
            'active_items': total_items - expired_items,
            'expired_items': expired_items,
            'memory_usage_estimate': len(str(self.cache))  # 简单估算
        }

# 全局缓存实例
_global_cache = TimedCache(default_timeout=300)  # 5分钟默认过期

def get_cache() -> TimedCache:
    """
    获取全局缓存实例
    
    Returns:
        TimedCache实例
    """
    return _global_cache

def clear_cache() -> int:
    """
    清空全局缓存
    
    Returns:
        清空的缓存项数量
    """
    return _global_cache.clear()

def get_cache_stats() -> Dict[str, Any]:
    """
    获取全局缓存统计信息
    
    Returns:
        缓存统计信息
    """
    return _global_cache.get_stats()