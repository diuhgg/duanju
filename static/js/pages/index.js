/**
 * 首页JavaScript
 * 处理搜索页面的交互逻辑
 */

// 全局搜索组件实例
let searchComponent = null;

/**
 * 初始化首页
 */
function initIndexPage() {
    // 初始化搜索组件
    searchComponent = new SearchComponent('search-form', {
        placeholder: '请输入短剧名称...',
        minLength: 2,
        debounceDelay: 300
    });
    
    // 设置页面标题
    document.title = '短剧搜索 - 发现精彩短剧';
    
    // 绑定其他事件
    bindPageEvents();
    
    console.log('首页初始化完成');
}

/**
 * 绑定页面事件
 */
function bindPageEvents() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // 页面变为可见时，可以进行一些刷新操作
            console.log('页面变为可见');
        }
    });
    
    // 监听窗口大小变化
    window.addEventListener('resize', DOM.throttle(() => {
        // 响应式布局调整
        handleResponsiveLayout();
    }, 250));
    
    // 监听键盘事件
    document.addEventListener('keydown', (e) => {
        // 全局快捷键
        if (e.key === '/' && !isInputFocused()) {
            e.preventDefault();
            focusSearchInput();
        }
    });
}

/**
 * 处理响应式布局
 */
function handleResponsiveLayout() {
    const isMobileView = DOM.isMobile();
    document.body.classList.toggle('mobile-view', isMobileView);
    
    // 移动端特殊处理
    if (isMobileView) {
        // 调整移动端布局
        adjustMobileLayout();
    }
}

/**
 * 调整移动端布局
 */
function adjustMobileLayout() {
    // 移动端布局调整逻辑
    const searchForm = DOM.$('#search-form');
    if (searchForm) {
        // 移动端搜索框样式调整
        searchForm.classList.add('mobile-optimized');
    }
}

/**
 * 检查是否有输入框获得焦点
 * @returns {boolean} 是否有输入框获得焦点
 */
function isInputFocused() {
    const activeElement = document.activeElement;
    return activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
    );
}

/**
 * 聚焦到搜索输入框
 */
function focusSearchInput() {
    const searchInput = DOM.$('input[name="keyword"]');
    if (searchInput) {
        searchInput.focus();
        searchInput.select();
    }
}

/**
 * 显示搜索提示
 */
function showSearchHints() {
    const hints = [
        '霸道总裁',
        '甜宠恋爱',
        '重生复仇',
        '古装言情',
        '现代都市'
    ];
    
    const hintsContainer = DOM.$('.search-hints');
    if (hintsContainer) {
        const hintsHtml = hints.map(hint => 
            `<span class="hint-tag" onclick="searchHint('${hint}')">${hint}</span>`
        ).join('');
        
        hintsContainer.innerHTML = hintsHtml;
    }
}

/**
 * 点击提示词搜索
 * @param {string} hint - 提示词
 */
function searchHint(hint) {
    const searchInput = DOM.$('input[name="keyword"]');
    if (searchInput && searchComponent) {
        searchInput.value = hint;
        searchComponent.performSearch(hint);
    }
}

/**
 * 页面清理
 */
function cleanupIndexPage() {
    if (searchComponent) {
        searchComponent.destroy();
        searchComponent = null;
    }
}

// 页面加载完成后初始化
DOM.onReady(() => {
    initIndexPage();
    showSearchHints();
});

// 页面卸载前清理
window.addEventListener('beforeunload', cleanupIndexPage);

// 导出页面方法
window.IndexPage = {
    init: initIndexPage,
    cleanup: cleanupIndexPage,
    searchHint
};