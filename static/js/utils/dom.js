/**
 * DOM操作工具模块
 * 提供常用的DOM操作和事件处理方法
 */

/**
 * 等待DOM加载完成
 * @param {Function} callback - 回调函数
 */
function onDOMReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

/**
 * 查询单个元素
 * @param {string} selector - CSS选择器
 * @param {Element} context - 查询上下文，默认为document
 * @returns {Element|null} 匹配的元素
 */
function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * 查询多个元素
 * @param {string} selector - CSS选择器
 * @param {Element} context - 查询上下文，默认为document
 * @returns {NodeList} 匹配的元素列表
 */
function $$(selector, context = document) {
    return context.querySelectorAll(selector);
}

/**
 * 创建元素
 * @param {string} tagName - 标签名
 * @param {Object} attributes - 属性对象
 * @param {string|Element|Array} content - 内容
 * @returns {Element} 创建的元素
 */
function createElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);
    
    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // 设置内容
    if (content) {
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Element) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Element) {
                    element.appendChild(child);
                }
            });
        }
    }
    
    return element;
}

/**
 * 显示元素
 * @param {Element|string} element - 元素或选择器
 */
function show(element) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        el.style.display = '';
        el.classList.remove('hidden');
    }
}

/**
 * 隐藏元素
 * @param {Element|string} element - 元素或选择器
 */
function hide(element) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        el.style.display = 'none';
    }
}

/**
 * 切换元素显示状态
 * @param {Element|string} element - 元素或选择器
 */
function toggle(element) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        if (el.style.display === 'none') {
            show(el);
        } else {
            hide(el);
        }
    }
}

/**
 * 添加CSS类
 * @param {Element|string} element - 元素或选择器
 * @param {string|Array} className - 类名
 */
function addClass(element, className) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        if (Array.isArray(className)) {
            el.classList.add(...className);
        } else {
            el.classList.add(className);
        }
    }
}

/**
 * 移除CSS类
 * @param {Element|string} element - 元素或选择器
 * @param {string|Array} className - 类名
 */
function removeClass(element, className) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        if (Array.isArray(className)) {
            el.classList.remove(...className);
        } else {
            el.classList.remove(className);
        }
    }
}

/**
 * 切换CSS类
 * @param {Element|string} element - 元素或选择器
 * @param {string} className - 类名
 */
function toggleClass(element, className) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        el.classList.toggle(className);
    }
}

/**
 * 检查是否包含CSS类
 * @param {Element|string} element - 元素或选择器
 * @param {string} className - 类名
 * @returns {boolean} 是否包含该类
 */
function hasClass(element, className) {
    const el = typeof element === 'string' ? $(element) : element;
    return el ? el.classList.contains(className) : false;
}

/**
 * 平滑滚动到元素
 * @param {Element|string} element - 元素或选择器
 * @param {Object} options - 滚动选项
 */
function scrollToElement(element, options = {}) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) {
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
            ...options
        });
    }
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

/**
 * 检测移动设备
 * @returns {boolean} 是否为移动设备
 */
function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * 获取元素的绝对位置
 * @param {Element} element - 元素
 * @returns {Object} 位置信息 {top, left, width, height}
 */
function getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
    };
}

// 导出DOM工具方法
window.DOM = {
    onReady: onDOMReady,
    $,
    $$,
    createElement,
    show,
    hide,
    toggle,
    addClass,
    removeClass,
    toggleClass,
    hasClass,
    scrollToElement,
    debounce,
    throttle,
    isMobile,
    getElementPosition
};