// 游戏常量
const LANE_WIDTH = 100;
const LANE_COUNT = 3;
const PLAYER_SIZE = 40;
const OBSTACLE_HEIGHT = 50;
const GRAVITY = 0.5;
const JUMP_FORCE = 12;
const GAME_SPEED_INITIAL = 5;
const GAME_SPEED_INCREMENT = 0.0005;

// 游戏变量
let canvas, ctx;
let player;
let obstacles = [];
let gameSpeed = GAME_SPEED_INITIAL;
let score = 0;
let gameOver = false;
let animationId;

// 玩家类
class Player {
    constructor() {
        this.lane = 1; // 中间车道
        this.x = (canvas.width - PLAYER_SIZE) / 2;
        this.y = canvas.height - PLAYER_SIZE - 20;
        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;
        this.velocityY = 0;
        this.isJumping = false;
        this.isRolling = false;
        this.rollTimer = 0;
        this.color = '#FF5722';
    }

    update() {
        // 更新水平位置
        const targetX = canvas.width / 2 - LANE_WIDTH / 2 + this.lane * LANE_WIDTH;
        this.x += (targetX - this.x) * 0.2;

        // 更新垂直位置（跳跃/重力）
        if (this.isJumping) {
            this.velocityY -= GRAVITY;
            this.y -= this.velocityY;

            if (this.y >= canvas.height - this.height - 20) {
                this.y = canvas.height - this.height - 20;
                this.isJumping = false;
                this.velocityY = 0;
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
        ctx.fillStyle = this.color;

        if (this.isRolling) {
            // 绘制翻滚状态的玩家（扁平化）
            ctx.fillRect(this.x, this.y + this.height / 2, this.width, this.height / 2);
            // 绘制细节
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x + 10, this.y + this.height / 2 + 5, 5, 5);
            ctx.fillRect(this.x + this.width - 15, this.y + this.height / 2 + 5, 5, 5);
        } else {
            // 绘制站立/跳跃状态的玩家
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // 绘制面部特征
            ctx.fillStyle = '#333';
            // 眼睛
            ctx.fillRect(this.x + 10, this.y + 15, 5, 5);
            ctx.fillRect(this.x + this.width - 15, this.y + 15, 5, 5);
            // 嘴巴
            if (this.isJumping) {
                ctx.fillRect(this.x + 15, this.y + 30, 10, 3); // 惊讶的嘴
            } else {
                ctx.fillRect(this.x + 15, this.y + 30, 10, 2); // 正常的嘴
            }
        }
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
            this.rollTimer = 30; // 翻滚持续时间
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
        this.type = type; // 0: 地面障碍, 1: 空中障碍, 2: 断桥
        this.lane = lane;
        this.x = canvas.width / 2 - LANE_WIDTH / 2 + lane * LANE_WIDTH;
        this.y = -OBSTACLE_HEIGHT; // 从屏幕顶部上方生成
        this.width = LANE_WIDTH - 10;
        this.height = OBSTACLE_HEIGHT;
        this.passed = false;

        // 根据类型设置颜色和高度
        switch(type) {
            case 0: // 地面障碍
                this.color = '#795548';
                break;
            case 1: // 空中障碍
                this.color = '#FFC107';
                break;
            case 2: // 断桥
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
            score += 10;
            document.getElementById('score').textContent = score;
        }
    }

    draw() {
        ctx.fillStyle = this.color;

        switch(this.type) {
            case 0: // 地面障碍
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 添加纹理
                ctx.fillStyle = '#5D4037';
                for (let i = 0; i < this.width; i += 15) {
                    ctx.fillRect(this.x + i, this.y + 5, 10, 5);
                }
                break;
            case 1: // 空中障碍
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 添加纹理
                ctx.fillStyle = '#FFA000';
                ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, 5);
                ctx.fillRect(this.x + 10, this.y + 25, this.width - 20, 5);
                ctx.fillRect(this.x + 10, this.y + 40, this.width - 20, 5);
                break;
            case 2: // 断桥
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // 添加裂缝效果
                ctx.fillStyle = '#4E342E';
                ctx.fillRect(this.x + this.width/2 - 5, this.y, 10, this.height);
                break;
        }
    }

    checkCollision() {
        if (this.lane !== player.lane) return false;

        const playerBottom = player.y + player.height;
        const obstacleTop = this.y;
        const playerTop = player.y;
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
                case 0: // 地面障碍：跳跃可通过，翻滚不可通过
                    return !player.isJumping;
                case 1: // 空中障碍：翻滚可通过，跳跃不可通过
                    return !player.isRolling;
                case 2: // 断桥：跳跃可通过，翻滚不可通过
                    return !player.isJumping;
            }
        }

        return false;
    }
}

// 初始化游戏
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 设置画布尺寸
    canvas.width = 400;
    canvas.height = 600;

    // 初始化玩家
    player = new Player();

    // 重置游戏状态
    obstacles = [];
    gameSpeed = GAME_SPEED_INITIAL;
    score = 0;
    gameOver = false;

    document.getElementById('score').textContent = score;
    document.getElementById('game-over').style.display = 'none';

    // 启动游戏循环
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();

    // 添加事件监听器
    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('home-btn').addEventListener('click', goToHomePage);
}

// 生成障碍物
function generateObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const type = Math.floor(Math.random() * 3); // 0, 1 或 2

    obstacles.push(new Obstacle(type, lane));
}

// 绘制背景和赛道
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

// 游戏主循环
function gameLoop() {
    if (gameOver) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景和赛道
    drawBackground();

    // 更新和绘制玩家
    player.update();
    player.draw();

    // 生成新障碍物
    if (Math.random() < 0.03) {
        generateObstacle();
    }

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

    // 增加游戏速度
    gameSpeed += GAME_SPEED_INCREMENT;

    // 继续游戏循环
    animationId = requestAnimationFrame(gameLoop);
}

// 结束游戏
function endGame() {
    gameOver = true;
    cancelAnimationFrame(animationId);

    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').style.display = 'block';
}

// 返回首页
function goToHomePage() {
    // 返回主游戏页面
    window.location.href = '../../game.html';
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    if (gameOver) return;

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