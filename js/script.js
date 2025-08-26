import { renderDialogue } from './dialogue_renderer.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 世界的状态与设定 ---
    let gameMode = 'map'; // 当前游戏模式: 'map' 或 'dialogue'
    let allStories = {}; // 存放我们所有的故事
    let walls = []; // 存放所有墙体信息

    const player = {
        element: document.getElementById('player'),
        x: 400, // 初始x坐标
        y: 300, // 初始y坐标
        speed: 3, // 移动速度
        width: 50, // 玩家的宽度 (与CSS保持一致)
        height: 50, // 玩家的高度 (与CSS保持一致)
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
    const interactionPrompt = document.getElementById('interaction-prompt');
    let interactableObjects = []; // 存放所有可交互物

    // --- 碰撞检测核心：AABB算法 ---
    /**
     * 检查两个矩形是否重叠 (Axis-Aligned Bounding Box)
     * @param {object} rect1 - {x, y, width, height}
     * @param {object} rect2 - {x, y, width, height}
     * @returns {boolean} - 如果重叠则返回 true
     */
    function isColliding(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // --- 游戏循环 ---
    function gameLoop() {
        if (gameMode !== 'map') return;

        // 记录移动前的原始位置
        const originalX = player.x;
        const originalY = player.y;

        // 根据按键计算期望的下一个位置
        let nextX = originalX;
        let nextY = originalY;
        if (keysPressed.w) nextY -= player.speed;
        if (keysPressed.s) nextY += player.speed;
        if (keysPressed.a) nextX -= player.speed;
        if (keysPressed.d) nextX += player.speed;

        // --- 精密碰撞处理 ---

        // 1. 先处理X轴的移动
        const playerXRect = { x: nextX, y: originalY, width: player.width, height: player.height };
        for (const wall of walls) {
            if (isColliding(playerXRect, wall)) {
                // 如果发生碰撞，就修正nextX的值，让其刚好贴在墙边
                if (nextX > originalX) { // 向右移动时撞墙
                    nextX = wall.x - player.width;
                } else if (nextX < originalX) { // 向左移动时撞墙
                    nextX = wall.x + wall.width;
                }
                break; // 找到一个碰撞就够了，跳出循环
            }
        }
        player.x = nextX; // 更新X坐标

        // 2. 再处理Y轴的移动
        const playerYRect = { x: player.x, y: nextY, width: player.width, height: player.height };
        for (const wall of walls) {
            if (isColliding(playerYRect, wall)) {
                // 如果发生碰撞，就修正nextY的值
                if (nextY > originalY) { // 向下移动时撞墙
                    nextY = wall.y - player.height;
                } else if (nextY < originalY) { // 向上移动时撞墙
                    nextY = wall.y + wall.height;
                }
                break; // 找到一个碰撞就够了
            }
        }
        player.y = nextY; // 更新Y坐标

        // --- 碰撞处理结束 ---

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
        let nearestObject = null;
        let minDistance = Infinity;
        const detectionRadius = 60; // 交互检测范围

        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        // 1. 找到距离最近的可交互对象
        interactableObjects.filter(obj => !obj.interacted).forEach(obj => {
            const objWidth = obj.element.offsetWidth;
            const objHeight = obj.element.offsetHeight;
            const objCenterX = obj.x + objWidth / 2;
            const objCenterY = obj.y + objHeight / 2;
            const distance = Math.hypot(playerCenterX - objCenterX, playerCenterY - objCenterY);
            if (distance < detectionRadius && distance < minDistance) {
                minDistance = distance;
                nearestObject = obj;
            }
        });

        // 2. 根据最近的对象更新状态和提示位置
        currentInteractable = nearestObject;

        if (currentInteractable && currentInteractable.showPrompt) {
            const obj = currentInteractable;
            const objWidth = obj.element.offsetWidth;
            const objHeight = obj.element.offsetHeight;
            const objCenterX = obj.x + objWidth / 2;
            const objCenterY = obj.y + objHeight / 2;

            const dx = playerCenterX - objCenterX;
            const dy = playerCenterY - objCenterY;

            let promptX = objCenterX;
            let promptY;

            const yOffset = 30;
            const xOffset = objWidth / 2 + 20;

            // 判断主角在物品的哪个方向，然后把提示放在对侧
            if (Math.abs(dy) > Math.abs(dx)) { // 垂直方向更远
                if (dy > 0) { // 玩家在下方 -> 提示在上方
                    promptY = obj.y - yOffset;
                } else { // 玩家在上方 -> 提示在下方
                    promptY = obj.y + objHeight + 10;
                }
            } else { // 水平方向更远
                if (dx > 0) { // 玩家在右方 -> 提示在左方
                    promptX = obj.x - xOffset + 15;
                } else { // 玩家在左方 -> 提示在右方
                    promptX = obj.x + objWidth + 5;
                }
                promptY = objCenterY - 10;
            }

            interactionPrompt.style.display = 'block';
            interactionPrompt.style.left = `${promptX}px`;
            interactionPrompt.style.top = `${promptY}px`;
        } else {
            interactionPrompt.style.display = 'none';
        }
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
            const [storyResponse, objectsResponse, wallsResponse] = await Promise.all([
                fetch('data/story.json'),
                fetch('data/objects.json'),
                fetch('data/walls.json') // 加载墙体数据
            ]);

            allStories = await storyResponse.json();
            const objectsData = await objectsResponse.json();
            const wallsData = await wallsResponse.json(); // 解析墙体数据

            // 创造世界万物
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
                mapView.appendChild(objElement);
                interactableObjects.push({
                    element: objElement,
                    x: data.x,
                    y: data.y,
                    storyKey: data.storyKey,
                    showPrompt: data.showPrompt !== false, // 如果未定义或为true，则为true
                    interacted: false
                });
            });

            // 构建世界的物理边界
            wallsData.forEach(data => {
                walls.push({ // 将墙体信息存入我们的世界状态
                    x: data.x,
                    y: data.y,
                    width: data.width,
                    height: data.height
                });

                // (调试用) 在屏幕上把墙画出来
                const wallElement = document.createElement('div');
                wallElement.className = 'wall';
                wallElement.style.left = `${data.x}px`;
                wallElement.style.top = `${data.y}px`;
                wallElement.style.width = `${data.width}px`;
                wallElement.style.height = `${data.height}px`;
                mapView.appendChild(wallElement);
            });

        } catch (error) {
            console.error("在构建世界时出现了错误: ", error);
        }

        requestAnimationFrame(gameLoop);
    }

    initializeGame();
});