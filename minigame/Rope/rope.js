import { minigameLoader } from "../../js/game/modules/minigameLoader.js";
const GRID_SIZE = 6; // 6x6点阵
const GRID_POINTS = []; // 存储所有点阵点的坐标

// 游戏状态
let gameState = {
    ropes: [],
    totalRopes: 0,
    solvedRopes: 0,
    timeLeft: 60, // 2分钟
    timer: null,
    isDragging: false,
    draggedEnd: null,
    startTime: null,
    hintActive: false
};
let result = true;

// 绳子颜色
const ropeColors = [
    '#FF5252', '#FF4081', '#E040FB', '#7C4DFF',
    '#536DFE', '#448AFF', '#40C4FF', '#18FFFF',
    '#64FFDA', '#69F0AE', '#B2FF59', '#EEFF41'
];

// 初始化游戏
// 修改 initGame 函数
function initGame() {
    gameState.ropes = [];
    gameState.solvedRopes = 0;
    gameState.timeLeft = 60;
    gameState.isDragging = false;
    gameState.draggedEnd = null;
    gameState.startTime = Date.now();
    gameState.hintActive = false;

    document.getElementById('game-board').innerHTML = '';
    document.getElementById('victory-screen').style.display = 'none';
    document.getElementById('fail-screen').style.display = 'none';

    // 创建固定数量的绳子
    createRopes();

    // 开始计时
    startTimer();

    // 添加事件监听器
    setupEventListeners();
}
// 初始化点阵
function initGrid() {
    const gameBoard = document.getElementById('game-board');
    const boardWidth = gameBoard.offsetWidth;
    const boardHeight = gameBoard.offsetHeight;

    // 计算点阵间距
    const gridSpacingX = boardWidth / (GRID_SIZE + 1);
    const gridSpacingY = boardHeight / (GRID_SIZE + 1);

    // 清空点阵
    GRID_POINTS.length = 0;

    // 创建点阵点
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const x = (col + 1) * gridSpacingX;
            const y = (row + 1) * gridSpacingY;

            GRID_POINTS.push({
                x: x,
                y: y,
                occupied: false, // 标记是否被占用
                occupiedBy: null // 被哪个绳子端点占用
            });

            // 可选：可视化点阵点（调试用）
            /*
            const point = document.createElement('div');
            point.className = 'grid-point';
            point.style.left = `${x - 2}px`;
            point.style.top = `${y - 2}px`;
            gameBoard.appendChild(point);
            */
        }
    }
}

// 创建绳子
// 修改 createRopes 函数
function createRopes() {
    const gameBoard = document.getElementById('game-board');
    const count = 10;
    gameState.totalRopes = count;
    document.getElementById('ropes-count').textContent = count;

    // 初始化点阵
    initGrid();

    // 重置所有点阵点的占用状态
    GRID_POINTS.forEach(point => {
        point.occupied = false;
        point.occupiedBy = null;
    });

    // 收集所有可用的点阵点
    const availablePoints = [...GRID_POINTS];

    for (let i = 0; i < count; i++) {
        // 随机选择两个不同的点阵点
        if (availablePoints.length < 2) {
            console.error("没有足够的点阵点来创建绳子");
            break;
        }

        const startPointIndex = Math.floor(Math.random() * availablePoints.length);
        const startPoint = availablePoints[startPointIndex];
        availablePoints.splice(startPointIndex, 1);

        const endPointIndex = Math.floor(Math.random() * availablePoints.length);
        const endPoint = availablePoints[endPointIndex];
        availablePoints.splice(endPointIndex, 1);

        // 标记点阵点为已占用
        startPoint.occupied = true;
        startPoint.occupiedBy = { ropeId: i, endType: "start" };

        endPoint.occupied = true;
        endPoint.occupiedBy = { ropeId: i, endType: "end" };

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
        rope.style.zIndex = i;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", startPoint.x);
        line.setAttribute("y1", startPoint.y);
        line.setAttribute("x2", endPoint.x);
        line.setAttribute("y2", endPoint.y);
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", "4");
        line.setAttribute("stroke-linecap", "round");
        rope.appendChild(line);

        // 创建绳子端点
        const startEnd = createRopeEnd(startPoint.x, startPoint.y, color, i, "start");
        const endEnd = createRopeEnd(endPoint.x, endPoint.y, color, i, "end");

        // 存储点阵点引用
        startEnd.dataset.gridX = startPoint.x;
        startEnd.dataset.gridY = startPoint.y;
        endEnd.dataset.gridX = endPoint.x;
        endEnd.dataset.gridY = endPoint.y;

        gameBoard.appendChild(rope);
        gameBoard.appendChild(startEnd);
        gameBoard.appendChild(endEnd);

        // 保存绳子状态
        gameState.ropes.push({
            id: i,
            element: rope,
            line: line,
            start: {
                element: startEnd,
                x: startPoint.x,
                y: startPoint.y,
                gridPoint: startPoint
            },
            end: {
                element: endEnd,
                x: endPoint.x,
                y: endPoint.y,
                gridPoint: endPoint
            },
            color: color,
            solved: false,
            layer: i
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
// 修改 tangleRopes 函数
function tangleRopes() {
    // 实现绳子缠绕逻辑，但确保端点保持在点阵上
    gameState.ropes.forEach(rope => {
        // 随机选择一个不同的点阵点来移动端点
        const availablePoints = GRID_POINTS.filter(point =>
            !point.occupied ||
            (point.occupiedBy &&
                point.occupiedBy.ropeId === rope.id)
        );

        if (availablePoints.length > 1) {
            // 随机移动起点
            const startPointIndex = Math.floor(Math.random() * availablePoints.length);
            const newStartPoint = availablePoints[startPointIndex];
            availablePoints.splice(startPointIndex, 1);

            // 释放原来的点
            if (rope.start.gridPoint) {
                rope.start.gridPoint.occupied = false;
                rope.start.gridPoint.occupiedBy = null;
            }

            // 占用新的点
            newStartPoint.occupied = true;
            newStartPoint.occupiedBy = { ropeId: rope.id, endType: "start" };

            // 更新起点位置
            rope.start.x = newStartPoint.x;
            rope.start.y = newStartPoint.y;
            rope.start.gridPoint = newStartPoint;
            rope.start.element.style.left = `${newStartPoint.x - 10}px`;
            rope.start.element.style.top = `${newStartPoint.y - 10}px`;
            rope.start.element.dataset.gridX = newStartPoint.x;
            rope.start.element.dataset.gridY = newStartPoint.y;

            // 随机移动终点
            const endPointIndex = Math.floor(Math.random() * availablePoints.length);
            const newEndPoint = availablePoints[endPointIndex];

            // 释放原来的点
            if (rope.end.gridPoint) {
                rope.end.gridPoint.occupied = false;
                rope.end.gridPoint.occupiedBy = null;
            }

            // 占用新的点
            newEndPoint.occupied = true;
            newEndPoint.occupiedBy = { ropeId: rope.id, endType: "end" };

            // 更新终点位置
            rope.end.x = newEndPoint.x;
            rope.end.y = newEndPoint.y;
            rope.end.gridPoint = newEndPoint;
            rope.end.element.style.left = `${newEndPoint.x - 10}px`;
            rope.end.element.style.top = `${newEndPoint.y - 10}px`;
            rope.end.element.dataset.gridX = newEndPoint.x;
            rope.end.element.dataset.gridY = newEndPoint.y;

            // 更新线条
            rope.line.setAttribute("x1", newStartPoint.x);
            rope.line.setAttribute("y1", newStartPoint.y);
            rope.line.setAttribute("x2", newEndPoint.x);
            rope.line.setAttribute("y2", newEndPoint.y);
        }
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

// 检查绳子是否被阻挡
function isRopeBlocked(rope) {
    const currentLayer = rope.layer;

    for (const otherRope of gameState.ropes) {
        if (otherRope.layer > currentLayer &&
            !otherRope.solved &&
            areRopesCrossed(rope, otherRope)) {
            return true;
        }
    }

    return false;
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

// 找到最近的点阵点
function findNearestGridPoint(x, y) {
    let nearestPoint = null;
    let minDistance = Infinity;

    for (const point of GRID_POINTS) {
        const distance = Math.hypot(x - point.x, y - point.y);
        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
        }
    }

    return nearestPoint;
}

// 检查点是否可用
function isGridPointAvailable(point, excludeRopeId = null, excludeEndType = null) {
    if (!point) return false;

    // 如果点未被占用，或者被排除的绳子端点占用，则可用
    return !point.occupied ||
        (excludeRopeId !== null &&
            excludeEndType !== null &&
            point.occupiedBy &&
            point.occupiedBy.ropeId === excludeRopeId &&
            point.occupiedBy.endType === excludeEndType);
}

// 开始计时器
function startTimer() {
    updateTimerDisplay();

    gameState.timer = setInterval(() => {
        if(gameState.timer > 0) {
            gameState.timeLeft--;
            updateTimerDisplay();
        }

        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            result = false;
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
    // 修改按钮事件，移除下一关
    document.getElementById('hint-btn').addEventListener('click', showHint);
    document.getElementById('reset-btn').addEventListener('click', resetLevel);
    document.getElementById('return-btn').addEventListener('click', returnToMainGame);
    document.getElementById('retry-btn').addEventListener('click', resetLevel);
    document.getElementById('fail-return-btn').addEventListener('click', returnToMainGame);

    // 隐藏下一关按钮
    document.getElementById('next-level-btn').style.display = 'none';
}

// 开始拖动绳子端点
function startDragging(endElement, clientX, clientY) {
    const ropeId = parseInt(endElement.dataset.ropeId);
    const rope = gameState.ropes[ropeId];

    // 检查绳子是否被阻挡
    if (isRopeBlocked(rope)) {
        endElement.classList.add('blocked');
        setTimeout(() => {
            endElement.classList.remove('blocked');
        }, 500);
        return;
    }

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
    if (!gameState.draggedEnd) return;

    const ropeId = parseInt(gameState.draggedEnd.dataset.ropeId);
    const endType = gameState.draggedEnd.dataset.endType;
    const rope = gameState.ropes[ropeId];

    // 找到最近的点阵点
    const nearestPoint = findNearestGridPoint(
        parseInt(gameState.draggedEnd.style.left) + 10,
        parseInt(gameState.draggedEnd.style.top) + 10
    );

    // 检查点是否可用
    const isAvailable = isGridPointAvailable(nearestPoint, ropeId, endType);

    if (isAvailable) {
        // 释放原来的点阵点
        if (endType === 'start' && rope.start.gridPoint) {
            rope.start.gridPoint.occupied = false;
            rope.start.gridPoint.occupiedBy = null;
        } else if (rope.end.gridPoint) {
            rope.end.gridPoint.occupied = false;
            rope.end.gridPoint.occupiedBy = null;
        }

        // 占用新的点阵点
        nearestPoint.occupied = true;
        nearestPoint.occupiedBy = { ropeId: ropeId, endType: endType };

        // 更新绳子端点位置
        if (endType === 'start') {
            rope.start.x = nearestPoint.x;
            rope.start.y = nearestPoint.y;
            rope.start.gridPoint = nearestPoint;
        } else {
            rope.end.x = nearestPoint.x;
            rope.end.y = nearestPoint.y;
            rope.end.gridPoint = nearestPoint;
        }

        // 更新端点和线条位置
        gameState.draggedEnd.style.left = `${nearestPoint.x - 10}px`;
        gameState.draggedEnd.style.top = `${nearestPoint.y - 10}px`;
        gameState.draggedEnd.dataset.gridX = nearestPoint.x;
        gameState.draggedEnd.dataset.gridY = nearestPoint.y;

        rope.line.setAttribute(
            endType === 'start' ? 'x1' : 'x2',
            nearestPoint.x
        );
        rope.line.setAttribute(
            endType === 'start' ? 'y1' : 'y2',
            nearestPoint.y
        );

        // 检查绳子是否已解开
        checkIfRopeSolved(rope);
    } else {
        // 点不可用，回到原来的位置
        const originalX = gameState.draggedEnd.dataset.gridX;
        const originalY = gameState.draggedEnd.dataset.gridY;

        gameState.draggedEnd.style.left = `${originalX - 10}px`;
        gameState.draggedEnd.style.top = `${originalY - 10}px`;

        if (endType === 'start') {
            rope.start.x = originalX;
            rope.start.y = originalY;
        } else {
            rope.end.x = originalX;
            rope.end.y = originalY;
        }

        rope.line.setAttribute(
            endType === 'start' ? 'x1' : 'x2',
            originalX
        );
        rope.line.setAttribute(
            endType === 'start' ? 'y1' : 'y2',
            originalY
        );

        // 给用户一个视觉反馈，表明移动失败
        gameState.draggedEnd.classList.add('invalid-move');
        setTimeout(() => {
            gameState.draggedEnd.classList.remove('invalid-move');
        }, 500);
    }

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
            endGame(result);
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