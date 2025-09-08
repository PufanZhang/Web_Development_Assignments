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
const loadingScreen = document.getElementById('loading-screen');

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
        player.show();

        gameState.saveLocation(mapId, { x: targetX, y: targetY });
        console.log(`已传送到: ${packedMapData.name || mapId}`);
    };

    if (packedMapData.entryStoryKey) {
        console.log(`发现入场故事: ${packedMapData.entryStoryKey}`);
        player.hide();
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
    const startTime = Date.now();
    const minimumDisplayTime = 500;
    const loadingPromise = (async () => {
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
        const initialMap = playerData.address ? playerData.address.map : "Map1-3-1";
        const initialX = playerData.address ? playerData.address.x : 700;
        const initialY = playerData.address ? playerData.address.y : 700;

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