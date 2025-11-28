/**
 * 任务模块
 * 负责任务图显示、进度跟踪和任务详情功能
 */

// 任务模块状态
const TasksModule = {
    currentTrader: 'prapor',
    currentSelectedNode: null,
    // 修改为每个商人单独保存缩放状态
    traderZoomStates: {}, // 使用对象存储每个商人的缩放状态
    currentTransform: null,
    allTasksData: null,
    isInitialized: false
};

// 商人数据配置
const TRADER_CONFIG = {
    prapor: { name: "Prapor", description: "前苏联军队的军需官，提供各种军用装备和武器。他通常会给玩家一些战斗和收集任务。" },
    therapist: { name: "Therapist", description: "塔科夫市立医院的主任医师，提供医疗用品和治疗服务。她的任务通常与医疗和救援相关。" },
    skier: { name: "Skier", description: "一个精明的商人，专门交易各种改装件和装备。他的任务通常涉及收集特定物品或消灭敌人。" },
    peacekeeper: { name: "Peacekeeper", description: "联合国派驻在塔科夫的代表，提供北约装备和武器。他的任务通常与国际事务和情报收集有关。" },
    mechanic: { name: "Mechanic", description: "一个技术专家，提供各种电子设备和武器改装服务。他的任务通常涉及技术设备和电子元件。" },
    ragman: { name: "Ragman", description: "专门交易服装和护甲的商人。他的任务通常与收集特定服装或护甲有关。" },
    jaeger: { name: "Jaeger", description: "一位隐居的猎人，提供狩猎装备和生存用品。他的任务通常涉及狩猎和生存技能。" },
    fence: { name: "Fence", description: "黑市商人，交易各种来路不明的物品。" },
    lightkeeper: { name: "Lightkeeper", description: "灯塔守护者，提供特殊任务和物品。" },
    "竞技场裁判": { name: "竞技场裁判", description: "竞技场裁判，负责竞技场相关任务。" },
    "BTR司机": { name: "BTR司机", description: "BTR司机，提供载具相关服务。" }
};

/**
 * 初始化任务模块
 */
function initTasksModule() {
    if (TasksModule.isInitialized) {
        console.log('任务模块已初始化，刷新任务图...');
        renderTaskGraph(TasksModule.currentTrader);
        return;
    }
    
    initTasksInterface();
    loadAllTasksData();
    TasksModule.isInitialized = true;
    console.log('任务模块初始化完成');
}

/**
 * 获取任务状态按钮HTML
 * @param {Object} taskData - 任务数据
 * @param {string} traderName - 商人名称
 * @param {Object} options - 配置
 * @returns {string} HTML片段
 */
function getStatusToggleButtonHTML(taskData, traderName, options = {}) {
    const { disabled = false, tooltip = '' } = options;
    const statusButtonClass = taskData.completed ? 'completed' : 'incomplete';
    const statusButtonText = taskData.completed ? '标记为未完成' : '标记为已完成';
    const disabledAttr = disabled ? 'disabled' : '';
    const disabledClass = disabled ? 'disabled' : '';
    const titleAttr = tooltip ? `title="${tooltip}"` : '';

    return `
        <button class="status-toggle-btn ${statusButtonClass} ${disabledClass}"
                data-task-id="${taskData.taskId}"
                data-trader="${traderName}"
                ${disabledAttr}
                ${titleAttr}>
            ${statusButtonText}
        </button>
    `;
}

/**
 * 绑定任务状态按钮事件
 * @param {HTMLElement} taskTooltip - 任务详情框
 * @param {Object} taskData - 任务数据
 */
function bindStatusToggleEvent(taskTooltip, taskData) {
    const statusToggleBtn = taskTooltip.querySelector('.status-toggle-btn');
    if (!statusToggleBtn) {
        return;
    }

    statusToggleBtn.addEventListener('click', function(e) {
        if (this.disabled) return;
        e.stopPropagation();
        const taskId = this.getAttribute('data-task-id');
        const trader = this.getAttribute('data-trader');

        toggleTaskStatus(taskId, trader, taskData);
        taskTooltip.style.display = 'none';
    });
}

/**
 * 初始化任务界面
 */
function initTasksInterface() {
    initTraderTooltips();
    initTraderSelection();
    initProgressControls();
    console.log('任务界面初始化完成');
}

/**
 * 初始化商人提示信息
 */
function initTraderTooltips() {
    const traderTooltip = document.getElementById('trader-tooltip');
    const traderItems = document.querySelectorAll('.dock-item[data-trader]');
    
    traderItems.forEach(item => {
        item.addEventListener('mouseover', function(e) {
            const traderId = this.getAttribute('data-trader');
            const trader = TRADER_CONFIG[traderId];
            
            if (trader && traderTooltip) {
                traderTooltip.innerHTML = `
                    <div class="trader-name">${trader.name}</div>
                    <div>${trader.description}</div>
                `;
                traderTooltip.style.display = 'block';
                updateTooltipPosition(traderTooltip, e);
            }
        });
        
        item.addEventListener('mousemove', function(e) {
            updateTooltipPosition(traderTooltip, e);
        });
        
        item.addEventListener('mouseout', function() {
            if (traderTooltip) {
                traderTooltip.style.display = 'none';
            }
        });
    });
    
    console.log(`已初始化 ${traderItems.length} 个商人提示`);
}

/**
 * 更新工具提示位置
 * @param {HTMLElement} tooltip - 工具提示元素
 * @param {Event} event - 鼠标事件
 */
function updateTooltipPosition(tooltip, event) {
    if (tooltip) {
        tooltip.style.left = (event.pageX - 140) + 'px';
        tooltip.style.top = (event.pageY - 150) + 'px';
    }
}

/**
 * 初始化商人选择功能
 */
function initTraderSelection() {
    const traderItems = document.querySelectorAll('.dock-item[data-trader]');
    
    traderItems.forEach(item => {
        item.addEventListener('click', function() {
            // 保存当前商人的变换状态
            saveCurrentTraderState();
            
            // 更新激活状态
            document.querySelectorAll('.dock-item[data-trader]').forEach(trader => {
                trader.classList.remove('active');
            });
            this.classList.add('active');
            
            // 加载新商人的任务图
            const traderName = this.getAttribute('data-trader');
            loadTraderTasks(traderName);
        });
    });
    
    console.log('商人选择功能初始化完成');
}

/**
 * 初始化进度控制
 */
function initProgressControls() {
    const clearProgressBtn = document.getElementById('clear-progress');
    
    if (clearProgressBtn) {
        clearProgressBtn.addEventListener('click', function() {
            if (confirm('确定要清除所有任务进度吗？此操作不可撤销。')) {
                clearAllTaskProgress();
                updateProgressDisplay(TasksModule.currentTrader);
            }
        });
    }
    
    console.log('进度控制初始化完成');
}

/**
 * 保存当前商人的状态
 */
function saveCurrentTraderState() {
    if (TasksModule.currentTrader && TasksModule.currentTransform) {
        TasksModule.traderZoomStates[TasksModule.currentTrader] = TasksModule.currentTransform;
        console.log(`保存商人 ${TasksModule.currentTrader} 的缩放状态:`, TasksModule.currentTransform);
    }
}

/**
 * 加载商人的任务图
 * @param {string} traderName - 商人名称
 */
function loadTraderTasks(traderName) {
    // 如果当前已经有商人，保存其状态
    if (TasksModule.currentTrader && TasksModule.currentTrader !== traderName) {
        saveCurrentTraderState();
    }
    
    TasksModule.currentTrader = traderName;
    
    if (TasksModule.allTasksData) {
        renderTaskGraph(traderName);
    } else {
        console.log('等待任务数据加载完成...');
        // 数据加载完成后会自动渲染
    }
}

/**
 * 加载所有任务数据
 */
function loadAllTasksData() {
    // 显示任务图加载状态
    const taskGraph = document.getElementById('task-graph');
    if (taskGraph) {
        taskGraph.innerHTML = `
            <div class="loading-animation" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载任务数据...</div>
                <div class="loading-subtext">请稍候</div>
            </div>
        `;
    }
    
    try {
        // 从本地数据文件加载任务数据
        const traderDataMap = {
            'Prapor': window.praporData,
            'Therapist': window.therapistData,
            'Fence': window.fenceData,
            'Skier': window.skierData,
            'Peacekeeper': window.peacekeeperData,
            'Mechanic': window.mechanicData,
            'Ragman': window.ragmanData,
            'Jaeger': window.jaegerData,
            'Lightkeeper': window.lightkeeperData,
            '竞技场裁判': window.竞技场裁判Data,
            'BTR司机': window.btr司机Data
        };
        
        // 合并所有商人的任务数据
        const allTasks = [];
        for (const traderName in traderDataMap) {
            const traderData = traderDataMap[traderName];
            if (traderData && traderData.data && traderData.data.tasks) {
                // 为每个任务添加完整的taskRequirements信息
                const tasks = traderData.data.tasks.map(task => {
                    // 处理taskRequirements，确保包含完整的task信息
                    const taskRequirements = (task.taskRequirements || []).map(req => {
                        // 如果req.task只有id，需要从所有任务中查找完整信息
                        if (req.task && req.task.id && !req.task.name) {
                            const fullTask = findTaskById(req.task.id, traderDataMap);
                            if (fullTask) {
                                return {
                                    task: {
                                        id: fullTask.id,
                                        name: fullTask.name,
                                        minPlayerLevel: fullTask.minPlayerLevel || 1,
                                        trader: fullTask.trader || { name: traderName }
                                    }
                                };
                            }
                        }
                        return req;
                    });
                    
                    return {
                        ...task,
                        taskRequirements: taskRequirements,
                        minPlayerLevel: task.minPlayerLevel || 1
                    };
                });
                allTasks.push(...tasks);
            }
        }
        
        TasksModule.allTasksData = allTasks;
        console.log(`成功加载 ${TasksModule.allTasksData.length} 个任务数据`);
        
        // 数据加载完成后渲染当前商人的任务图
        if (TasksModule.currentTrader) {
            renderTaskGraph(TasksModule.currentTrader);
        }
    } catch (error) {
        console.error('获取任务数据失败:', error);
        // 显示错误状态
        const taskGraph = document.getElementById('task-graph');
        if (taskGraph) {
            taskGraph.innerHTML = `
                <div class="loading-animation" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div style="color: #f44336; margin-bottom: 10px; font-size: 24px;">❌</div>
                    <div class="loading-text">加载失败</div>
                    <div class="loading-subtext">${error.message}</div>
                </div>
            `;
        }
    }
}

/**
 * 根据任务ID查找任务
 * @param {string} taskId - 任务ID
 * @param {Object} traderDataMap - 商人数据映射
 * @returns {Object|null} 任务对象
 */
function findTaskById(taskId, traderDataMap) {
    for (const traderName in traderDataMap) {
        const traderData = traderDataMap[traderName];
        if (traderData && traderData.data && traderData.data.tasks) {
            const task = traderData.data.tasks.find(t => t.id === taskId);
            if (task) {
                return task;
            }
        }
    }
    return null;
}

/**
 * 渲染任务图
 * @param {string} traderName - 商人名称
 */
function renderTaskGraph(traderName) {
    // 确保容器可见
    const tasksContent = document.getElementById('tasks-content');
    if (!tasksContent.classList.contains('active')) {
        setTimeout(() => renderTaskGraph(traderName), 100);
        return;
    }
    
    // 显示加载状态
    const taskGraph = document.getElementById('task-graph');
    if (taskGraph) {
        taskGraph.innerHTML = `
            <div class="loading-animation" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在生成任务图...</div>
                <div class="loading-subtext">${traderName}</div>
            </div>
        `;
    }
    
    // 保存当前状态（如果需要）
    if (TasksModule.currentTrader && TasksModule.currentTrader !== traderName) {
        saveCurrentTraderState();
    }
    
    TasksModule.currentTrader = traderName;
    
    // 清空现有内容
    d3.select('#task-graph').selectAll('*').remove();
    
    // 获取容器尺寸
    const width = taskGraph.clientWidth || 800;
    const height = taskGraph.clientHeight || 600;
    
    if (width === 0 || height === 0) {
        setTimeout(() => renderTaskGraph(traderName), 100);
        return;
    }
    
    // 创建SVG和缩放行为
    const svg = d3.select('#task-graph')
        .attr('width', width)
        .attr('height', height);
    
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .filter(function(event) {
        // 允许在节点上也能缩放和拖拽，但阻止双击放大
        // 如果是双击事件，阻止在节点上触发
        if (event.type === 'dblclick' && event.target && event.target.closest('.task-node')) {
            return false;
        }
        // 其他情况都允许（包括在节点上的滚轮缩放和拖拽）
        return true;
    })
    .on('zoom', (event) => {
        g.attr('transform', event.transform);
        TasksModule.currentTransform = event.transform;
        // 实时保存当前缩放状态到对应商人
        if (TasksModule.currentTrader) {
            TasksModule.traderZoomStates[TasksModule.currentTrader] = event.transform;
        }
        closeTaskTooltipOnInteraction();
    });
    
    svg.call(zoom);
    const g = svg.append('g');
    
    // 生成任务数据
    const tasks = generateTasksData(traderName);
    
    // 如果生成了任务数据，渲染任务节点
    if (tasks && tasks.nodes && tasks.nodes.length > 0) {
        renderTaskNodes(g, tasks, width, height);
        applySavedZoomState(svg, g, zoom, traderName, tasks);
        updateProgressDisplay(traderName);
        console.log(`任务图渲染完成: ${traderName}`);
    } else {
        // 如果没有任务数据，显示空状态
        taskGraph.innerHTML = `
            <div class="loading-animation" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <div style="color: #ff9800; margin-bottom: 10px; font-size: 24px;">⚠️</div>
                <div class="loading-text">暂无任务数据</div>
                <div class="loading-subtext">请检查网络连接或稍后重试</div>
            </div>
        `;
    }
}

/**
 * 生成任务数据
 * @param {string} traderName - 商人名称
 * @returns {Object} 任务数据对象
 */
function generateTasksData(traderName) {
    const nodes = [];
    const links = [];
    
    // 从本地存储加载该商人的任务进度
    const savedProgress = getTraderProgress(traderName);
    
    // 从所有任务数据中筛选出当前商人的任务
    const traderEnglishName = TRADER_CONFIG[traderName]?.name || traderName;
    const traderTasks = TasksModule.allTasksData.filter(task => task.trader.name === traderEnglishName);
    
    console.log(`加载商人 ${traderName} 的任务数据:`, traderTasks);
    
    // 添加商人根节点(位置0,0)
    // 使用大小写不敏感匹配
    const rootNodeConfig = TRADER_ROOT_NODES.find(r => 
        r.traderKey.toLowerCase() === traderName.toLowerCase()
    );
    if (rootNodeConfig) {
        nodes.push({
            id: -1, // 根节点使用-1作为ID
            taskId: `root_${traderName}`, // 根节点特殊ID
            name: rootNodeConfig.title,
            location: rootNodeConfig.location,
            level: rootNodeConfig.level,
            objective: rootNodeConfig.objectives,
            rewards: [],
            image: rootNodeConfig.image,
            detailImage: rootNodeConfig.image,
            completed: false,
            nextTasks: [],
            gridPosition: { x: 0, y: 0 },
            types: [],
            isRootNode: true, // 标记为根节点
            backgroundColor: rootNodeConfig.backgroundColor
        });
    }
    
    // 创建节点
    traderTasks.forEach((task, i) => {
        if (!task) {
            console.warn(`任务数据为空: ${traderName}-${i}`);
            return;
        }
        
        const taskId = task.id;
        const isCompleted = savedProgress[taskId] || false;
        const positionInfo = POSITION_DATA[taskId] || { gridPosition: { x: i, y: 0 }, types: [] };
        
        // 处理任务目标
        const objectives = task.objectives ? task.objectives.map(obj => {
            let desc = obj.description;
            if (obj.optional) {
                desc = "(可选)" + desc;
            }
            if (obj.count) {
                desc += ` (${obj.count})`;
            }
            return desc;
        }) : ["暂无目标"];
        
        // 从taskRequirements的task中获取当前任务的等级要求
        // taskRequirements中的task.minPlayerLevel是当前任务的等级要求，不是前置任务的
        let taskLevel = 1;
        if (task.taskRequirements && task.taskRequirements.length > 0 && task.taskRequirements[0].task) {
            taskLevel = task.taskRequirements[0].task.minPlayerLevel || 1;
        }
        
        nodes.push({
            id: i, // 任务节点ID从0开始(根节点是-1)
            taskId: taskId,
            name: task.name || "未知任务",
            location: task.map ? task.map.name : "任意",
            level: taskLevel,
            objective: objectives,
            rewards: [],
            image: task.taskImageLink || "img/tasks/default.jpg",
            detailImage: task.taskImageLink || "img/tasks/default.jpg",
            completed: isCompleted,
            nextTasks: [],
            gridPosition: positionInfo.gridPosition,
            types: positionInfo.types
        });
    });
    
    // 添加从根节点到指定任务的连线
    if (rootNodeConfig && rootNodeConfig.connectedTaskIds && rootNodeConfig.connectedTaskIds.length > 0) {
        const rootNodeIndex = nodes.findIndex(n => n.isRootNode); // 查找根节点在数组中的实际索引
        if (rootNodeIndex !== -1) {
            rootNodeConfig.connectedTaskIds.forEach(connectedTaskId => {
                const targetIndex = nodes.findIndex(n => n.taskId === connectedTaskId);
                if (targetIndex !== -1) {
                    links.push({
                        source: rootNodeIndex, // 使用根节点在数组中的实际索引
                        target: targetIndex
                    });
                }
            });
        }
    }
    
    // 创建连线 - 基于每个任务的前置任务创建连接
    nodes.forEach((node, i) => {
        // 跳过根节点
        if (node.id === -1) return;
        
        const taskIndex = i - (rootNodeConfig ? 1 : 0); // 调整索引(如果有根节点)
        const task = traderTasks[taskIndex];
        if (task && task.taskRequirements && task.taskRequirements.length > 0) {
            task.taskRequirements.forEach(req => {
                const targetIndex = nodes.findIndex(n => n.taskId === req.task.id);
                if (targetIndex !== -1) {
                    links.push({
                        source: targetIndex,
                        target: i
                    });
                }
            });
        }
    });
    
    // 如果没有前置任务，则创建默认的线性连接(不包括根节点)
    if (links.length === 0 && traderTasks.length > 0) {
        const startIndex = rootNodeConfig ? 0 : 0; // 任务节点从0开始
        for (let i = startIndex; i < traderTasks.length - 1; i++) {
            links.push({
                source: i,
                target: i + 1
            });
        }
    }
    
    console.log(`生成 ${traderName} 的任务图: ${nodes.length} 个节点, ${links.length} 条连线`);
    
    return { nodes, links };
}

/**
 * 渲染任务节点
 * @param {Object} g - D3组元素
 * @param {Object} tasks - 任务数据
 * @param {number} width - 容器宽度
 * @param {number} height - 容器高度
 */
function renderTaskNodes(g, tasks, width, height) {
    const nodeWidth = 160;
    const nodeHeight = 200;
    const gridHorizontalSpacing = 220;
    const gridVerticalSpacing = 250;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    
    // 设置节点位置
    tasks.nodes.forEach((node, i) => {
        const gridPos = node.gridPosition || { x: 0, y: 0 };
        node.x = margin.left + gridPos.x * gridHorizontalSpacing;
        node.y = margin.top + gridPos.y * gridVerticalSpacing;
    });
    
    // 创建连线 - 统一使用单一颜色
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('path')
        .data(tasks.links)
        .enter().append('path')
        .attr('d', d => {
            const source = tasks.nodes[d.source];
            const target = tasks.nodes[d.target];
            
            // 检查节点是否存在
            if (!source || !target) {
                return '';
            }
			
			// 使用网格式连线：先水平移动，再垂直移动，再水平移动
            const midX1 = source.x + (target.x - source.x) * 0.5;
            const midX2 = target.x - (target.x - source.x) * 0.5;
            
            return `M ${source.x} ${source.y} 
                    H ${midX1} 
                    V ${target.y} 
                    H ${target.x}`;
        })
        .attr('fill', 'none')
        .attr('stroke', '#666') // 统一使用灰色
        .attr('stroke-width', 10) // 统一使用3像素粗细
        .attr('stroke-opacity', 1);
    
    // 创建节点组
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(tasks.nodes)
        .enter().append('g')
        .attr('class', d => `task-node ${d.completed ? 'completed' : ''}`)
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('user-select', 'none')
        .style('-webkit-user-select', 'none')
        .style('-moz-user-select', 'none')
        .style('-ms-user-select', 'none');
    
    // 添加节点背景矩形
    node.append('rect')
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('x', -nodeWidth/2)
        .attr('y', -nodeHeight/2)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', d => {
            // 根节点使用自定义背景色
            if (d.isRootNode && d.backgroundColor) {
                return d.backgroundColor;
            }
            return d.completed ? '#2a5c2a' : '#2a2a2a';
        })
        .attr('stroke', d => {
            // 根节点使用特殊边框
            if (d.isRootNode) {
                return '#fff';
            }
            return d.completed ? '#4CAF50' : '#666';
        })
        .attr('stroke-width', d => {
            // 根节点使用更粗的边框
            if (d.isRootNode) {
                return 4;
            }
            return d.completed ? 3 : 2;
        });
    
    // 添加节点内容（图片、文本等）
    renderNodeContent(node, nodeWidth, nodeHeight);
    
    // 添加交互事件
    initNodeInteractions(node, TasksModule.currentTrader);
}

/**
 * 渲染节点内容
 * @param {Object} node - D3节点选择器
 * @param {number} nodeWidth - 节点宽度
 * @param {number} nodeHeight - 节点高度
 */
function renderNodeContent(node, nodeWidth, nodeHeight) {
    // 添加信息条
    node.append('rect')
        .attr('width', nodeWidth - 20)
        .attr('height', 20)
        .attr('x', -nodeWidth/2 + 10)
        .attr('y', -nodeHeight/2 + 10)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', 'rgba(0, 0, 0, 0.7)');
    
    // 添加任务地点
    node.append('text')
        .text(d => d.location)
        .attr('text-anchor', 'start')
        .attr('x', -nodeWidth/2 + 15)
        .attr('y', -nodeHeight/2 + 23)
        .attr('fill', '#ccc')
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .style('-webkit-user-select', 'none')
        .style('-moz-user-select', 'none')
        .style('-ms-user-select', 'none');
    
    // 添加任务等级
    node.append('text')
        .text(d => `Lv.${d.level}`)
        .attr('text-anchor', 'end')
        .attr('x', nodeWidth/2 - 15)
        .attr('y', -nodeHeight/2 + 23)
        .attr('fill', '#ffca00')
        .style('font-size', '9px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .style('-webkit-user-select', 'none')
        .style('-moz-user-select', 'none')
        .style('-ms-user-select', 'none');
    
    // 添加节点图片
    node.append('image')
        .attr('xlink:href', d => d.image)
        .attr('x', -nodeWidth/2 + 10)
        .attr('y', -nodeHeight/2 + 35)
        .attr('width', nodeWidth - 20)
        .attr('height', 80)
        .attr('preserveAspectRatio', 'xMidYMid slice');
    
    // 添加任务名称
    node.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .attr('y', -nodeHeight/2 + 130)
        .attr('fill', '#eee')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .style('-webkit-user-select', 'none')
        .style('-moz-user-select', 'none')
        .style('-ms-user-select', 'none');
    
    // 添加任务目标
    node.each(function(d) {
        const nodeElement = d3.select(this);
        const objectives = Array.isArray(d.objective) ? d.objective : [d.objective];
        const displayObjectives = objectives.slice(0, 3);
        
        displayObjectives.forEach((objective, i) => {
            const truncatedText = truncateText(`• ${objective}`, nodeWidth - 30, 8);
            
            nodeElement.append('text')
                .text(truncatedText)
                .attr('text-anchor', 'start')
                .attr('x', -nodeWidth/2 + 15)
                .attr('y', -nodeHeight/2 + 145 + (i * 12))
                .attr('fill', '#ccc')
                .style('font-size', '8px')
                .style('pointer-events', 'none')
                .style('user-select', 'none')
                .style('-webkit-user-select', 'none')
                .style('-moz-user-select', 'none')
                .style('-ms-user-select', 'none');
        });
        
        if (objectives.length > 3) {
            nodeElement.append('text')
                .text('...')
                .attr('text-anchor', 'start')
                .attr('x', -nodeWidth/2 + 15)
                .attr('y', -nodeHeight/2 + 145 + (3 * 12))
                .attr('fill', '#999')
                .style('font-size', '8px')
                .style('pointer-events', 'none')
                .style('user-select', 'none')
                .style('-webkit-user-select', 'none')
                .style('-moz-user-select', 'none')
                .style('-ms-user-select', 'none');
        }
    });
    
    // 添加任务类型标签
    node.each(function(d) {
        const nodeElement = d3.select(this);
        
        if (d.types && d.types.length > 0) {
            d.types.forEach((type, index) => {
                const labelText = type === 'fairy' ? '仙女棒' : '3 x 4';
                const labelWidth = 28;
                const labelHeight = 12;
                const xPosition = nodeWidth/2 - 25 - (index * (labelWidth + 5));
                const yPosition = nodeHeight/2 - 15;
                
                nodeElement.append('rect')
                    .attr('class', `task-type-label ${type}`)
                    .attr('x', xPosition - labelWidth/2)
                    .attr('y', yPosition - labelHeight/2)
                    .attr('width', labelWidth)
                    .attr('height', labelHeight)
                    .attr('rx', 2)
                    .attr('ry', 2);
                
                nodeElement.append('text')
                    .text(labelText)
                    .attr('text-anchor', 'middle')
                    .attr('x', xPosition)
                    .attr('y', yPosition + 3)
                    .style('font-size', '8px')
                    .style('font-weight', 'bold')
                    .style('fill', '#fff')
                    .style('pointer-events', 'none')
                    .style('user-select', 'none')
                    .style('-webkit-user-select', 'none')
                    .style('-moz-user-select', 'none')
                    .style('-ms-user-select', 'none');
            });
        }
    });
}

/**
 * 初始化节点交互
 * @param {Object} node - D3节点选择器
 * @param {string} traderName - 商人名称
 */
function initNodeInteractions(node, traderName) {
    // 鼠标悬停事件 - 显示任务目标提示框
    node.on('mouseover', function(event, d) {
        event.stopPropagation();
        
        const objectives = Array.isArray(d.objective) ? d.objective : [d.objective];
        let tooltipContent = '';
        objectives.forEach((objective, index) => {
            tooltipContent += `<div class="objective-tooltip-item">${index + 1}. ${objective}</div>`;
        });
        
        let tooltip = d3.select('#objective-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('id', 'objective-tooltip')
                .attr('class', 'objective-tooltip');
        }
        
        tooltip.html(`
            <div class="objective-tooltip-header">${d.name}</div>
            <div class="objective-tooltip-content">${tooltipContent}</div>
        `)
        .style('display', 'block')
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 15) + 'px');
    });
    
    // 鼠标移动事件
    node.on('mousemove', function(event) {
        d3.select('#objective-tooltip')
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
    });
    
    // 鼠标离开事件
    node.on('mouseout', function(event) {
        event.stopPropagation();
        d3.select('#objective-tooltip').style('display', 'none');
    });
    
    // 节点点击事件 - 显示任务详情
    let clickTimer = null;
    
    node.on('mousedown', function(event) {
        // 允许拖拽和缩放，但阻止双击放大
        // 只在双击时阻止事件传播，单次点击和拖拽允许
        if (event.detail === 2) {
            // 双击事件，阻止传播
            event.stopPropagation();
        }
        // 清除之前的点击定时器
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
        }
    })
    .on('click', function(event, d) {
        event.stopPropagation();
        console.log('点击任务节点:', d.name);
        
        // 根节点不显示任务详情
        if (d.isRootNode) {
            return;
        }
        
        // 延迟执行，避免与双击冲突
        clickTimer = setTimeout(() => {
            // 移除之前选中节点的样式
            if (TasksModule.currentSelectedNode) {
                d3.select(TasksModule.currentSelectedNode)
                    .classed('selected', false)
                    .select('rect')
                    .attr('stroke', TasksModule.currentSelectedNode.__data__.completed ? '#4CAF50' : '#666')
                    .attr('stroke-width', TasksModule.currentSelectedNode.__data__.completed ? 3 : 2);
            }
            
            // 设置当前节点为选中状态
            TasksModule.currentSelectedNode = this;
            d3.select(this)
                .classed('selected', true)
                .select('rect')
                .attr('stroke', '#2196F3')
                .attr('stroke-width', 4);
            
            // 显示任务详情提示框
            showTaskTooltip(d, traderName);
            
            clickTimer = null;
        }, 200); // 增加延迟时间，避免与双击冲突
    })
    .on('dblclick', function(event, d) {
        event.stopPropagation();
        event.preventDefault();
        
        // 根节点不处理双击
        if (d.isRootNode) {
            return;
        }
        
        // 清除点击定时器
        if (clickTimer) {
            clearTimeout(clickTimer);
            clickTimer = null;
        }
        
        console.log('双击任务节点:', d.name);
        
        // 切换任务完成状态
        toggleTaskStatus(d.taskId, traderName, d);
    });
}

/**
 * 应用保存的缩放状态
 * @param {Object} svg - D3 SVG元素
 * @param {Object} g - D3组元素
 * @param {Object} zoom - D3缩放行为
 * @param {string} traderName - 商人名称
 * @param {Object} tasks - 任务数据
 */
function applySavedZoomState(svg, g, zoom, traderName, tasks) {
    const savedTransform = TasksModule.traderZoomStates[traderName];
    
    if (savedTransform) {
        g.attr('transform', savedTransform);
        svg.call(zoom.transform, savedTransform);
        TasksModule.currentTransform = savedTransform;
        console.log(`应用商人 ${traderName} 的保存缩放状态`);
    } else {
        // 初始视图调整 - 修复缩放问题
        const nodeWidth = 160, nodeHeight = 200;
        
        // 计算所有节点的边界框
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        tasks.nodes.forEach(node => {
            minX = Math.min(minX, node.x - nodeWidth/2);
            maxX = Math.max(maxX, node.x + nodeWidth/2);
            minY = Math.min(minY, node.y - nodeHeight/2);
            maxY = Math.max(maxY, node.y + nodeHeight/2);
        });
        
        const nodesBoundingBox = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
        
        const width = parseInt(svg.attr('width'));
        const height = parseInt(svg.attr('height'));
        
        // 计算合适的缩放比例 - 修复缩放比例计算
        const scaleX = (width - 100) / (nodesBoundingBox.width || 1);
        const scaleY = (height - 100) / (nodesBoundingBox.height || 1);
        const scale = Math.min(0.7, scaleX, scaleY); // 使用更小的初始缩放比例
        
        // 计算平移以使所有节点居中
        const translateX = (width - nodesBoundingBox.width * scale) / 2 - nodesBoundingBox.x * scale;
        const translateY = (height - nodesBoundingBox.height * scale) / 2 - nodesBoundingBox.y * scale;
        
        const initialTransform = d3.zoomIdentity
            .translate(translateX, translateY)
            .scale(scale);
        
        // 应用初始变换
        g.attr('transform', initialTransform);
        svg.call(zoom.transform, initialTransform);
        TasksModule.currentTransform = initialTransform;
        TasksModule.traderZoomStates[traderName] = initialTransform;
        
        console.log(`创建商人 ${traderName} 的初始缩放状态, 缩放比例: ${scale}`);
    }
}

/**
 * 关闭任务详情提示框（缩放或平移时）
 */
function closeTaskTooltipOnInteraction() {
    const taskTooltip = document.getElementById('task-tooltip');
    if (taskTooltip && taskTooltip.style.display === 'flex') {
        taskTooltip.style.display = 'none';
        
        if (TasksModule.currentSelectedNode) {
            d3.select(TasksModule.currentSelectedNode)
                .classed('selected', false)
                .select('rect')
                .attr('stroke', TasksModule.currentSelectedNode.__data__.completed ? '#4CAF50' : '#666')
                .attr('stroke-width', TasksModule.currentSelectedNode.__data__.completed ? 3 : 2);
            TasksModule.currentSelectedNode = null;
        }
    }
}

/**
 * 显示任务详情提示框
 * @param {Object} taskData - 任务数据
 * @param {string} traderName - 商人名称
 */
function showTaskTooltip(taskData, traderName) {
    const taskTooltip = document.getElementById('task-tooltip');
    if (!taskTooltip) {
        console.error('任务详情框元素未找到');
        return;
    }
    
    console.log('显示任务详情框:', taskData.name);
    
    // 在加载详情前同步本地进度，保证按钮不会被隐藏
    const initialProgress = getTraderProgress(traderName);
    const initialStatus = initialProgress[taskData.taskId] || false;
    taskData.completed = initialStatus;
    const loadingStatusBtnHTML = getStatusToggleButtonHTML(taskData, traderName);
    
    // 显示加载提示
    taskTooltip.innerHTML = `
        <div class="task-tooltip-header">
            <div class="task-tooltip-title">任务详情</div>
            <button class="task-tooltip-close">&times;</button>
        </div>
        <div class="task-tooltip-info">
            <div class="loading-detail">获取情报中...</div>
        </div>
        <div class="task-actions">
            ${loadingStatusBtnHTML}
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
    
    // 保持按钮在加载期间可用
    bindStatusToggleEvent(taskTooltip, taskData);
    
    // 获取任务详情
    fetchTaskDetail(taskData.taskId).then(taskDetail => {
        if (!taskDetail) {
            taskTooltip.innerHTML = `
                <div class="task-tooltip-header">
                    <div class="task-tooltip-title">加载失败</div>
                    <button class="task-tooltip-close">&times;</button>
                </div>
                <div class="task-tooltip-info">
                    <div class="loading-detail">加载任务详情失败，请重试。</div>
                </div>
            `;
            return;
        }
        
        // 更新任务状态
        const savedProgress = getTraderProgress(traderName);
        const currentStatus = savedProgress[taskData.taskId] || false;
        taskData.completed = currentStatus;
		
		// 计算前置任务完成状态
		let allPrerequisitesCompleted = true;
		let prerequisitesHTML = '';

		if (taskDetail.taskRequirements && taskDetail.taskRequirements.length > 0) {
			// 首先遍历所有前置任务，确定是否全部完成
			taskDetail.taskRequirements.forEach(req => {
				const prerequisiteTraderKey = getTraderKeyByEnglishName(req.task.trader.name);
				const prerequisiteProgress = getTraderProgress(prerequisiteTraderKey);
				const isPrerequisiteCompleted = prerequisiteProgress[req.task.id] || false;
				
				if (!isPrerequisiteCompleted) {
					allPrerequisitesCompleted = false;
				}
			});
			
			// 然后生成HTML，使用已经计算好的 allPrerequisitesCompleted 值
			// 当前置任务未完成时，展开显示
			const shouldExpand = !allPrerequisitesCompleted;
			prerequisitesHTML = `
				<div class="task-prerequisites">
					<div class="task-section-title task-prerequisites-header ${allPrerequisitesCompleted ? 'prerequisites-completed' : 'prerequisites-incomplete'}">
						前置任务
						<span class="prerequisites-toggle">${shouldExpand ? '▲' : '▼'}</span>
					</div>
					<div class="task-prerequisites-list" style="display: ${shouldExpand ? 'block' : 'none'};">
			`;
			
			// 再次遍历前置任务生成每个条目的HTML
			taskDetail.taskRequirements.forEach(req => {
				const prerequisiteTraderKey = getTraderKeyByEnglishName(req.task.trader.name);
				const prerequisiteProgress = getTraderProgress(prerequisiteTraderKey);
				const isPrerequisiteCompleted = prerequisiteProgress[req.task.id] || false;
				
				const statusClass = isPrerequisiteCompleted ? 'prerequisite-completed' : 'prerequisite-incomplete';
				
				// 通过前置任务ID获取完整的前置任务信息
				const traderDataMap = {
					'Prapor': window.praporData,
					'Therapist': window.therapistData,
					'Fence': window.fenceData,
					'Skier': window.skierData,
					'Peacekeeper': window.peacekeeperData,
					'Mechanic': window.mechanicData,
					'Ragman': window.ragmanData,
					'Jaeger': window.jaegerData,
					'Lightkeeper': window.lightkeeperData,
					'竞技场裁判': window.竞技场裁判Data,
					'BTR司机': window.btr司机Data
				};
				const prerequisiteTask = findTaskById(req.task.id, traderDataMap);
				
				// 从前置任务的taskRequirements中获取前置任务的等级要求
				let prerequisiteLevel = 1;
				if (prerequisiteTask && prerequisiteTask.taskRequirements && prerequisiteTask.taskRequirements.length > 0 && prerequisiteTask.taskRequirements[0].task) {
					prerequisiteLevel = prerequisiteTask.taskRequirements[0].task.minPlayerLevel || 1;
				}
				
				// 获取商人头像路径
				const traderAvatarPath = getTraderAvatarPath(req.task.trader.name);
				
				prerequisitesHTML += `
					<div class="task-prerequisite ${statusClass}" data-prerequisite-task-id="${req.task.id}" data-prerequisite-trader-key="${prerequisiteTraderKey}">
						<img src="${traderAvatarPath}" alt="${req.task.trader.name}" class="prerequisite-trader-avatar" onerror="this.style.display='none'">
						<span class="prerequisite-text">${req.task.trader ? req.task.trader.name + ' - ' : ''}${req.task.name} (要求等级: ${prerequisiteLevel})</span>
					</div>
				`;
			});
			
			prerequisitesHTML += `
					</div>
				</div>
			`;
		}
		
		// 根据前置任务完成状态决定按钮交互
		const hasPrerequisites = taskDetail.taskRequirements && taskDetail.taskRequirements.length > 0;
		const shouldDisableButton = !taskData.completed && hasPrerequisites && !allPrerequisitesCompleted;
        const statusToggleBtnHTML = getStatusToggleButtonHTML(taskData, traderName, {
            disabled: shouldDisableButton,
            tooltip: shouldDisableButton ? '请先完成所有前置任务' : '点击此处或双击节点标记'
        });
	
        const rewardsHTML = generateRewardsHTML(taskDetail);
        
		taskTooltip.innerHTML = `
			<div class="task-tooltip-header">
				<div class="task-tooltip-title">${taskDetail.name}</div>
				<button class="task-tooltip-close">&times;</button>
			</div>
			<div class="task-tooltip-info">
				<img src="${taskDetail.taskImageLink}" class="task-image" alt="${taskDetail.name}" onerror="this.style.display='none'">
				<div class="task-info-row">
					<div><strong>地点:</strong> ${taskDetail.map ? taskDetail.map.name : '任意'}</div>
					<div><strong>要求等级:</strong> ${(taskDetail.taskRequirements && taskDetail.taskRequirements.length > 0 && taskDetail.taskRequirements[0].task && taskDetail.taskRequirements[0].task.minPlayerLevel) ? taskDetail.taskRequirements[0].task.minPlayerLevel : 1}</div>
				</div>
				
				${prerequisitesHTML}
				
				<div class="task-objectives">
					<div class="task-section-title">任务目标</div>
					${taskDetail.objectives ? taskDetail.objectives.map(obj => {
						let desc = obj.description;
						if (obj.optional) {
							desc = "(可选)" + desc;
						}
						if (obj.count) {
							desc += ` [ ${obj.count} ]`;
						}
						return `<div class="task-objective">• ${desc}</div>`;
					}).join('') : '<div class="task-objective">暂无目标</div>'}
				</div>
				<div class="task-rewards">
					<div class="task-section-title">任务奖励</div>
					${rewardsHTML}
				</div>
			</div>
			<div class="task-actions">
				${statusToggleBtnHTML}
			</div>
		`;
        
        // 添加前置任务折叠功能
        const prerequisitesHeader = taskTooltip.querySelector('.task-prerequisites-header');
        if (prerequisitesHeader) {
            prerequisitesHeader.addEventListener('click', function() {
                const list = this.nextElementSibling;
                const toggle = this.querySelector('.prerequisites-toggle');
                if (list.style.display === 'none') {
                    list.style.display = 'block';
                    toggle.textContent = '▲';
                } else {
                    list.style.display = 'none';
                    toggle.textContent = '▼';
                }
            });
        }
        
        // 添加前置任务项点击事件
        const prerequisiteItems = taskTooltip.querySelectorAll('.task-prerequisite[data-prerequisite-task-id]');
        prerequisiteItems.forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const taskId = this.getAttribute('data-prerequisite-task-id');
                const prerequisiteTraderKey = this.getAttribute('data-prerequisite-trader-key');
                
                if (taskId && prerequisiteTraderKey) {
                    // 如果任务属于其他商人，先切换商人
                    if (prerequisiteTraderKey !== traderName) {
                        // 保存当前商人的状态
                        saveCurrentTraderState();
                        
                        // 更新dock栏激活状态
                        document.querySelectorAll('.dock-item[data-trader]').forEach(trader => {
                            trader.classList.remove('active');
                        });
                        const targetTraderItem = document.querySelector(`.dock-item[data-trader="${prerequisiteTraderKey}"]`);
                        if (targetTraderItem) {
                            targetTraderItem.classList.add('active');
                        }
                        
                        // 切换商人并等待渲染完成后定位节点
                        loadTraderTasks(prerequisiteTraderKey);
                        
                        // 等待渲染完成后定位节点
                        setTimeout(() => {
                            focusOnTaskNode(taskId, prerequisiteTraderKey);
                        }, 300);
                    } else {
                        // 如果任务属于当前商人，直接定位节点
                        focusOnTaskNode(taskId, traderName);
                    }
                }
            });
        });
        
        // 重新绑定关闭按钮事件
        const newCloseBtn = taskTooltip.querySelector('.task-tooltip-close');
        if (newCloseBtn) {
            newCloseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                taskTooltip.style.display = 'none';
            });
        }
        
        // 添加状态切换按钮事件
        bindStatusToggleEvent(taskTooltip, taskData);
    }).catch(error => {
        console.error('获取任务详情失败:', error);
        taskTooltip.innerHTML = `
            <div class="task-tooltip-header">
                <div class="task-tooltip-title">加载失败</div>
                <button class="task-tooltip-close">&times;</button>
            </div>
            <div class="task-tooltip-info">
                <div class="loading-detail">加载任务详情失败: ${error.message}</div>
            </div>
        `;
    });
}

/**
 * 根据商人英文名获取对应的键值
 * @param {string} englishName - 商人英文名
 * @returns {string} 商人键值
 */
function getTraderKeyByEnglishName(englishName) {
    for (const key in TRADER_CONFIG) {
        if (TRADER_CONFIG[key].name === englishName) {
            return key;
        }
    }
    return englishName.toLowerCase(); // 如果找不到匹配，返回小写的英文名
}

/**
 * 根据商人英文名获取商人头像路径
 * @param {string} englishName - 商人英文名
 * @returns {string} 商人头像路径
 */
function getTraderAvatarPath(englishName) {
    // 特殊处理中文商人名
    const nameMap = {
        '竞技场裁判': 'Ref',
        'BTR司机': 'BTR'
    };
    
    const imageName = nameMap[englishName] || englishName;
    return `img/NPC/${imageName}.jpg`;
}

/**
 * 获取任务详情
 * @param {string} taskId - 任务ID
 * @returns {Promise} 任务详情Promise
 */
function fetchTaskDetail(taskId) {
    // 显示详情加载动画
    const taskTooltip = document.getElementById('task-tooltip');
    if (taskTooltip) {
        const infoSection = taskTooltip.querySelector('.task-tooltip-info');
        if (infoSection) {
            infoSection.innerHTML = `
                <div class="loading-animation loading-small">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">获取情报中...</div>
                </div>
            `;
        }
    }

    return new Promise((resolve, reject) => {
        try {
            // 从本地数据中查找任务
            const traderDataMap = {
                'Prapor': window.praporData,
                'Therapist': window.therapistData,
                'Fence': window.fenceData,
                'Skier': window.skierData,
                'Peacekeeper': window.peacekeeperData,
                'Mechanic': window.mechanicData,
                'Ragman': window.ragmanData,
                'Jaeger': window.jaegerData,
                'Lightkeeper': window.lightkeeperData,
                '竞技场裁判': window.竞技场裁判Data,
                'BTR司机': window.btr司机Data
            };
            
            // 在所有商人的数据中查找任务
            let taskDetail = null;
            for (const traderName in traderDataMap) {
                const traderData = traderDataMap[traderName];
                if (traderData && traderData.data && traderData.data.tasks) {
                    const task = traderData.data.tasks.find(t => t.id === taskId);
                    if (task) {
                        taskDetail = task;
                        // 处理taskRequirements，确保包含完整的task信息
                        if (taskDetail.taskRequirements) {
                            taskDetail.taskRequirements = taskDetail.taskRequirements.map(req => {
                                // 如果req.task已经有完整信息（包括name和minPlayerLevel），直接使用
                                if (req.task && req.task.id && req.task.name && req.task.minPlayerLevel !== undefined) {
                                    return req;
                                }
                                // 如果req.task只有id，需要从所有任务中查找完整信息
                                if (req.task && req.task.id) {
                                    const prerequisiteTask = findTaskById(req.task.id, traderDataMap);
                                    if (prerequisiteTask) {
                                        return {
                                            task: {
                                                id: prerequisiteTask.id,
                                                name: prerequisiteTask.name,
                                                minPlayerLevel: prerequisiteTask.minPlayerLevel || 1,
                                                trader: prerequisiteTask.trader || { name: traderName }
                                            }
                                        };
                                    }
                                }
                                return req;
                            });
                        }
                        break;
                    }
                }
            }
            
            if (taskDetail) {
                resolve(taskDetail);
            } else {
                reject(new Error('未找到任务详情'));
            }
        } catch (error) {
            console.error('获取任务详情失败:', error);
            reject(error);
        }
    });
}

/**
 * 生成奖励HTML
 * @param {Object} taskDetail - 任务详情
 * @returns {string} 奖励HTML
 */
function generateRewardsHTML(taskDetail) {
    if (!taskDetail) return '<div class="reward-item">暂无奖励</div>';
    
    let html = '';
    
    // 经验奖励
    if (taskDetail.experience) {
        html += `<div class="reward-item experience-reward">
            <div class="reward-text">经验: ${taskDetail.experience}</div>
        </div>`;
    }
    
    // 声望奖励
    if (taskDetail.finishRewards && taskDetail.finishRewards.traderStanding && taskDetail.finishRewards.traderStanding.length > 0) {
        taskDetail.finishRewards.traderStanding.forEach(standing => {
            const traderImage = `img/npc/${standing.trader.name}.jpg`;
            html += `<div class="reward-item standing-reward">
                <img src="${traderImage}" class="reward-image" alt="${standing.trader.name}" onerror="this.style.display='none'">
                <div class="reward-info">
                    <div class="reward-quantity">+${standing.standing}</div>
                    <div class="reward-name">${standing.trader.name} 声望</div>
                </div>
            </div>`;
        });
    }
    
    // 物品奖励
    if (taskDetail.finishRewards && taskDetail.finishRewards.items && taskDetail.finishRewards.items.length > 0) {
        taskDetail.finishRewards.items.forEach(item => {
            html += `<div class="reward-item">
                <img src="${item.item.iconLink}" class="reward-image" alt="${item.item.name}">
                <div class="reward-info">
                    <div class="reward-quantity">x${item.quantity}</div>
                    <div class="reward-name">${item.item.name}</div>
                </div>
            </div>`;
        });
    }
    
    // 解锁商人
    if (taskDetail.finishRewards && taskDetail.finishRewards.traderUnlock && taskDetail.finishRewards.traderUnlock.length > 0) {
        taskDetail.finishRewards.traderUnlock.forEach(trader => {
            const traderImage = `img/npc/${trader.name}.jpg`;
            html += `<div class="reward-item">
                <img src="${traderImage}" class="reward-image" alt="${trader.name}" onerror="this.style.display='none'">
                <div class="reward-info">
                    <div class="trader-unlock"><strong>新增商人</strong></div>
                    <div class="reward-name">${trader.name}</div>
                </div>
            </div>`;
        });
    }
    
    // 解锁商品
    if (taskDetail.finishRewards && taskDetail.finishRewards.offerUnlock && taskDetail.finishRewards.offerUnlock.length > 0) {
        taskDetail.finishRewards.offerUnlock.forEach(offer => {
            html += `<div class="reward-item">
                <img src="${offer.item.iconLink}" class="reward-image" alt="${offer.item.name}">
                <div class="reward-info">
                    <div class="offer-unlock"><strong>新增商品</strong></div>
                    <div class="reward-name">${offer.item.name}</div>
                </div>
            </div>`;
        });
    }
    
    // 解锁工艺
    if (taskDetail.finishRewards && taskDetail.finishRewards.craftUnlock && taskDetail.finishRewards.craftUnlock.length > 0) {
        taskDetail.finishRewards.craftUnlock.forEach(craft => {
            craft.rewardItems.forEach(item => {
                html += `<div class="reward-item">
                    <img src="${item.item.iconLink}" class="reward-image" alt="${item.item.name}">
                    <div class="reward-info">
                        <div class="craft-unlock"><strong>新增工艺</strong></div>
                        <div class="reward-name">${item.item.name}</div>
                    </div>
                </div>`;
            });
        });
    }
    
    return html || '<div class="reward-item">暂无奖励</div>';
}

/**
 * 切换任务状态
 * @param {string} taskId - 任务ID
 * @param {string} traderName - 商人名称
 * @param {Object} taskData - 任务数据
 */
function toggleTaskStatus(taskId, traderName, taskData) {
    // 如果要标记为完成，检查前置任务
    if (!taskData.completed) {
        // 需要获取任务详情来检查前置任务
        fetchTaskDetail(taskId).then(taskDetail => {
            if (taskDetail && taskDetail.taskRequirements && taskDetail.taskRequirements.length > 0) {
                // 检查所有前置任务是否完成
                let allPrerequisitesCompleted = true;
                taskDetail.taskRequirements.forEach(req => {
                    const prerequisiteTraderKey = getTraderKeyByEnglishName(req.task.trader.name);
                    const prerequisiteProgress = getTraderProgress(prerequisiteTraderKey);
                    const isPrerequisiteCompleted = prerequisiteProgress[req.task.id] || false;
                    
                    if (!isPrerequisiteCompleted) {
                        allPrerequisitesCompleted = false;
                    }
                });
                
                if (!allPrerequisitesCompleted) {
                    alert('请先完成所有前置任务');
                    return;
                }
            }
            
            // 前置任务已完成或没有前置任务，切换状态
            performTaskStatusToggle(taskId, traderName, taskData);
        }).catch(error => {
            console.error('获取任务详情失败:', error);
            // 如果获取详情失败，仍然允许切换状态
            performTaskStatusToggle(taskId, traderName, taskData);
        });
    } else {
        // 如果是要取消完成状态，直接切换
        performTaskStatusToggle(taskId, traderName, taskData);
    }
}

/**
 * 执行任务状态切换
 * @param {string} taskId - 任务ID
 * @param {string} traderName - 商人名称
 * @param {Object} taskData - 任务数据
 */
function performTaskStatusToggle(taskId, traderName, taskData) {
    const newCompletedStatus = !taskData.completed;
    
    // 更新任务数据
    taskData.completed = newCompletedStatus;
    
    // 保存到本地存储
    saveTaskProgress(traderName, taskId, newCompletedStatus);
    
    // 更新所有节点中对应的节点样式
    d3.selectAll('.task-node').each(function(d) {
        if (d.taskId === taskId) {
            const node = d3.select(this);
            node.classed('completed', newCompletedStatus);
            
            node.select('rect')
                .attr('fill', newCompletedStatus ? '#2a5c2a' : '#2a2a2a')
                .attr('stroke', newCompletedStatus ? '#4CAF50' : (node.classed('selected') ? '#2196F3' : '#666'))
                .attr('stroke-width', node.classed('selected') ? 4 : (newCompletedStatus ? 3 : 2));
        }
    });
    
    // 更新当前选中节点
    if (TasksModule.currentSelectedNode && TasksModule.currentSelectedNode.__data__.taskId === taskId) {
        TasksModule.currentSelectedNode.__data__.completed = newCompletedStatus;
    }
    
    // 更新进度显示
    updateProgressDisplay(traderName);
}

/**
 * 保存任务进度到本地存储
 * @param {string} traderName - 商人名称
 * @param {string} taskId - 任务ID
 * @param {boolean} completed - 完成状态
 */
function saveTaskProgress(traderName, taskId, completed) {
    let progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    if (!progress[traderName]) {
        progress[traderName] = {};
    }
    
    progress[traderName][taskId] = completed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    
    console.log(`已保存任务进度: ${traderName}-${taskId} = ${completed}`);
}

/**
 * 从本地存储获取商人任务进度
 * @param {string} traderName - 商人名称
 * @returns {Object} 任务进度对象
 */
function getTraderProgress(traderName) {
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return progress[traderName] || {};
}

/**
 * 清除所有任务进度
 */
function clearAllTaskProgress() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('已清除所有任务进度');
    
    // 重新渲染当前任务图
    if (TasksModule.currentTrader) {
        renderTaskGraph(TasksModule.currentTrader);
    }
}

/**
 * 更新进度显示
 * @param {string} traderName - 商人名称
 */
function updateProgressDisplay(traderName) {
    const savedProgress = getTraderProgress(traderName);
    const traderEnglishName = TRADER_CONFIG[traderName]?.name || traderName;
    const traderTasks = TasksModule.allTasksData ? TasksModule.allTasksData.filter(task => task.trader.name === traderEnglishName) : [];
    const totalTasks = traderTasks.length;
    const completedTasks = Object.values(savedProgress).filter(status => status).length;
    
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        progressText.textContent = `进度: ${completedTasks}/${totalTasks}`;
    }
    
    console.log(`进度更新: ${traderName} - ${completedTasks}/${totalTasks}`);
}

/**
 * 定位并聚焦到指定的任务节点
 * @param {string} taskId - 任务ID
 * @param {string} traderName - 商人名称
 */
function focusOnTaskNode(taskId, traderName) {
    const svg = d3.select('#task-graph');
    const g = svg.select('g');
    
    if (svg.empty() || g.empty()) {
        console.warn('任务图未渲染，无法定位节点');
        return;
    }
    
    // 查找对应的任务节点
    const targetNode = g.selectAll('.task-node').filter(function(d) {
        return d.taskId === taskId;
    });
    
    if (targetNode.empty()) {
        console.warn(`未找到任务节点: ${taskId}`);
        return;
    }
    
    // 获取节点数据
    const nodeData = targetNode.datum();
    
    // 获取SVG容器尺寸
    const width = svg.node().clientWidth || 800;
    const height = svg.node().clientHeight || 600;
    
    // 获取当前缩放状态
    const currentTransform = TasksModule.traderZoomStates[traderName] || d3.zoomIdentity;
    const currentScale = currentTransform.k || 1;
    
    // 计算目标位置（考虑当前缩放）
    const targetX = nodeData.x;
    const targetY = nodeData.y;
    
    // 计算需要应用的变换，使节点居中显示
    const scale = Math.max(1, currentScale); // 至少放大到1倍
    const translateX = width / 2 - targetX * scale;
    const translateY = height / 2 - targetY * scale;
    
    // 应用变换
    const transform = d3.zoomIdentity
        .translate(translateX, translateY)
        .scale(scale);
    
    // 保存变换状态
    TasksModule.currentTransform = transform;
    TasksModule.traderZoomStates[traderName] = transform;
    
    // 应用变换到SVG
    g.transition()
        .duration(500)
        .attr('transform', transform);
    
    // 高亮显示节点（选中状态）
    targetNode.each(function() {
        // 移除之前选中节点的样式
        if (TasksModule.currentSelectedNode) {
            const prevNode = d3.select(TasksModule.currentSelectedNode);
            prevNode.classed('selected', false);
            const prevData = prevNode.datum();
            prevNode.select('rect')
                .attr('stroke', prevData.completed ? '#4CAF50' : '#666')
                .attr('stroke-width', prevData.completed ? 3 : 2);
        }
        
        // 设置当前节点为选中状态
        TasksModule.currentSelectedNode = this;
        const node = d3.select(this);
        node.classed('selected', true);
        node.select('rect')
            .attr('stroke', '#2196F3')
            .attr('stroke-width', 4);
        
        // 显示任务详情
        showTaskTooltip(nodeData, traderName);
    });
    
    // 更新zoom行为的状态（直接使用svg上已有的zoom行为）
    const zoomBehavior = d3.zoom();
    svg.call(zoomBehavior.transform, transform);
    
    console.log(`已定位到任务节点: ${taskId}`);
}

/**
 * 显示错误消息
 * @param {string} message - 错误消息
 */
function showErrorMessage(message) {
    console.error('任务模块错误:', message);
    // 可以在这里添加UI错误显示逻辑
}

/**
 * 文本截断函数
 * @param {string} text - 要截断的文本
 * @param {number} maxWidth - 最大宽度
 * @param {number} fontSize - 字体大小
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxWidth, fontSize) {
    const maxChars = 18;
    if (text.length > maxChars) {
        return text.substring(0, maxChars - 1) + '…';
    }
    return text;
}

// 窗口调整大小时重绘任务图
window.addEventListener('resize', debounce(() => {
    const tasksContent = document.getElementById('tasks-content');
    if (tasksContent.classList.contains('active') && TasksModule.currentTrader) {
        setTimeout(() => {
            const savedTransform = TasksModule.currentTransform;
            renderTaskGraph(TasksModule.currentTrader);
            if (savedTransform) {
                TasksModule.currentTransform = savedTransform;
                TasksModule.currentTraderZoomState[TasksModule.currentTrader] = savedTransform;
            }
        }, 300);
    }
}, 250));

// 导出任务模块函数
window.initTasksModule = initTasksModule;