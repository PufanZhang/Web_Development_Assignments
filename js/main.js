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


// --- 当前地图的状态容器 ---
let currentMap = {
    id: null,
    walls: [],
    interactableObjects: []
};

// --- 地图传送 ---
async function loadMapAt(mapId, targetX, targetY) {
    console.log(`正在加载地图: ${mapId}...`);

    const newMapData = await loader.loadMap(mapId);
    if (!newMapData) {
        alert(`地图 "${mapId}" 加载失败，请检查文件或网络！`);
        return;
    }

    // --- 在构建地图前，先过滤掉不该出现的物品 ---
    const filteredObjects = (newMapData.objects || []).filter(objData => {
        let shouldShow = true;
        if (objData.requiredValue && currentUser) {
            const { name, comparison, value } = objData.requiredValue;
            const userValue = gameState.getValue(currentUser, name);

            switch (comparison) {
                case 'greaterOrEqual':
                    if (userValue < value) shouldShow = false;
                    break;
                case 'lessOrEqual':
                    if (userValue > value) shouldShow = false;
                    break;
                case 'equal':
                    if (userValue !== value) shouldShow = false;
                    break;
            }
        }
        return shouldShow;
    });

    // 创建一个新的 mapData 对象，它只包含通过了检查的物品
    const filteredMapData = { ...newMapData, objects: filteredObjects };

    clearMap();
    const { interactableObjects, walls } = buildMap(filteredMapData);
    currentMap = { id: mapId, interactableObjects, walls };

    document.getElementById('map-view').style.backgroundImage = `url(${newMapData.background})`;

    interactionManager.updateInteractables(currentMap.interactableObjects);
    player.x = targetX;
    player.y = targetY;
    player.updateStyle();

    if (currentUser) {
        gameState.saveLocation(currentUser, mapId, { x: targetX, y: targetY });
    }
    console.log(`已传送到: ${newMapData.name || mapId}`);
}

// --- 游戏主循环 ---
function gameLoop() {
    if (window.gameMode === 'map') {
        player.update(); // 1. 更新玩家，计算出期望移动的位置
        handlePlayerCollision(player, currentMap.walls); // 2. 传入玩家对象，处理碰撞
        interactionManager.update(player); // 3. 更新交互检测
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

    debugManager.init();

    const handleTeleport = (teleportData) => {
        loadMapAt(teleportData.targetMap, teleportData.targetX, teleportData.targetY);
    };

    dialogueManager.init();
    interactionManager.init(handleTeleport);
    player.init();

    const savedLocation = gameState.loadLocation(currentUser);
    const initialMap = savedLocation ? savedLocation.map : "map1";
    const initialX = savedLocation ? savedLocation.x : 400;
    const initialY = savedLocation ? savedLocation.y : 300;
    await loadMapAt(initialMap, initialX, initialY);
    gameState.getValue(currentUser, 'suspicion');
    requestAnimationFrame(gameLoop);

    // 监听浏览器窗口关闭或刷新事件，实现“退出时自动存档”
    window.addEventListener('beforeunload', () => {
        if (currentUser && currentMap.id) {
            gameState.saveLocation(currentUser, currentMap.id, { x: player.x, y: player.y });
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeGame);