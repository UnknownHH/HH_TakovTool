/**
 * 地图模块
 * 负责地图显示、切换和交互功能
 */

// 地图模块状态
const MapModule = {
    currentMap: null,
    panzoomInstance: null,
    currentStyle: '2D',
    isInitialized: false
};

/**
 * 初始化地图模块
 */
function initMapModule() {
    if (MapModule.isInitialized) {
        console.log('地图模块已初始化，重新加载地图...');
        reloadCurrentMap();
        return;
    }
    
    initMapInterface();
    loadDefaultMap();
    MapModule.isInitialized = true;
    console.log('地图模块初始化完成');
}

/**
 * 初始化地图界面交互
 */
function initMapInterface() {
    initMapSelection();
    initMapStyleControls();
    console.log('地图界面交互初始化完成');
}

/**
 * 初始化地图选择功能
 */
function initMapSelection() {
    const mapItems = document.querySelectorAll('.dock-item[data-map]');
    
    mapItems.forEach(item => {
        item.addEventListener('click', function() {
            // 更新激活状态
            document.querySelectorAll('.dock-item[data-map]').forEach(map => {
                map.classList.remove('active');
            });
            this.classList.add('active');
            
            // 加载新地图
            const mapName = this.getAttribute('data-map');
            loadMap(mapName, MapModule.currentStyle);
        });
    });
    
    console.log(`已初始化 ${mapItems.length} 个地图选择项`);
}

/**
 * 初始化地图样式控制
 */
function initMapStyleControls() {
    const styleButtons = document.querySelectorAll('.map-style-btn');
    
    styleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // 更新按钮状态
            document.querySelectorAll('.map-style-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
            
            // 更新地图样式
            MapModule.currentStyle = this.getAttribute('data-style');
            const activeMap = document.querySelector('.dock-item.active[data-map]');
            
            if (activeMap) {
                const mapName = activeMap.getAttribute('data-map');
                loadMap(mapName, MapModule.currentStyle);
            }
        });
    });
    
    console.log('地图样式控制初始化完成');
}

/**
 * 加载默认地图
 */
function loadDefaultMap() {
    const defaultMap = document.querySelector('.dock-item.active[data-map]');
    if (defaultMap) {
        const mapName = defaultMap.getAttribute('data-map');
        loadMap(mapName, MapModule.currentStyle);
    }
}

/**
 * 重新加载当前地图
 */
function reloadCurrentMap() {
    const activeMap = document.querySelector('.dock-item.active[data-map]');
    if (activeMap && MapModule.currentStyle) {
        const mapName = activeMap.getAttribute('data-map');
        loadMap(mapName, MapModule.currentStyle);
    }
}

/**
 * 加载指定地图
 * @param {string} mapName - 地图名称
 * @param {string} style - 地图样式
 */
function loadMap(mapName, style) {
    console.log(`加载地图: ${mapName}, 样式: ${style}`);
    
    // 清理现有地图
    if (MapModule.currentMap) {
        MapModule.currentMap.remove();
        MapModule.currentMap = null;
    }
    
    // 创建新地图实例
    MapModule.currentMap = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomControl: false
    });
    
    // 设置地图图片路径
    const mapImageUrl = `img/map/${mapName}${style === '2D' ? '' : '_' + style}.jpg`;
    loadMapImage(mapImageUrl);
    
    // 初始化平移缩放
    initPanzoom();
}

/**
 * 加载地图图片
 * @param {string} imageUrl - 地图图片URL
 */
function loadMapImage(imageUrl) {
    const img = new Image();
    
    // 显示地图加载状态，但不替换整个地图容器
    const mapContainer = document.getElementById('map');
    let loadingElement = document.getElementById('map-loading');
    
    if (!loadingElement && mapContainer) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'map-loading';
        loadingElement.className = 'loading-animation';
        loadingElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            background: rgba(0,0,0,0.7);
            padding: 20px;
            border-radius: 8px;
        `;
        loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">正在加载地图</div>
            <div class="loading-subtext">${imageUrl.split('/').pop()}</div>
        `;
        mapContainer.appendChild(loadingElement);
    }
    
    img.onload = function() {
        const imgWidth = this.width;
        const imgHeight = this.height;
        const bounds = [[0, 0], [imgHeight, imgWidth]];
        
        // 移除加载状态
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // 确保地图容器是空的
        if (MapModule.currentMap) {
            MapModule.currentMap.remove();
        }
        
        // 重新创建地图实例
        MapModule.currentMap = L.map('map', {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 2,
            zoomControl: false
        });
        
        // 添加图片覆盖层
        L.imageOverlay(imageUrl, bounds).addTo(MapModule.currentMap);
        
        // 设置地图视图
        MapModule.currentMap.setView([imgHeight/2, imgWidth/2], -2);
        
        // 确保地图尺寸正确
        setTimeout(() => {
            MapModule.currentMap.invalidateSize();
        }, 100);
        
        console.log(`地图图片加载成功: ${imageUrl} (${imgWidth}x${imgHeight})`);
    };
    
    img.onerror = function() {
        console.warn(`地图图片加载失败: ${imageUrl}，使用默认尺寸`);
        // 移除加载状态
        if (loadingElement) {
            loadingElement.remove();
        }
        loadFallbackMap(imageUrl);
    };
    
    img.src = imageUrl;
}

/**
 * 加载备用地图（图片加载失败时使用）
 * @param {string} imageUrl - 地图图片URL
 */
function loadFallbackMap(imageUrl) {
    const bounds = [[0, 0], [800, 800]];
    L.imageOverlay(imageUrl, bounds).addTo(MapModule.currentMap);
    MapModule.currentMap.setView([400, 400], 0);
    
    setTimeout(() => {
        MapModule.currentMap.invalidateSize();
    }, 100);
}

/**
 * 初始化平移缩放功能
 */
function initPanzoom() {
    const mapElement = document.querySelector('#map .leaflet-pane');
    
    if (mapElement && !MapModule.panzoomInstance) {
        MapModule.panzoomInstance = panzoom(mapElement, {
            bounds: true,
            boundsPadding: 0.1,
            maxZoom: 4,
            minZoom: 0.5
        });
        console.log('地图平移缩放功能初始化完成');
    }
}

/**
 * 获取当前地图状态
 * @returns {Object} 地图状态信息
 */
function getMapStatus() {
    return {
        currentMap: MapModule.currentMap ? '已加载' : '未加载',
        currentStyle: MapModule.currentStyle,
        isInitialized: MapModule.isInitialized
    };
}

// 窗口调整大小时重新验证地图尺寸
window.addEventListener('resize', debounce(() => {
    if (MapModule.currentMap && document.getElementById('map-content').classList.contains('active')) {
        setTimeout(() => {
            MapModule.currentMap.invalidateSize();
        }, 300);
    }
}, 250));

// 导出地图模块函数
window.initMapModule = initMapModule;
window.getMapStatus = getMapStatus;
window.reloadCurrentMap = reloadCurrentMap;