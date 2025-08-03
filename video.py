#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
视频播放地址获取模块 - 优化版本
支持异步并发请求、智能缓存机制和延迟加载
"""

import re
import json
import time
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import requests
from functools import lru_cache
from config import get_config

# 获取配置
config = get_config()

# 配置日志
logger = logging.getLogger(__name__)

# 缓存类 - 支持过期时间
class TimedCache:
    """带过期时间的缓存类"""
    
    def __init__(self, default_timeout=None, max_size=1000):
        self.cache = {}
        self.default_timeout = default_timeout or config.CACHE_TIMEOUT
        self.max_size = max_size
        
    def get(self, key):
        """获取缓存值"""
        if key not in self.cache:
            return None
            
        value, timestamp = self.cache[key]
        
        # 检查是否过期
        if datetime.now() - timestamp > timedelta(seconds=self.default_timeout):
            del self.cache[key]
            return None
            
        return value
    
    def set(self, key, value, timeout=None):
        """设置缓存值"""
        # 如果缓存满了，清理过期项
        if len(self.cache) >= self.max_size:
            self._cleanup_expired()
            
            # 如果还是满的，删除最旧的项
            if len(self.cache) >= self.max_size:
                oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k][1])
                del self.cache[oldest_key]
        
        self.cache[key] = (value, datetime.now())
    
    def _cleanup_expired(self):
        """清理过期的缓存项"""
        now = datetime.now()
        expired_keys = [
            key for key, (value, timestamp) in self.cache.items()
            if now - timestamp > timedelta(seconds=self.default_timeout)
        ]
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"清理了 {len(expired_keys)} 个过期缓存项")
    
    def clear(self):
        """清空缓存"""
        self.cache.clear()
        logger.info("缓存已清空")
    
    def stats(self):
        """获取缓存统计信息"""
        now = datetime.now()
        valid_items = 0
        expired_items = 0
        
        for value, timestamp in self.cache.values():
            if now - timestamp <= timedelta(seconds=self.default_timeout):
                valid_items += 1
            else:
                expired_items += 1
        
        return {
            'total_items': len(self.cache),
            'valid_items': valid_items,
            'expired_items': expired_items,
            'hit_rate': valid_items / len(self.cache) if self.cache else 0,
            'max_size': self.max_size,
            'cache_timeout': self.default_timeout
        }

# 创建缓存实例
_play_url_cache = TimedCache(
    default_timeout=config.CACHE_TIMEOUT,
    max_size=config.CACHE_MAX_SIZE
)

def get_play_link_by_id(video_id):
    """根据视频ID生成播放链接"""
    return f"https://djw1.com/play/{video_id}.html"

# 创建全局连接池（提高性能）
_connector = None
_session = None

async def get_session():
    """获取异步会话（使用连接池）"""
    global _connector, _session
    
    if _connector is None:
        _connector = aiohttp.TCPConnector(
            limit=config.MAX_CONCURRENT_REQUESTS,
            limit_per_host=config.MAX_CONCURRENT_REQUESTS // 2,
            ttl_dns_cache=300,  # DNS缓存5分钟
            use_dns_cache=True,
            keepalive_timeout=30,
            enable_cleanup_closed=True
        )
    
    if _session is None or _session.closed:
        timeout = aiohttp.ClientTimeout(total=config.ASYNC_TIMEOUT)
        _session = aiohttp.ClientSession(
            connector=_connector,
            timeout=timeout,
            headers={'User-Agent': config.USER_AGENT}
        )
    
    return _session

async def cleanup_session():
    """清理会话和连接池"""
    global _session, _connector
    
    if _session and not _session.closed:
        await _session.close()
        _session = None
    
    if _connector:
        await _connector.close()
        _connector = None

def extract_m3u8_url_from_script(script_content):
    """从脚本内容中提取m3u8播放地址"""
    if not script_content:
        return ""
    
    # 方法1: 查找JSON格式的播放地址
    json_patterns = [
        r'playUrls\s*=\s*({[^}]+})',
        r'playUrls\s*:\s*({[^}]+})',
        r'var\s+playUrls\s*=\s*({[^}]+})'
    ]
    
    m3u8_url = ""
    for pattern in json_patterns:
        match = re.search(pattern, script_content)
        if match:
            try:
                # 清理JSON字符串
                json_str = match.group(1).replace('\\', '').replace("'", '"')
                play_urls = json.loads(json_str)
                m3u8_url = play_urls.get("wwm3u8", "")
                if m3u8_url:
                    break
            except json.JSONDecodeError:
                continue
    
    # 方法2: 直接查找m3u8 URL
    if not m3u8_url:
        m3u8_patterns = [
            r'"wwm3u8"\s*:\s*"(https?://[^"]+)"',
            r"'wwm3u8'\s*:\s*'(https?://[^']+)'",
            r'wwm3u8\s*:\s*["\'](https?://[^"\']+)["\']'
        ]
        
        for pattern in m3u8_patterns:
            match = re.search(pattern, script_content)
            if match:
                m3u8_url = match.group(1).replace('\\', '')
                break
    
    # 方法3: 查找任何m3u8链接
    if not m3u8_url:
        m3u8_match = re.search(r'(https?://[^"\']*\.m3u8[^"\']*)', script_content)
        if m3u8_match:
            m3u8_url = m3u8_match.group(1).replace('\\', '')
    
    return m3u8_url

async def get_episode_play_url_async(session, episode_url):
    """异步获取单个剧集的播放地址"""
    if not episode_url:
        return None
    
    # 检查缓存
    cached_result = _play_url_cache.get(episode_url)
    if cached_result is not None:
        logger.debug(f"缓存命中: {episode_url}")
        return cached_result
    
    try:
        # 确保URL是完整的
        if not episode_url.startswith('http'):
            episode_url = f"https://djw1.com{episode_url}"
        
        # 使用异步请求
        async with session.get(episode_url) as response:
            if response.status != 200:
                return None
            
            html_content = await response.text()
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # 查找播放器脚本
            player_section = soup.find('section', class_='player-content')
            if player_section:
                script_tags = player_section.find_all('script')
                for script in script_tags:
                    if script.string:
                        m3u8_url = extract_m3u8_url_from_script(script.string)
                        if m3u8_url:
                            # 缓存结果
                            _play_url_cache.set(episode_url, m3u8_url)
                            logger.debug(f"获取到播放地址: {episode_url}")
                            return m3u8_url
            
            # 如果没找到，尝试查找页面中的所有脚本
            all_scripts = soup.find_all('script')
            for script in all_scripts:
                if script.string and ('playUrls' in script.string or '.m3u8' in script.string):
                    m3u8_url = extract_m3u8_url_from_script(script.string)
                    if m3u8_url:
                        # 缓存结果
                        _play_url_cache.set(episode_url, m3u8_url)
                        logger.debug(f"获取到播放地址: {episode_url}")
                        return m3u8_url
            
            # 缓存空结果
            _play_url_cache.set(episode_url, None)
            logger.warning(f"未找到播放地址: {episode_url}")
            return None
            
    except Exception as e:
        logger.error(f"获取剧集播放地址失败 {episode_url}: {e}")
        # 缓存错误结果
        _play_url_cache.set(episode_url, None)
        return None

def get_episode_play_url(episode_url):
    """同步获取单个剧集的播放地址（保持向后兼容）"""
    if not episode_url:
        return None
    
    # 检查缓存
    cached_result = _play_url_cache.get(episode_url)
    if cached_result is not None:
        logger.debug(f"缓存命中: {episode_url}")
        return cached_result
    
    try:
        # 确保URL是完整的
        if not episode_url.startswith('http'):
            episode_url = f"https://djw1.com{episode_url}"
        
        headers = {
            'User-Agent': config.USER_AGENT
        }
        
        # 使用配置的超时时间
        response = requests.get(episode_url, headers=headers, timeout=config.ASYNC_TIMEOUT)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找播放器脚本
        player_section = soup.find('section', class_='player-content')
        if player_section:
            script_tags = player_section.find_all('script')
            for script in script_tags:
                if script.string:
                    m3u8_url = extract_m3u8_url_from_script(script.string)
                    if m3u8_url:
                        # 缓存结果
                        _play_url_cache.set(episode_url, m3u8_url)
                        logger.debug(f"获取到播放地址: {episode_url}")
                        return m3u8_url
        
        # 如果没找到，尝试查找页面中的所有脚本
        all_scripts = soup.find_all('script')
        for script in all_scripts:
            if script.string and ('playUrls' in script.string or '.m3u8' in script.string):
                m3u8_url = extract_m3u8_url_from_script(script.string)
                if m3u8_url:
                    # 缓存结果
                    _play_url_cache.set(episode_url, m3u8_url)
                    logger.debug(f"获取到播放地址: {episode_url}")
                    return m3u8_url
        
        # 缓存空结果
        _play_url_cache.set(episode_url, None)
        logger.warning(f"未找到播放地址: {episode_url}")
        return None
        
    except Exception as e:
        logger.error(f"获取剧集播放地址失败 {episode_url}: {e}")
        # 缓存错误结果
        _play_url_cache.set(episode_url, None)
        return None

async def get_episodes_play_urls_async(episode_list, max_concurrent=None, max_episodes=None):
    """异步批量获取剧集播放地址"""
    if not episode_list:
        return []
    
    # 使用配置的默认值
    max_concurrent = max_concurrent or config.MAX_CONCURRENT_REQUESTS
    max_episodes = max_episodes or config.MAX_EPISODES
    
    # 限制获取的剧集数量，实现延迟加载
    episodes_to_fetch = episode_list[:max_episodes]
    
    # 使用全局会话
    session = await get_session()
    
    # 创建异步任务
    tasks = []
    for episode in episodes_to_fetch:
        task = get_episode_play_url_async(session, episode['url'])
        tasks.append((episode, task))
    
    # 并发执行任务
    results = []
    for episode, task in tasks:
        try:
            play_url = await task
            episode['play_url'] = play_url
            results.append(episode)
        except Exception as e:
            logger.error(f"获取剧集播放地址失败: {e}")
            episode['play_url'] = None
            results.append(episode)
    
    # 为剩余的剧集添加占位符
    for episode in episode_list[max_episodes:]:
        episode['play_url'] = None
        results.append(episode)
    
    logger.info(f"异步获取完成，处理了 {len(episodes_to_fetch)} 个剧集")
    return results

def parse_video_details(video_url, use_async=True, max_episodes=None):
    """解析视频详情，支持异步和延迟加载"""
    max_episodes = max_episodes or config.MAX_EPISODES
    
    # 优化：减少默认的max_episodes以提高首次加载速度
    if max_episodes > 20:
        max_episodes = 10  # 首次只加载10集，提高速度
    
    headers = {
        'User-Agent': config.USER_AGENT
    }
    
    try:
        logger.info(f"开始解析视频详情: {video_url}, max_episodes: {max_episodes}")
        logger.info(f"请求头: {headers}")
        start_time = time.time()
        
        # 优化：使用更短的超时时间
        logger.info(f"发送HTTP请求到: {video_url}")
        response = requests.get(video_url, headers=headers, timeout=5)
        logger.info(f"HTTP响应状态: {response.status_code}")
        response.raise_for_status()
        
        parse_time = time.time() - start_time
        logger.info(f"页面获取耗时: {parse_time:.2f}秒")
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 提取主标题
        title_tag = soup.find('h1', class_='items-title')
        main_title = ""
        if title_tag:
            # 移除<span>标签内容
            for span in title_tag.find_all('span', class_='items-epname'):
                span.extract()
            main_title = title_tag.get_text(strip=True)
        
        # 提取标签
        tags = []
        tag_links = soup.find_all('a', rel='tag')
        for tag in tag_links:
            tag_text = tag.get_text(strip=True)
            if tag_text:
                tags.append(tag_text)
        
        # 提取更新时间信息
        time_tag = soup.find('time', class_='excerpt-update')
        datetime_str = time_tag['datetime'] if time_tag and time_tag.has_attr('datetime') else ""
        update_text = time_tag.get_text(strip=True) if time_tag else ""
        
        # 格式化日期
        formatted_date = ""
        if datetime_str:
            try:
                dt = datetime.fromisoformat(datetime_str.rstrip('+08:00'))
                formatted_date = dt.strftime('%Y-%m-%d')
            except ValueError:
                formatted_date = datetime_str
        
        # 提取状态信息
        status_info = ""
        text_info_div = soup.find('div', class_='text-info')
        if text_info_div:
            status_span = text_info_div.find('span', class_='info-mark')
            if status_span:
                status_info = status_span.get_text(strip=True)
        
        # 提取剧集列表
        episode_list = []
        ep_items_div = soup.find('div', class_='ep-list-items')
        if ep_items_div:
            for a_tag in ep_items_div.find_all('a', class_='ep-item'):
                episode_title = a_tag.get('title', '').strip()
                episode_url = a_tag.get('href', '').strip()
                episode_number = a_tag.get_text(strip=True)
                
                episode_list.append({
                    'title': episode_title,
                    'url': episode_url,
                    'number': episode_number,
                    'play_url': None  # 初始化为None
                })
        
        # 提取首发时间
        release_date = ""
        if text_info_div:
            release_span = text_info_div.find('span', class_='info-addtime')
            if release_span:
                release_text = release_span.get_text(strip=True)
                # 提取日期部分
                date_match = re.search(r'\d{4}-\d{2}-\d{2}', release_text)
                if date_match:
                    release_date = date_match.group(0)
        
        # 提取主视频的m3u8播放URL
        m3u8_url = ""
        player_section = soup.find('section', class_='player-content')
        if player_section:
            script_tags = player_section.find_all('script')
            for script in script_tags:
                if script.string:
                    m3u8_url = extract_m3u8_url_from_script(script.string)
                    if m3u8_url:
                        break
        
        # 获取剧集播放地址
        if use_async and episode_list:
            # 使用异步方式获取播放地址
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                episode_list = loop.run_until_complete(
                    get_episodes_play_urls_async(episode_list, max_episodes=max_episodes)
                )
            finally:
                loop.close()
        else:
            # 使用同步方式获取播放地址（仅前几集）
            for i, episode in enumerate(episode_list[:max_episodes]):
                episode['play_url'] = get_episode_play_url(episode['url'])
        
        # 如果主视频没有播放地址，尝试从第一个剧集获取
        if not m3u8_url and episode_list:
            m3u8_url = episode_list[0].get('play_url', '')
        
        result = {
            'video_title': main_title,
            'tags': tags,
            'update_datetime': datetime_str,
            'formatted_date': formatted_date,
            'update_text': update_text,
            'status_info': status_info,
            'release_date': release_date,
            'episodes': episode_list,
            'm3u8_url': m3u8_url
        }
        
        logger.info(f"视频详情解析完成: {main_title}, 剧集数: {len(episode_list)}")
        return result
    
    except requests.exceptions.RequestException as e:
        logger.error(f"请求错误 {video_url}: {e}")
        return None
    except Exception as e:
        logger.error(f"解析错误 {video_url}: {e}", exc_info=True)
        return None

def clear_cache():
    """清除播放地址缓存"""
    _play_url_cache.clear()

def get_cache_stats():
    """获取缓存统计信息"""
    return _play_url_cache.stats()