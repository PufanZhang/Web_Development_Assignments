import { renderDialogue } from './dialogue_renderer.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 世界的状态与设定 ---
    let gameMode = 'map'; // 当前游戏模式: 'map' 或 'dialogue'
    let allStories = {}; // 存放我们所有的故事

    const player = {
        element: document.getElementById('player'),
        x: 400, // 初始x坐标
        y: 300, // 初始y坐标
        speed: 3, // 移动速度
    };

    // 追踪按键状态，实现流畅移动
    const keysPressed = {
        w: false,
        a: false,
        s: false,
        d: false
    };

    // --- 获取舞台元素 ---
    const dialogueView = document.getElementById('dialogue-view');
    const characterContainer = document.getElementById('character-container');
    const characterName = document.getElementById('character-name');
    const dialogueText = document.getElementById('dialogue-text');
    const mapView = document.getElementById('map-view');
    let interactableObjects = []; // 存放所有可交互物

    // --- 游戏循环 ---
    function gameLoop() {
        if (gameMode !== 'map') return;

        // 根据按键更新玩家坐标
        if (keysPressed.w) player.y -= player.speed;
        if (keysPressed.s) player.y += player.speed;
        if (keysPressed.a) player.x -= player.speed;
        if (keysPressed.d) player.x += player.speed;

        // 更新玩家在屏幕上的位置
        player.element.style.top = `${player.y}px`;
        player.element.style.left = `${player.x}px`;

        // 检查与可交互物的距离
        checkInteraction();

        requestAnimationFrame(gameLoop);
    }

    // --- 交互逻辑 ---
    let currentInteractable = null;
    function checkInteraction() {
        currentInteractable = null;
        interactableObjects.filter(obj => !obj.interacted).forEach(obj => {
            const distance = Math.hypot(player.x - obj.x, player.y - obj.y);
            if (distance < 60) {
                currentInteractable = obj;
                obj.element.classList.add('in-range');
            } else {
                obj.element.classList.remove('in-range');
            }
        });
    }

    // --- 对话系统 ---
    let dialogueState = {};
    function startDialogue(storyKey) {
        if (!allStories[storyKey]) return; // 如果故事不存在，则不触发

        gameMode = 'dialogue'; // 切换游戏模式
        dialogueView.classList.add('active'); // 召唤对话界面

        // 初始化对话状态
        dialogueState = {
            story: allStories[storyKey],
            currentIndex: -1,
            currentScene: []
        };

        advanceDialogue(); // 开始第一句对话
    }

    function advanceDialogue() {
        dialogueState.currentIndex++;
        if (dialogueState.currentIndex >= dialogueState.story.length) {
            endDialogue();
            return;
        }
        const currentLine = dialogueState.story[dialogueState.currentIndex];
        if (currentLine.scene) {
            dialogueState.currentScene = currentLine.scene;
        }
        renderDialogue(dialogueState, { characterContainer, characterName, dialogueText });
    }

    function endDialogue() {
        gameMode = 'map';
        dialogueView.classList.remove('active');

        if (currentInteractable) {
            currentInteractable.interacted = true; // 标记为已交互
            currentInteractable.element.classList.add('hidden'); // 在视觉上隐藏它
            currentInteractable = null; // 清除当前的交互目标
        }

        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('keydown', (e) => {
        if (gameMode === 'map') {
            if (keysPressed[e.key] !== undefined) keysPressed[e.key] = true;
            if (e.key === 'e' && currentInteractable) {
                startDialogue(currentInteractable.storyKey);
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (gameMode === 'map') {
            if (keysPressed[e.key] !== undefined) keysPressed[e.key] = false;
        }
    });

    dialogueView.addEventListener('click', () => {
        if(gameMode === 'dialogue') {
            advanceDialogue();
        }
    });

    // --- 游戏初始化：世界的诞生 ---
    async function initializeGame() {
        try {
            const [storyResponse, objectsResponse] = await Promise.all([
                fetch('data/story.json'),
                fetch('data/objects.json')
            ]);

            allStories = await storyResponse.json();
            const objectsData = await objectsResponse.json();

            // 根据物品蓝图，创造世界万物
            objectsData.forEach(data => {
                const objElement = document.createElement('div');
                objElement.id = data.id;
                objElement.className = 'interactable-object';
                objElement.style.left = `${data.x}px`;
                objElement.style.top = `${data.y}px`;
                objElement.style.width = `${data.width}px`;
                objElement.style.height = `${data.height}px`;
                objElement.style.backgroundImage = `url(${data.image})`;
                objElement.dataset.storyKey = data.storyKey;

                mapView.appendChild(objElement); // 将创造的物品放入世界

                // 将物品的完整信息存入世界状态中
                interactableObjects.push({
                    element: objElement,
                    x: data.x,
                    y: data.y,
                    storyKey: data.storyKey,
                    interacted: false // 初始状态：未交互
                });
            });

        } catch (error) {
            console.error("在构建世界时出现了错误: ", error);
        }

        requestAnimationFrame(gameLoop);
    }

    initializeGame();
});