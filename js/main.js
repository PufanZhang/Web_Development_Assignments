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
        await dialogueManager.start(packedMapData.entryStoryKey, setupMap);
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
    window.addEventListener('beforeunload', () => {
        if (window.playerDataCache && currentMap.id) {
            window.playerDataCache.address = { map: currentMap.id, x: player.x, y: player.y };
            navigator.sendBeacon('/api/player/save', JSON.stringify(window.playerDataCache));
            console.log("已发送退出存档信标。(注意: 该请求可能因缺少token而失败)");
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeGame);