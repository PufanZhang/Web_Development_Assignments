import { gameState, getCurrentUser, loader } from './modules/dataManager.js';
import { buildMap, clearMap, buildObject } from './modules/world/builder.js';
import { player } from './modules/world/player.js';
import { handlePlayerCollision } from './modules/world/collision.js';
import { interactionManager } from './modules/world/interaction.js';
import { dialogueManager } from './modules/world/dialogue.js';
import { debugManager } from './modules/debug.js';
import { PLAYER_INITIAL_X, PLAYER_INITIAL_Y, INITIAL_MAP } from "./config.js";
import { initDebugRuler, updateDebugRuler } from './modules/ruler.js';

// --- 全局游戏状态 ---
window.gameMode = 'map'; // 'map' 或 'dialogue'
let currentUser = null;
const gameContainer = document.getElementById('game-container'); // 获取视口容器
const mapView = document.getElementById('map-view'); // 获取地图容器
const loadingScreen = document.getElementById('loading-screen');
let cameraX = 0;
let cameraY = 0;

// --- 当前地图的状态容器 ---
let currentMap = {
    id: null,
    walls: [],
    interactableObjects: [],
    latentObjects: [],
    width: 0,
    height: 0
};

// 检查单个条件
function checkCondition(condition) {
    const userValue = gameState.getValue(condition.name);
    const requiredValue = condition.value;

    // 注意：这里的比较符是 snake_case 格式，与后端 models.rs 中的 Comparison 枚举对应
    console.log(`正在比较数值：${requiredValue}, 比较类别：${condition.comparison}`);
    switch (condition.comparison) {
        case 'greater_than':
            return userValue > requiredValue;
        case 'less_than':
            return userValue < requiredValue;
        case 'equal':
            return userValue === requiredValue;
        case 'greater_than_or_equal':
            return userValue >= requiredValue;
        case 'less_than_or_equal':
            return userValue <= requiredValue;
        case 'not_equal':
            return userValue !== requiredValue;
        default:
            return false;
    }
}

// 检查一个物品的所有条件
function shouldDisplayObject(obj) {
    // 如果物品没有 requiredValues 字段，则默认应该显示
    if (!obj.requiredValues || !obj.requiredValues.conditions) {
        return true;
    }

    const { logic, conditions } = obj.requiredValues;

    if (logic && logic.toUpperCase() === 'OR') {
        // OR 逻辑：只要有一个条件满足即可
        return conditions.some(checkCondition);
    } else {
        // AND 逻辑 (默认逻辑)：所有条件都必须满足
        return conditions.every(checkCondition);
    }
}

// 检查并动态添加物品的主函数
function checkDynamicObjects() {
    if (!currentMap.latentObjects || currentMap.latentObjects.length === 0) {
        return;
    }
    console.log(`正在检查 ${currentMap.latentObjects.length} 个潜在物品...`);
    const newlyVisibleObjectsData = [];
    const remainingLatentObjects = [];

    // 遍历所有潜在物品，进行分组
    currentMap.latentObjects.forEach(objData => {
        if (shouldDisplayObject(objData)) {
            newlyVisibleObjectsData.push(objData);
        } else {
            remainingLatentObjects.push(objData);
        }
    });

    // 如果有新出现的物品
    if (newlyVisibleObjectsData.length > 0) {
        console.log(`✨ 发现 ${newlyVisibleObjectsData.length} 个新物品可以显示！`);
        const newInteractableObjects = [];

        newlyVisibleObjectsData.forEach(objData => {
            const newObject = buildObject(objData);
            newInteractableObjects.push(newObject);
        });

        // 更新地图状态
        currentMap.interactableObjects = currentMap.interactableObjects.concat(newInteractableObjects);
        currentMap.latentObjects = remainingLatentObjects;

        // 通知交互管理器，可交互物品列表已更新
        interactionManager.updateInteractables(currentMap.interactableObjects);
    }
}

// 预加载图片的函数
async function preloadImages(imageUrls) {
    console.log("开始预加载图片资源...", imageUrls);
    const promises = imageUrls.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            img.onload = resolve;
            img.onerror = () => {
                console.warn(`图片加载失败: ${src}`);
                resolve(); // 即使单张图片加载失败，也继续游戏
            };
        });
    });
    await Promise.all(promises);
    console.log("✅ 所有图片已预加载完毕！");
}

// 退出时自动保存的函数
function saveAndLogout() {
    if (window.playerDataCache && currentMap.id) {
        window.playerDataCache.address = { map: currentMap.id, x: player.x, y: player.y };

        const token = localStorage.getItem('jwt_token');
        if (token) {
            const data = {
                token: token,
                playerData: window.playerDataCache
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon('/api/player/logout', blob);
        }
    }
}

function updateCamera() {
    if (!currentMap.width || !currentMap.height) return;

    const viewportWidth = gameContainer.offsetWidth;
    const viewportHeight = gameContainer.offsetHeight;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    cameraX = playerCenterX - viewportWidth / 2;
    cameraY = playerCenterY - viewportHeight / 2;

    cameraX = Math.max(0, Math.min(cameraX, currentMap.width - viewportWidth));
    cameraY = Math.max(0, Math.min(cameraY, currentMap.height - viewportHeight));

    mapView.style.transform = `translate(-${cameraX}px, -${cameraY}px)`;
}

// --- 地图传送 ---
async function loadMapAt(mapId, targetX, targetY) {
    console.log(`正在加载地图: ${mapId}...`);
    interactionManager.updateInteractables([]);
    interactionManager.update(player);

    // 1. 调用 loader 来获取打包好的地图数据
    const packedMapData = await loader.loadMap(mapId);
    if (!packedMapData) {
        // 如果加载失败，dataManager 里的 apiRequest 应该已经处理了跳转，这里以防万一
        alert(`地图 "${mapId}" 加载失败，请检查文件或网络！`);
        return;
    }

    // 1.5. 从存档中获取此地图上已移除的物体列表
    const removedObjectIds = gameState.getRemovedObjects(mapId);
    if (removedObjectIds.length > 0) {
        console.log(`根据存档，将过滤掉 ${removedObjectIds.length} 个已移除的物体:`, removedObjectIds);
        const originalCount = packedMapData.objects.length;
        // 过滤掉 packedMapData.objects 数组中 ID 在 removedObjectIds 列表里的物体
        packedMapData.objects = packedMapData.objects.filter(objData => !removedObjectIds.includes(objData.id));
        console.log(`物体过滤完毕。原始数量: ${originalCount}, 当前数量: ${packedMapData.objects.length}`);
    }

    // 2. 在构建地图前，调用预加载
    await preloadImages(packedMapData.assetManifest || []);
    clearMap();

    // 在播放入场故事前，就在后台把地图构建好
    const { interactableObjects, walls, width, height } = buildMap(packedMapData);
    currentMap = { id: mapId, interactableObjects, walls, width, height, latentObjects: packedMapData.latentObjects || [] };
    interactionManager.updateInteractables(currentMap.interactableObjects);

    // 显示已经构建好的地图和玩家
    const showMap = () => {
        mapView.style.backgroundImage = `url(${packedMapData.background})`;
        mapView.style.backgroundColor = '';

        // 显示所有可交互的物体
        currentMap.interactableObjects.forEach(obj => {
            if (obj.element) {
                obj.element.style.display = 'block';
            }
        });

        player.x = targetX;
        player.y = targetY;
        updateCamera();
        player.updateStyle();
        player.show();

        gameState.saveLocation(mapId, { x: targetX, y: targetY });
        console.log(`玩家位置：${targetX}, ${targetY}`);
        console.log(`已传送到: ${packedMapData.name || mapId}`);
        mapView.classList.add('visible-map');
    };

    if (packedMapData.entryStoryKey) {
        console.log(`发现入场故事: ${packedMapData.entryStoryKey}`);
        player.hide();

        // 隐藏所有可交互的物体
        currentMap.interactableObjects.forEach(obj => {
            if (obj.element) {
                obj.element.style.display = 'none';
            }
        });
        mapView.classList.remove('visible-map');

        mapView.style.backgroundImage = '';
        mapView.style.backgroundColor = 'black';
        mapView.style.transform = 'translate(0, 0)';
        try {
            // 故事播放完毕后，直接显示之前构建好的地图
            await dialogueManager.start(packedMapData.entryStoryKey, showMap);
        } catch (error) {
            console.error("启动入场故事时发生错误:", error);
            console.log("对话系统出现异常，已跳过故事并直接加载地图。");
            showMap();
        }
    } else {
        // 如果没有入场故事，直接显示地图
        showMap();
    }
}

// --- 游戏主循环 ---
function gameLoop() {
    if (window.gameMode === 'map') {
        player.update();
        handlePlayerCollision(player, currentMap.walls);
        interactionManager.update(player);
        updateCamera();
        updateDebugRuler(cameraX, cameraY);
    }
    requestAnimationFrame(gameLoop);
}

// --- 游戏初始化 ---
async function initializeGame() {
    const startTime = Date.now();
    const minimumDisplayTime = 500;
    const loadingPromise = (async () => {
        currentUser = getCurrentUser();

        debugManager.init();
        gameState.onValueChange(checkDynamicObjects);

        const handleTeleport = (teleportData) => {
            loadMapAt(teleportData.targetMap, teleportData.targetX, teleportData.targetY);
        };

        dialogueManager.init();
        interactionManager.init(handleTeleport);
        player.init();
        initDebugRuler();

        const playerData = await gameState.loadPlayerData();
        if (!playerData) {
            alert("加载玩家存档失败！");
            return;
        }

        // 使用后端返回的数据来确定初始位置
        const initialMap = playerData.address.map ? playerData.address.map : INITIAL_MAP;
        const initialX = playerData.address.x !== -1.0 ? playerData.address.x : PLAYER_INITIAL_X;
        const initialY = playerData.address.y !== -1.0 ? playerData.address.y : PLAYER_INITIAL_Y;

        await loadMapAt(initialMap, initialX, initialY);

        // 初始化时同步所有数值到调试窗口
        Object.keys(playerData.values || {}).forEach(valueName => {
            gameState.getValue(valueName);
        });

        requestAnimationFrame(gameLoop);

        const returnToMenuButton = document.getElementById('return-to-menu');
        if (returnToMenuButton) {
            returnToMenuButton.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        window.addEventListener('beforeunload', saveAndLogout);
    })();
    // 等待游戏加载完成
    await loadingPromise;

    // 计算已经过去的时间
    const elapsedTime = Date.now() - startTime;
    const remainingTime = minimumDisplayTime - elapsedTime;

    // 如果加载时间小于5秒，则等待剩余的时间
    if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
    }

    // 所有初始化和等待完成后，隐藏加载屏幕并显示游戏容器
    loadingScreen.classList.add('hidden');
    gameContainer.classList.add('visible');
}

document.addEventListener('DOMContentLoaded', initializeGame);