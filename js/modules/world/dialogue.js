import { renderDialogue } from '../../dialogue_renderer.js';
import { loader, gameState, getCurrentUser } from '../dataManager.js';

const elements = {
    dialogueView: document.getElementById('dialogue-view'),
    characterContainer: document.getElementById('character-container'),
    characterName: document.getElementById('character-name'),
    dialogueText: document.getElementById('dialogue-text'),
    dialogueOptionsContainer: document.getElementById('dialogue-options-container')
};

let state = {};
const storyCache = {};
let onDialogueEndCallback = null;

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
        onDialogueEndCallback = onEnd;
        window.gameMode = 'dialogue';
        elements.dialogueView.classList.add('active');
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
            const currentUser = getCurrentUser();
            if (currentUser) {
                currentNode.valueChanges.forEach(change => {
                    gameState.modifyValue(currentUser, change.name, change.amount);
                });
            }
        }

        if (currentNode.scene) {
            state.currentScene = currentNode.scene;
        }
        renderDialogue(state, elements, (targetNode) => {
            this.advance(targetNode);
        });
    },

    end() {
        window.gameMode = 'map';
        elements.dialogueView.classList.remove('active');
        if (onDialogueEndCallback) {
            onDialogueEndCallback(state.endAction);
        }
    }
};