/**
 * 播放器组件
 * 负责视频播放器的核心功能
 */

class VideoPlayer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.iframe = null;
        this.options = {
            playerUrl: 'https://m3u8player.org/player.html',
            ...options
        };
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            throw new Error('播放器容器未找到');
        }
        
        this.iframe = this.container.querySelector('iframe');
        if (!this.iframe) {
            throw new Error('播放器iframe未找到');
        }
    }
    
    /**
     * 加载视频
     * @param {string} m3u8Url - M3U8播放地址
     */
    loadVideo(m3u8Url) {
        if (!m3u8Url) {
            throw new Error('播放地址不能为空');
        }
        
        const encodedUrl = encodeURIComponent(m3u8Url);
        const playerSrc = `${this.options.playerUrl}?url=${encodedUrl}`;
        
        this.iframe.src = playerSrc;
        
        // 显示播放器容器
        this.show();
        
        console.log('视频加载完成:', m3u8Url);
    }
    
    /**
     * 显示播放器
     */
    show() {
        this.container.style.display = '';
    }
    
    /**
     * 隐藏播放器
     */
    hide() {
        this.container.style.display = 'none';
    }
    
    /**
     * 清空播放器
     */
    clear() {
        this.iframe.src = '';
    }
    
    /**
     * 销毁播放器
     */
    destroy() {
        this.clear();
        this.iframe = null;
        this.container = null;
    }
}

// 导出播放器类
window.VideoPlayer = VideoPlayer;