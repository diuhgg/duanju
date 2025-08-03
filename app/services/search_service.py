"""
搜索服务模块

处理短剧搜索相关的业务逻辑
"""

import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

def search_dramas(keyword):
    """
    搜索短剧
    
    Args:
        keyword (str): 搜索关键词
        
    Returns:
        dict: 搜索结果
    """
    try:
        # 构建搜索URL
        search_url = f"https://www.2345kan.com/search/{keyword}.html"
        
        # 发送HTTP请求
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(search_url, headers=headers, timeout=10)
        response.raise_for_status()
        response.encoding = 'utf-8'
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 提取搜索结果
        results = _parse_search_results(soup, keyword)
        
        logger.info(f"搜索关键词: {keyword}, 找到 {results['item_count']} 个结果")
        return results
        
    except requests.RequestException as e:
        logger.error(f"搜索请求失败: {e}")
        raise Exception(f"搜索请求失败: {str(e)}")
    except Exception as e:
        logger.error(f"搜索处理失败: {e}")
        raise Exception(f"搜索处理失败: {str(e)}")

def _parse_search_results(soup, keyword):
    """
    解析搜索结果页面
    
    Args:
        soup: BeautifulSoup对象
        keyword: 搜索关键词
        
    Returns:
        dict: 解析后的搜索结果
    """
    # 获取标题
    title_element = soup.find('h1', class_='fed-part-title')
    title = title_element.get_text(strip=True) if title_element else f'"{keyword}"的搜索结果'
    
    # 获取搜索结果项
    items = []
    item_elements = soup.find_all('a', class_='fed-list-item')
    
    for item in item_elements:
        try:
            # 提取链接
            play_link = item.get('href', '')
            if not play_link.startswith('http'):
                play_link = 'https://www.2345kan.com' + play_link
            
            # 提取视频ID
            video_id = _extract_video_id_from_url(play_link)
            
            # 提取图片
            img_element = item.find('img')
            img_src = img_element.get('data-original', '') if img_element else ''
            if img_src and not img_src.startswith('http'):
                img_src = 'https://www.2345kan.com' + img_src
            
            # 提取标题
            title_element = item.find('h3', class_='fed-list-title')
            subtitle = title_element.get_text(strip=True) if title_element else '未知标题'
            
            # 提取集数信息
            remarks_element = item.find('span', class_='fed-list-remarks')
            remarks = remarks_element.get_text(strip=True) if remarks_element else '未知集数'
            
            # 提取标签
            tags_elements = item.find_all('span', class_='fed-list-tag')
            tags = ' '.join([tag.get_text(strip=True) for tag in tags_elements])
            
            items.append({
                'title': subtitle,
                'play_link': play_link,
                'video_id': video_id,
                'image_url': img_src,
                'episodes': remarks,
                'genres': tags.strip()
            })
            
        except Exception as e:
            logger.warning(f"解析搜索结果项失败: {e}")
            continue
    
    return {
        'search_term': keyword,
        'section_title': title,
        'item_count': len(items),
        'items': items
    }

def _extract_video_id_from_url(url):
    """
    从URL中提取视频ID
    
    Args:
        url (str): 视频URL
        
    Returns:
        str: 视频ID
    """
    try:
        if '/play/' in url:
            # 提取 /play/xxx.html 中的 xxx
            parts = url.split('/play/')
            if len(parts) > 1:
                video_part = parts[1].split('.html')[0]
                return video_part
    except Exception as e:
        logger.warning(f"提取视频ID失败: {e}")
    
    return ''