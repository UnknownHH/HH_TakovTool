/**
 * 逃离塔科夫工具站 - 主脚本文件
 * 负责通用功能、导航和模块协调
 */

// 全局状态管理
const AppState = {
    currentModule: 'map',
    isInitialized: false
};

// 本地存储键名
const STORAGE_KEY = 'tarkov-tasks-progress';

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('初始化逃离塔科夫工具站...');
    initNavigation();
    activateModule('map');
    AppState.isInitialized = true;
});

/**
 * 初始化导航功能
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetModule = this.getAttribute('data-target');
            activateModule(targetModule);
        });
    });
    
    console.log('导航系统初始化完成');
}

/**
 * 激活指定模块
 * @param {string} moduleName - 模块名称 (map, tasks, items)
 */
function activateModule(moduleName) {
    // 验证模块名称
    const validModules = ['map', 'tasks', 'items'];
    if (!validModules.includes(moduleName)) {
        console.error(`无效的模块名称: ${moduleName}`);
        return;
    }
    
    // 更新导航状态
    updateNavigation(moduleName);
    
    // 更新内容显示
    updateContentVisibility(moduleName);
    
    // 初始化模块特定功能
    initializeModule(moduleName);
    
    AppState.currentModule = moduleName;
    console.log(`已切换到模块: ${moduleName}`);
}

/**
 * 更新导航栏激活状态
 * @param {string} activeModule - 当前激活的模块名称
 */
function updateNavigation(activeModule) {
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
    });
    
    const activeNav = document.querySelector(`.nav-item[data-target="${activeModule}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
}

/**
 * 更新内容区域显示状态
 * @param {string} activeModule - 当前激活的模块名称
 */
function updateContentVisibility(activeModule) {
    document.querySelectorAll('.content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${activeModule}-content`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

/**
 * 初始化模块特定功能
 * @param {string} moduleName - 模块名称
 */
function initializeModule(moduleName) {
    switch (moduleName) {
        case 'map':
            if (typeof initMapModule === 'function') {
                setTimeout(() => initMapModule(), 50);
            }
            break;
            
        case 'tasks':
            if (typeof initTasksModule === 'function') {
                setTimeout(() => initTasksModule(), 100);
            }
            break;
            
        case 'items':
            if (typeof initItemsModule === 'function') {
                setTimeout(() => initItemsModule(), 50);
            }
            break;
    }
}

/**
 * 显示全局加载动画
 * @param {string} message - 加载消息
 * @param {string} size - 尺寸 (normal, small, inline)
 */
function showLoading(message = '加载中...', size = 'normal') {
    const loading = document.getElementById('global-loading');
    if (!loading) return;
    
    const text = loading.querySelector('.loading-text');
    const subtext = loading.querySelector('.loading-subtext');
    
    if (text) text.textContent = message;
    if (subtext) subtext.textContent = '请稍候';
    
    // 移除所有尺寸类
    loading.classList.remove('loading-small', 'loading-inline', 'loading-normal');
    
    // 添加指定尺寸类
    if (size === 'small') {
        loading.classList.add('loading-small');
    } else if (size === 'inline') {
        loading.classList.add('loading-inline');
    }
    
    loading.style.display = 'flex';
}

/**
 * 隐藏全局加载动画
 */
function hideLoading() {
    const loading = document.getElementById('global-loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

/**
 * 显示模块特定的加载动画
 * @param {string} containerId - 容器ID
 * @param {string} message - 加载消息
 */
function showModuleLoading(containerId, message = '加载中...') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-animation loading-small">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
            <div class="loading-subtext">请稍候</div>
        </div>
    `;
}

/**
 * 工具函数：从本地存储加载数据
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值
 * @returns {*} 存储的值或默认值
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`从本地存储加载数据失败 (${key}):`, error);
        return defaultValue;
    }
}

/**
 * 工具函数：保存数据到本地存储
 * @param {string} key - 存储键名
 * @param {*} value - 要存储的值
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`保存数据到本地存储失败 (${key}):`, error);
    }
}

/**
 * 工具函数：防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 导出全局函数供其他模块使用
window.activateModule = activateModule;
window.loadFromStorage = loadFromStorage;
window.saveToStorage = saveToStorage;
window.debounce = debounce;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showModuleLoading = showModuleLoading;