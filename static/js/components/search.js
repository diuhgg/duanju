/**
 * 搜索组件
 * 负责搜索功能的交互逻辑
 */

class SearchComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            placeholder: '请输入短剧名称...',
            minLength: 2,
            debounceDelay: 300,
            ...options
        };
        
        this.searchInput = null;
        this.searchButton = null;
        this.resultsContainer = null;
        this.loadingElement = null;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            throw new Error('搜索容器未找到');
        }
        
        this.findElements();
        this.bindEvents();
    }
    
    findElements() {
        this.searchInput = this.container.querySelector('input[type="text"], input[name="keyword"]');
        this.searchButton = this.container.querySelector('button[type="submit"], .search-button');
        this.resultsContainer = document.getElementById('search-results');
        this.loadingElement = document.getElementById('loading');
    }
    
    bindEvents() {
        if (this.searchInput) {
            // 防抖搜索
            const debouncedSearch = DOM.debounce((e) => {
                const keyword = e.target.value.trim();
                if (keyword.length >= this.options.minLength) {
                    this.performSearch(keyword);
                }
            }, this.options.debounceDelay);
            
            this.searchInput.addEventListener('input', debouncedSearch);
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            });
        }
        
        if (this.searchButton) {
            this.searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSearch();
            });
        }
    }
    
    handleSearch() {
        const keyword = this.searchInput?.value.trim();
        if (!keyword) {
            this.showError('请输入搜索关键词');
            return;
        }
        
        if (keyword.length < this.options.minLength) {
            this.showError(`搜索关键词至少需要${this.options.minLength}个字符`);
            return;
        }
        
        this.performSearch(keyword);
    }
    
    async performSearch(keyword) {
        try {
            this.showLoading();
            
            const results = await API.searchDramas(keyword);
            
            this.hideLoading();
            this.displayResults(results);
            
        } catch (error) {
            this.hideLoading();
            this.showError(`搜索失败: ${error.message}`);
            console.error('搜索失败:', error);
        }
    }
    
    displayResults(results) {
        if (!this.resultsContainer) {
            console.error('搜索结果容器未找到');
            return;
        }
        
        if (!results.items || results.items.length === 0) {
            this.showNoResults(results.search_term);
            return;
        }
        
        const resultsHtml = this.generateResultsHtml(results);
        this.resultsContainer.innerHTML = resultsHtml;
        
        // 绑定结果项点击事件
        this.bindResultEvents();
    }
    
    generateResultsHtml(results) {
        const { section_title, items, item_count } = results;
        
        const itemsHtml = items.map(item => `
            <div class="search-item" data-video-id="${item.video_id}">
                <div class="item-image">
                    <img src="${item.image_url}" alt="${item.title}" loading="lazy">
                </div>
                <div class="item-info">
                    <h3 class="item-title">${item.title}</h3>
                    <p class="item-episodes">${item.episodes}</p>
                    <p class="item-genres">${item.genres}</p>
                    <button class="play-button" data-video-id="${item.video_id}">
                        立即播放
                    </button>
                </div>
            </div>
        `).join('');
        
        return `
            <div class="search-header">
                <h2>${section_title}</h2>
                <p class="result-count">共找到 ${item_count} 个结果</p>
            </div>
            <div class="search-items">
                ${itemsHtml}
            </div>
        `;
    }
    
    bindResultEvents() {
        const playButtons = this.resultsContainer.querySelectorAll('.play-button');
        playButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const videoId = e.target.dataset.videoId;
                if (videoId) {
                    this.playVideo(videoId);
                }
            });
        });
    }
    
    playVideo(videoId) {
        // 跳转到播放页面
        window.location.href = `/play?id=${videoId}`;
    }
    
    showLoading() {
        if (this.loadingElement) {
            DOM.show(this.loadingElement);
        }
        
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>搜索中...</p>
                </div>
            `;
        }
    }
    
    hideLoading() {
        if (this.loadingElement) {
            DOM.hide(this.loadingElement);
        }
    }
    
    showError(message) {
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = `
                <div class="error-state">
                    <h3>⚠️ 搜索失败</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()">重新尝试</button>
                </div>
            `;
        }
    }
    
    showNoResults(keyword) {
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = `
                <div class="no-results">
                    <h3>😔 未找到相关结果</h3>
                    <p>没有找到与 "${keyword}" 相关的短剧</p>
                    <p>建议：</p>
                    <ul>
                        <li>检查关键词拼写</li>
                        <li>尝试使用更简单的关键词</li>
                        <li>使用不同的搜索词</li>
                    </ul>
                </div>
            `;
        }
    }
    
    clear() {
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = '';
        }
    }
    
    destroy() {
        // 移除事件监听器
        // 清理引用
        this.container = null;
        this.searchInput = null;
        this.searchButton = null;
        this.resultsContainer = null;
        this.loadingElement = null;
    }
}

// 导出搜索组件类
window.SearchComponent = SearchComponent;