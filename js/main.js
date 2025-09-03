import { gameState, getCurrentUser, loader } from './modules/dataManager.js';
import { buildMap, clearMap } from './modules/world/builder.js';
import { player } from './modules/world/player.js';
import { handlePlayerCollision } from './modules/world/collision.js';
import { interactionManager } from './modules/world/interaction.js';
import { dialogueManager } from './modules/world/dialogue.js';
import { debugManager } from './debug.js';


// --- 全局游戏状态 ---
window.gameMode = 'map'; // 'map' 或 'dialogue'
let currentUser = null;
const gameContainer = document.getElementById('game-container'); // 获取视口容器
const mapView = document.getElementById('map-view'); // 获取地图容器

// --- 当前地图的状态容器 ---
let currentMap = {
    id: null,
    walls: [],
    interactableObjects: [],
    width: 0,
    height: 0
};

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

function updateCamera() {
    if (!currentMap.width || !currentMap.height) return;

    const viewportWidth = gameContainer.offsetWidth;
    const viewportHeight = gameContainer.offsetHeight;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    let cameraX = playerCenterX - viewportWidth / 2;
    let cameraY = playerCenterY - viewportHeight / 2;

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

    const setupMap = () => {
        const { interactableObjects, walls, width, height } = buildMap(packedMapData);
        currentMap = { id: mapId, interactableObjects, walls, width, height };

        mapView.style.backgroundImage = `url(${packedMapData.background})`;
        mapView.style.backgroundColor = '';

        interactionManager.updateInteractables(currentMap.interactableObjects);
        player.x = targetX;
        player.y = targetY;
        player.updateStyle();

        gameState.saveLocation(mapId, { x: targetX, y: targetY });
        console.log(`已传送到: ${packedMapData.name || mapId}`);
    };

    if (packedMapData.entryStoryKey) {
        console.log(`发现入场故事: ${packedMapData.entryStoryKey}`);
        mapView.style.backgroundImage = '';
        mapView.style.backgroundColor = 'black';
        mapView.style.transform = 'translate(0, 0)';
        try {
            await dialogueManager.start(packedMapData.entryStoryKey, setupMap);
        } catch (error) {
            console.error("启动入场故事时发生错误:", error);
            console.log("对话系统出现异常，已跳过故事并直接加载地图。");
            setupMap();
        }
    } else {
        setupMap();
    }
}

// --- 游戏主循环 ---
function gameLoop() {
    setInterval(saveGameData, 60000);
    if (window.gameMode === 'map') {
        player.update();
        handlePlayerCollision(player, currentMap.walls);
        interactionManager.update(player);
        updateCamera();
    }
    requestAnimationFrame(gameLoop);
}

// --- 游戏初始化 ---
async function initializeGame() {
    currentUser = getCurrentUser();

    debugManager.init();

    const handleTeleport = (teleportData) => {
        loadMapAt(teleportData.targetMap, teleportData.targetX, teleportData.targetY);
    };

    dialogueManager.init();
    interactionManager.init(handleTeleport);
    player.init();

    const playerData = await gameState.loadPlayerData();
    if (!playerData) {
        alert("加载玩家存档失败！");
        return;
    }

    // 使用后端返回的数据来确定初始位置
    const initialMap = playerData.address ? playerData.address.map : "map1";
    const initialX = playerData.address ? playerData.address.x : 400;
    const initialY = playerData.address ? playerData.address.y : 300;

    await loadMapAt(initialMap, initialX, initialY);

    // 初始化时同步所有数值到调试窗口
    Object.keys(playerData.values || {}).forEach(valueName => {
        gameState.getValue(valueName);
    });

    requestAnimationFrame(gameLoop);

    // “退出时自动存档”功能
    window.addEventListener('beforeunload', (event) => {
        // 检查是否有需要保存的数据
        if (window.playerDataCache && currentMap.id) {
            // 1. 更新玩家在缓存中的最新位置
            window.playerDataCache.address = { map: currentMap.id, x: player.x, y: player.y };

            // 2. 从 localStorage 中获取认证令牌
            const token = localStorage.getItem('jwt_token');

            // 3. 创建带有认证信息的请求头
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // 4. 将要发送的数据转换为 Blob 对象
            const blob = new Blob([JSON.stringify(window.playerDataCache)], { type: 'application/json' });

            // 5. 使用 fetch API 和 keepalive 标志发送请求
            // 浏览器会保证这个请求在页面关闭后继续进行
            fetch('/api/player/save', {
                method: 'POST',
                headers: headers,
                body: blob,
                keepalive: true // 确保页面关闭后请求能被完整发送
            });

            console.log("已发送带令牌的退出存档请求。");
        }
    });
}

async function saveGameData() {
    if (!window.playerDataCache || !currentMap.id) {
        return;
    }
    window.playerDataCache.address = { map: currentMap.id, x: player.x, y: player.y };
    const token = localStorage.getItem('jwt_token');

    try {
        const response = await fetch('/api/player/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(window.playerDataCache)
        });

        if (response.ok) {
            console.log("游戏进度已自动保存。");
        } else {
            console.error("自动存档请求失败:", await response.text());
        }
    } catch (error) {
        console.error("自动存档时发生网络错误:", error);
    }
}

document.addEventListener('DOMContentLoaded', initializeGame);