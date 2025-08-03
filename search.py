import requests
from bs4 import BeautifulSoup

def search_data(keyword):
    # 使用前端已编码的关键词，不再进行二次编码
    url = f"https://djw1.com/search/{keyword}/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    }
    
    try:
        # 发送HTTP请求
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        container = soup.find('section', class_='container items')
        
        if not container:
            # 返回空结果
            return {
                'search_term': keyword,
                'section_title': f"搜索: {keyword}",
                'item_count': 0,
                'items': []
            }
        
        # 提取标题
        title_tag = container.find('h1', class_='items-title')
        title = title_tag.get_text(strip=True) if title_tag else ""
        
        # 提取列表项
        items = []
        for item in container.find_all('li', class_='item'):
            # 提取播放链接
            play_link_tag = item.find('a', class_='image-line')
            play_link = play_link_tag['href'] if play_link_tag and play_link_tag.has_attr('href') else ""
            
            # 提取图片链接
            img_tag = item.find('img', class_='thumb')
            img_src = img_tag['src'] if img_tag and img_tag.has_attr('src') else ""
            
            # 提取备注
            remarks_tag = item.find('span', class_='remarks light')
            remarks = remarks_tag.get_text(strip=True) if remarks_tag else ""
            
            # 提取标签
            tags_tag = item.find('span', class_='tags')
            tags = tags_tag.get_text(strip=True) if tags_tag else ""
            
            # 提取副标题
            subtitle_tag = item.find('h3')
            subtitle = subtitle_tag.get_text(strip=True) if subtitle_tag else ""
            
            # 从play_link中提取video_id
            video_id = ""
            if play_link:
                # 从URL中提取ID，例如从 /play/12345.html 提取 12345
                import re
                match = re.search(r'/play/([^/]+)\.html', play_link)
                if match:
                    video_id = match.group(1)
            
            items.append({
                'title': subtitle,
                'play_link': play_link,
                'video_id': video_id,  # 添加video_id字段
                'image_url': img_src,
                'episodes': remarks,
                'genres': tags.strip()
            })
        
        return {
            'search_term': keyword,
            'section_title': title,
            'item_count': len(items),
            'items': items
        }
    
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None