/**
 * 物品模块
 * 负责藏身处升级数据的显示和管理
 */

// 物品模块状态
const ItemsModule = {
    hideoutData: null,
    isInitialized: false
};

/**
 * 初始化物品模块
 */
function initItemsModule() {
    if (ItemsModule.isInitialized) {
        console.log('物品模块已初始化，刷新数据...');
        refreshHideoutData();
        return;
    }
    
    initHideoutInterface();
    loadHideoutData();
    ItemsModule.isInitialized = true;
    console.log('物品模块初始化完成');
}

/**
 * 初始化藏身处界面
 */
function initHideoutInterface() {
    initHideoutControls();
    console.log('藏身处界面初始化完成');
}

/**
 * 初始化藏身处控制功能
 */
function initHideoutControls() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-hideout');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadHideoutData();
        });
    }
    
    // 展开/折叠全部按钮
    const toggleBtn = document.getElementById('toggle-all');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            toggleAllStations();
        });
    }
    
    console.log('藏身处控制功能初始化完成');
}

/**
 * 加载藏身处数据
 */
function loadHideoutData() {
    const hideoutList = document.getElementById('hideout-list');
    // 显示模块加载动画
    showModuleLoading('hideout-list', '正在加载藏身处数据...');
    
    const query = `
    {
      hideoutStations(gameMode: pve, lang: zh) {
        name
        levels {
          level
          description
          constructionTime
          itemRequirements {
            quantity
            item {
              name
              imageLink
            }
          }
        }
      }
    }`;
    
    fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({query: query})
    })
    .then(response => {
        if (!response.ok) throw new Error('网络响应不正常');
        return response.json();
    })
    .then(data => {
        if (data.errors) throw new Error(data.errors[0].message);
        
        ItemsModule.hideoutData = data.data.hideoutStations;
        renderHideoutList(ItemsModule.hideoutData);
        console.log(`成功加载 ${ItemsModule.hideoutData.length} 个藏身处数据`);
    })
    .catch(error => {
        console.error('获取藏身处数据失败:', error);
        // 显示错误状态
        const hideoutList = document.getElementById('hideout-list');
        if (hideoutList) {
            hideoutList.innerHTML = `
                <div class="loading-animation loading-small">
                    <div style="color: #f44336; margin-bottom: 10px;">❌</div>
                    <div class="loading-text">加载失败</div>
                    <div class="loading-subtext">${error.message}</div>
                </div>
            `;
        }
    });
}

/**
 * 刷新藏身处数据
 */
function refreshHideoutData() {
    if (ItemsModule.hideoutData) {
        renderHideoutList(ItemsModule.hideoutData);
    } else {
        loadHideoutData();
    }
}

/**
 * 渲染藏身处列表
 * @param {Array} stations - 藏身处数据
 */
function renderHideoutList(stations) {
    const hideoutList = document.getElementById('hideout-list');
    
    if (!stations || stations.length === 0) {
        hideoutList.innerHTML = '<div class="error">没有找到藏身处数据</div>';
        return;
    }
    
    let html = '';
    
    stations.forEach(station => {
        if (!station.levels || station.levels.length === 0) return;
        
        html += `
        <div class="hideout-station">
            <div class="station-header">
                <h3 class="station-name">${station.name}</h3>
                <span class="station-toggle">▼</span>
            </div>
            <div class="station-levels">
        `;
        
        // 按等级排序并渲染每个等级
        station.levels.sort((a, b) => a.level - b.level).forEach(level => {
            html += renderStationLevel(level);
        });
        
        html += `
            </div>
        </div>
        `;
    });
    
    hideoutList.innerHTML = html;
    initStationInteractions();
}

/**
 * 渲染单个藏身处等级
 * @param {Object} level - 等级数据
 * @returns {string} HTML字符串
 */
function renderStationLevel(level) {
    const time = formatConstructionTime(level.constructionTime);
    
    return `
    <div class="station-level">
        <div class="level-header">
            <h4 class="level-title">等级 ${level.level}</h4>
            <span class="construction-time">建造时间: ${time}</span>
        </div>
        <p class="level-description">${level.description || '暂无描述'}</p>
        <div class="item-requirements">
            ${renderItemRequirements(level.itemRequirements)}
        </div>
    </div>
    `;
}

/**
 * 渲染物品需求
 * @param {Array} requirements - 物品需求数组
 * @returns {string} HTML字符串
 */
function renderItemRequirements(requirements) {
    if (!requirements || requirements.length === 0) {
        return '<div class="item-requirement">无物品需求</div>';
    }
    
    return requirements.map(req => `
        <div class="item-requirement">
            <img src="${req.item.imageLink}" alt="${req.item.name}" class="item-image" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9IjIwIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tk8gSU1BR0U8L3RleHQ+Cjwvc3ZnPgo='">
            <div class="item-info">
                <span class="item-name">${req.item.name}</span>
                <span class="item-quantity">x ${req.quantity}</span>
            </div>
        </div>
    `).join('');
}

/**
 * 初始化藏身处交互功能
 */
function initStationInteractions() {
    const stationHeaders = document.querySelectorAll('.station-header');
    
    stationHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const levels = this.nextElementSibling;
            const toggle = this.querySelector('.station-toggle');
            
            levels.classList.toggle('expanded');
            toggle.classList.toggle('expanded');
        });
    });
    
    console.log(`初始化了 ${stationHeaders.length} 个藏身处交互`);
}

/**
 * 格式化建造时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间
 */
function formatConstructionTime(seconds) {
    if (seconds === 0) return '立即完成';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0 && minutes > 0) {
        return `${hours}小时${minutes}分钟`;
    } else if (hours > 0) {
        return `${hours}小时`;
    } else {
        return `${minutes}分钟`;
    }
}

/**
 * 展开/折叠所有藏身处
 */
function toggleAllStations() {
    const stations = document.querySelectorAll('.hideout-station');
    if (stations.length === 0) return;
    
    const firstStation = stations[0];
    const isExpanded = firstStation.querySelector('.station-levels').classList.contains('expanded');
    
    stations.forEach(station => {
        const levels = station.querySelector('.station-levels');
        const toggle = station.querySelector('.station-toggle');
        
        if (isExpanded) {
            levels.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            levels.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    });
    
    console.log(`${isExpanded ? '折叠' : '展开'}了所有藏身处`);
}

/**
 * 显示藏身处错误信息
 * @param {string} message - 错误信息
 */
function showHideoutError(message) {
    const hideoutList = document.getElementById('hideout-list');
    hideoutList.innerHTML = `<div class="error">加载失败: ${message}</div>`;
}

/**
 * 获取藏身处模块状态
 * @returns {Object} 模块状态信息
 */
function getItemsModuleStatus() {
    return {
        dataLoaded: !!ItemsModule.hideoutData,
        dataCount: ItemsModule.hideoutData ? ItemsModule.hideoutData.length : 0,
        isInitialized: ItemsModule.isInitialized
    };
}

// 导出物品模块函数
window.initItemsModule = initItemsModule;
window.getItemsModuleStatus = getItemsModuleStatus;