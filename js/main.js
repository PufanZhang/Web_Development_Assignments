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

// --- 镜头更新函数 ---
function updateCamera() {
    if (!currentMap.width || !currentMap.height) return;

    // 1. 获取视口（游戏窗口）的尺寸
    const viewportWidth = gameContainer.offsetWidth;
    const viewportHeight = gameContainer.offsetHeight;

    // 2. 计算玩家在地图上的中心点
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // 3. 计算理想的镜头左上角位置，目标是让玩家位于视口中心
    let cameraX = playerCenterX - viewportWidth / 2;
    let cameraY = playerCenterY - viewportHeight / 2;

    // 4. 限制镜头移动范围，防止“穿帮”看到地图外面的黑色区域
    // Math.max 确保镜头不会移动到地图左边和上边的外面
    // Math.min 确保镜头不会移动到地图右边和下边的外面
    cameraX = Math.max(0, Math.min(cameraX, currentMap.width - viewportWidth));
    cameraY = Math.max(0, Math.min(cameraY, currentMap.height - viewportHeight));

    // 5. 使用 transform 来移动地图
    mapView.style.transform = `translate(-${cameraX}px, -${cameraY}px)`;
}

// --- 地图传送 ---
async function loadMapAt(mapId, targetX, targetY) {
    console.log(`正在加载地图: ${mapId}...`);
    interactionManager.updateInteractables([]);
    interactionManager.update(player);

    const newMapData = await loader.loadMap(mapId);
    if (!newMapData) {
        alert(`地图 "${mapId}" 加载失败，请检查文件或网络！`);
        return;
    }

    const mapView = document.getElementById('map-view');
    clearMap();

    const setupMap = () => {
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
        const { interactableObjects, walls, width, height } = buildMap(filteredMapData);
        currentMap = { id: mapId, interactableObjects, walls, width, height };

        // 恢复地图原本的背景
        mapView.style.backgroundImage = `url(${newMapData.background})`;
        mapView.style.backgroundColor = ''; // 清除纯黑背景

        interactionManager.updateInteractables(currentMap.interactableObjects);
        player.x = targetX;
        player.y = targetY;
        player.updateStyle();

        if (currentUser) {
            gameState.saveLocation(currentUser, mapId, { x: targetX, y: targetY });
        }
        console.log(`已传送到: ${newMapData.name || mapId}`);
    };

    if (newMapData.entryStoryKey) {
        // 如果有入场故事，就先播放它
        console.log(`发现入场故事: ${newMapData.entryStoryKey}`);
        mapView.style.backgroundImage = '';
        mapView.style.backgroundColor = 'black';
        mapView.style.transform = 'translate(0, 0)';
        await dialogueManager.start(newMapData.entryStoryKey, setupMap);
    } else {
        setupMap();
    }
}

// --- 游戏主循环 ---
function gameLoop() {
    if (window.gameMode === 'map') {
        player.update(); // 1. 更新玩家，计算出期望移动的位置
        handlePlayerCollision(player, currentMap.walls); // 2. 传入玩家对象，处理碰撞
        interactionManager.update(player); // 3. 更新交互检测
        updateCamera();
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