#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Flask应用主文件 - 优化版本
支持异步数据获取、缓存管理、错误处理和输入验证
"""

import re
import time
import logging
from functools import wraps
from datetime import datetime
from flask import Flask, render_template, request, jsonify, g, send_from_directory
from search import search_data
from video import parse_video_details, get_play_link_by_id, clear_cache, get_cache_stats
from config import get_config

# 获取配置
config = get_config()

# 配置日志
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(config)

# 简单的频率限制存储
_rate_limit_storage = {}

def clean_rate_limit_storage():
    """清理过期的频率限制记录"""
    current_time = time.time()
    expired_keys = [
        key for key, data in _rate_limit_storage.items()
        if current_time - data['last_reset'] > 3600  # 清理1小时前的记录
    ]
    for key in expired_keys:
        del _rate_limit_storage[key]

# 装饰器：性能监控
def monitor_performance(func):
    """监控函数执行性能"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        
        if execution_time > 1.0:  # 记录超过1秒的请求
            logger.warning(f"{func.__name__} 执行时间较长: {execution_time:.2f}秒")
        else:
            logger.debug(f"{func.__name__} 执行时间: {execution_time:.2f}秒")
        
        return result
    return wrapper

# 装饰器：频率限制
def rate_limit(per_minute=None, per_hour=None):
    """简单的频率限制装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not config.RATE_LIMIT_ENABLED:
                return func(*args, **kwargs)
            
            client_ip = request.remote_addr
            current_time = time.time()
            
            # 清理过期记录
            if len(_rate_limit_storage) > 1000:  # 防止内存泄漏
                clean_rate_limit_storage()
            
            if client_ip not in _rate_limit_storage:
                _rate_limit_storage[client_ip] = {
                    'minute_count': 0,
                    'hour_count': 0,
                    'minute_reset': current_time,
                    'hour_reset': current_time,
                    'last_reset': current_time
                }
            
            client_data = _rate_limit_storage[client_ip]
            
            # 重置分钟计数
            if current_time - client_data['minute_reset'] > 60:
                client_data['minute_count'] = 0
                client_data['minute_reset'] = current_time
            
            # 重置小时计数
            if current_time - client_data['hour_reset'] > 3600:
                client_data['hour_count'] = 0
                client_data['hour_reset'] = current_time
            
            # 检查频率限制
            minute_limit = per_minute or config.RATE_LIMIT_PER_MINUTE
            hour_limit = per_hour or config.RATE_LIMIT_PER_HOUR
            
            if client_data['minute_count'] >= minute_limit:
                logger.warning(f"客户端 {client_ip} 超过分钟频率限制")
                return jsonify({'error': '请求过于频繁，请稍后再试'}), 429
            
            if client_data['hour_count'] >= hour_limit:
                logger.warning(f"客户端 {client_ip} 超过小时频率限制")
                return jsonify({'error': '请求过于频繁，请稍后再试'}), 429
            
            # 增加计数
            client_data['minute_count'] += 1
            client_data['hour_count'] += 1
            client_data['last_reset'] = current_time
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

# 输入验证函数
def validate_video_id(video_id):
    """验证视频ID格式"""
    if not video_id or len(video_id) > 50:
        return False
    return bool(re.match(config.ALLOWED_VIDEO_ID_PATTERN, video_id))

def validate_search_query(query):
    """验证搜索查询"""
    if not query or len(query.strip()) == 0:
        return False, "搜索关键词不能为空"
    
    if len(query) > config.MAX_SEARCH_LENGTH:
        return False, f"搜索关键词长度不能超过{config.MAX_SEARCH_LENGTH}个字符"
    
    # 检查是否包含恶意字符
    dangerous_chars = ['<', '>', '"', "'", '&', 'javascript:', 'data:']
    for char in dangerous_chars:
        if char in query.lower():
            return False, "搜索关键词包含不允许的字符"
    
    return True, None

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/episode-play-url', methods=['POST'])
@rate_limit(per_minute=30, per_hour=100)
def get_episode_play_url():
    """获取单个剧集的播放地址"""
    try:
        data = request.get_json()
        if not data or 'episode_url' not in data:
            return jsonify({'success': False, 'error': '缺少剧集URL参数'}), 400
        
        episode_url = data['episode_url']
        if not episode_url:
            return jsonify({'success': False, 'error': '剧集URL不能为空'}), 400
        
        logger.info(f"获取剧集播放地址: {episode_url}")
        
        # 确保URL是完整的
        if not episode_url.startswith('http'):
            episode_url = f"https://djw1.com{episode_url}"
        
        # 使用现有的函数获取播放地址
        from video import get_episode_play_url
        play_url = get_episode_play_url(episode_url)
        
        if play_url:
            logger.info(f"成功获取剧集播放地址: {play_url}")
            return jsonify({
                'success': True,
                'play_url': play_url
            })
        else:
            logger.warning(f"未找到剧集播放地址: {episode_url}")
            return jsonify({
                'success': False,
                'error': '未找到播放地址'
            }), 404
            
    except Exception as e:
        logger.error(f"获取剧集播放地址出错: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': '服务器内部错误'
        }), 500

@app.route('/play-fixed')
def play_fixed():
    """修复版本的播放页面"""
    video_id = request.args.get('id')
    if not video_id:
        logger.warning("播放页面缺少视频ID参数")
        return render_template('error.html', message='缺少视频ID参数'), 400
    
    # 验证视频ID格式
    if not validate_video_id(video_id):
        logger.warning(f"播放页面收到无效的视频ID: {video_id}")
        return render_template('error.html', message='无效的视频ID格式'), 400
    
    logger.info(f"渲染修复版播放页面: {video_id}")
    return render_template('play_fixed.html')



@app.route('/search')
@rate_limit(per_minute=30, per_hour=100)
@monitor_performance
def search():
    """搜索接口 - 优化版本"""
    try:
        # 支持两种参数名：q 和 keyword
        keyword = request.args.get('q', '') or request.args.get('keyword', '')
        keyword = keyword.strip()
        
        # 输入验证
        is_valid, error_msg = validate_search_query(keyword)
        if not is_valid:
            logger.warning(f"无效的搜索查询: {keyword}, 错误: {error_msg}")
            return jsonify({'error': error_msg}), 400
        
        logger.info(f"搜索关键词: {keyword}")
        
        # 记录请求开始时间
        start_time = time.time()
        results = search_data(keyword)
        search_time = time.time() - start_time
        
        if results:
            logger.info(f"搜索到 {results.get('item_count', 0)} 个结果, 耗时: {search_time:.2f}秒")
            
            # 添加性能信息到响应中（开发环境）
            if config.DEBUG:
                results['_debug'] = {
                    'search_time': round(search_time, 2),
                    'timestamp': datetime.now().isoformat()
                }
            
            return jsonify(results)
        else:
            logger.info(f"未找到相关视频: {keyword}")
            return jsonify({'error': '未找到相关视频'}), 404
            
    except Exception as e:
        logger.error(f"搜索出错: {e}", exc_info=True)
        return jsonify({'error': '搜索服务暂时不可用，请稍后重试'}), 500

@app.route('/video/<video_id>')
@rate_limit(per_minute=20, per_hour=60)
@monitor_performance
def get_video_data(video_id):
    """获取视频详情数据 - 优化版本"""
    try:
        # 输入验证
        if not validate_video_id(video_id):
            logger.warning(f"无效的视频ID: {video_id}")
            return jsonify({'error': '无效的视频ID格式'}), 400
        
        # 获取查询参数并验证
        try:
            use_async = request.args.get('async', 'true').lower() == 'true'
            max_episodes = int(request.args.get('max_episodes', config.MAX_EPISODES))
            
            # 限制最大剧集数
            if max_episodes > 100:
                max_episodes = 100
            elif max_episodes < 1:
                max_episodes = 1
                
        except ValueError:
            logger.warning(f"无效的max_episodes参数: {request.args.get('max_episodes')}")
            return jsonify({'error': '无效的参数格式'}), 400
        
        logger.info(f"获取视频数据: {video_id}, 异步: {use_async}, 最大剧集数: {max_episodes}")
        
        # 构建播放链接
        play_link = get_play_link_by_id(video_id)
        if not play_link:
            logger.warning(f"无法构建播放链接: {video_id}")
            return jsonify({'error': '无效的视频ID'}), 404
        
        # 记录请求开始时间
        start_time = time.time()
        
        # 解析视频详情
        logger.info(f"开始解析视频详情，播放链接: {play_link}")
        video_data = parse_video_details(
            play_link, 
            use_async=use_async, 
            max_episodes=max_episodes
        )
        
        parse_time = time.time() - start_time
        
        if video_data:
            logger.info(f"成功获取视频数据: {video_data.get('video_title', 'Unknown')}, 耗时: {parse_time:.2f}秒")
            
            # 添加性能信息到响应中（开发环境）
            response_data = {'success': True, 'data': video_data}
            if config.DEBUG:
                response_data['_debug'] = {
                    'parse_time': round(parse_time, 2),
                    'episodes_count': len(video_data.get('episodes', [])),
                    'use_async': use_async,
                    'timestamp': datetime.now().isoformat(),
                    'play_link': play_link
                }
            
            return jsonify(response_data)
        else:
            logger.error(f"获取视频数据失败: {video_id}, 播放链接: {play_link}")
            logger.error("parse_video_details函数返回了None，可能的原因：")
            logger.error("1. 网络请求失败")
            logger.error("2. HTML解析失败")
            logger.error("3. 目标网站结构变化")
            logger.error("4. 被目标网站屏蔽")
            return jsonify({'error': '视频数据不存在或无法访问，请检查视频ID或稍后重试'}), 404
            
    except Exception as e:
        logger.error(f"获取视频数据出错: {e}", exc_info=True)
        return jsonify({'error': '视频服务暂时不可用，请稍后重试'}), 500

@app.route('/play')
def play():
    """播放页面"""
    video_id = request.args.get('id')
    if not video_id:
        logger.warning("播放页面缺少视频ID参数")
        return render_template('error.html', message='缺少视频ID参数'), 400
    
    # 验证视频ID格式
    if not validate_video_id(video_id):
        logger.warning(f"播放页面收到无效的视频ID: {video_id}")
        return render_template('error.html', message='无效的视频ID格式'), 400
    
    logger.info(f"渲染播放页面: {video_id}")
    # 直接渲染播放页面模板，让前端通过API获取数据
    return render_template('play.html')

@app.route('/cache/clear')
@rate_limit(per_minute=5, per_hour=10)
def clear_cache_route():
    """清除缓存接口"""
    try:
        clear_cache()
        logger.info("缓存已清除")
        return jsonify({'success': True, 'message': '缓存已清除'})
    except Exception as e:
        logger.error(f"清除缓存出错: {e}", exc_info=True)
        return jsonify({'error': '清除缓存失败'}), 500

@app.route('/cache/stats')
@rate_limit(per_minute=10, per_hour=30)
def cache_stats_route():
    """获取缓存统计信息"""
    try:
        stats = get_cache_stats()
        return jsonify({'success': True, 'data': stats})
    except Exception as e:
        logger.error(f"获取缓存统计出错: {e}", exc_info=True)
        return jsonify({'error': '获取缓存统计失败'}), 500

@app.route('/health')
def health_check():
    """健康检查端点"""
    try:
        cache_stats = get_cache_stats()
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '2.0.0',
            'cache_stats': cache_stats,
            'config': {
                'debug': config.DEBUG,
                'rate_limit_enabled': config.RATE_LIMIT_ENABLED,
                'max_episodes': config.MAX_EPISODES
            }
        })
    except Exception as e:
        logger.error(f"健康检查失败: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

# 全局错误处理
@app.errorhandler(400)
def bad_request(error):
    """400错误处理"""
    logger.warning(f"400错误: {error}")
    if request.is_json:
        return jsonify({'error': '请求格式错误'}), 400
    return render_template('error.html', message='请求格式错误'), 400

@app.errorhandler(404)
def not_found(error):
    """404错误处理"""
    logger.warning(f"404错误: {request.url}")
    if request.is_json:
        return jsonify({'error': '资源未找到'}), 404
    return render_template('error.html', message='页面未找到'), 404

@app.errorhandler(429)
def rate_limit_exceeded(error):
    """429错误处理 - 频率限制"""
    logger.warning(f"频率限制触发: {request.remote_addr}")
    if request.is_json:
        return jsonify({'error': '请求过于频繁，请稍后再试'}), 429
    return render_template('error.html', message='请求过于频繁，请稍后再试'), 429

@app.errorhandler(500)
def internal_error(error):
    """500错误处理"""
    logger.error(f"500错误: {error}", exc_info=True)
    if request.is_json:
        return jsonify({'error': '服务器内部错误'}), 500
    return render_template('error.html', message='服务器内部错误'), 500

@app.errorhandler(Exception)
def handle_exception(error):
    """处理未捕获的异常"""
    logger.error(f"未处理的异常: {error}", exc_info=True)
    if request.is_json:
        return jsonify({'error': '服务器内部错误'}), 500
    return render_template('error.html', message='服务器内部错误'), 500

if __name__ == '__main__':
    print("🚀 启动优化版播放器应用...")
    print("📊 新功能:")
    print("   - 异步并发请求")
    print("   - 智能缓存机制")
    print("   - 延迟加载剧集")
    print("   - 性能监控")
    print("   - 缓存管理API")
    print("   - 输入验证与安全防护")
    print("   - 频率限制")
    print("   - 错误处理优化")
    print("   - 配置管理系统")
    print("\n🌐 访问地址: http://localhost:5000")
    print("🔧 缓存管理: http://localhost:5000/cache/stats")
    print("❤️ 健康检查: http://localhost:5000/health")
    print(f"\n⚙️ 当前配置: {config.__class__.__name__}")
    print(f"🐛 调试模式: {'开启' if config.DEBUG else '关闭'}")
    print(f"⏱️ 频率限制: {'开启' if config.RATE_LIMIT_ENABLED else '关闭'}")
    
    # 启动应用
    app.run(
        debug=config.DEBUG, 
        host='0.0.0.0', 
        port=5000,
        threaded=True  # 启用多线程支持
    )