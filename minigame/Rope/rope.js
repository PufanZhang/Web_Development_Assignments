import { minigameLoader } from "../../js/game/modules/minigameLoader.js";
// 游戏状态
let gameState = {
    ropes: [],
    totalRopes: 0,
    solvedRopes: 0,
    timeLeft: 120, // 2分钟
    timer: null,
    isDragging: false,
    draggedEnd: null,
    currentLevel: 1,
    startTime: null,
    hintActive: false
};

// 绳子颜色
const ropeColors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41'
];

// 初始化游戏
function initGame() {
    gameState.ropes = [];
    gameState.solvedRopes = 0;
    gameState.timeLeft = 120;
    gameState.isDragging = false;
    gameState.draggedEnd = null;
    gameState.startTime = Date.now();
    gameState.hintActive = false;

    document.getElementById('game-board').innerHTML = '';
    document.getElementById('victory-screen').style.display = 'none';
    document.getElementById('fail-screen').style.display = 'none';

    // 根据关卡难度创建绳子
    createRopes(3 + gameState.currentLevel);

    // 开始计时
    startTimer();

    // 添加事件监听器
    setupEventListeners();
}

// 创建绳子
function createRopes(count) {
    const gameBoard = document.getElementById('game-board');
    const boardWidth = gameBoard.offsetWidth;
    const boardHeight = gameBoard.offsetHeight;

    gameState.totalRopes = count;
    document.getElementById('ropes-count').textContent = count;

    for (let i = 0; i < count; i++) {
        // 随机生成绳子位置
        const startX = Math.random() * (boardWidth - 100) + 50;
        const startY = Math.random() * (boardHeight - 100) + 50;
        let endX, endY;

        // 确保绳子有一定长度
        do {
            endX = Math.random() * (boardWidth - 100) + 50;
            endY = Math.random() * (boardHeight - 100) + 50;
        } while (Math.hypot(endX - startX, endY - startY) < 100);

        const color = ropeColors[i % ropeColors.length];

        // 创建SVG线条代表绳子
        const rope = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        rope.classList.add("rope");
        rope.style.position = "absolute";
        rope.style.left = "0";
        rope.style.top = "0";
        rope.style.width = "100%";
        rope.style.height = "100%";
        rope.style.pointerEvents = "none";
        rope.dataset.id = i;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", startX);
        line.setAttribute("y1", startY);
        line.setAttribute("x2", endX);
        line.setAttribute("y2", endY);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "4");
        line.setAttribute("stroke-linecap", "round");
        rope.appendChild(line);

        // 创建绳子端点
        const startEnd = createRopeEnd(startX, startY, color, i, "start");
        const endEnd = createRopeEnd(endX, endY, color, i, "end");

        gameBoard.appendChild(rope);
        gameBoard.appendChild(startEnd);
        gameBoard.appendChild(endEnd);

        // 保存绳子状态
        gameState.ropes.push({
            id: i,
            element: rope,
            line: line,
            start: {element: startEnd, x: startX, y: startY},
            end: {element: endEnd, x: endX, y: endY},
            color: color,
            solved: false
        });
    }

    // 随机缠绕绳子
    tangleRopes();
}

// 创建绳子端点
function createRopeEnd(x, y, color, ropeId, endType) {
    const end = document.createElement("div");
    end.classList.add("rope-end");
    end.style.left = `${x - 10}px`;
    end.style.top = `${y - 10}px`;
    end.style.backgroundColor = color;
    end.dataset.ropeId = ropeId;
    end.dataset.endType = endType;
    return end;
}

// 随机缠绕绳子
function tangleRopes() {
    // 实现绳子缠绕逻辑
    // 这里简化处理，实际游戏中需要更复杂的缠绕算法
    gameState.ropes.forEach(rope => {
        // 随机移动端点，创造缠绕效果
        const randomMove = 80;
        rope.start.x += (Math.random() * randomMove * 2) - randomMove;
        rope.start.y += (Math.random() * randomMove * 2) - randomMove;
        rope.end.x += (Math.random() * randomMove * 2) - randomMove;
        rope.end.y += (Math.random() * randomMove * 2) - randomMove;

        // 更新端点和线条位置
        updateRopePosition(rope);
    });

    // 检查并标记交叉点
    checkForCrossings();
}

// 更新绳子位置
function updateRopePosition(rope) {
    rope.start.element.style.left = `${rope.start.x - 10}px`;
    rope.start.element.style.top = `${rope.start.y - 10}px`;
    rope.end.element.style.left = `${rope.end.x - 10}px`;
    rope.end.element.style.top = `${rope.end.y - 10}px`;

    rope.line.setAttribute("x1", rope.start.x);
    rope.line.setAttribute("y1", rope.start.y);
    rope.line.setAttribute("x2", rope.end.x);
    rope.line.setAttribute("y2", rope.end.y);
}

// 检查绳子交叉
function checkForCrossings() {
    // 重置所有绳子的交叉状态
    gameState.ropes.forEach(rope => {
        rope.element.classList.remove("crossed");
    });

    // 检查每对绳子是否交叉
    for (let i = 0; i < gameState.ropes.length; i++) {
        const rope1 = gameState.ropes[i];
        if (rope1.solved) continue;

        for (let j = i + 1; j < gameState.ropes.length; j++) {
            const rope2 = gameState.ropes[j];
            if (rope2.solved) continue;

            if (areRopesCrossed(rope1, rope2)) {
                rope1.element.classList.add("crossed");
                rope2.element.classList.add("crossed");
            }
        }
    }
}

// 判断两条绳子是否交叉
function areRopesCrossed(rope1, rope2) {
    const x1 = rope1.start.x, y1 = rope1.start.y;
    const x2 = rope1.end.x, y2 = rope1.end.y;
    const x3 = rope2.start.x, y3 = rope2.start.y;
    const x4 = rope2.end.x, y4 = rope2.end.y;

    // 计算分母
    const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

    // 如果分母为0，则线段平行或共线
    if (den === 0) return false;

    // 计算ua和ub
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;

    // 如果ua和ub都在0和1之间，则线段交叉
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// 开始计时器
function startTimer() {
    updateTimerDisplay();

    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();

        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            endGame(false);
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    document.getElementById('time-left').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 时间少于30秒时变红色
    if (gameState.timeLeft < 30) {
        document.getElementById('time-left').style.color = '#ff5252';
    }
}

// 设置事件监听器
function setupEventListeners() {
    const gameBoard = document.getElementById('game-board');

    // 鼠标按下事件
    gameBoard.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('rope-end')) {
            startDragging(e.target, e.clientX, e.clientY);
        }
    });

    // 鼠标移动事件
    document.addEventListener('mousemove', (e) => {
        if (gameState.isDragging) {
            dragRopeEnd(e.clientX, e.clientY);
        }
    });

    // 鼠标释放事件
    document.addEventListener('mouseup', () => {
        if (gameState.isDragging) {
            stopDragging();
        }
    });

    // 触摸事件支持
    gameBoard.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('rope-end')) {
            e.preventDefault();
            startDragging(e.target, e.touches[0].clientX, e.touches[0].clientY);
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (gameState.isDragging) {
            e.preventDefault();
            dragRopeEnd(e.touches[0].clientX, e.touches[0].clientY);
        }
    });

    document.addEventListener('touchend', () => {
        if (gameState.isDragging) {
            stopDragging();
        }
    });

    // 按钮事件
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('reset-btn').addEventListener('click', resetLevel);
    document.getElementById('next-level-btn').addEventListener('click', nextLevel);
    document.getElementById('return-btn').addEventListener('click', returnToMainGame);
    document.getElementById('retry-btn').addEventListener('click', resetLevel);
    document.getElementById('fail-return-btn').addEventListener('click', returnToMainGame);
}

// 开始拖动绳子端点
function startDragging(endElement, clientX, clientY) {
    gameState.isDragging = true;
    gameState.draggedEnd = endElement;
    endElement.classList.add('dragging');

    // 记录初始位置
    gameState.dragStartX = clientX;
    gameState.dragStartY = clientY;
    gameState.originalX = parseInt(endElement.style.left) + 10;
    gameState.originalY = parseInt(endElement.style.top) + 10;
}

// 拖动绳子端点
function dragRopeEnd(clientX, clientY) {
    const dx = clientX - gameState.dragStartX;
    const dy = clientY - gameState.dragStartY;

    const newX = gameState.originalX + dx;
    const newY = gameState.originalY + dy;

    // 限制在游戏区域内
    const gameBoard = document.getElementById('game-board');
    const boundedX = Math.max(10, Math.min(gameBoard.offsetWidth - 10, newX));
    const boundedY = Math.max(10, Math.min(gameBoard.offsetHeight - 10, newY));

    // 更新端点位置
    gameState.draggedEnd.style.left = `${boundedX - 10}px`;
    gameState.draggedEnd.style.top = `${boundedY - 10}px`;

    // 更新对应的绳子数据
    const ropeId = parseInt(gameState.draggedEnd.dataset.ropeId);
    const endType = gameState.draggedEnd.dataset.endType;
    const rope = gameState.ropes[ropeId];

    if (endType === 'start') {
        rope.start.x = boundedX;
        rope.start.y = boundedY;
    } else {
        rope.end.x = boundedX;
        rope.end.y = boundedY;
    }

    // 更新绳子线条
    rope.line.setAttribute(
        endType === 'start' ? 'x1' : 'x2',
        boundedX
    );
    rope.line.setAttribute(
        endType === 'start' ? 'y1' : 'y2',
        boundedY
    );

    // 检查交叉
    checkForCrossings();

    // 检查是否解开
    checkIfRopeSolved(rope);
}

// 停止拖动
function stopDragging() {
    gameState.draggedEnd.classList.remove('dragging');
    gameState.isDragging = false;
    gameState.draggedEnd = null;
}

// 检查绳子是否已解开
function checkIfRopeSolved(rope) {
    if (rope.solved) return;

    // 检查这条绳子是否与其他任何绳子交叉
    let isCrossed = false;

    for (let i = 0; i < gameState.ropes.length; i++) {
        const otherRope = gameState.ropes[i];
        if (otherRope.id === rope.id || otherRope.solved) continue;

        if (areRopesCrossed(rope, otherRope)) {
            isCrossed = true;
            break;
        }
    }

    // 如果没有交叉，则标记为已解开
    if (!isCrossed) {
        rope.solved = true;
        rope.element.classList.add('solved');
        rope.start.element.classList.add('solved');
        rope.end.element.classList.add('solved');

        gameState.solvedRopes++;
        document.getElementById('ropes-count').textContent = gameState.totalRopes - gameState.solvedRopes;

        // 检查是否所有绳子都已解开
        if (gameState.solvedRopes === gameState.totalRopes) {
            endGame(true);
        }
    }
}

// 显示提示
function showHint() {
    if (gameState.hintActive) {
        document.getElementById('game-board').classList.remove('hint-active');
        gameState.hintActive = false;
        return;
    }

    // 找到一条未解开的绳子
    let unsolvedRope = null;
    for (const rope of gameState.ropes) {
        if (!rope.solved) {
            unsolvedRope = rope;
            break;
        }
    }

    if (unsolvedRope) {
        unsolvedRope.element.classList.add('hint');
        document.getElementById('game-board').classList.add('hint-active');
        gameState.hintActive = true;

        // 3秒后自动关闭提示
        setTimeout(() => {
            document.getElementById('game-board').classList.remove('hint-active');
            unsolvedRope.element.classList.remove('hint');
            gameState.hintActive = false;
        }, 3000);
    }
}

// 重置当前关卡
function resetLevel() {
    clearInterval(gameState.timer);
    initGame();
}

// 下一关
function nextLevel() {
    gameState.currentLevel++;
    resetLevel();
}

// 结束游戏
function endGame(isVictory) {
    clearInterval(gameState.timer);

    if (isVictory) {
        const timeUsed = Math.floor((Date.now() - gameState.startTime) / 1000);
        const minutes = Math.floor(timeUsed / 60);
        const seconds = timeUsed % 60;

        document.getElementById('completion-time').textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('victory-screen').style.display = 'flex';
    } else {
        document.getElementById('fail-screen').style.display = 'flex';
    }
}

// 返回主游戏
function returnToMainGame() {
    // 发送消息给父页面，通知游戏结束
    const result = { success: gameState.solvedRopes === gameState.totalRopes };
    window.parent.postMessage({ type: 'closeMinigame', result: result }, '*');
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', initGame);