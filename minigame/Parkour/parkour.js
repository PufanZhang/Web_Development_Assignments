import { minigameLoader } from "../../js/minigameLoader.js";

// 游戏常量
const LANE_WIDTH = 100;
const LANE_COUNT = 3;
const PLAYER_SIZE = 40;
const OBSTACLE_HEIGHT = 50;
const COIN_SIZE = 20;
const FINISH_LINE_HEIGHT = 20;
const GRAVITY = 0.5;
const JUMP_FORCE = 12;
const GAME_SPEED_INITIAL = 5;
const GAME_SPEED_INCREMENT = 1; // 每30秒增加的速度
const STUCK_THRESHOLD = 5; // 困死检测阈值（连续障碍数量）

// 游戏变量
let canvas, ctx;
let player;
let obstacles = [];
let coins = [];
let finishLine = null;
let gameSpeed = GAME_SPEED_INITIAL;
let baseGameSpeed = GAME_SPEED_INITIAL;
let score = 0;
let coinsCollected = 0;
let gameOver = false;
let gameWon = false;
let animationId;
let gameTime = 0;
let lastSpeedIncreaseTime = 0;
let consecutiveObstacles = 0;
let stuckWarningTimer = 0;
let inTutorial = false;
let tutorialStep = 0;
let tutorialCompleted = false;
let obstacleSpawnPaused = false;

// 玩家类
class Player {
    constructor() {
        this.lane = 1; // 中间车道
        // 修改x坐标计算，使玩家在赛道中间
        this.x = (canvas.width / 2 - LANE_WIDTH / 2) + (this.lane * LANE_WIDTH) + (LANE_WIDTH - PLAYER_SIZE) / 2;
        this.y = canvas.height - PLAYER_SIZE - 20;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.velocityY = 0;
        this.isJumping = false;
        this.isRolling = false;
        this.rollTimer = 0;
        this.color = '#FF5722';
        this.scale = 1;
        this.baseY = canvas.height - PLAYER_SIZE - 20;
    }

    update() {
        // 更新水平位置，使玩家保持在赛道中间
        const targetX = (canvas.width / 2 - LANE_WIDTH / 2) + (this.lane * LANE_WIDTH) + (LANE_WIDTH - this.width) / 2;
        this.x += (targetX - this.x) * 0.2;

        // 更新跳跃状态（使用缩放代替垂直位移）
        if (this.isJumping) {
            this.velocityY -= GRAVITY;

            // 使用缩放模拟跳跃高度
            const jumpProgress = 1 - (this.velocityY / JUMP_FORCE);
            this.scale = 1 + jumpProgress * 0.5;

            if (this.velocityY <= 0) {
                this.isJumping = false;
                this.velocityY = 0;
                this.scale = 1;
            }
        }

        // 更新翻滚状态
        if (this.isRolling) {
            this.rollTimer--;
            if (this.rollTimer <= 0) {
                this.isRolling = false;
                this.height = PLAYER_SIZE;
                this.y = canvas.height - this.height - 20;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.baseY + this.height/2);
        ctx.scale(this.scale, this.scale);

        ctx.fillStyle = this.color;

        if (this.isRolling) {
            // 绘制翻滚状态的玩家（扁平化）
            ctx.fillRect(-this.width/2, -this.height/4, this.width, this.height/2);
            // 绘制细节
            ctx.fillStyle = '#333';
            ctx.fillRect(-this.width/2 + 10, -this.height/4 + 5, 5, 5);
            ctx.fillRect(this.width/2 - 15, -this.height/4 + 5, 5, 5);
        } else {
            // 绘制站立/跳跃状态的玩家
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

            // 绘制面部特征
            ctx.fillStyle = '#333';
            // 眼睛
            ctx.fillRect(-this.width/2 + 10, -this.height/2 + 15, 5, 5);
            ctx.fillRect(this.width/2 - 15, -this.height/2 + 15, 5, 5);
            // 嘴巴
            if (this.isJumping) {
                ctx.fillRect(-this.width/2 + 15, -this.height/2 + 30, 10, 3);
            } else {
                ctx.fillRect(-this.width/2 + 15, -this.height/2 + 30, 10, 2);
            }
        }

        ctx.restore();
    }

    jump() {
        if (!this.isJumping && !this.isRolling) {
            this.isJumping = true;
            this.velocityY = JUMP_FORCE;
        }
    }

    roll() {
        if (!this.isRolling && !this.isJumping) {
            this.isRolling = true;
            this.rollTimer = 30;
            this.height = PLAYER_SIZE / 2;
            this.y = canvas.height - this.height - 20;
        }
    }

    moveLeft() {
        if (this.lane > 0) {
            this.lane--;
        }
    }

    moveRight() {
        if (this.lane < LANE_COUNT - 1) {
            this.lane++;
        }
    }
}

// 障碍物类
class Obstacle {
    constructor(type, lane) {
        this.type = type;
        this.lane = lane;
        // 修改x坐标计算，使障碍物在赛道中间
        this.x = (canvas.width / 2 - LANE_WIDTH / 2) + (lane * LANE_WIDTH) + (LANE_WIDTH - (LANE_WIDTH - 10)) / 2;
        this.y = -OBSTACLE_HEIGHT;
        this.width = LANE_WIDTH - 10;
        this.height = OBSTACLE_HEIGHT;
        this.passed = false;

        // 根据类型设置颜色和高度
        switch(type) {
            case 0:
                this.color = '#795548';
                break;
            case 1:
                this.color = '#FFC107';
                break;
            case 2:
                this.color = '#8D6E63';
                break;
        }
    }

    update() {
        // 向下移动
        this.y += gameSpeed;

        // 检查是否通过玩家
        if (!this.passed && this.y > player.y + player.height) {
            this.passed = true;
        }
    }

    draw() {
        ctx.fillStyle = this.color;

        switch(this.type) {
            case 0:
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 添加纹理
                ctx.fillStyle = '#5D4037';
                for (let i = 0; i < this.width; i += 15) {
                    ctx.fillRect(this.x + i, this.y + 5, 10, 5);
                }
                break;
            case 1:
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 添加纹理
                ctx.fillStyle = '#FFA000';
                ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, 5);
                ctx.fillRect(this.x + 10, this.y + 25, this.width - 20, 5);
                ctx.fillRect(this.x + 10, this.y + 40, this.width - 20, 5);
                break;
            case 2:
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 添加裂缝效果
                ctx.fillStyle = '#4E342E';
                ctx.fillRect(this.x + this.width/2 - 5, this.y, 10, this.height);
                break;
        }
    }

    checkCollision() {
        if (this.lane !== player.lane) return false;

        // 调整碰撞检测以考虑玩家的缩放
        const playerBottom = player.baseY + player.height * player.scale;
        const playerTop = player.baseY - (player.height * (player.scale - 1)) / 2;
        const obstacleTop = this.y;
        const obstacleBottom = this.y + this.height;

        // 水平碰撞检测
        const horizontalCollision =
            player.x < this.x + this.width &&
            player.x + player.width > this.x;

        // 垂直碰撞检测
        const verticalCollision =
            playerBottom > obstacleTop &&
            playerTop < obstacleBottom;

        if (horizontalCollision && verticalCollision) {
            // 根据障碍物类型和玩家状态判断是否碰撞
            switch(this.type) {
                case 0:
                    return !player.isJumping;
                case 1:
                    return !player.isRolling;
                case 2:
                    return !player.isJumping;
            }
        }

        return false;
    }
}

// 金币类
class Coin {
    constructor(lane) {
        this.lane = lane;
        this.x = (canvas.width / 2 - LANE_WIDTH / 2) + (lane * LANE_WIDTH) + (LANE_WIDTH - COIN_SIZE) / 2;
        this.y = -COIN_SIZE;
        this.width = COIN_SIZE;
        this.height = COIN_SIZE;
        this.collected = false;
        this.rotation = 0;
    }

    update() {
        // 向下移动
        this.y += gameSpeed;

        // 旋转动画
        this.rotation += 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);

        // 绘制金币
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制金币中心
        ctx.fillStyle = '#D4AF37';
        ctx.beginPath();
        ctx.arc(0, 0, this.width/4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    checkCollection() {
        if (this.collected) return false;

        // 计算玩家与金币的距离
        const playerCenterX = player.x + player.width/2;
        const playerCenterY = player.baseY + player.height/2;
        const coinCenterX = this.x + this.width/2;
        const coinCenterY = this.y + this.height/2;

        const distance = Math.sqrt(
            Math.pow(playerCenterX - coinCenterX, 2) +
            Math.pow(playerCenterY - coinCenterY, 2)
        );

        // 如果距离小于两者半径之和，则收集金币
        return distance < (player.width/2 * player.scale + this.width/2);
    }
}

// 终点线类
class FinishLine {
    constructor() {
        this.width = LANE_WIDTH * LANE_COUNT;
        this.height = FINISH_LINE_HEIGHT;
        this.x = canvas.width - this.width;
        this.y = -this.height;
        this.passed = false;
    }

    update() {
        this.y += gameSpeed;
    }

    draw() {
        // 创建黑白相间的终点线
        const stripeWidth = 20;
        for (let i = 0; i < this.width; i += stripeWidth * 2) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x + i, this.y, stripeWidth, this.height);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(this.x + i + stripeWidth, this.y, stripeWidth, this.height);
        }
    }

    checkCollision() {
        const playerBottom = player.baseY + player.height * player.scale;
        const playerTop = player.baseY - (player.height * (player.scale - 1)) / 2;
        const finishTop = this.y;
        const finishBottom = this.y + this.height;

        const horizontalCollision =
            player.x + player.width > this.x &&
            player.x < this.x + this.width;

        const verticalCollision =
            playerBottom > finishTop &&
            playerTop < finishBottom;

        return horizontalCollision && verticalCollision;
    }
}

// 初始化游戏
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    canvas.width = 500;
    canvas.height = 600;

    // 初始化玩家
    player = new Player();

    // 重置游戏状态
    obstacles = [];
    coins = [];
    finishLine = null;
    gameSpeed = GAME_SPEED_INITIAL;
    baseGameSpeed = GAME_SPEED_INITIAL;
    score = 0;
    coinsCollected = 0;
    gameOver = false;
    gameWon = false;
    gameTime = 0;
    lastSpeedIncreaseTime = 0;
    consecutiveObstacles = 0;
    stuckWarningTimer = 0;
    inTutorial = false;
    tutorialStep = 0;
    tutorialCompleted = false;

    document.getElementById('score').textContent = score;
    document.getElementById('coins').textContent = coinsCollected;
    document.getElementById('speed').textContent = '1.0x';
    document.getElementById('time').textContent = '0';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('victory-screen').style.display = 'none';
    document.getElementById('stuck-warning').style.display = 'none';

    if (!tutorialCompleted) {
        startTutorial();
    } else {
        requestAnimationFrame(gameLoop);
    }

    // 启动游戏循环
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();

    // 添加事件监听器
    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('home-btn').addEventListener('click', goToHomePage);
    document.getElementById('victory-restart-btn').addEventListener('click', initGame);
    document.getElementById('victory-home-btn').addEventListener('click', goToHomePage);
}

// 生成障碍物
function generateObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const type = Math.floor(Math.random() * 3);

    obstacles.push(new Obstacle(type, lane));
}

// 生成金币
function generateCoin() {
    const lane = Math.floor(Math.random() * LANE_COUNT);

    coins.push(new Coin(lane));
}

// 生成终点线
function generateFinishLine() {
    finishLine = new FinishLine();
}

// 困死检测
function checkIfStuck() {
    // 检测玩家前方150px高度内每条车道的障碍物数量
    const checkHeight = 150;
    const laneObstacleCount = [0, 0, 0]; // 三条车道的障碍物计数

    obstacles.forEach(obs => {
        // 检查障碍物是否在玩家前方指定高度范围内
        if (obs.y > 0 && obs.y < checkHeight) {
            laneObstacleCount[obs.lane]++;
        }
    });

    // 检查是否所有车道都有至少一个障碍物
    const allLanesBlocked = laneObstacleCount.every(count => count > 0);

    if (allLanesBlocked && !obstacleSpawnPaused) {
        // 暂停生成障碍物
        obstacleSpawnPaused = true;
    }
    else
        obstacleSpawnPaused = false;
}

// 绘制背景
function drawBackground() {
    // 绘制天空
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#64B5F6');
    gradient.addColorStop(1, '#BBDEFB');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制赛道
    for (let i = 0; i < LANE_COUNT; i++) {
        const laneX = canvas.width / 2 - LANE_WIDTH / 2 + i * LANE_WIDTH;

        // 赛道背景
        ctx.fillStyle = '#78909C';
        ctx.fillRect(laneX, 0, LANE_WIDTH, canvas.height);

        // 赛道标记
        ctx.fillStyle = '#FFFFFF';
        for (let y = 0; y < canvas.height; y += 30) {
            ctx.fillRect(laneX + LANE_WIDTH / 2 - 2, y, 4, 15);
        }

        // 赛道边界
        ctx.strokeStyle = '#37474F';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(laneX, 0);
        ctx.lineTo(laneX, canvas.height);
        ctx.moveTo(laneX + LANE_WIDTH, 0);
        ctx.lineTo(laneX + LANE_WIDTH, canvas.height);
        ctx.stroke();
    }
}
//游戏教程
function startTutorial() {
    inTutorial = true;
    tutorialStep = 1;

    // 创建教程UI元素
    const tutorialUI = document.createElement('div');
    tutorialUI.id = 'tutorial-ui';
    tutorialUI.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 100;
        max-width: 400px;
    `;
    document.getElementById('game-container').appendChild(tutorialUI);

    // 显示第一步教程
    showTutorialStep();
}

function showTutorialStep() {
    const tutorialUI = document.getElementById('tutorial-ui');

    switch(tutorialStep) {
        case 1:
            tutorialUI.innerHTML = `
                <h3>欢迎来到跑酷游戏！</h3>
                <p>使用 A 和 D 键左右移动角色</p>
                <button id="tutorial-next">下一步</button>
            `;
            break;
        case 2:
            tutorialUI.innerHTML = `
                <h3>跳跃</h3>
                <p>按 W 键跳跃来避开地面障碍物</p>
                <button id="tutorial-next">下一步</button>
            `;
            break;
        case 3:
            tutorialUI.innerHTML = `
                <h3>翻滚</h3>
                <p>按 S 键翻滚来避开空中障碍物</p>
                <button id="tutorial-next">下一步</button>
            `;
            break;
        case 4:
            tutorialUI.innerHTML = `
                <h3>收集金币</h3>
                <p>触碰金色圆圈可以收集金币</p>
                <p>每个金币+50分</p>
                <button id="tutorial-next">开始游戏</button>
            `;
            break;
    }

    document.getElementById('tutorial-next').addEventListener('click', nextTutorialStep);
}

function nextTutorialStep() {
    tutorialStep++;

    if (tutorialStep > 4) {
        // 教程结束
        completeTutorial();
        return;
    }

    showTutorialStep();
}

function completeTutorial() {
    inTutorial = false;
    tutorialCompleted = true;

    // 移除教程UI
    const tutorialUI = document.getElementById('tutorial-ui');
    if (tutorialUI) {
        tutorialUI.remove();
    }

    // 开始游戏循环
    requestAnimationFrame(gameLoop);
}

// 游戏主循环
function gameLoop() {
    if (gameOver || gameWon) return;

    if (inTutorial) return; // 教程期间不执行游戏循环

    // 增加游戏时间
    gameTime++;
    document.getElementById('score').textContent = score;
    // 基于存活时间增加分数
    if(gameTime % (5 - Math.floor(gameTime / 1800)) === 0){
        score += 1;
    }

    // 每30秒增加一次游戏速度
    const currentTimeInSeconds = Math.floor(gameTime / 60);
    if (currentTimeInSeconds > 0 && currentTimeInSeconds % 30 === 0 && currentTimeInSeconds !== lastSpeedIncreaseTime) {
        baseGameSpeed += GAME_SPEED_INCREMENT;
        lastSpeedIncreaseTime = currentTimeInSeconds;
        gameSpeed = baseGameSpeed;
        document.getElementById('speed').textContent = (baseGameSpeed / GAME_SPEED_INITIAL).toFixed(1) + 'x';
    }
    // 2分钟时生成终点线
    if (currentTimeInSeconds >= 120 && !finishLine) {
        generateFinishLine();
    }

    // 更新时间和显示
    document.getElementById('time').textContent = currentTimeInSeconds;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景和赛道
    drawBackground();

    // 更新和绘制玩家
    player.update();
    player.draw();

    // 生成新障碍物
    if (!inTutorial && !obstacleSpawnPaused && Math.random() < 0.03) {
        generateObstacle();
    }

    // 生成新金币
    if (!inTutorial && Math.random() < 0.02) {
        generateCoin();
    }

    // 困死检测
    checkIfStuck();

    // 更新和绘制障碍物
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();

        // 移除屏幕外的障碍物（超出底部）
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            continue;
        }

        // 检查碰撞
        if (obstacles[i].checkCollision()) {
            endGame();
            return;
        }
    }

    // 更新和绘制金币
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();

        // 检查金币收集
        if (coins[i].checkCollection()) {
            coins[i].collected = true;
            coinsCollected++;
            score += 50; // 收集金币额外加分
            document.getElementById('coins').textContent = coinsCollected;
            document.getElementById('score').textContent = score;
            coins.splice(i, 1);
            continue;
        }

        coins[i].draw();

        // 移除屏幕外的金币（超出底部）
        if (coins[i].y > canvas.height) {
            coins.splice(i, 1);
        }
    }

    // 更新和绘制终点线
    if (finishLine) {
        finishLine.update();
        finishLine.draw();

        // 检查是否到达终点
        if (finishLine.checkCollision()) {
            victory();
            return;
        }

        // 如果终点线超出屏幕且未被触碰，游戏继续
        if (finishLine.y > canvas.height) {
            finishLine = null;
        }
    }

    // 增加游戏速度（平滑加速）
    gameSpeed += 0.0005;

    animationId = requestAnimationFrame(gameLoop);
}

// 结束游戏
function endGame() {
    gameOver = true;
    cancelAnimationFrame(animationId);

    document.getElementById('final-score').textContent = score;
    document.getElementById('final-coins').textContent = coinsCollected;
    document.getElementById('game-over').style.display = 'block';
}

// 胜利
function victory() {
    gameWon = true;
    cancelAnimationFrame(animationId);

    document.getElementById('finish-time').textContent = Math.floor(gameTime / 60);
    document.getElementById('victory-score').textContent = score;
    document.getElementById('victory-coins').textContent = coinsCollected;
    document.getElementById('victory-screen').style.display = 'block';
}

// 返回首页
function goToHomePage() {
    // 返回主游戏页面
    const result = { success: false };
    window.parent.postMessage({ type: 'closeMinigame', result: result }, '*');
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (gameOver || gameWon) return;

    switch(e.key) {
        case 'a':
        case 'A':
        case 'ArrowLeft':
            player.moveLeft();
            break;
        case 'd':
        case 'D':
        case 'ArrowRight':
            player.moveRight();
            break;
        case 'w':
        case 'W':
        case 'ArrowUp':
            player.jump();
            break;
        case 's':
        case 'S':
        case 'ArrowDown':
            player.roll();
            break;
    }
});

// 启动游戏
window.onload = initGame;