document.addEventListener('DOMContentLoaded', function () {
    console.log('页面加载完成，初始化搜索功能...');
    
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const loader = document.getElementById('loader');
    const resultsContainer = document.getElementById('results-container');
    const resultsList = document.getElementById('results-list');
    const resultTitle = document.getElementById('result-title');
    const resultCount = document.getElementById('result-count');
    const errorMessage = document.getElementById('error-message');

    // 检查元素是否存在
    console.log('搜索元素检查:', {
        searchInput: !!searchInput,
        searchButton: !!searchButton,
        loader: !!loader,
        resultsContainer: !!resultsContainer,
        resultsList: !!resultsList,
        resultTitle: !!resultTitle,
        resultCount: !!resultCount,
        errorMessage: !!errorMessage
    });

    // 搜索功能
    async function performSearch() {
        const query = searchInput.value.trim();
        console.log('开始搜索，关键词:', query);

        if (!query) {
            showError('请输入搜索关键词');
            return;
        }

        // 显示加载状态
        loader.style.display = 'block';
        resultsContainer.style.display = 'none';
        errorMessage.style.display = 'none';

        try {
            const searchUrl = `/search?q=${encodeURIComponent(query)}`;
            console.log('发送请求到:', searchUrl);
            
            // 发送搜索请求到后端API
            const response = await fetch(searchUrl);
            console.log('响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('响应错误内容:', errorText);
                throw new Error(`请求失败: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            console.log('搜索响应数据:', data);

            // 处理响应数据
            handleSearchResponse(data);

        } catch (error) {
            console.error('搜索出错:', error);
            showError(`搜索失败: ${error.message || '无法连接到服务器'}`);
            loader.style.display = 'none';
        }
    }

    // 处理搜索响应
    function handleSearchResponse(data) {
        loader.style.display = 'none';

        console.log('处理搜索响应:', data);

        if (!data || data.error) {
            showError(data.error || '搜索出现未知错误');
            return;
        }

        if (!data.items || data.item_count === 0) {
            resultTitle.textContent = `搜索结果: 无匹配内容`;
            resultCount.textContent = '0 个结果';
            resultsList.innerHTML = '';
            resultsContainer.style.display = 'block';
            return;
        }

        // 显示搜索结果
        resultTitle.textContent = `搜索结果: ${data.search_term}`;
        resultCount.textContent = `${data.item_count} 个结果`;
        resultsList.innerHTML = '';

        // 输出搜索结果数据结构
        console.log('搜索结果数据结构:', data);
        console.log('第一个视频项:', data.items[0]);

         // 渲染结果列表
        data.items.forEach((item, index) => {
            // 使用video_id字段，如果没有则使用play_link
            const videoId = item.video_id || item.play_link || index.toString();
            console.log(`视频项 ${index} ID:`, videoId, '视频项属性:', Object.keys(item));

            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            resultItem.innerHTML = `
                <div class="result-image">
                    <img src="${item.image_url}" alt="${item.title}">
                </div>
                <div class="result-info">
                    <h3 class="result-title">${item.title}</h3>
                    <div class="result-meta">
                        <span class="result-episodes">${item.episodes}</span>
                        <span class="result-genres">${item.genres}</span>
                    </div>
                    <button class="play-button">播放</button>
                    <div class="debug-info">ID: ${videoId}</div>
                </div>
            `;

            // 为播放按钮添加点击事件监听器
            const playButton = resultItem.querySelector('.play-button');
            playButton.addEventListener('click', function() {
                console.log('点击播放按钮，videoId:', videoId);
                // 直接跳转到播放页面，通过URL参数传递videoId
                window.location.href = `/play?id=${encodeURIComponent(videoId)}`;
            });

            resultsList.appendChild(resultItem);
        });

        resultsContainer.style.display = 'block';
    }

    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        resultsContainer.style.display = 'none';
        loader.style.display = 'none';
    }

    // 绑定事件
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            console.log('搜索按钮被点击');
            performSearch();
        });
        console.log('搜索按钮事件已绑定');
    } else {
        console.error('搜索按钮元素未找到');
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            console.log('搜索框按键:', e.key);
            if (e.key === 'Enter') {
                console.log('回车键触发搜索');
                performSearch();
            }
        });
        console.log('搜索框事件已绑定');
    } else {
        console.error('搜索输入框元素未找到');
    }
    
    console.log('搜索功能初始化完成');
});