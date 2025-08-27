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
async function loadMapAt(mapId, targetX, targetY) {
    console.log(`正在加载地图: ${mapId}...`);

    const newMapData = await loader.loadMap(mapId);
    if (!newMapData) {
        alert(`地图 "${mapId}" 加载失败，请检查文件或网络！`);
        return;
    }

    clearMap();
    const { interactableObjects, portals, walls } = buildMap(newMapData);
    currentMap = { id: mapId, interactableObjects, portals, walls };

    document.getElementById('map-view').style.backgroundImage = `url(${newMapData.background})`;

    interactionManager.updateInteractables(currentMap.interactableObjects, currentMap.portals);
    player.x = targetX;
    player.y = targetY;
    player.updateStyle();

    if (currentUser) {
        gameState.save(currentUser, mapId, { x: targetX, y: targetY });
    }

    console.log(`已传送到: ${newMapData.name || mapId}`);
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
        alert("请先登录！");
        window.location.href = 'login.html';
        return;
    }

    const handleTeleport = (portal) => {
        loadMapAt(portal.targetMap, portal.targetX, portal.targetY);
    };

    dialogueManager.init();
    interactionManager.init(handleTeleport);
    player.init();

    const savedLocation = gameState.load(currentUser);
    const initialMap = savedLocation ? savedLocation.map : "map1";
    const initialX = savedLocation ? savedLocation.x : 400;
    const initialY = savedLocation ? savedLocation.y : 300;

    await loadMapAt(initialMap, initialX, initialY);

    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initializeGame);