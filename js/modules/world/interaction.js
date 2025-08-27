import { dialogueManager } from './dialogue.js';

let interactableObjects = [];
let portals = [];
let currentInteractable = null;
let currentPortal = null;
const promptElement = document.getElementById('interaction-prompt');

function updatePrompt(target, player, key = 'E') {
    if (!target) {
        promptElement.style.display = 'none';
        return;
    }

    // --- 智能定位算法开始 ---
    // 1. 计算玩家和目标的中心点
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    // 2. 计算中心点之间的向量
    const deltaX = playerCenterX - targetCenterX;
    const deltaY = playerCenterY - targetCenterY;

    // 3. 为不同方向设置最合适的偏移量
    const offsetX = 40; // 用于左右定位的偏移量
    const offsetY = 35; // 用于上下定位的偏移量，比offsetX稍小，以达到视觉统一
    let promptX, promptY;

    // 4. 判断主方向，并使用对应的偏移量进行计算
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平方向是主导
        promptY = targetCenterY;
        if (deltaX > 0) { // 玩家在右，提示在左
            promptX = target.x - offsetX;
        } else { // 玩家在左，提示在右
            promptX = target.x + target.width + offsetX;
        }
    } else {
        // 垂直方向是主导
        promptX = targetCenterX;
        if (deltaY > 0) { // 玩家在下，提示在上
            promptY = target.y - offsetY;
        } else { // 玩家在上，提示在下
            promptY = target.y + target.height + offsetY;
        }
    }
    // --- 算法结束 ---

    promptElement.innerText = key;
    promptElement.style.display = 'block';
    // 使用 transform 来精确定位，并让CSS中的居中效果生效
    promptElement.style.left = `${promptX}px`;
    promptElement.style.top = `${promptY}px`;
}

export const interactionManager = {
    updateInteractables(objects, newPortals) {
        interactableObjects = objects;
        portals = newPortals;
    },

    init(onTeleport) {
        window.addEventListener('keydown', (e) => {
            if (window.gameMode !== 'map') return;
            if (e.key === 'e' && currentInteractable) {
                dialogueManager.start(currentInteractable.storyKey, () => {
                    if (currentInteractable) {
                        currentInteractable.interacted = true;
                        currentInteractable.element.classList.add('hidden');
                        currentInteractable = null;
                    }
                });
            }
            if (e.key === 'q' && currentPortal) {
                onTeleport(currentPortal);
            }
        });
    },

    update(player) {
        const detectionRadius = 80;
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

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

        if (currentPortal) {
            updatePrompt(currentPortal, player, 'Q');
        } else if (currentInteractable && currentInteractable.showPrompt) {
            updatePrompt(currentInteractable, player, 'E');
        } else {
            updatePrompt(null, player);
        }
    }
};