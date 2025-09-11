import { minigameLoader } from "../../js/minigameLoader.js";

// 游戏常量
const GAME_WIDTH = 700;
const GAME_HEIGHT = 840;
const PLAYER_SIZE = 20;
const PLAYER_HITBOX_SIZE = 8;
const PLAYER_SPEED_HIGH = 7;
const PLAYER_SPEED_LOW = 3;
const BULLET_SPEED = 8;
const BOSS_HEALTH = 1000;
// 难度配置
const ENEMY_BULLET_SPEED = {
    easy: 3,
    hard: 4
};
const DIFFICULTY_SETTINGS = {
    easy: {
        smallEnemyShootRate: 180, // 简单难度小敌机射击速率
        bossShootRate: 60         // 简单难度Boss射击速率
    },
    hard: {
        smallEnemyShootRate: 60,  // 困难难度小敌机射击速率
        bossShootRate: 30         // 困难难度Boss射击速率
    }
};

// 游戏变量
let canvas, ctx;
let player;
let playerBullets = [];
let enemies = [];
let enemyBullets = [];
let boss = null;
let gameState = 'start';
let score = 0;
let lives = 3;
let bombs = 3;
let keys = {};
let animationId;
let gameTime = 0;
let bossSpawned = false;
let bossIndicator = null;
let bombKeyPressed = false; // 新增：Bomb键按下状态标志
let currentDifficulty = 'easy'; // 默认难度

// 玩家类
class Player {
    constructor() {
        this.resetPosition();
        this.size = PLAYER_SIZE;
        this.hitboxSize = PLAYER_HITBOX_SIZE;
        this.speed = PLAYER_SPEED_HIGH;
        this.shootCooldown = 0;
        this.shootRate = 5;
        this.isHighSpeed = true;
        this.invincible = 0;
        this.respawning = false;
        this.respawnTimer = 0;
    }
    resetPosition() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT * 5 / 6;
    }

    // 新增：重置位置到指定位置
    respawnPosition() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT;
    }

    update() {
        // 如果正在重生，处理重生逻辑
        if (this.respawning) {
            this.respawnTimer--;

            // 重生动画
            this.y = Math.max(GAME_HEIGHT * 5/6, this.y - 2);

            // 重生完成
            if (this.respawning && this.respawnTimer <= 0) {
                this.respawning = false;
                this.invincible = 120;
            }

            return;
        }

        // 移动控制
        let speed = this.isHighSpeed ? PLAYER_SPEED_HIGH : PLAYER_SPEED_LOW;

        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= speed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += speed;
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= speed;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += speed;

        // 边界检查
        this.x = Math.max(this.size/2, Math.min(GAME_WIDTH - this.size/2, this.x));
        this.y = Math.max(this.size/2, Math.min(GAME_HEIGHT - this.size/2, this.y));

        // 射击冷却
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        // 无敌时间
        if (this.invincible > 0) {
            this.invincible--;
        }

        // 射击
        if ((keys['KeyZ'] || keys['Space']) && this.shootCooldown === 0) {
            this.shoot();
            this.shootCooldown = this.shootRate;
        }

        // Bomb - 修改：使用锁机制，按下并抬起之前只能触发一个
        if ((keys['KeyX'] || keys['ShiftRight']) && bombs > 0 && !bombKeyPressed) {
            bombKeyPressed = true;
            this.useBomb();
        }

        // 切换速度
        this.isHighSpeed = !(keys['ShiftLeft'] || keys['ShiftRight']);
    }

    draw() {
        // 重生期间闪烁效果
        if (this.respawning && Math.floor(this.respawnTimer / 5) % 2 === 0) {
            return;
        }

        // 绘制玩家飞机
        ctx.fillStyle = this.invincible % 10 < 5 ? 'rgba(255, 255, 255, 0.5)' : '#00ccff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size/2);
        ctx.lineTo(this.x - this.size/2, this.y + this.size/2);
        ctx.lineTo(this.x + this.size/2, this.y + this.size/2);
        ctx.closePath();
        ctx.fill();

        // 绘制判定点
        if (this.invincible === 0 && !this.respawning) {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(this.x, this.y + 2, this.hitboxSize/2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    shoot() {
        // 发射子弹
        playerBullets.push({
            x: this.x,
            y: this.y - this.size/2,
            width: 4,
            height: 12,
            speed: BULLET_SPEED
        });
    }

    useBomb() {
        bombs--;
        document.getElementById('bombs').textContent = bombs;

        // 添加Bomb特效
        createBombEffect();

        // 清除所有敌方子弹
        enemyBullets = [];

        // 对敌人造成伤害
        enemies.forEach(enemy => {
            if (enemy.type === 'boss') {
                enemy.health -= 50;
                updateBossHealth();

                // 添加Boss受击特效
                createBossHitEffect(enemy.x, enemy.y);
            } else {
                score += 100;
                document.getElementById('score').textContent = score;

                // 添加小敌机爆炸特效
                createExplosionEffect(enemy.x, enemy.y, '#ff6666');
            }
        });

        // 移除普通敌人
        enemies = enemies.filter(enemy => enemy.type === 'boss');
    }

    // 玩家死亡方法
    die() {

        // 新增：每次被击中后重置Bomb数为3
        bombs = 3;
        document.getElementById('bombs').textContent = bombs;

        // 添加玩家死亡特效
        createPlayerDeathEffect(this.x, this.y);

        // 清除所有敌方子弹
        enemyBullets = [];

        // 设置无敌时间
        this.invincible = 0;

        // 如果还有残机，则重生
        if (lives > 0) {
            lives--;
            document.getElementById('lives').textContent = lives;
            this.respawning = true;
            this.respawning = true;
            this.respawnTimer = 120;
            this.respawnPosition(); // 使用重置位置方法
        } else {
            // 游戏结束
            endGame();
        }
    }
}

// 敌人类
class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.entering = true;

        // 根据当前难度设置射击速率
        const difficultySettings = DIFFICULTY_SETTINGS[currentDifficulty];
        if (type === 'small') {
            this.width = 30;
            this.height = 30;
            this.health = 10;
            this.shootRate = difficultySettings.smallEnemyShootRate; // 使用难度设置
            this.speed = 2;
            this.score = 100;
        } else if (type === 'boss') {
            this.width = 100;
            this.height = 100;
            this.health = BOSS_HEALTH;
            this.shootRate = difficultySettings.bossShootRate; // 使用难度设置
            this.speed = 1;
            this.pattern = 0;
            this.patternTimer = 0;
            this.score = 5000;
            this.targetY = 150;
        }

        this.shootCooldown = 60;
    }

    update() {
        // 移动逻辑
        if (this.type === 'small') {
            this.y += this.speed;

            // 射出屏幕后移除
            if (this.y > GAME_HEIGHT + this.height) {
                return false;
            }

            // 小敌机射击逻辑
            if (this.shootCooldown > 0) {
                this.shootCooldown--;
            } else {
                this.shoot();
                this.shootCooldown = this.shootRate;
            }
        } else if (this.type === 'boss') {
            // Boss入场动画
            if (this.entering) {
                this.y += this.speed;

                // 到达目标位置后停止入场动画
                if (this.y >= this.targetY) {
                    this.y = this.targetY;
                    this.entering = false;

                    // 添加Boss完全入场特效
                    createBossEntranceEffect(this.x, this.y);
                }

                // 入场阶段不攻击
                return true;
            }

            // Boss正常移动逻辑
            this.x += Math.sin(gameTime / 50) * 2;

            // 限制Boss移动范围
            this.x = Math.max(this.width/2, Math.min(GAME_WIDTH - this.width/2, this.x));

            // Boss弹幕模式
            this.patternTimer++;
            if (this.patternTimer > 300) {
                this.pattern = (this.pattern + 1) % 3;
                this.patternTimer = 0;

                // 添加模式切换特效
                createPatternChangeEffect(this.x, this.y);
            }

            // Boss射击逻辑
            if (this.shootCooldown > 0) {
                this.shootCooldown--;
            } else {
                this.shoot();
                this.shootCooldown = this.shootRate;
            }
        }

        return true;
    }

    draw() {
        if (this.type === 'small') {
            // 绘制小敌机
            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height/2);
            ctx.lineTo(this.x - this.width/2, this.y + this.height/2);
            ctx.lineTo(this.x + this.width/2, this.y + this.height/2);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'boss') {
            // 绘制Boss
            ctx.fillStyle = '#ff3366';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width/2, 0, Math.PI * 2);
            ctx.fill();

            // Boss装饰
            ctx.fillStyle = '#ff99cc';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width/3, 0, Math.PI * 2);
            ctx.fill();

            // 入场动画期间的发光效果
            if (this.entering) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width/2 + 10 * Math.sin(gameTime/5), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    shoot() {
        const currentBulletSpeed = ENEMY_BULLET_SPEED[currentDifficulty];
        if (this.type === 'small') {
            // 小敌机射击
            enemyBullets.push({
                x: this.x,
                y: this.y + this.height/2,
                width: 6,
                height: 6,
                speed: currentBulletSpeed,
                angle: Math.PI/2
            });
        } else if (this.type === 'boss') {
            // Boss弹幕模式
            switch(this.pattern) {
                case 0:
                    // 圆形弹幕
                    for (let i = 0; i < 12; i++) {
                        let angle = (Math.PI * 2 / 12) * i;
                        enemyBullets.push({
                            x: this.x,
                            y: this.y + this.height/2,
                            width: 8,
                            height: 8,
                            speed: currentBulletSpeed * 0.7,
                            angle: angle
                        });
                    }
                    break;
                case 1:
                    // 瞄准玩家射击
                    let dx = player.x - this.x;
                    let dy = player.y - this.y;
                    let angle = Math.atan2(dy, dx);

                    for (let i = -1; i <= 1; i++) {
                        enemyBullets.push({
                            x: this.x,
                            y: this.y + this.height/2,
                            width: 8,
                            height: 8,
                            speed: currentBulletSpeed,
                            angle: angle + (i * 0.2)
                        });
                    }
                    break;
                case 2:
                    // 螺旋弹幕
                    for (let i = 0; i < 8; i++) {
                        let angle = (Math.PI * 2 / 8) * i + (gameTime / 20);
                        enemyBullets.push({
                            x: this.x,
                            y: this.y + this.height/2,
                            width: 8,
                            height: 8,
                            speed: currentBulletSpeed * 0.8,
                            angle: angle
                        });
                    }
                    break;
            }
        }
    }
}

// 初始化游戏
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // 设置画布尺寸
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    // 初始化玩家
    player = new Player();

    // 重置游戏状态
    playerBullets = [];
    enemies = [];
    enemyBullets = [];
    boss = null;
    gameState = 'playing';
    score = 0;
    lives = 3;
    bombs = 3;
    gameTime = 0;
    bossSpawned = false;
    bossIndicator = null;
    bombKeyPressed = false; // 重置Bomb键状态

    // 清除特效容器
    document.getElementById('effects-container').innerHTML = '';

    // 更新UI
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('bombs').textContent = bombs;
    document.getElementById('stage').textContent = '道中';
    document.getElementById('boss-health-text').textContent = '未出现';
    document.getElementById('boss-health-bar').style.width = '0%';

    document.getElementById('game-start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';

    // 启动游戏循环
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    gameLoop();
}

// 生成敌人
function spawnEnemies() {
    // 生成小敌机
    if (gameTime % 60 === 0 && !bossSpawned) {
        let x = Math.random() * (GAME_WIDTH - 60) + 30;
        enemies.push(new Enemy('small', x, -30));
    }

    // 生成Boss
    if (gameTime > 600 && !bossSpawned) {
        let boss = new Enemy('boss', GAME_WIDTH / 2, -100);
        enemies.push(boss);
        bossSpawned = true;

        // 创建Boss位置指示器
        bossIndicator = {
            x: boss.x,
            width: 40,
            height: 10,
            color: '#ff0000'
        };

        document.getElementById('stage').textContent = '关底';
        document.getElementById('boss-health-text').textContent = 'BOSS登场中...';
    }
}

// 更新Boss血量显示
function updateBossHealth() {
    if (bossSpawned) {
        let boss = enemies.find(e => e.type === 'boss');
        if (boss) {
            let healthPercent = (boss.health / BOSS_HEALTH) * 100;
            document.getElementById('boss-health-bar').style.width = healthPercent + '%';
            document.getElementById('boss-health-bar').style.background = 'linear-gradient(to right, #F44336, #FF5722)';

            if (boss.health <= 0) {
                // Boss被击败
                score += 5000;
                document.getElementById('score').textContent = score;
                document.getElementById('boss-health-text').textContent = '击败！';

                // 添加Boss爆炸特效
                createBossExplosionEffect(boss.x, boss.y);

                // 移除Boss指示器
                bossIndicator = null;

                // 3秒后重新开始道中
                setTimeout(() => {
                    bossSpawned = false;
                    document.getElementById('stage').textContent = '道中';
                    document.getElementById('boss-health-text').textContent = '未出现';
                    document.getElementById('boss-health-bar').style.width = '0%';
                    gameTime = 0;
                }, 3000);
            }
        }
    }
}

// 检测碰撞
function checkCollisions() {
    // 玩家子弹与敌人碰撞
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        let bullet = playerBullets[i];

        for (let j = enemies.length - 1; j >= 0; j--) {
            let enemy = enemies[j];

            // 简单矩形碰撞检测
            if (bullet.x > enemy.x - enemy.width/2 &&
                bullet.x < enemy.x + enemy.width/2 &&
                bullet.y > enemy.y - enemy.height/2 &&
                bullet.y < enemy.y + enemy.height/2) {

                enemy.health -= 5;

                // 添加击中特效
                createHitEffect(bullet.x, bullet.y);

                // 移除子弹
                playerBullets.splice(i, 1);

                // 更新Boss血量显示
                if (enemy.type === 'boss') {
                    updateBossHealth();
                }

                // 检查敌人是否被击败
                if (enemy.health <= 0) {
                    score += enemy.score;
                    document.getElementById('score').textContent = score;

                    // 添加爆炸特效
                    if (enemy.type === 'boss') {
                        createBossExplosionEffect(enemy.x, enemy.y);
                    } else {
                        createExplosionEffect(enemy.x, enemy.y, '#ff6666');
                    }

                    enemies.splice(j, 1);
                }

                break;
            }
        }
    }

    // 敌人子弹与玩家碰撞
    if (player.invincible === 0 && !player.respawning) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let bullet = enemyBullets[i];

            // 计算子弹与玩家的距离
            let dx = bullet.x - player.x;
            let dy = bullet.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.hitboxSize/2 + bullet.width/2) {
                // 玩家被击中
                player.die();

                // 移除子弹
                enemyBullets.splice(i, 1);
                break;
            }
        }
    }
}

// 游戏主循环
function gameLoop() {
    if (gameState !== 'playing') return;

    // 清空画布
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 绘制背景
    drawBackground();

    // 更新游戏时间
    gameTime++;

    // 生成敌人
    spawnEnemies();

    // 更新玩家
    player.update();

    // 更新玩家子弹
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        playerBullets[i].y -= playerBullets[i].speed;

        // 移除超出屏幕的子弹
        if (playerBullets[i].y < -10) {
            playerBullets.splice(i, 1);
        }
    }

    // 更新敌人
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (!enemies[i].update()) {
            enemies.splice(i, 1);
        }
    }

    // 更新敌人子弹
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let bullet = enemyBullets[i];
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;

        // 移除超出屏幕的子弹
        if (bullet.x < -10 || bullet.x > GAME_WIDTH + 10 ||
            bullet.y < -10 || bullet.y > GAME_HEIGHT + 10) {
            enemyBullets.splice(i, 1);
        }
    }

    // 更新Boss指示器
    if (bossIndicator && bossSpawned) {
        let boss = enemies.find(e => e.type === 'boss');
        if (boss) {
            bossIndicator.x = boss.x;
        }
    }

    // 检测碰撞
    checkCollisions();

    // 绘制游戏对象
    drawGameObjects();

    // 绘制Boss指示器 - 修改为在游戏界面底部下方显示
    if (bossIndicator) {
        ctx.fillStyle = bossIndicator.color;
        // 在游戏界面底部下方绘制指示器，高度为10px，宽度为40px
        ctx.fillRect(
            bossIndicator.x - bossIndicator.width/2,
            GAME_HEIGHT + 10, // 在游戏界面底部下方10像素
            bossIndicator.width,
            bossIndicator.height
        );
    }

    // 继续游戏循环
    animationId = requestAnimationFrame(gameLoop);
}

// 绘制背景
function drawBackground() {
    // 绘制星空背景
    ctx.fillStyle = '#000033';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 绘制星星
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 50; i++) {
        let x = (i * 37 + gameTime) % GAME_WIDTH;
        let y = (i * 23 + gameTime * 0.5) % GAME_HEIGHT;
        let size = (i % 3) + 1;
        ctx.fillRect(x, y, size, size);
    }
}

// 绘制游戏对象
function drawGameObjects() {
    // 绘制玩家子弹
    ctx.fillStyle = '#00ff00';
    playerBullets.forEach(bullet => {
        ctx.fillRect(bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height);
    });

    // 绘制敌人子弹
    ctx.fillStyle = '#ff9900';
    enemyBullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.width/2, 0, Math.PI * 2);
        ctx.fill();
    });

    // 绘制敌人
    enemies.forEach(enemy => {
        enemy.draw();
    });

    // 绘制玩家
    player.draw();
}

// 结束游戏
function endGame() {
    gameState = 'gameover';
    cancelAnimationFrame(animationId);

    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').style.display = 'block';
}

// 返回首页
function goToHomePage() {
    const result = { success: false };
    window.parent.postMessage({ type: 'closeMinigame', result: result }, '*');
}

// 选择难度
function selectDifficulty(difficulty) {
    currentDifficulty = difficulty;
    initGame();
}

// CSS特效函数
function createCSSEffect(type, x, y, size = 50) {
    const effectsContainer = document.getElementById('effects-container');
    const effect = document.createElement('div');

    effect.className = `effect ${type}`;
    effect.style.left = `${x - size/2}px`;
    effect.style.top = `${y - size/2}px`;
    effect.style.width = `${size}px`;
    effect.style.height = `${size}px`;

    effectsContainer.appendChild(effect);

    // 动画结束后移除元素
    effect.addEventListener('animationend', () => {
        effectsContainer.removeChild(effect);
    });
}

// 特效函数
function createHitEffect(x, y) {
    createCSSEffect('hit-effect', x, y, 20);
}

function createExplosionEffect(x, y, color) {
    createCSSEffect('explosion', x, y, 50);
}

function createBossHitEffect(x, y) {
    createCSSEffect('explosion', x, y, 60);
}

function createBossExplosionEffect(x, y) {
    createCSSEffect('explosion', x, y, 100);
}

function createPlayerHitEffect(x, y) {
    createCSSEffect('hit-effect', x, y, 30);
}

function createPlayerDeathEffect(x, y) {
    createCSSEffect('player-death', x, y, 60);
}

function createBossEntranceEffect(x, y) {
    createCSSEffect('boss-entrance', x, y, 150);
}

function createPatternChangeEffect(x, y) {
    createCSSEffect('pattern-change', x, y, 100);
}

function createBombEffect() {
    // 添加全屏闪光
    const effectsContainer = document.getElementById('effects-container');
    const flash = document.createElement('div');
    flash.className = 'bomb-effect';
    effectsContainer.appendChild(flash);

    // 动画结束后移除元素
    flash.addEventListener('animationend', () => {
        effectsContainer.removeChild(flash);
    });

    // 添加冲击波效果
    createCSSEffect('shockwave', player.x, player.y, 20);

    // 添加多个冲击波
    setTimeout(() => createCSSEffect('shockwave', player.x, player.y, 40), 100);
    setTimeout(() => createCSSEffect('shockwave', player.x, player.y, 60), 200);
}

// 键盘事件处理
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    // 游戏开始屏幕按Z键开始游戏
    if (gameState === 'start' && (e.code === 'KeyZ' || e.code === 'Space')) {
        initGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;

    // 新增：释放Bomb键时重置状态
    if (e.code === 'KeyX' || e.code === 'ShiftRight') {
        bombKeyPressed = false;
    }
});

// 初始化事件监听器
window.onload = function() {
    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('home-btn').addEventListener('click', goToHomePage);
};
/*
window.onload = function() {
    document.getElementById('easy-mode').addEventListener('click', initGame);
    document.getElementById('hard-mode').addEventListener('click', initGame);
};*/