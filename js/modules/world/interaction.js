import { dialogueManager } from './dialogue.js';

let interactableObjects = [];
let portals = [];
let currentInteractable = null;
let currentPortal = null;
const promptElement = document.getElementById('interaction-prompt');

function updatePrompt(target, key = 'E') {
    if (!target) {
        promptElement.style.display = 'none';
        return;
    }
    // 这里可以使用你喜欢的动态算法，为了简洁我先用固定位置
    promptElement.innerText = key;
    promptElement.style.display = 'block';
    promptElement.style.left = `${target.x + target.width / 2}px`;
    promptElement.style.top = `${target.y - 30}px`;
}

export const interactionManager = {
    // 允许主程序动态更新可交互物列表
    updateInteractables(objects, newPortals) {
        interactableObjects = objects;
        portals = newPortals;
    },

    init(onTeleport) { // onTeleport 是一个函数，由 main.js 传入
        window.addEventListener('keydown', (e) => {
            if (window.gameMode !== 'map') return;

            if (e.key === 'e' && currentInteractable) {
                dialogueManager.start(currentInteractable.storyKey, () => {
                    // ... 对话结束逻辑
                });
            }
            // 新增传送逻辑！
            if (e.key === 'q' && currentPortal) {
                onTeleport(currentPortal);
            }
        });
    },

    update(player) {
        const detectionRadius = 80; // 稍微扩大一点范围
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        // --- 检测普通物品 ---
        let nearestObject = null;
        let minObjectDist = Infinity;
        interactableObjects.filter(obj => !obj.interacted).forEach(obj => {
            const objCenterX = obj.x + obj.width / 2;
            const objCenterY = obj.y + obj.height / 2;
            const distance = Math.hypot(playerCenterX - objCenterX, playerCenterY - objCenterY);
            if (distance < detectionRadius && distance < minObjectDist) {
                minObjectDist = distance;
                nearestObject = obj;
            }
        });
        currentInteractable = nearestObject;

        // --- 检测传送门 ---
        let nearestPortal = null;
        let minPortalDist = Infinity;
        portals.forEach(portal => {
            const portalCenterX = portal.x + portal.width / 2;
            const portalCenterY = portal.y + portal.height / 2;
            const distance = Math.hypot(playerCenterX - portalCenterX, playerCenterY - portalCenterY);
            if (distance < detectionRadius && distance < minPortalDist) {
                minPortalDist = distance;
                nearestPortal = portal;
            }
        });
        currentPortal = nearestPortal;

        // --- UI提示 (优先显示传送门) ---
        if (currentPortal) {
            updatePrompt(currentPortal, 'Q');
        } else if (currentInteractable) {
            updatePrompt(currentInteractable, 'E');
        } else {
            updatePrompt(null);
        }
    }
};

export const interactionManager = {
    // 接收从 main.js 传来的物体列表，并保存在模块内部变量中
    init(objects) {
        interactableObjects = objects;

        window.addEventListener('keydown', (e) => {
            if (window.gameMode === 'map' && e.key === 'e' && currentInteractable) {
                dialogueManager.start(currentInteractable.storyKey, () => {
                    if (currentInteractable) {
                        currentInteractable.interacted = true;
                        currentInteractable.element.classList.add('hidden');
                        currentInteractable = null;
                    }
                });
            }
        });
    },

    // update 函数每一帧都会被调用，负责检测和更新交互状态
    update(player) {
        let nearestObject = null;
        let minDistance = Infinity;
        const detectionRadius = 60;

        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        interactableObjects.filter(obj => !obj.interacted).forEach(obj => {
            const objCenterX = obj.x + obj.width / 2;
            const objCenterY = obj.y + obj.height / 2;
            const distance = Math.hypot(playerCenterX - objCenterX, playerCenterY - objCenterY);

            if (distance < detectionRadius && distance < minDistance) {
                minDistance = distance;
                nearestObject = obj;
            }
        });

        currentInteractable = nearestObject;

        // --- 动态提示算法回归！---
        if (currentInteractable && currentInteractable.showPrompt) {
            const obj = currentInteractable;
            const objCenterX = obj.x + obj.width / 2;
            const objCenterY = obj.y + obj.height / 2;

            const dx = playerCenterX - objCenterX;
            const dy = playerCenterY - objCenterY;

            let promptX = objCenterX;
            let promptY = objCenterY;

            const yOffset = 30; // 垂直方向的偏移量
            const xOffset = obj.width / 2 + 20; // 水平方向的偏移量

            // 判断主角在物品的哪个方向，然后把提示放在对侧
            if (Math.abs(dy) > Math.abs(dx)) { // 垂直方向更远
                promptY = (dy > 0) ? (obj.y - yOffset) : (obj.y + obj.height + 10);
            } else { // 水平方向更远
                promptX = (dx > 0) ? (obj.x - xOffset + 15) : (obj.x + obj.width + 5);
                promptY = objCenterY - 10;
            }

            promptElement.style.display = 'block';
            promptElement.style.left = `${promptX}px`;
            promptElement.style.top = `${promptY}px`;
        } else {
            promptElement.style.display = 'none';
        }
    }
};