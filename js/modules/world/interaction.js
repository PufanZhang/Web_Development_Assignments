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