import { dialogueManager } from './dialogue.js';
import { INTERACTION_RADIUS, BASE_VISUAL_GAP } from '../../config.js';

let interactableObjects = [];
let currentInteractable = null;
const promptElement = document.getElementById('interaction-prompt');

function updatePrompt(target, player) {
    if (!target || !target.showPrompt) {
        if (promptElement.style.display !== 'none') {
            promptElement.style.display = 'none';
        }
        return;
    }

    const wasHidden = promptElement.style.display === 'none';
    let promptWidth, promptHeight;
    if (wasHidden) {
        // 为了精确测量，先让标签在不可见状态下显示出来
        promptElement.style.transition = 'none'; // 测量期间禁止任何动画
        promptElement.style.visibility = 'hidden'; // 让它不可见，但占据空间
        promptElement.style.display = 'block';
        // 能获取到它真实的尺寸
        promptWidth = promptElement.offsetWidth;
        promptHeight = promptElement.offsetHeight;
    } else {
        // 如果它本来就可见，直接获取尺寸即可
        promptWidth = promptElement.offsetWidth;
        promptHeight = promptElement.offsetHeight;
    }

    // --- 智能定位算法开始 ---
    // 1. 实时获取提示标签被渲染后的实际尺寸
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

    // 更新文本和计算出的位置
    promptElement.innerText = 'E';
    promptElement.style.left = `${promptX}px`;
    promptElement.style.top = `${promptY}px`;

    if (wasHidden) {
        // 对于初次登场的标签，让它“瞬移”到正确位置
        // 强制浏览器立刻应用上面的位置变化
        void promptElement.offsetWidth;
        // 然后，恢复它的过渡动画和可见度，让后续移动变得丝滑
        promptElement.style.transition = '';
        promptElement.style.visibility = 'visible';
    }
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
        // 使用从配置中导入的 INTERACTION_RADIUS
        const detectionRadius = INTERACTION_RADIUS;
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