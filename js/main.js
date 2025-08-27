import { gameState, getCurrentUser, loader } from './modules/dataManager.js';
import { buildMap, clearMap } from './modules/world/builder.js';
import { player } from './modules/world/player.js';
import { handlePlayerCollision } from './modules/world/collision.js';
import { interactionManager } from './modules/world/interaction.js';
import { dialogueManager } from './modules/world/dialogue.js';

// --- 全局游戏状态 ---
window.gameMode = 'map'; // 'map' 或 'dialogue'
let currentUser = null;
let worldData = null;

// --- 当前地图的状态容器 ---
let currentMap = {
    id: null,
    walls: [],
    interactableObjects: [],
    portals: []
};

// --- 地图传送 ---
async function teleportTo(mapId, targetX, targetY) { // <-- 方法变为异步 (async)
    console.log(`正在加载地图: ${mapId}...`);

    // 1. 从加载器获取地图数据
    const newMapData = await loader.loadMap(mapId);
    if (!newMapData) {
        alert(`地图 "${mapId}" 加载失败，请检查文件或网络！`);
        return;
    }

    // 2. 清理旧地图
    clearMap();

    // 3. 建造新地图
    const { interactableObjects, portals, walls } = buildMap(newMapData);

    // 4. 更新当前地图状态
    currentMap = { id: mapId, interactableObjects, portals, walls };

    // 5. 移动玩家到新位置
    player.x = targetX;
    player.y = targetY;
    player.updateStyle();

    // 6. 保存进度
    if (currentUser) {
        gameState.save(currentUser, mapId, { x: targetX, y: targetY });
    }

    console.log(`已传送到: ${mapData.name || mapId}`);
}

// --- 游戏主循环 ---
function gameLoop() {
    if (window.gameMode === 'map') {
        handlePlayerCollision(player, currentMap.walls);
        interactionManager.update(player);
    }
    requestAnimationFrame(gameLoop);
}

// --- 游戏初始化 ---
async function initializeGame() {
    currentUser = getCurrentUser();
    if (!currentUser) {
        // 如果没登录，可以跳转回登录页
        alert("请先登录！");
        window.location.href = 'login.html';
        return;
    }

    // 初始化各个模块
    dialogueManager.init();
    interactionManager.init(teleportTo);
    player.init();

    // 决定出生点
    const savedLocation = gameState.load(currentUser);
    const initialMap = savedLocation ? savedLocation.map : "map1"; // 假设默认地图是 map1
    const initialX = savedLocation ? savedLocation.x : 400; // 默认坐标
    const initialY = savedLocation ? savedLocation.y : 300; // 默认坐标
    await teleportTo(initialMap, initialX, initialY);

    // 启动游戏循环
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);