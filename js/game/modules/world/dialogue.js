import { renderDialogue } from '../dialogue_renderer.js';
import { loader, gameState, getCurrentUser } from '../dataManager.js';

const elements = {
    dialogueView: document.getElementById('dialogue-view'),
    characterContainer: document.getElementById('character-container'),
    characterName: document.getElementById('character-name'),
    dialogueText: document.getElementById('dialogue-text'),
    dialogueOptionsContainer: document.getElementById('dialogue-options-container'),
    itemImageContainer: document.getElementById('item-image-container'),
    mapView: document.getElementById('map-view')
};

let state = {};
const storyCache = {};
let onDialogueEndCallback = null;
let animationVideoElement = null;

export const dialogueManager = {
    init() {
        elements.dialogueView.addEventListener('click', (e) => {
            // 只有在没有选项，并且点击的不是选项按钮时，才通过点击背景继续
            const currentNode = state.story.nodes[state.currentNodeId];
            if (window.gameMode === 'dialogue' && !currentNode.options && e.target.className !== 'dialogue-option') {
                this.advance();
            }
        });
    },

    async start(storyKey, onEnd) {
        if (!storyCache[storyKey]) {
            const storyData = await loader.loadStory(storyKey);
            if (!storyData) return;
            storyCache[storyKey] = storyData;
        }
        const story = storyCache[storyKey];

        // 检查故事数据中是否有 animation 字段
        if (story.animation) {
            // 创建 video 元素
            console.log(`检测到动画资源 ${story.animation}`);
            animationVideoElement = document.createElement('video');
            animationVideoElement.src = story.animation;
            animationVideoElement.loop = true;
            animationVideoElement.muted = true; // 这是为了确保能在大多数浏览器上自动播放
            animationVideoElement.playsInline = true;

            // 设置全屏样式
            animationVideoElement.style.position = 'fixed';
            animationVideoElement.style.top = '0';
            animationVideoElement.style.left = '0';
            animationVideoElement.style.width = '100vw';
            animationVideoElement.style.height = '100vh';
            animationVideoElement.style.objectFit = 'cover';
            // 确保视频在对话框后面，但在地图前面
            animationVideoElement.style.zIndex = '9';

            // 将 video 元素添加到 body 中并播放
            document.body.appendChild(animationVideoElement);
            animationVideoElement.play().catch(error => {
                console.error("入场动画播放失败:", error);
            });
        }

        onDialogueEndCallback = onEnd;
        window.gameMode = 'dialogue';
        elements.dialogueView.classList.add('active');
        if (elements.mapView) {
            elements.mapView.classList.add('dialogue-active');
        }
        state = {
            story: story,
            currentNodeId: story.startNode,
            currentScene: [],
            endAction: null
        };
        this.renderCurrentNode();
    },

    advance(nextNodeId) {
        const currentNode = state.story.nodes[state.currentNodeId];
        // 如果提供了 nextNodeId (来自选项点击)，则直接使用
        // 否则，使用当前节点的 nextNode
        const targetNodeId = nextNodeId || currentNode.nextNode;

        if (targetNodeId && state.story.nodes[targetNodeId]) {
            state.currentNodeId = targetNodeId;
            const nextNode = state.story.nodes[targetNodeId];
            if (nextNode.action) {
                state.endAction = nextNode.action; // 如果下一个节点有动作，记录下来
            }
            this.renderCurrentNode();
        } else {
            // 如果当前节点有动作，也记录下来
            if (currentNode.action) {
                state.endAction = currentNode.action;
            }
            this.end();
        }
    },

    renderCurrentNode() {
        const currentNode = state.story.nodes[state.currentNodeId];
        if (!currentNode) {
            this.end();
            return;
        }

        // --- 处理数值变化 ---
        if (currentNode.valueChanges) {
            currentNode.valueChanges.forEach(change => {
                if (change.absolute) {
                    const delta = change.amount - gameState.getValue(change.name);
                    gameState.modifyValue(getCurrentUser(), change.name, delta);
                } else {
                    gameState.modifyValue(getCurrentUser(), change.name, change.amount);
                }
            });
        }

        if (currentNode.saveFile) {
            gameState.createSaveFile(currentNode.saveFile);
        }

        if (currentNode.scene) {
            state.currentScene = currentNode.scene;
        }

        renderDialogue(state, elements, (targetNode) => {
            this.advance(targetNode);
        });
    },

    end() {
        if (animationVideoElement) {
            animationVideoElement.pause();
            if (animationVideoElement.parentNode) {
                animationVideoElement.parentNode.removeChild(animationVideoElement);
            }
            animationVideoElement = null;
        }
        window.gameMode = 'map';
        elements.dialogueView.classList.remove('active');
        elements.itemImageContainer.style.display = 'none';
        if (elements.mapView) {
            elements.mapView.classList.remove('dialogue-active');
        }
        if (onDialogueEndCallback) {
            onDialogueEndCallback(state.endAction);
        }
    }
};