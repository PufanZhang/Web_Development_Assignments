import { renderDialogue } from '../../dialogue_renderer.js';
import { loader } from '../dataManager.js'; // 引入新的加载器

const elements = {
    dialogueView: document.getElementById('dialogue-view'),
    characterContainer: document.getElementById('character-container'),
    characterName: document.getElementById('character-name'),
    dialogueText: document.getElementById('dialogue-text'),
};

let state = {};
const storyCache = {}; // 新增一个“剧本缓存”，看过的剧本就记下来，不用重复加载
let allStories = {};
let onDialogueEndCallback = null;

export const dialogueManager = {
    init() {
        elements.dialogueView.addEventListener('click', () => {
            if (window.gameMode === 'dialogue') {
                this.advance();
            }
        });
    },

    async start(storyKey, onEnd) {
        // 检查缓存里有没有这个剧本
        if (!storyCache[storyKey]) {
            console.log(`首次加载剧本: ${storyKey}`);
            const storyData = await loader.loadStory(storyKey);
            if (!storyData) return; // 加载失败则不继续
            storyCache[storyKey] = storyData;
        }

        const story = storyCache[storyKey];
        onDialogueEndCallback = onEnd;

        window.gameMode = 'dialogue';
        elements.dialogueView.classList.add('active');

        state = {
            story: story,
            currentIndex: -1,
            currentScene: []
        };
        this.advance();
    },

    advance() {
        state.currentIndex++;
        if (state.currentIndex >= state.story.length) {
            this.end();
            return;
        }
        const currentLine = state.story[state.currentIndex];
        if (currentLine.scene) {
            state.currentScene = currentLine.scene;
        }
        renderDialogue(state, elements);
    },

    end() {
        window.gameMode = 'map';
        elements.dialogueView.classList.remove('active');
        if (onDialogueEndCallback) {
            onDialogueEndCallback();
        }
    }
};