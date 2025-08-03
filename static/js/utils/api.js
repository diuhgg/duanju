/**
 * API调用工具模块
 * 封装常用的API请求方法
 */

/**
 * 基础API请求配置
 */
const API_CONFIG = {
    timeout: 10000,
    retries: 3,
    retryDelay: 1000
};

/**
 * 发送GET请求
 * @param {string} url - 请求URL
 * @param {Object} params - 查询参数
 * @param {Object} options - 请求选项
 * @returns {Promise} API响应
 */
async function apiGet(url, params = {}, options = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    const requestOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };
    
    return await apiRequest(fullUrl, requestOptions);
}

/**
 * 发送POST请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise} API响应
 */
async function apiPost(url, data = {}, options = {}) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        body: JSON.stringify(data),
        ...options
    };
    
    return await apiRequest(url, requestOptions);
}

/**
 * 基础API请求方法
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} API响应
 */
async function apiRequest(url, options = {}) {
    const maxRetries = options.retries || API_CONFIG.retries;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries && !error.name === 'AbortError') {
                // 等待后重试
                await new Promise(resolve => 
                    setTimeout(resolve, API_CONFIG.retryDelay * (attempt + 1))
                );
                continue;
            }
            
            break;
        }
    }
    
    throw new Error(`API请求失败 (${maxRetries + 1}次尝试): ${lastError.message}`);
}

/**
 * 搜索短剧
 * @param {string} keyword - 搜索关键词
 * @returns {Promise} 搜索结果
 */
async function searchDramas(keyword) {
    return await apiGet('/search', { q: keyword });
}

/**
 * 获取视频详情
 * @param {string} videoId - 视频ID
 * @param {Object} options - 选项
 * @returns {Promise} 视频详情
 */
async function getVideoDetails(videoId, options = {}) {
    const params = {
        async: 'true',
        max_episodes: options.maxEpisodes || '20',
        ...options.params
    };
    
    return await apiGet(`/video/${videoId}`, params);
}

/**
 * 获取单集视频信息
 * @param {string} videoId - 视频ID
 * @returns {Promise} 视频信息
 */
async function getEpisodeVideo(videoId) {
    return await getVideoDetails(videoId, {
        maxEpisodes: '1'
    });
}

/**
 * 清空缓存
 * @returns {Promise} 清空结果
 */
async function clearCache() {
    return await apiPost('/cache/clear');
}

/**
 * 获取缓存统计
 * @returns {Promise} 缓存统计
 */
async function getCacheStats() {
    return await apiGet('/cache/stats');
}

/**
 * 健康检查
 * @returns {Promise} 健康状态
 */
async function healthCheck() {
    return await apiGet('/health');
}

// 导出API方法
window.API = {
    get: apiGet,
    post: apiPost,
    request: apiRequest,
    searchDramas,
    getVideoDetails,
    getEpisodeVideo,
    clearCache,
    getCacheStats,
    healthCheck
};