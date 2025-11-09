// 全局变量
let currentMap = null;
let panzoomInstance = null;
let currentSelectedNode = null; // 跟踪当前选中的节点
let currentTraderZoomState = {}; // 存储每个商人的缩放状态
let currentTraderName = null; // 当前商人名称
let currentTransform = null; // 当前变换状态

// 本地存储键名
const STORAGE_KEY = 'tarkov-tasks-progress';

// 商人简介数据
const TRADER_DESCRIPTIONS = {
    "prapor": "前苏联军队的军需官，提供各种军用装备和武器。他通常会给玩家一些战斗和收集任务。",
    "therapist": "塔科夫市立医院的主任医师，提供医疗用品和治疗服务。她的任务通常与医疗和救援相关。",
    "skier": "一个精明的商人，专门交易各种改装件和装备。他的任务通常涉及收集特定物品或消灭敌人。",
    "peacekeeper": "联合国派驻在塔科夫的代表，提供北约装备和武器。他的任务通常与国际事务和情报收集有关。",
    "mechanic": "一个技术专家，提供各种电子设备和武器改装服务。他的任务通常涉及技术设备和电子元件。",
    "ragman": "专门交易服装和护甲的商人。他的任务通常与收集特定服装或护甲有关。",
    "jaeger": "一位隐居的猎人，提供狩猎装备和生存用品。他的任务通常涉及狩猎和生存技能。"
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initMapInterface();
    initTasksInterface();
    
    // 默认加载海关地图
    setTimeout(() => {
        initMap('海关', '2D');
    }, 100);
});

// 初始化导航功能
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有active类
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
            
            // 添加active类到当前项
            this.classList.add('active');
            const targetId = this.getAttribute('data-target') + '-content';
            const targetContent = document.getElementById(targetId);
            targetContent.classList.add('active');
            
            // 如果是任务界面，确保渲染任务图
            if (targetId === 'tasks-content') {
                setTimeout(() => {
                    const activeTrader = document.querySelector('.dock-item.active[data-trader]');
                    if (activeTrader) {
                        const traderName = activeTrader.getAttribute('data-trader');
                        // 延迟渲染确保容器已完全显示
                        setTimeout(() => renderTaskGraph(traderName), 200);
                    }
                }, 50);
            }
            
            // 如果是地图界面，确保地图尺寸正确
            if (targetId === 'map-content' && currentMap) {
                setTimeout(() => {
                    currentMap.invalidateSize();
                }, 50);
            }
        });
    });
}

// 初始化地图界面
function initMapInterface() {
    // 地图选择
    document.querySelectorAll('.dock-item[data-map]').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.dock-item[data-map]').forEach(map => map.classList.remove('active'));
            this.classList.add('active');
            
            const mapName = this.getAttribute('data-map');
            const currentStyle = document.querySelector('.map-style-btn.active').getAttribute('data-style');
            initMap(mapName, currentStyle);
        });
    });
    
    // 地图样式切换
    document.querySelectorAll('.map-style-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.map-style-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const activeMap = document.querySelector('.dock-item.active[data-map]');
            if (activeMap) {
                const mapName = activeMap.getAttribute('data-map');
                const style = this.getAttribute('data-style');
                initMap(mapName, style);
            }
        });
    });
}

// 初始化地图
function initMap(mapName, style) {
    if (currentMap) {
        currentMap.remove();
        currentMap = null;
    }
    
    // 创建地图实例
    currentMap = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomControl: false
    });
    
    // 根据地图名称和样式设置图片路径
    const mapImageUrl = `img/map/${mapName}${style === '2D' ? '' : '_' + style}.jpg`;
    
    // 创建临时图片元素来获取实际尺寸
    const img = new Image();
    img.onload = function() {
        // 获取图片实际尺寸
        const imgWidth = this.width;
        const imgHeight = this.height;
        
        console.log(`地图 ${mapName} 尺寸: ${imgWidth}x${imgHeight}`);
        
        // 使用图片实际尺寸设置边界
        const bounds = [[0, 0], [imgHeight, imgWidth]];
        const imageOverlay = L.imageOverlay(mapImageUrl, bounds).addTo(currentMap);
        
        // 设置地图视图到图片中心
        currentMap.setView([imgHeight/2, imgWidth/2], -2);
        
        // 确保地图尺寸正确
        setTimeout(() => {
            currentMap.invalidateSize();
        }, 100);
        
        // 初始化Panzoom
        const mapElement = document.querySelector('#map .leaflet-pane');
        if (mapElement && !panzoomInstance) {
            panzoomInstance = panzoom(mapElement, {
                bounds: true,
                boundsPadding: 0.1,
                maxZoom: 4,
                minZoom: 0.5
            });
        }
    };
    
    // 如果图片加载失败，使用默认尺寸
    img.onerror = function() {
        console.warn(`地图图片加载失败: ${mapImageUrl}，使用默认尺寸`);
        
        // 使用默认边界
        const bounds = [[0, 0], [800, 800]];
        const imageOverlay = L.imageOverlay(mapImageUrl, bounds).addTo(currentMap);
        
        // 设置地图视图到图片中心
        currentMap.setView([400, 400], 0);
        
        // 确保地图尺寸正确
        setTimeout(() => {
            currentMap.invalidateSize();
        }, 100);
    };
    
    // 开始加载图片
    img.src = mapImageUrl;
}

// 初始化任务界面
function initTasksInterface() {
    const traderTooltip = document.getElementById('trader-tooltip');
    
    // 商人悬停提示
    document.querySelectorAll('.dock-item[data-trader]').forEach(item => {
        item.addEventListener('mouseover', function(e) {
            const traderName = this.getAttribute('data-trader');
            const name = this.querySelector('.dock-name').textContent;
            const desc = TRADER_DESCRIPTIONS[traderName] || "暂无描述";
            traderTooltip.innerHTML = `<div class="trader-name">${name}</div><div>${desc}</div>`;
            traderTooltip.style.display = 'block';
            traderTooltip.style.left = e.pageX + 10 + 'px';
            traderTooltip.style.top = e.pageY + 10 + 'px';
        });
        
        item.addEventListener('mousemove', function(e) {
            traderTooltip.style.left = e.pageX - 140 + 'px';
            traderTooltip.style.top = e.pageY - 150 + 'px';
        });
        
        item.addEventListener('mouseout', function() {
            traderTooltip.style.display = 'none';
        });
    });
    
    // 商人选择
    document.querySelectorAll('.dock-item[data-trader]').forEach(item => {
        item.addEventListener('click', function() {
            // 保存当前商人的变换状态
            if (currentTraderName && currentTransform) {
                currentTraderZoomState[currentTraderName] = currentTransform;
            }
            
            document.querySelectorAll('.dock-item[data-trader]').forEach(trader => trader.classList.remove('active'));
            this.classList.add('active');
            
            const traderName = this.getAttribute('data-trader');
            
            // 渲染任务图，会自动应用保存的缩放状态
            setTimeout(() => renderTaskGraph(traderName), 200);
        });
    });
    
    // 添加清除进度按钮事件
    const clearProgressBtn = document.getElementById('clear-progress');
    if (clearProgressBtn) {
        clearProgressBtn.addEventListener('click', function() {
            if (confirm('确定要清除所有任务进度吗？此操作不可撤销。')) {
                clearAllProgress();
                const activeTrader = document.querySelector('.dock-item.active[data-trader]');
                if (activeTrader) {
                    updateProgressDisplay(activeTrader.getAttribute('data-trader'));
                }
            }
        });
    }
    
    // 默认渲染普拉波的任务图
    setTimeout(() => {
        renderTaskGraph('prapor');
    }, 100);
    
    // 窗口调整大小时重绘任务图，但保持缩放状态
    window.addEventListener('resize', function() {
        const activeTrader = document.querySelector('.dock-item.active[data-trader]');
        const tasksContent = document.getElementById('tasks-content');
        
        if (activeTrader && tasksContent.classList.contains('active')) {
            setTimeout(() => {
                const traderName = activeTrader.getAttribute('data-trader');
                // 保存当前变换状态
                const savedTransform = currentTransform;
                renderTaskGraph(traderName);
                // 恢复变换状态
                if (savedTransform) {
                    currentTransform = savedTransform;
                    currentTraderZoomState[traderName] = savedTransform;
                }
            }, 300);
        }
    });
}

// 使用D3.js渲染任务图 - 使用固定布局
function renderTaskGraph(traderName) {
    // 确保容器可见并获取正确尺寸
    const tasksContent = document.getElementById('tasks-content');
    if (!tasksContent.classList.contains('active')) {
        setTimeout(() => renderTaskGraph(traderName), 100);
        return;
    }
    
    // 保存当前商人的变换状态（如果存在）
    if (currentTraderName && currentTransform) {
        currentTraderZoomState[currentTraderName] = currentTransform;
    }
    
    // 更新当前商人名称
    currentTraderName = traderName;
    
    // 清空现有内容
    d3.select('#task-graph').selectAll('*').remove();
    
    // 获取正确的容器尺寸
    const taskGraph = document.getElementById('task-graph');
    const width = taskGraph.clientWidth || 800;
    const height = taskGraph.clientHeight || 600;
    
    // 如果尺寸为0，延迟渲染
    if (width === 0 || height === 0) {
        setTimeout(() => renderTaskGraph(traderName), 100);
        return;
    }
    
    console.log(`渲染 ${traderName} 的任务图，尺寸: ${width}x${height}`);
    
    // 创建SVG
    const svg = d3.select('#task-graph')
        .attr('width', width)
        .attr('height', height);
    
    // 创建缩放行为
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            currentTransform = event.transform; // 保存当前变换状态
            
            // 添加：在缩放或平移时关闭任务详情框
            const taskTooltip = document.getElementById('task-tooltip');
            if (taskTooltip && taskTooltip.style.display === 'flex') {
                taskTooltip.style.display = 'none';
                
                // 同时取消选中节点的样式
                if (currentSelectedNode) {
                    d3.select(currentSelectedNode)
                        .classed('selected', false)
                        .select('rect')
                        .attr('stroke', currentSelectedNode.__data__.completed ? '#4CAF50' : '#666')
                        .attr('stroke-width', currentSelectedNode.__data__.completed ? 3 : 2);
                    currentSelectedNode = null;
                }
            }
        });
    
    svg.call(zoom);
    
    // 创建组用于缩放
    const g = svg.append('g');
    
    // 从表格数据获取任务信息
    const tasks = generateTasks(traderName);
    
    // 定义节点尺寸
    const nodeWidth = 160;
    const nodeHeight = 200;
    
    // 计算节点位置 - 使用gridPosition坐标
    const gridHorizontalSpacing = 220;
    const gridVerticalSpacing = 250;
    
    // 设置容器边距
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
    // 使用gridPosition设置节点位置
    tasks.nodes.forEach((node, i) => {
        const gridPos = node.gridPosition || { x: 0, y: 0 };
        
        console.log(`节点 ${node.name} 的 gridPosition:`, gridPos);
        
        // 使用gridPosition的x和y坐标，乘以间距得到实际位置
        node.x = margin.left + gridPos.x * gridHorizontalSpacing;
        node.y = margin.top + gridPos.y * gridVerticalSpacing;
        
        console.log(`节点 ${node.name} 的实际位置: (${node.x}, ${node.y})`);
    });
    
    // 创建连线 - 使用水平和垂直线（网格式）
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(tasks.links)
        .enter().append('path')
        .attr('d', d => {
            const source = tasks.nodes[d.source];
            const target = tasks.nodes[d.target];
            
            // 网格式连线：先水平移动，再垂直移动，再水平移动
            const midX1 = source.x + (target.x - source.x) * 0.5;
            const midX2 = target.x - (target.x - source.x) * 0.5;
            
            return `M ${source.x} ${source.y} 
                    H ${midX1} 
                    V ${target.y} 
                    H ${target.x}`;
        })
        .attr('fill', 'none')
        .attr('stroke', d => {
            // 根据连线类型设置不同颜色
            switch(d.type) {
                case 'branch':
                    return '#FF9800'; // 橙色用于分支连线
                case 'default':
                    return '#666';    // 灰色用于默认连线
                default:
                    return '#4CAF50'; // 绿色用于主连线
            }
        })
        .attr('stroke-width', 10) // 统一设置为4像素粗细
        .attr('stroke-dasharray', d => d.type === 'branch' ? '5,5' : 'none')
        .attr('stroke-opacity', 0.8);
    
    // 创建节点组
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(tasks.nodes)
        .enter().append('g')
        .attr('class', d => `task-node ${d.completed ? 'completed' : ''}`)
        .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // 添加节点背景矩形
    node.append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', d => d.completed ? '#2a5c2a' : '#2a2a2a')
        .attr('stroke', d => d.completed ? '#4CAF50' : '#666')
        .attr('stroke-width', d => d.completed ? 3 : 2);

    // 添加地点和等级信息条（在图片上方）
    node.append('rect')
        .attr('width', nodeWidth - 20)
        .attr('height', 20)
        .attr('x', -nodeWidth/2 + 10)
        .attr('y', -nodeHeight/2 + 10)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', 'rgba(0, 0, 0, 0.7)');

    // 添加任务地点（左侧）
    node.append('text')
        .text(d => d.location)
        .attr('text-anchor', 'start')
        .attr('x', -nodeWidth/2 + 15)
        .attr('y', -nodeHeight/2 + 23)
        .attr('fill', '#fff')
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none');

    // 添加任务等级（右侧）
    node.append('text')
        .text(d => `Lv.${d.level}`)
        .attr('text-anchor', 'end')
        .attr('x', nodeWidth/2 - 15)
        .attr('y', -nodeHeight/2 + 23)
        .attr('fill', '#4CAF50')
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none');

    // 添加节点图片 - 调整位置，为信息条留出空间
    node.append('image')
        .attr('xlink:href', d => d.image)
        .attr('x', -nodeWidth/2 + 10)
        .attr('y', -nodeHeight/2 + 35) // 调整Y位置，为信息条留出空间
        .attr('width', nodeWidth - 20)
        .attr('height', 80) // 调整高度，为任务目标和名称留出空间
        .attr('preserveAspectRatio', 'xMidYMid slice');

    // 添加任务名称
    node.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .attr('y', -nodeHeight/2 + 130) // 调整位置
        .attr('fill', '#eee')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none');

    // 添加任务目标（最多显示3个）
    node.each(function(d) {
        const nodeElement = d3.select(this);
        const objectives = Array.isArray(d.objective) ? d.objective : [d.objective];
        const displayObjectives = objectives.slice(0, 3); // 最多显示3个目标
        
        displayObjectives.forEach((objective, i) => {
            // 截断文本并添加省略号
            const truncatedText = truncateText(`• ${objective}`, nodeWidth - 30, 8);
            
            nodeElement.append('text')
                .text(truncatedText)
                .attr('text-anchor', 'start')
                .attr('x', -nodeWidth/2 + 15)
                .attr('y', -nodeHeight/2 + 145 + (i * 12)) // 每个目标间隔12px
                .attr('fill', '#ccc')
                .style('font-size', '8px')
                .style('pointer-events', 'none');
        });
        
        // 如果目标超过3个，添加省略号
        if (objectives.length > 3) {
            nodeElement.append('text')
                .text('...')
                .attr('text-anchor', 'start')
                .attr('x', -nodeWidth/2 + 15)
                .attr('y', -nodeHeight/2 + 145 + (3 * 12))
                .attr('fill', '#999')
                .style('font-size', '8px')
                .style('pointer-events', 'none');
        }
    });

    // 添加文本截断函数（辅助函数）
    function truncateText(text, maxWidth, fontSize) {
        // 最大字符数（包括圆点和省略号）
        const maxChars = 18;
        if (text.length > maxChars) {
            return text.substring(0, maxChars - 1) + '…';
        }
        return text;
    }
    
    // 节点点击事件 - 显示任务详情提示框并选中节点
    node.on('click', function(event, d) {
        event.stopPropagation(); // 防止事件冒泡影响缩放
        
        // 移除之前选中节点的样式
        if (currentSelectedNode) {
            d3.select(currentSelectedNode)
                .classed('selected', false)
                .select('rect')
                .attr('stroke', currentSelectedNode.__data__.completed ? '#4CAF50' : '#666')
                .attr('stroke-width', currentSelectedNode.__data__.completed ? 3 : 2);
        }
        
        // 设置当前节点为选中状态
        currentSelectedNode = this;
        d3.select(this)
            .classed('selected', true)
            .select('rect')
            .attr('stroke', '#2196F3') // 蓝色边框表示选中
            .attr('stroke-width', 4);
        
        // 显示任务详情提示框
        showTaskTooltip(d, traderName);
    });
    
    // 更新进度显示
    updateProgressDisplay(traderName);
    
    // 检查是否有保存的缩放状态
    const savedTransform = currentTraderZoomState[traderName];
    
    if (savedTransform) {
        // 应用保存的变换状态
        g.attr('transform', savedTransform);
        svg.call(zoom.transform, savedTransform);
        currentTransform = savedTransform;
        console.log(`应用保存的缩放状态给商人: ${traderName}`);
    } else {
        // 初始视图调整 - 居中显示所有节点
        const nodesBoundingBox = {
            x: Math.min(...tasks.nodes.map(n => n.x - nodeWidth/2)),
            y: Math.min(...tasks.nodes.map(n => n.y - nodeHeight/2)),
            width: Math.max(...tasks.nodes.map(n => n.x + nodeWidth/2)) - Math.min(...tasks.nodes.map(n => n.x - nodeWidth/2)),
            height: Math.max(...tasks.nodes.map(n => n.y + nodeHeight/2)) - Math.min(...tasks.nodes.map(n => n.y - nodeHeight/2))
        };
        
        // 计算缩放和平移以使所有节点可见，调整边距参数
        const scaleX = width / (nodesBoundingBox.width + 100);
        const scaleY = height / (nodesBoundingBox.height + 100);
        const scale = Math.min(0.85, scaleX, scaleY);
        
        const translate = [
            width/2 - (nodesBoundingBox.x + nodesBoundingBox.width/2) * scale,
            height/2 - (nodesBoundingBox.y + nodesBoundingBox.height/2) * scale
        ];
        
        // 创建初始变换
        const initialTransform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
        
        // 应用初始变换
        g.attr('transform', initialTransform);
        svg.call(zoom.transform, initialTransform);
        currentTransform = initialTransform;
        
        // 保存初始状态
        currentTraderZoomState[traderName] = initialTransform;
        
        console.log(`创建初始缩放状态给商人: ${traderName}`);
    }
}

// 显示任务详情提示框
function showTaskTooltip(d, traderName) {
    const taskTooltip = document.getElementById('task-tooltip');
    
    // 修复：从本地存储重新获取任务状态，确保显示最新状态
    const savedProgress = getTraderProgress(traderName);
    const currentStatus = savedProgress[d.taskId] || false;
    d.completed = currentStatus;
    
    const statusText = d.completed ? '未完成' : '已完成';
    const statusButtonClass = d.completed ? 'incomplete' : 'completed';
    const statusButtonText = d.completed ? '已完成' : '未完成';
    
    // 富文本内容示例 - 这里可以根据任务ID或其他条件显示不同的内容
    const htmlContent = generateTaskHTMLContent(d);
    
    taskTooltip.innerHTML = `
        <div class="task-tooltip-header">
            <div class="task-tooltip-title">${d.name}</div>
            <button class="task-tooltip-close">&times;</button>
        </div>
        <div class="task-tooltip-info">
            <img src="${d.detailImage}" class="task-image" alt="${d.name}">
            <div class="task-info-row">
                <div><strong>地点:</strong> ${d.location}</div>
                <div><strong>要求等级:</strong> ${d.level}</div>
            </div>
            <div class="task-objectives">
                <div class="task-section-title">任务目标</div>
                ${Array.isArray(d.objective) ? 
                    d.objective.map(obj => `<div class="task-objective">• ${obj}</div>`).join('') : 
                    `<div class="task-objective">• ${d.objective}</div>`
                }
            </div>
            <div class="task-rewards">
                <div class="task-section-title">任务奖励</div>
                ${Array.isArray(d.rewards) ? 
                    d.rewards.map(reward => `<div class="task-reward">• ${reward}</div>`).join('') : 
                    `<div class="task-reward">• ${d.rewards}</div>`
                }
            </div>
            <div class="task-Guide">
                <div class="task-section-title">任务攻略</div>
                ${htmlContent}
            </div>
        </div>
        <div class="task-actions">
            <button class="status-toggle-btn ${statusButtonClass}" data-task-id="${d.taskId}" data-trader="${traderName}">
                ${statusButtonText}
            </button>
        </div>
    `;
    
    taskTooltip.style.display = 'flex';
    
    // 添加关闭按钮事件
    const closeBtn = taskTooltip.querySelector('.task-tooltip-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            taskTooltip.style.display = 'none';
        });
    }
    
    // 添加状态切换按钮事件
    const statusToggleBtn = taskTooltip.querySelector('.status-toggle-btn');
    if (statusToggleBtn) {
        statusToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const taskId = this.getAttribute('data-task-id');
            const trader = this.getAttribute('data-trader');
            
            // 切换任务完成状态
            toggleTaskStatus(taskId, trader, d);
            
            // 更新提示框中的状态显示
            const newCompletedStatus = !d.completed;
            
            if (newCompletedStatus) {
                this.textContent = '未完成';
                this.className = 'status-toggle-btn completed';
            } else {
                this.textContent = '已完成';
                this.className = 'status-toggle-btn incomplete';
            }
        });
    }
}

// 生成任务富文本内容
function generateTaskHTMLContent(taskData) {
    // 这里可以根据任务ID、名称或其他属性生成不同的富文本内容
    // 示例：为特定任务生成攻略内容
    const taskId = taskData.taskId;
    
    // 示例内容 - 实际使用时可以根据具体任务定制
    let html = `
        <ul>
            <li><strong>推荐装备：</strong>根据任务地点选择合适的武器和护甲</li>
            <li><strong>注意事项：</strong>注意周围敌人位置，合理规划路线</li>
            <li><strong>完成技巧：</strong>利用掩体，注意听声辨位</li>
    `;
    
    // 为特定任务添加特殊提示
    if (taskId.includes('prapor-1')) {
        html += `<li><strong>特殊提示：</strong>Utyos机枪位于中心区西侧建筑内</li>`;
    } else if (taskId.includes('prapor-2')) {
        html += `<li><strong>特殊提示：</strong>MP-133霰弹枪可以在Scav身上找到</li>`;
    } else if (taskId.includes('prapor-4')) {
        html += `<li><strong>特殊提示：</strong>青铜怀表位于海关建筑内的桌子上</li>`;
    }
    
    html += `</ul>`;
    
    return html;
}

// 切换任务状态
function toggleTaskStatus(taskId, traderName, taskData) {
    const newCompletedStatus = !taskData.completed;
    
    // 更新任务数据
    taskData.completed = newCompletedStatus;
    
    // 保存到本地存储
    saveTaskProgress(traderName, taskId, newCompletedStatus);
    
    // 更新节点样式
    if (currentSelectedNode) {
        const node = d3.select(currentSelectedNode);
        node.classed('completed', newCompletedStatus);
        
        node.select('rect')
            .attr('fill', newCompletedStatus ? '#2a5c2a' : '#2a2a2a')
            .attr('stroke', newCompletedStatus ? '#4CAF50' : '#2196F3') // 保持选中状态的蓝色边框
            .attr('stroke-width', 4); // 保持选中状态的边框宽度
    }
    
    // 更新进度显示
    updateProgressDisplay(traderName);
}

// 生成任务数据 - 从表格数据导入，支持多分支连接
function generateTasks(traderName) {
    const nodes = [];
    const links = [];
    
    // 从本地存储加载该商人的任务进度
    const savedProgress = getTraderProgress(traderName);
    
    // 从表格数据获取任务信息
    const traderTasks = TASKS_DATA[traderName] || [];
    
    console.log(`加载商人 ${traderName} 的任务数据:`, traderTasks);
    
    // 创建节点
    traderTasks.forEach((task, i) => {
        // 确保任务数据存在
        if (!task) {
            console.warn(`任务数据为空: ${traderName}-${i}`);
            return;
        }
        
        const taskId = `${traderName}-${task.id || i}`;
        const isCompleted = savedProgress[taskId] || false;
        
        // 确保gridPosition存在
        const gridPos = task.gridPosition || { x: i, y: 0 };
        
        nodes.push({
            id: i,
            taskId: taskId,
            name: task.name || "未知任务",
            location: task.location || "未知地点",
            level: task.level || 1,
            objective: task.objective || ["暂无目标"],
            rewards: task.rewards || ["暂无奖励"],
            image: task.image || "img/tasks/default.jpg",
            detailImage: task.detailImage || task.image || "img/tasks/default.jpg",
            completed: isCompleted,
            nextTasks: task.next || [],
            gridPosition: gridPos  // 确保gridPosition被传递
        });
        
        console.log(`创建节点 ${task.name || "未知任务"}，gridPosition:`, gridPos);
    });
    
    // 创建连线 - 基于每个任务的next数组创建多分支连接
    nodes.forEach((node, i) => {
        if (node.nextTasks && node.nextTasks.length > 0) {
            node.nextTasks.forEach(targetIndex => {
                // 确保目标索引在有效范围内
                if (targetIndex >= 0 && targetIndex < nodes.length) {
                    links.push({
                        source: i,
                        target: targetIndex,
                        // 可以添加连线类型标识，用于后续样式区分
                        type: 'normal'
                    });
                }
            });
        }
    });
    
    // 如果没有定义next数组，则创建默认的线性连接（向后兼容）
    if (links.length === 0) {
        for (let i = 0; i < traderTasks.length - 1; i++) {
            links.push({
                source: i,
                target: i + 1,
                type: 'default'
            });
        }
    }
    
    console.log(`生成 ${traderName} 的任务图: ${nodes.length} 个节点, ${links.length} 条连线`);
    
    return { nodes, links };
}

// 保存任务进度到本地存储
function saveTaskProgress(traderName, taskId, completed) {
    let progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (!progress[traderName]) {
        progress[traderName] = {};
    }
    
    progress[traderName][taskId] = completed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    
    console.log(`已保存任务进度: ${traderName}-${taskId} = ${completed}`);
}

// 从本地存储加载任务进度
function loadTaskProgress(traderName, taskId) {
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (progress[traderName] && progress[traderName].hasOwnProperty(taskId)) {
        return progress[traderName][taskId];
    }
    
    return false;
}

// 获取商人的所有任务进度
function getTraderProgress(traderName) {
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return progress[traderName] || {};
}

// 计算并显示任务进度
function updateProgressDisplay(traderName) {
    const savedProgress = getTraderProgress(traderName);
    const traderTasks = TASKS_DATA[traderName] || [];
    const totalTasks = traderTasks.length;
    
    // 计算已完成任务数量
    const completedTasks = Object.values(savedProgress).filter(status => status).length;
    
    // 更新进度文本 - 现在在浮动控制栏中
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `进度: ${completedTasks}/${totalTasks}`;
    }
    
    console.log(`进度更新: ${traderName} - ${completedTasks}/${totalTasks}`);
}

// 清除所有任务进度
function clearAllProgress() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('已清除所有任务进度');
    
    // 重新渲染当前任务图
    const activeTrader = document.querySelector('.dock-item.active[data-trader]');
    if (activeTrader) {
        const traderName = activeTrader.getAttribute('data-trader');
        renderTaskGraph(traderName);
    }
}
