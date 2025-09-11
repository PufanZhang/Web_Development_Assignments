import { MAP_CONFIG, MAP_DATA, STARS } from './mario_map.js';
import { minigameLoader } from "../../js/game/modules/minigameLoader.js";

// 游戏状态
const GameState = {
    PLAYING: 0,
    PAUSED: 1,
    WIN: 2,
    LOSE: 3
};

class MarioGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameMessage = document.getElementById('game-message');
        this.restartButton = document.getElementById('restart-button');

        this.state = GameState.PLAYING;
        this.camera = { x: 0, y: 0 };
        this.lastCheckpoint = { ...MAP_DATA.startPoint };

        this.setupPlayer();
        this.setupEventListeners();
        this.gameLoop();

        // 通知父页面游戏已加载完成
        window.parent.postMessage({ type: 'minigameLoaded' }, '*');
    }

    setupPlayer() {
        this.player = {
            x: MAP_DATA.startPoint.x,
            y: MAP_DATA.startPoint.y,
            width: MAP_CONFIG.player.width,
            height: MAP_CONFIG.player.height,
            velX: 0,
            velY: 0,
            isJumping: false,
            facing: 'right'
        };
    }

    setupEventListeners() {
        // 键盘控制
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;

            // 重新开始游戏
            if (e.key === 'r' && (this.state === GameState.WIN || this.state === GameState.LOSE)) {
                this.restartGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // 接收来自父页面的消息
        window.addEventListener('message', (e) => {
            if (e.data.type === 'closeMinigame') {
                // 游戏结束，返回主游戏
                window.parent.postMessage({
                    type: 'closeMinigame',
                    result: { success: this.state === GameState.WIN }
                }, '*');
            }
        });
    }

    update() {
        if (this.state !== GameState.PLAYING) return;

        // 处理玩家输入
        this.handleInput();

        // 应用重力
        this.player.velY += MAP_CONFIG.gravity;

        // 更新玩家位置
        this.player.x += this.player.velX;
        this.player.y += this.player.velY;

        // 检查碰撞
        this.checkCollisions();

        // 检查陷阱
        this.checkTraps();

        // 检查存档点
        this.checkCheckpoints();

        // 检查游戏结束条件
        this.checkGameEnd();

        // 更新摄像机位置
        this.updateCamera();
    }

    handleInput() {
        // 左右移动
        if (this.keys['a'] || this.keys['A'] || this.keys['ArrowLeft']) {
            this.player.velX = -MAP_CONFIG.player.speed;
            this.player.facing = 'left';
        } else if (this.keys['d'] || this.keys['D'] || this.keys['ArrowRight']) {
            this.player.velX = MAP_CONFIG.player.speed;
            this.player.facing = 'right';
        } else {
            this.player.velX = 0;
        }

        // 跳跃
        if ((this.keys['w'] || this.keys['W'] || this.keys['ArrowUp'] || this.keys[' ']) && !this.player.isJumping) {
            this.player.velY = -MAP_CONFIG.player.jumpForce;
            this.player.isJumping = true;
        }
    }

    checkCollisions() {
        // 边界检查
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > MAP_CONFIG.width) {
            this.player.x = MAP_CONFIG.width - this.player.width;
        }
        if (this.player.y > MAP_CONFIG.height) {
            this.die();
            return;
        }

        // 平台碰撞检测
        this.player.isJumping = true;

        for (const platform of MAP_DATA.platforms) {
            if (this.isColliding(this.player, platform)) {
                // 从上方碰撞平台
                if (this.player.velY > 0 && this.player.y + this.player.height - this.player.velY <= platform.y) {
                    this.player.y = platform.y - this.player.height;
                    this.player.velY = 0;
                    this.player.isJumping = false;
                }
                // 从下方碰撞平台
                else if (this.player.velY < 0 && this.player.y - this.player.velY >= platform.y + platform.height) {
                    this.player.y = platform.y + platform.height;
                    this.player.velY = 0;
                }
                // 从左侧碰撞平台
                else if (this.player.velX > 0 && this.player.x + this.player.width - this.player.velX <= platform.x) {
                    this.player.x = platform.x - this.player.width;
                }
                // 从右侧碰撞平台
                else if (this.player.velX < 0 && this.player.x - this.player.velX >= platform.x + platform.width) {
                    this.player.x = platform.x + platform.width;
                }
            }
        }
    }

    checkTraps() {
        for (const trap of MAP_DATA.traps) {
            if (this.isColliding(this.player, trap)) {
                switch (trap.type) {
                    case 'fall-trap':
                        // 坠落陷阱 - 立即坠落
                        this.showMessage('坠落陷阱!');
                        this.die();
                        break;
                    case 'spring-trap':
                        // 弹簧陷阱 - 弹向高空
                        this.showMessage('弹簧陷阱!');
                        this.player.velY = -20;
                        setTimeout(() => this.die(), 1000);
                        break;
                    case 'gravity-trap':
                        // 重力陷阱 - 吸入黑洞
                        this.showMessage('重力陷阱!');
                        this.state = GameState.LOSE;
                        setTimeout(() => this.die(), 500);
                        break;
                    case 'laser-trap':
                        // 激光陷阱 - 被激光击中
                        this.showMessage('激光陷阱!');
                        this.die();
                        break;
                }
                return;
            }
        }
    }

    checkCheckpoints() {
        for (const checkpoint of MAP_DATA.checkpoints) {
            // 简单的距离检测
            const dx = this.player.x - checkpoint.x;
            const dy = this.player.y - checkpoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50) {
                this.lastCheckpoint = { ...checkpoint };
            }
        }
    }

    checkGameEnd() {
        // 检查是否到达终点
        if (this.isColliding(this.player, MAP_DATA.endPoint)) {
            this.win();
        }
    }

    updateCamera() {
        // 摄像机跟随玩家
        this.camera.x = this.player.x - this.canvas.width / 2;

        // 限制摄像机不超出地图边界
        this.camera.x = Math.max(0, Math.min(this.camera.x, MAP_CONFIG.width - this.canvas.width));
    }

    isColliding(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
            obj1.x + obj1.width > obj2.x &&
            obj1.y < obj2.y + obj2.height &&
            obj1.y + obj1.height > obj2.y;
    }

    die() {
        this.state = GameState.LOSE;
        this.showMessage('游戏失败!', true);

        // 重置玩家到上一个存档点
        setTimeout(() => {
            this.player.x = this.lastCheckpoint.x;
            this.player.y = this.lastCheckpoint.y;
            this.player.velX = 0;
            this.player.velY = 0;
            this.state = GameState.PLAYING;
            this.hideMessage();
        }, 1500);
    }

    win() {
        this.state = GameState.WIN;
        this.showMessage('任务成功!', true);

        // 通知主游戏获胜
        setTimeout(() => {
            window.parent.postMessage({
                type: 'closeMinigame',
                result: { success: true }
            }, '*');
        }, 2000);
    }

    showMessage(text, showRestart = false) {
        this.gameMessage.textContent = text;
        this.gameMessage.classList.add('visible');

        if (showRestart) {
            this.restartButton.classList.add('visible');
        }
    }

    hideMessage() {
        this.gameMessage.classList.remove('visible');
        this.restartButton.classList.remove('visible');
    }

    restartGame() {
        this.setupPlayer();
        this.lastCheckpoint = { ...MAP_DATA.startPoint };
        this.state = GameState.PLAYING;
        this.hideMessage();
    }

    draw() {
        // 清除画布
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制星空背景
        this.drawStars();

        // 平移画布以实现摄像机效果
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // 绘制平台
        this.drawPlatforms();

        // 绘制陷阱
        this.drawTraps();

        // 绘制终点
        this.drawEndPoint();

        // 绘制玩家
        this.drawPlayer();

        this.ctx.restore();
    }

    drawStars() {
        this.ctx.save();
        this.ctx.translate(-this.camera.x * 0.5, 0); // 星空移动较慢，产生视差效果

        for (const star of STARS) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }

        this.ctx.restore();
    }

    drawPlatforms() {
        for (const platform of MAP_DATA.platforms) {
            if (platform.type === 'ground') {
                // 地面 - 深灰色
                this.ctx.fillStyle = '#333';
            } else {
                // 平台 - 白色
                this.ctx.fillStyle = '#FFF';
            }

            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
    }

    drawTraps() {
        for (const trap of MAP_DATA.traps) {
            switch (trap.type) {
                case 'fall-trap':
                    // 坠落陷阱 - 带有裂缝的灰色平台
                    this.ctx.fillStyle = '#444';
                    this.ctx.fillRect(trap.x, trap.y, trap.width, trap.height);

                    // 绘制裂缝
                    this.ctx.strokeStyle = '#222';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(trap.x + 10, trap.y + 10);
                    this.ctx.lineTo(trap.x + trap.width - 10, trap.y + trap.height - 10);
                    this.ctx.stroke();
                    break;

                case 'spring-trap':
                    // 弹簧陷阱 - 灰色方块带有弹簧图案
                    this.ctx.fillStyle = '#666';
                    this.ctx.fillRect(trap.x, trap.y, trap.width, trap.height);

                    // 绘制弹簧图案
                    this.ctx.strokeStyle = '#333';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    for (let i = 0; i < 4; i++) {
                        const y = trap.y + 5 + i * 5;
                        this.ctx.moveTo(trap.x + 5, y);
                        this.ctx.lineTo(trap.x + trap.width - 5, y);
                    }
                    this.ctx.stroke();
                    break;

                case 'gravity-trap':
                    // 重力陷阱 - 深灰色圆形
                    this.ctx.fillStyle = '#555';
                    this.ctx.beginPath();
                    this.ctx.arc(
                        trap.x + trap.width / 2,
                        trap.y + trap.height / 2,
                        trap.width / 2,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();

                    // 绘制黑洞效果
                    this.ctx.fillStyle = '#000';
                    this.ctx.beginPath();
                    this.ctx.arc(
                        trap.x + trap.width / 2,
                        trap.y + trap.height / 2,
                        trap.width / 4,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                    break;

                case 'laser-trap':
                    // 激光陷阱 - 灰白色方块
                    this.ctx.fillStyle = '#AAA';
                    this.ctx.fillRect(trap.x, trap.y, trap.width, trap.height);

                    // 绘制激光发射器
                    this.ctx.fillStyle = '#F00';
                    if (trap.direction === 'down') {
                        this.ctx.fillRect(trap.x + 10, trap.y + trap.height, 10, 20);
                    }
                    break;
            }
        }
    }

    drawEndPoint() {
        // 绘制终点基地
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(
            MAP_DATA.endPoint.x,
            MAP_DATA.endPoint.y - 50,
            MAP_DATA.endPoint.width,
            MAP_DATA.endPoint.height + 50
        );

        // 绘制基地门
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(
            MAP_DATA.endPoint.x + 20,
            MAP_DATA.endPoint.y - 30,
            60,
            80
        );
    }

    drawPlayer() {
        // 绘制玩家 - 白色矩形
        this.ctx.fillStyle = '#FFF';
        this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);

        // 根据朝向绘制面部
        this.ctx.fillStyle = '#000';
        if (this.player.facing === 'right') {
            this.ctx.fillRect(this.player.x + 15, this.player.y + 5, 3, 3);
        } else {
            this.ctx.fillRect(this.player.x + 2, this.player.y + 5, 3, 3);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 游戏初始化
window.addEventListener('load', () => {
    new MarioGame();
});