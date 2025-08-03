/**
 * 播放器页面JavaScript模块
 * 负责视频播放、剧集管理、用户交互等功能
 */

// 全局变量
let currentVideoData = null;
let currentEpisodeIndex = 0;
let isLoading = false;
let retryCount = 0;
const MAX_RETRY_COUNT = 3;

// ==================== 工具函数 ====================

/**
 * 客户端日志记录
 * @param {string} message - 日志消息
 * @param {object} data - 日志数据
 */
function sendLogToServer(message, data) {
    // 生产环境下使用console.log记录，避免无效的网络请求
    if (console && console.log) {
        console.log(`[${new Date().toISOString()}] ${message}:`, data);
    }
}

/**
 * 从URL中提取视频ID
 * @param {string} url - 视频URL
 * @returns {string|null} 视频ID
 */
function extractVideoIdFromUrl(url) {
    const match = url.match(/\/play\/([^\/]+)\.html/);
    return match ? match[1] : null;
}

/**
 * 从URL参数获取videoId
 * @returns {string|null} 视频ID
 */
function getVideoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// ==================== UI状态管理 ====================

/**
 * 显示错误信息
 * @param {string} message - 错误消息
 * @param {boolean} canRetry - 是否可以重试
 */
function showError(message, canRetry = true) {
    const errorContainer = document.getElementById('error-container');
    const retryButton = canRetry && retryCount < MAX_RETRY_COUNT 
        ? `<button onclick="retryCurrentOperation()" ${isLoading ? 'disabled' : ''}>
             ${isLoading ? '重试中...' : `重试 (${retryCount}/${MAX_RETRY_COUNT})`}
           </button>` 
        : '';
    
    errorContainer.innerHTML = `
        <div class="error-alert">
            <h3>⚠️ 播放失败</h3>
            <p>${message}</p>
            ${retryButton}
            <button onclick="location.reload()">刷新页面</button>
            <a href="/" class="back-button">返回搜索</a>
        </div>
    `;
    document.querySelector('.player-container').style.display = 'none';
}

/**
 * 显示加载状态
 * @param {string} message - 加载消息
 */
function showLoading(message = '加载中...') {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    isLoading = true;
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    isLoading = false;
}

/**
 * 显示剧集列表加载状态
 */
function showEpisodesLoading() {
    const episodesList = document.getElementById('episodes-list');
    const episodeCount = document.getElementById('episode-count');
    
    episodesList.innerHTML = `
        <div class="loading-episodes">
            <div class="loading-spinner"></div>
            <p>加载剧集中...</p>
        </div>
    `;
    episodeCount.textContent = '加载中...';
}

// ==================== 剧集管理 ====================

/**
 * 渲染剧集列表
 * @param {Array} episodes - 剧集数组
 */
function renderEpisodesList(episodes) {
    const episodesList = document.getElementById('episodes-list');
    const episodeCount = document.getElementById('episode-count');
    
    if (!episodes || episodes.length === 0) {
        episodesList.innerHTML = '<div class="no-episodes">暂无剧集信息</div>';
        episodeCount.textContent = '0 集';
        return;
    }

    episodeCount.textContent = `${episodes.length} 集`;
    
    const episodesHTML = episodes.map((episode, index) => `
        <div class="episode-item ${index === 0 ? 'active' : ''}" 
             data-index="${index}" 
             onclick="switchEpisode(${index})">
            <div class="episode-number">${episode.number}</div>
            <div class="episode-info-text">
                <div class="episode-title">${episode.title || `第${episode.number}集`}</div>
                <div class="episode-url">${episode.url ? '有播放链接' : '无播放链接'}</div>
            </div>
        </div>
    `).join('');
    
    episodesList.innerHTML = episodesHTML;
}

/**
 * 切换剧集
 * @param {number} index - 剧集索引
 */
function switchEpisode(index) {
    if (!currentVideoData || !currentVideoData.episodes || !currentVideoData.episodes[index]) {
        console.error('剧集数据不存在');
        showError('剧集数据不存在', false);
        return;
    }

    const episode = currentVideoData.episodes[index];
    currentEpisodeIndex = index;

    // 更新当前播放信息
    document.getElementById('episode-number').textContent = episode.number;
    document.getElementById('episode-title').textContent = episode.title || `第${episode.number}集`;

    // 更新剧集列表中的激活状态
    document.querySelectorAll('.episode-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });

    // 使用剧集的播放地址
    if (episode.play_url) {
        updatePlayer(episode.play_url);
    } else if (episode.url) {
        // 如果没有直接播放地址，尝试从URL获取
        showLoading('正在获取播放地址...');
        const episodeVideoId = extractVideoIdFromUrl(episode.url);
        if (episodeVideoId) {
            loadEpisodeVideo(episodeVideoId);
        } else {
            hideLoading();
            console.warn('无法获取剧集播放地址');
            showError('无法获取剧集播放地址', false);
        }
    } else {
        console.warn('剧集没有播放地址');
        showError('剧集没有播放地址', false);
    }

    // 滚动到当前剧集
    const activeItem = document.querySelector('.episode-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    sendLogToServer('切换剧集', {
        episodeIndex: index,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        hasPlayUrl: !!episode.play_url
    });
}

/**
 * 切换到上一集
 */
function switchToPreviousEpisode() {
    if (currentEpisodeIndex > 0) {
        switchEpisode(currentEpisodeIndex - 1);
    }
}

/**
 * 切换到下一集
 */
function switchToNextEpisode() {
    if (currentVideoData && currentVideoData.episodes && 
        currentEpisodeIndex < currentVideoData.episodes.length - 1) {
        switchEpisode(currentEpisodeIndex + 1);
    }
}

// ==================== 播放器管理 ====================

/**
 * 更新播放器
 * @param {string} m3u8Url - M3U8播放地址
 */
function updatePlayer(m3u8Url) {
    const encodedM3u8Url = encodeURIComponent(m3u8Url);
    const iframeSrc = `https://m3u8player.org/player.html?url=${encodedM3u8Url}`;
    document.getElementById('video-player').src = iframeSrc;
}

/**
 * 初始化播放器
 * @param {object} videoData - 视频数据
 */
function initPlayer(videoData) {
    try {
        // 保存视频数据
        currentVideoData = videoData;

        // 检查必要字段
        if (!videoData.m3u8_url && !videoData.play_url) {
            throw new Error('非法的视频链接格式');
        }
        if (!videoData.video_title) {
            throw new Error('视频数据中缺少标题字段');
        }

        // 展示视频信息
        document.getElementById('video-title').textContent = videoData.video_title;
        
        // 渲染剧集列表
        renderEpisodesList(videoData.episodes);
        
        // 如果有剧集信息，显示第一集
        if (videoData.episodes && videoData.episodes.length > 0) {
            const firstEpisode = videoData.episodes[0];
            document.getElementById('episode-number').textContent = firstEpisode.number;
            document.getElementById('episode-title').textContent = firstEpisode.title || `第${firstEpisode.number}集`;
        } else {
            document.getElementById('episode-number').textContent = '单集';
            document.getElementById('episode-title').textContent = '完整版';
        }

        // 构建并设置iframe的src
        const encodedM3u8Url = encodeURIComponent(videoData.m3u8_url || videoData.play_url);
        const iframeSrc = `https://m3u8player.org/player.html?url=${encodedM3u8Url}`;
        document.getElementById('video-player').src = iframeSrc;

        // 向服务器发送日志
        sendLogToServer('播放器初始化成功', {
            videoTitle: videoData.video_title,
            episodeCount: videoData.episodes ? videoData.episodes.length : 0
        });
    } catch (error) {
        console.error('播放器初始化失败:', error);
        showError(error.message);
        sendLogToServer('播放器初始化失败', {
            error: error.message, 
            stack: error.stack
        });
    }
}

// ==================== 数据加载 ====================

/**
 * 加载剧集视频
 * @param {string} videoId - 视频ID
 */
function loadEpisodeVideo(videoId) {
    const params = new URLSearchParams({
        async: 'true',
        max_episodes: '1'  // 只获取当前剧集
    });
    
    fetch(`/video/${videoId}?${params}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }
            return response.json();
        })
        .then(response => {
            hideLoading();
            if (!response.success) {
                throw new Error(response.error || '获取剧集数据失败');
            }
            
            const data = response.data;
            if (data && data.m3u8_url) {
                updatePlayer(data.m3u8_url);
            } else {
                throw new Error('剧集视频数据无效');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('加载剧集视频失败:', error);
            showError(`加载剧集失败: ${error.message}`, true);
        });
}

/**
 * 加载视频数据
 * @param {string} videoId - 视频ID
 */
function loadVideoData(videoId) {
    if (isLoading) return;
    
    showLoading('正在加载视频信息...');
    
    // 请求视频数据 - 使用新的API
    const params = new URLSearchParams({
        async: 'true',
        max_episodes: '20'  // 只获取前20集的播放地址
    });
    
    fetch(`/video/${videoId}?${params}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }
            return response.json();
        })
        .then(response => {
            hideLoading();
            
            if (!response.success) {
                throw new Error(response.error || '获取视频数据失败');
            }
            
            const data = response.data;
            // 检查API返回的数据结构
            if (data && (data.m3u8_url || (data.episodes && data.episodes.length > 0))) {
                retryCount = 0; // 重置重试计数
                initPlayer(data);
            } else {
                throw new Error('API返回无效的视频数据');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('请求失败:', error);
            showError(`加载视频失败: ${error.message}`, true);
            sendLogToServer('视频请求失败', {
                error: error.message,
                videoId: videoId,
                retryCount: retryCount
            });
        });
}

/**
 * 重试当前操作
 */
function retryCurrentOperation() {
    if (isLoading || retryCount >= MAX_RETRY_COUNT) return;
    
    retryCount++;
    const videoId = getVideoIdFromUrl();
    if (videoId) {
        loadVideoData(videoId);
    }
}

// ==================== 键盘快捷键 ====================

/**
 * 设置键盘快捷键
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // 防止在输入框中触发快捷键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                switchToPreviousEpisode();
                break;
            case 'ArrowRight':
                e.preventDefault();
                switchToNextEpisode();
                break;
            case ' ':
                e.preventDefault();
                // 尝试控制播放器暂停/播放（如果可能）
                break;
            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) {
                    return; // 允许浏览器刷新
                }
                e.preventDefault();
                retryCurrentOperation();
                break;
            case 'Escape':
                e.preventDefault();
                // 可以添加退出全屏等功能
                break;
            case 'h':
            case 'H':
                e.preventDefault();
                showKeyboardHelp();
                break;
        }
    });
}

/**
 * 显示键盘快捷键帮助
 */
function showKeyboardHelp() {
    const helpContent = `
        <div class="keyboard-help">
            <h3>⌨️ 键盘快捷键</h3>
            <div class="help-content">
                <div class="help-item">
                    <kbd>←</kbd> <span>上一集</span>
                </div>
                <div class="help-item">
                    <kbd>→</kbd> <span>下一集</span>
                </div>
                <div class="help-item">
                    <kbd>R</kbd> <span>重试加载</span>
                </div>
                <div class="help-item">
                    <kbd>H</kbd> <span>显示帮助</span>
                </div>
                <div class="help-item">
                    <kbd>Esc</kbd> <span>关闭帮助</span>
                </div>
            </div>
            <button onclick="hideKeyboardHelp()">关闭</button>
        </div>
    `;
    
    const helpOverlay = document.createElement('div');
    helpOverlay.className = 'help-overlay';
    helpOverlay.innerHTML = helpContent;
    helpOverlay.onclick = function(e) {
        if (e.target === helpOverlay) {
            hideKeyboardHelp();
        }
    };
    
    document.body.appendChild(helpOverlay);
    
    // ESC键关闭帮助
    const escHandler = function(e) {
        if (e.key === 'Escape') {
            hideKeyboardHelp();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * 隐藏键盘快捷键帮助
 */
function hideKeyboardHelp() {
    const helpOverlay = document.querySelector('.help-overlay');
    if (helpOverlay) {
        helpOverlay.remove();
    }
}

// ==================== 移动端支持 ====================

/**
 * 移动端手势支持
 */
function setupMobileGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isScrolling = false;
    
    const minSwipeDistance = 50;
    const maxVerticalDistance = 100;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        isScrolling = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        // 检测是否在垂直滚动
        const currentY = e.changedTouches[0].screenY;
        if (Math.abs(currentY - touchStartY) > 10) {
            isScrolling = true;
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        if (isScrolling) return; // 如果在滚动，忽略手势
        
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        
        handleSwipeGesture();
    }, { passive: true });
    
    function handleSwipeGesture() {
        const horizontalDistance = touchEndX - touchStartX;
        const verticalDistance = Math.abs(touchEndY - touchStartY);
        
        // 确保是水平滑动且垂直距离不太大
        if (Math.abs(horizontalDistance) < minSwipeDistance || verticalDistance > maxVerticalDistance) {
            return;
        }
        
        // 左滑：下一集
        if (horizontalDistance < -minSwipeDistance) {
            switchToNextEpisode();
            showSwipeHint('下一集');
        }
        // 右滑：上一集
        else if (horizontalDistance > minSwipeDistance) {
            switchToPreviousEpisode();
            showSwipeHint('上一集');
        }
    }
    
    /**
     * 显示滑动提示
     * @param {string} text - 提示文本
     */
    function showSwipeHint(text) {
        const hint = document.createElement('div');
        hint.className = 'swipe-hint';
        hint.textContent = text;
        document.body.appendChild(hint);
        
        setTimeout(() => {
            hint.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 300);
        }, 1500);
    }
}

/**
 * 设置移动端剧集列表功能
 */
function setupMobileEpisodeList() {
    const episodesHeader = document.querySelector('.episodes-header');
    const episodesSection = document.querySelector('.episodes-section');
    
    if (episodesHeader && episodesSection) {
        // 添加点击头部切换折叠状态的功能
        episodesHeader.addEventListener('click', function() {
            const episodesList = episodesSection.querySelector('.episodes-list');
            if (episodesList) {
                const isHidden = episodesList.style.display === 'none';
                episodesList.style.display = isHidden ? 'grid' : 'none';
                
                // 添加动画效果
                episodesHeader.classList.toggle('collapsed', !isHidden);
            }
        });
        
        // 点击剧集项后滚动到当前项
        document.addEventListener('click', function(e) {
            if (e.target.closest('.episode-item')) {
                const activeItem = e.target.closest('.episode-item');
                setTimeout(() => {
                    activeItem.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest',
                        inline: 'center'
                    });
                }, 100);
            }
        });
        
        // 双击头部显示剧集总数信息
        let tapCount = 0;
        episodesHeader.addEventListener('click', function() {
            tapCount++;
            setTimeout(() => {
                if (tapCount === 2 && currentVideoData && currentVideoData.episodes) {
                    showEpisodeInfo();
                }
                tapCount = 0;
            }, 300);
        });
    }
    
    // 设置移动端手势
    if (window.innerWidth <= 768) {
        setupMobileGestures();
    }
}

/**
 * 显示剧集信息
 */
function showEpisodeInfo() {
    if (!currentVideoData || !currentVideoData.episodes) return;
    
    const totalEpisodes = currentVideoData.episodes.length;
    const loadedEpisodes = currentVideoData.episodes.filter(ep => ep.play_url).length;
    
    const info = document.createElement('div');
    info.className = 'episode-info-toast';
    info.innerHTML = `
        <div class="toast-content">
            <h4>📺 剧集信息</h4>
            <p>总剧集数: ${totalEpisodes}</p>
            <p>已加载: ${loadedEpisodes}</p>
            <p>当前: 第${currentEpisodeIndex + 1}集</p>
        </div>
    `;
    
    document.body.appendChild(info);
    
    setTimeout(() => {
        info.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        info.classList.remove('show');
            setTimeout(() => {
            if (info.parentNode) {
                info.parentNode.removeChild(info);
            }
        }, 300);
    }, 3000);
}

// ==================== 初始化 ====================

/**
 * 页面加载完成后初始化
 */
window.addEventListener('DOMContentLoaded', () => {
    // 初始化剧集列表为加载状态
    showEpisodesLoading();
    
    const videoId = getVideoIdFromUrl();
    
    if (videoId) {
        loadVideoData(videoId);
    } else {
        const errorMsg = '未找到视频ID参数';
        console.error(errorMsg);
        showError(errorMsg, false);
        // 清除剧集加载状态
        document.getElementById('episodes-list').innerHTML = '<div class="no-episodes">无法加载剧集</div>';
        document.getElementById('episode-count').textContent = '0 集';
        sendLogToServer('参数缺失', {
            urlParams: window.location.href
        });
    }
    
    // 设置键盘快捷键
    setupKeyboardShortcuts();
    
    // 移动端剧集列表显示/隐藏功能
    setupMobileEpisodeList();
});