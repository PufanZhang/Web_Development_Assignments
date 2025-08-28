import { dialogueManager } from './dialogue.js';

let interactableObjects = [];
let currentInteractable = null;
const promptElement = document.getElementById('interaction-prompt');

function updatePrompt(target, player) {
    if (!target || !target.showPrompt) {
        promptElement.style.display = 'none';
        return;
    }

    // --- 智能定位算法开始 ---
    const BASE_VISUAL_GAP = 15;
    // 1. 实时获取提示标签被渲染后的实际尺寸
    const promptWidth = promptElement.offsetWidth;
    const promptHeight = promptElement.offsetHeight;
    const aspectRatio = promptWidth / promptHeight;
    const horizontalGap = BASE_VISUAL_GAP * Math.sqrt(aspectRatio);
    const verticalGap = BASE_VISUAL_GAP / Math.sqrt(aspectRatio);

    // 2. 计算玩家和目标的中心点
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;

    // 3. 计算中心点之间的向量
    const deltaX = playerCenterX - targetCenterX;
    const deltaY = playerCenterY - targetCenterY;

    let promptX, promptY;

    // 4. 判断主方向，并根据标签的实时尺寸和视觉间隙，计算出完美的中心点位置
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平方向是主导
        promptY = targetCenterY;
        const totalHorizontalOffset = (promptWidth / 2) + horizontalGap;
        if (deltaX > 0) { // 玩家在右，提示在左
            promptX = target.x - totalHorizontalOffset;
        } else { // 玩家在左，提示在右
            promptX = target.x + target.width + totalHorizontalOffset;
        }
    } else {
        // 垂直方向是主导
        promptX = targetCenterX;
        const totalVerticalOffset = (promptHeight / 2) + verticalGap;
        if (deltaY > 0) { // 玩家在下，提示在上
            promptY = target.y - totalVerticalOffset;
        } else { // 玩家在上，提示在下
            promptY = target.y + target.height + totalVerticalOffset;
        }
    }
    // --- 算法结束 ---

    promptElement.innerText = 'E';
    promptElement.style.display = 'block';
    // 使用 transform 来精确定位，并让CSS中的居中效果生效
    promptElement.style.left = `${promptX}px`;
    promptElement.style.top = `${promptY}px`;
}

export const interactionManager = {
    updateInteractables(objects) {
        interactableObjects = objects;
    },

    init(onTeleport) {
        window.addEventListener('keydown', (e) => {
            if (window.gameMode !== 'map' || e.key !== 'e' || !currentInteractable) return;

            dialogueManager.start(currentInteractable.storyKey, (endAction) => {
                // 对话结束后的回调
                if (endAction === 'teleport' && currentInteractable.teleportData) {
                    onTeleport(currentInteractable.teleportData);
                }

                // 普通物品交互后隐藏
                if (currentInteractable && !currentInteractable.teleportData) {
                    currentInteractable.interacted = true;
                    currentInteractable.element.classList.add('hidden');
                }

                // 无论如何，清空当前交互对象
                currentInteractable = null;
            });
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

        updatePrompt(currentInteractable, player);
    }
};