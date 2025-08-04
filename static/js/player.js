/**
 * 播放器页面JavaScript模块
 * 负责视频播放、剧集管理、用户交互等功能
 */

// 全局变量
let currentVideoData = null;
let currentEpisodeIndex = 0;
let isLoading = false;
let isInitialized = false;
let retryCount = 0;
let cachedEpisodes = null; // 缓存播放列表
let player = null; // Video.js播放器实例
const MAX_RETRY_COUNT = 3;

// ==================== Video.js播放器管理 ====================

/**
 * 初始化Video.js播放器
 */
function initVideoPlayer() {
    if (player) {
        player.dispose();
        player = null;
    }
    
    try {
        player = videojs('video-player', {
            controls: true,
            fluid: true,
            responsive: true,
            aspectRatio: window.innerWidth <= 768 ? '9:16' : '16:9', // 响应式长宽比
            fill: false,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            html5: {
                hls: {
                    enableLowInitialPlaylist: true,
                    smoothQualityChange: true,
                    overrideNative: true
                }
            },
            techOrder: ['html5'],
            sources: [],
            breakpoints: {
                tiny: 300,
                xsmall: 400,
                small: 500,
                medium: 600,
                large: 700,
                xlarge: 800,
                huge: 900
            }
        });

        // 播放器事件监听
        player.ready(() => {
            console.log('Video.js播放器已准备就绪');
            // 根据设备类型设置合适的aspect ratio
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                player.aspectRatio('9:16');
            } else {
                player.aspectRatio('16:9');
            }
            adjustPlayerSize(); // 调整播放器尺寸
        });

        player.on('error', (error) => {
            console.error('播放器错误:', error);
            showError('视频播放出错，请稍后重试');
        });

        player.on('loadstart', () => {
            console.log('开始加载视频');
        });

        player.on('canplay', () => {
            console.log('视频可以播放');
            hideLoading();
        });

        player.on('ended', () => {
            console.log('视频播放结束');
            // 自动播放下一集
            autoPlayNextEpisode();
        });

        player.on('resize', () => {
            adjustPlayerSize();
        });

        // 窗口大小改变时调整播放器
        window.addEventListener('resize', () => {
            adjustPlayerSize();
        });

        return player;
    } catch (error) {
        console.error('初始化播放器失败:', error);
        showError('播放器初始化失败');
        return null;
    }
}

/**
 * 更新播放器源
 * @param {string} videoUrl - 视频URL
 * @param {string} videoType - 视频类型
 */
function updatePlayerSource(videoUrl, videoType = 'application/x-mpegURL') {
    if (!player) {
        player = initVideoPlayer();
    }
    
    if (player && videoUrl) {
        try {
            showLoading('正在加载视频...', true);
            
            player.src({
                src: videoUrl,
                type: videoType
            });
            
            // 尝试自动播放
            player.ready(() => {
                player.play().catch(e => {
                    console.log('自动播放失败，需要用户交互:', e);
                });
            });
            
        } catch (error) {
            console.error('更新播放器源失败:', error);
            showError('视频加载失败');
        }
    }
}

/**
 * 动态调整播放器尺寸
 */
function adjustPlayerSize() {
    if (!player) return;
    
    const container = document.querySelector('.player-container');
    if (!container) return;
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isLandscape = screenWidth > screenHeight;
    const isMobile = screenWidth <= 768;
    
    try {
        if (isMobile) {
            // 移动端自适应（竖屏视频）
            const episodesList = document.querySelector('.episodes-section');
            const isEpisodesCollapsed = episodesList && episodesList.classList.contains('collapsed');
            
            if (isLandscape) {
                // 横屏：充满可用空间
                const availableHeight = isEpisodesCollapsed ? screenHeight - 80 : screenHeight - 120;
                const maxHeight = Math.min(availableHeight, screenHeight * 0.9);
                const maxWidth = Math.min(screenWidth * 0.9, maxHeight * 9/16);
                container.style.maxHeight = `${maxHeight}px`;
                container.style.maxWidth = `${maxWidth}px`;
                container.style.aspectRatio = '9/16';
            } else {
                // 竖屏：充满播放列表之外的空间
                const availableHeight = isEpisodesCollapsed ? screenHeight - 80 : screenHeight - 120;
                const maxHeight = Math.min(availableHeight, screenHeight * 0.85);
                const maxWidth = Math.min(screenWidth * 0.95, maxHeight * 9/16);
                container.style.maxHeight = `${maxHeight}px`;
                container.style.maxWidth = `${maxWidth}px`;
                container.style.aspectRatio = '9/16';
            }
        } else {
            // 桌面端自适应（16:9比例）
            const maxHeight = Math.min(screenHeight * 0.8, 700);
            container.style.maxHeight = `${maxHeight}px`;
            container.style.aspectRatio = '16/9';
            container.style.maxWidth = 'none'; // 桌面端不限制最大宽度
        }
        
        // 触发播放器重新计算尺寸
        if (player.el()) {
            player.trigger('resize');
        }
        
    } catch (error) {
        console.warn('调整播放器尺寸时出错:', error);
    }
}

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
 * @param {boolean} showInPlayer - 是否显示在播放器上方
 */
function showLoading(message = '加载中...', showInPlayer = false) {
    // 防止重复显示加载状态
    if (isLoading) {
        return;
    }
    
    const loadingHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    if (showInPlayer) {
        // 显示在播放器上方
        const playerLoadingContainer = document.getElementById('player-loading-container');
        if (playerLoadingContainer) {
            playerLoadingContainer.innerHTML = loadingHTML;
        }
    } else {
        // 显示在页面顶部（用于初始加载）
        const errorContainer = document.getElementById('error-container');
        errorContainer.innerHTML = loadingHTML;
    }
    
    isLoading = true;
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const errorContainer = document.getElementById('error-container');
    const playerLoadingContainer = document.getElementById('player-loading-container');
    
    errorContainer.innerHTML = '';
    if (playerLoadingContainer) {
        playerLoadingContainer.innerHTML = '';
    }
    isLoading = false;
}

/**
 * 显示剧集列表加载状态（已弃用，使用统一的showLoading）
 */
// function showEpisodesLoading() {
//     const episodesList = document.getElementById('episodes-list');
//     const episodeCount = document.getElementById('episode-count');
//     
//     episodesList.innerHTML = `
//         <div class="loading-episodes">
//             <div class="loading-spinner"></div>
//             <p>加载剧集中...</p>
//         </div>
//     `;
//     episodeCount.textContent = '加载中...';
// }

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
            </div>
        </div>
    `).join('');
    
    episodesList.innerHTML = episodesHTML;
}

/**
 * 切换剧集 - 优化版本（使用缓存）
 * @param {number} index - 剧集索引
 */
function switchEpisode(index) {
    if (!currentVideoData || !cachedEpisodes || !cachedEpisodes[index]) {
        console.error('剧集数据不存在');
        showError('剧集数据不存在', false);
        return;
    }
    
    const episode = cachedEpisodes[index];
    currentEpisodeIndex = index;
    
    // 更新当前播放信息
    document.getElementById('episode-number').textContent = episode.number;
    document.getElementById('episode-title').textContent = episode.title || `第${episode.number}集`;
    
    // 更新剧集列表中的激活状态
    document.querySelectorAll('.episode-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
    
    // 使用缓存的播放地址，不重复请求
    if (episode.play_url) {
        updatePlayer(episode.play_url);
    } else if (episode.url) {
        // 如果没有直接播放地址，尝试动态获取（不显示加载动画）
        loadEpisodePlayUrl(episode.url, index);
    } else {
        console.warn('剧集没有播放地址和URL');
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
        hasPlayUrl: !!episode.play_url,
        fromCache: true
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
    } else {
        console.log('已经是最后一集了');
        showToast('已播放完所有剧集');
    }
}

/**
 * 自动播放下一集（带提示和延迟）
 */
function autoPlayNextEpisode() {
    if (!currentVideoData || !currentVideoData.episodes) {
        console.log('没有剧集数据');
        return;
    }
    
    if (currentEpisodeIndex >= currentVideoData.episodes.length - 1) {
        console.log('已经是最后一集了');
        showToast('🎉 所有剧集播放完毕！');
        return;
    }
    
    // 显示自动播放倒计时
    showAutoPlayCountdown(() => {
        switchEpisode(currentEpisodeIndex + 1);
    });
}

/**
 * 显示自动播放倒计时
 * @param {Function} callback - 倒计时结束后的回调
 */
function showAutoPlayCountdown(callback) {
    const nextEpisodeIndex = currentEpisodeIndex + 1;
    const nextEpisode = currentVideoData.episodes[nextEpisodeIndex];
    
    if (!nextEpisode) return;
    
    let countdown = 5; // 5秒倒计时
    const countdownElement = document.createElement('div');
    countdownElement.className = 'auto-play-countdown';
    countdownElement.innerHTML = `
        <div class="countdown-content">
            <div class="countdown-text">即将播放下一集</div>
            <div class="next-episode-info">
                第${nextEpisode.number}集: ${nextEpisode.title || `第${nextEpisode.number}集`}
            </div>
            <div class="countdown-timer">${countdown}</div>
            <div class="countdown-actions">
                <button class="countdown-btn cancel-btn" onclick="cancelAutoPlay()">取消</button>
                <button class="countdown-btn play-now-btn" onclick="playNowAutoPlay()">立即播放</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(countdownElement);
    
    // 保存回调和倒计时元素到全局变量
    window.autoPlayCallback = callback;
    window.autoPlayCountdownElement = countdownElement;
    
    // 开始倒计时
    const timer = setInterval(() => {
        countdown--;
        const timerElement = countdownElement.querySelector('.countdown-timer');
        if (timerElement) {
            timerElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(timer);
            if (countdownElement.parentNode) {
                countdownElement.parentNode.removeChild(countdownElement);
            }
            if (callback) callback();
            // 清理全局变量
            window.autoPlayCallback = null;
            window.autoPlayCountdownElement = null;
        }
    }, 1000);
    
    // 保存计时器ID
    window.autoPlayTimer = timer;
}

/**
 * 取消自动播放
 */
function cancelAutoPlay() {
    if (window.autoPlayTimer) {
        clearInterval(window.autoPlayTimer);
        window.autoPlayTimer = null;
    }
    if (window.autoPlayCountdownElement && window.autoPlayCountdownElement.parentNode) {
        window.autoPlayCountdownElement.parentNode.removeChild(window.autoPlayCountdownElement);
    }
    window.autoPlayCallback = null;
    window.autoPlayCountdownElement = null;
    showToast('已取消自动播放');
}

/**
 * 立即播放下一集
 */
function playNowAutoPlay() {
    if (window.autoPlayTimer) {
        clearInterval(window.autoPlayTimer);
        window.autoPlayTimer = null;
    }
    if (window.autoPlayCountdownElement && window.autoPlayCountdownElement.parentNode) {
        window.autoPlayCountdownElement.parentNode.removeChild(window.autoPlayCountdownElement);
    }
    
    const callback = window.autoPlayCallback;
    window.autoPlayCallback = null;
    window.autoPlayCountdownElement = null;
    
    if (callback) callback();
}

// ==================== 播放器管理 ====================

/**
 * 更新播放器
 * @param {string} m3u8Url - M3U8播放地址
 */
function updatePlayer(m3u8Url) {
    if (m3u8Url) {
        updatePlayerSource(m3u8Url);
    } else {
        showError('无效的播放地址');
    }
}



/**
 * 快速初始化播放器 - 优先显示视频
 * @param {Object} videoData - 视频数据
 */
function initPlayerQuick(videoData) {
    try {
        // 保存视频数据
        currentVideoData = videoData;
        
        // 检查必要字段
        if (!videoData.m3u8_url && !videoData.play_url && (!videoData.episodes || videoData.episodes.length === 0)) {
            throw new Error('无法找到播放地址：缺少m3u8_url、play_url和剧集信息');
        }
        
        // 展示视频信息
        document.getElementById('video-title').textContent = videoData.video_title || '未知视频';
        
        // 如果有剧集信息，显示第一集
        if (videoData.episodes && videoData.episodes.length > 0) {
            const firstEpisode = videoData.episodes[0];
            document.getElementById('episode-number').textContent = firstEpisode.number;
            document.getElementById('episode-title').textContent = firstEpisode.title || `第${firstEpisode.number}集`;
            
            // 缓存当前剧集数据
            cachedEpisodes = videoData.episodes;
            
            // 渲染当前剧集列表（可能不完整）
            renderEpisodesList(videoData.episodes);
        } else {
            document.getElementById('episode-number').textContent = '单集';
            document.getElementById('episode-title').textContent = '完整版';
        }
        
        // 初始化Video.js播放器
        if (!player) {
            player = initVideoPlayer();
        }
        
        // 调整播放器尺寸
        setTimeout(() => {
            adjustPlayerSize();
        }, 100);
        
        // 优先设置播放器
        const playUrl = videoData.m3u8_url || videoData.play_url;
        
        if (playUrl) {
            updatePlayerSource(playUrl);
        } else if (videoData.episodes && videoData.episodes.length > 0) {
            // 使用第一集播放地址
            const firstEpisode = videoData.episodes[0];
            if (firstEpisode.play_url) {
                updatePlayerSource(firstEpisode.play_url);
            }
        }
        
        hideLoading();
        
        // 发送日志
        sendLogToServer('播放器快速初始化成功', {
            videoTitle: videoData.video_title,
            episodeCount: videoData.episodes ? videoData.episodes.length : 0,
            hasPlayUrl: !!playUrl
        });
        
    } catch (error) {
        console.error('播放器快速初始化失败:', error);
        showError(error.message);
        sendLogToServer('播放器快速初始化失败', {
            error: error.message, 
            stack: error.stack
        });
    }
}

// ==================== 数据加载 ====================

/**
 * 加载剧集播放地址
 * @param {string} episodeUrl - 剧集页面URL
 * @param {number} episodeIndex - 剧集索引
 */
function loadEpisodePlayUrl(episodeUrl, episodeIndex) {
    // 创建一个临时的API来获取单个剧集的播放地址
    const apiUrl = '/episode-play-url';
    
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            episode_url: episodeUrl
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        return response.json();
    })
    .then(response => {
        if (!response.success) {
            throw new Error(response.error || '获取剧集播放地址失败');
        }
        
        const playUrl = response.play_url;
        if (playUrl) {
            // 更新缓存
            if (cachedEpisodes && cachedEpisodes[episodeIndex]) {
                cachedEpisodes[episodeIndex].play_url = playUrl;
            }
            
            // 更新播放器
            updatePlayer(playUrl);
            
            // 重新渲染播放列表以显示更新的状态
            renderEpisodesList(cachedEpisodes);
            
            // 恢复激活状态
            document.querySelectorAll('.episode-item').forEach((item, i) => {
                item.classList.toggle('active', i === episodeIndex);
            });
        } else {
            throw new Error('未获取到有效的播放地址');
        }
    })
    .catch(error => {
        console.error('加载剧集播放地址失败:', error);
        showError(`加载剧集失败: ${error.message}`, true);
    });
}

/**
 * 加载完整播放列表
 * @param {string} videoId - 视频ID
 */
function loadFullEpisodeList(videoId) {
    // 如果已经有缓存且数量足够，跳过加载
    if (cachedEpisodes && cachedEpisodes.length > 5) {
        console.log('播放列表已缓存，跳过重复加载');
        return;
    }
    
    console.log('开始加载完整播放列表...');
    
    const params = new URLSearchParams({
        async: 'true',
        max_episodes: '50'  // 获取更多剧集
    });
    
    fetch(`/video/${videoId}?${params}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }
            return response.json();
        })
        .then(response => {
            if (!response.success) {
                throw new Error(response.error || '获取完整播放列表失败');
            }
            
            const data = response.data;
            
            if (data && data.episodes && data.episodes.length > 0) {
                // 更新缓存
                cachedEpisodes = data.episodes;
                currentVideoData.episodes = data.episodes;
                
                // 重新渲染完整播放列表
                renderEpisodesList(data.episodes);
                
                console.log(`完整播放列表加载完成，共 ${data.episodes.length} 集`);
                
                sendLogToServer('完整播放列表加载成功', {
                    episodeCount: data.episodes.length
                });
            }
        })
        .catch(error => {
            console.warn('加载完整播放列表失败:', error);
            // 不影响当前播放，只记录日志
            sendLogToServer('完整播放列表加载失败', {
                error: error.message
            });
        });
}

/**
 * 加载视频数据 - 优化版本
 * @param {string} videoId - 视频ID
 */
function loadVideoData(videoId) {
    if (isLoading) {
        return;
    }
    
    // 注释：已移除顶部加载动画
    // showLoading('正在加载视频信息...');
    
    // 优先获取视频播放地址和基本信息
    const params = new URLSearchParams({
        async: 'true',
        max_episodes: '1'  // 先只获取第一集，快速显示播放器
    });
    
    const startTime = performance.now();
    const apiUrl = `/video/${videoId}?${params}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}`);
            }
            return response.json();
        })
        .then(response => {
            const loadTime = performance.now() - startTime;
            
            if (!response.success) {
                throw new Error(response.error || '获取视频数据失败');
            }
            
            const data = response.data;
            
            if (data && (data.m3u8_url || data.play_url || (data.episodes && data.episodes.length > 0))) {
                retryCount = 0; // 重置重试计数
                
                // 先初始化播放器（优先显示视频）
                initPlayerQuick(data);
                
                // 然后异步加载完整播放列表
                loadFullEpisodeList(videoId);
            } else {
                throw new Error('API返回无效的视频数据：缺少播放地址和剧集信息');
            }
        })
        .catch(error => {
            hideLoading();
            console.error('请求失败:', error);
            showError(`加载视频失败: ${error.message}`, true);
            sendLogToServer('视频请求失败', {
                videoId: videoId,
                error: error.message,
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
                // 控制video.js播放器暂停/播放
                if (player) {
                    if (player.paused()) {
                        player.play();
                    } else {
                        player.pause();
                    }
                }
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
                    <kbd>空格</kbd> <span>播放/暂停</span>
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
    // 防止重复初始化
    if (isInitialized) {
        return;
    }
    
    isInitialized = true;
    
    // 初始化页面元素状态
    document.getElementById('video-title').textContent = '';
    document.getElementById('episode-number').textContent = '';
    document.getElementById('episode-title').textContent = '';
    document.getElementById('episode-count').textContent = '';
    document.getElementById('episodes-list').innerHTML = '';
    
    const videoId = getVideoIdFromUrl();
    
    if (videoId) {
        // 只调用loadVideoData，不再手动调用showLoading
        if (!isLoading) {
            loadVideoData(videoId);
        }
    } else {
        const errorMsg = '未找到视频ID参数';
        console.error(errorMsg);
        showError(errorMsg, false);
        // 设置错误状态
        document.getElementById('episodes-list').innerHTML = '<div class="no-episodes">无法加载剧集</div>';
        document.getElementById('episode-count').textContent = '0 集';
        document.getElementById('video-title').textContent = '视频加载失败';
        sendLogToServer('参数缺失', {
            urlParams: window.location.href
        });
    }
    
    // 设置键盘快捷键
    setupKeyboardShortcuts();
    
    // 移动端剧集列表显示/隐藏功能
    setupMobileEpisodeList();
});

// 页面卸载时清理播放器
window.addEventListener('beforeunload', () => {
    if (player) {
        player.dispose();
        player = null;
    }
});

// 页面隐藏时暂停播放
document.addEventListener('visibilitychange', () => {
    if (player && document.hidden) {
        player.pause();
    }
});

/**
 * 初始化移动端播放列表折叠功能
 */
function initEpisodesCollapse() {
    const episodesHeader = document.querySelector('.episodes-header');
    const episodesSection = document.querySelector('.episodes-section');
    const mainContent = document.querySelector('.main-content');
    
    if (!episodesHeader || !episodesSection || !mainContent) return;
    
    // 检查是否为移动端
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    
    // 默认不折叠
    let isCollapsed = false;
    
    // 点击头部切换折叠状态
    episodesHeader.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        
        if (isCollapsed) {
            episodesSection.classList.add('collapsed');
            mainContent.classList.add('episodes-collapsed');
        } else {
            episodesSection.classList.remove('collapsed');
            mainContent.classList.remove('episodes-collapsed');
        }
        
        // 折叠状态改变后重新调整播放器尺寸
        setTimeout(() => {
            adjustPlayerSize();
        }, 300); // 等待CSS动画完成
    });
}

// 初始化折叠功能
document.addEventListener('DOMContentLoaded', () => {
    initEpisodesCollapse();
});

// 窗口大小改变时重新初始化
window.addEventListener('resize', () => {
    // 延迟执行，避免频繁调用
    setTimeout(() => {
        initEpisodesCollapse();
    }, 200);
});