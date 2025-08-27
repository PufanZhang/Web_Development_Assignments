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
async function teleportTo(portal) { // <-- 参数直接接收 portal 对象
    const { targetMap, targetX, targetY } = portal; // 从 portal 对象中解构出目标信息
    console.log(`正在加载地图: ${targetMap}...`);

    const newMapData = await loader.loadMap(targetMap);
    if (!newMapData) {
        alert(`地图 "${targetMap}" 加载失败，请检查文件或网络！`);
        return;
    }

    clearMap();
    const { interactableObjects, portals, walls } = buildMap(newMapData);
    currentMap = { id: targetMap, interactableObjects, portals, walls };

    document.getElementById('map-view').style.backgroundImage = `url(${newMapData.background})`;

    interactionManager.updateInteractables(currentMap.interactableObjects, currentMap.portals);
    player.x = targetX;
    player.y = targetY;
    player.updateStyle();

    if (currentUser) {
        gameState.save(currentUser, targetMap, { x: targetX, y: targetY });
    }

    // 修正这里的变量名
    console.log(`已传送到: ${newMapData.name || targetMap}`);
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
    interactionManager.init((portal) => teleportTo(portal));
    player.init();

    // 决定出生点
    const savedLocation = gameState.load(currentUser);
    const initialMap = savedLocation ? savedLocation.map : "map1"; // 假设默认地图是 map1
    const initialX = savedLocation ? savedLocation.x : 400; // 默认坐标
    const initialY = savedLocation ? savedLocation.y : 300; // 默认坐标
    await teleportTo({ targetMap: initialMap, targetX: initialX, targetY: initialY });

    // 启动游戏循环
    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);