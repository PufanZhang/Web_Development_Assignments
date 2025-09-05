// 游戏常量
const GAME_WIDTH = 700;
const GAME_HEIGHT = 840;
const PLAYER_SIZE = 20;
const PLAYER_HITBOX_SIZE = 8;
const PLAYER_SPEED_HIGH = 5;
const PLAYER_SPEED_LOW = 2;
const BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 4;
const BOSS_HEALTH = 1000;

// 游戏变量
let canvas, ctx;
let player;
let playerBullets = [];
let enemies = [];
let enemyBullets = [];
let boss = null;
let gameState = 'start'; // start, playing, gameover
let score = 0;
let lives = 3;
let bombs = 3;
let isHighSpeed = true;
let keys = {};
let animationId;
let gameTime = 0;
let bossSpawned = false;

// 玩家类
class Player {
    constructor() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT - 100;
        this.size = PLAYER_SIZE;
        this.hitboxSize = PLAYER_HITBOX_SIZE;
        this.speed = PLAYER_SPEED_HIGH;
        this.shootCooldown = 0;
        this.shootRate = 5;
        this.isHighSpeed = true;
        this.invincible = 0;
    }

    update() {
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

        // Bomb
        if ((keys['KeyX'] || keys['ShiftRight']) && bombs > 0) {
            this.useBomb();
        }

        // 切换速度
        this.isHighSpeed = !(keys['ShiftLeft'] || keys['ShiftRight']);
    }

    draw() {
        // 绘制玩家飞机
        ctx.fillStyle = this.invincible % 10 < 5 ? 'rgba(255, 255, 255, 0.5)' : '#00ccff';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size/2);
        ctx.lineTo(this.x - this.size/2, this.y + this.size/2);
        ctx.lineTo(this.x + this.size/2, this.y + this.size/2);
        ctx.closePath();
        ctx.fill();

        // 绘制判定点
        if (this.invincible === 0) {
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

        // 清除所有敌方子弹
        enemyBullets = [];

        // 对敌人造成伤害
        enemies.forEach(enemy => {
            if (enemy.type === 'boss') {
                enemy.health -= 50;
                updateBossHealth();
            } else {
                score += 100;
                document.getElementById('score').textContent = score;
            }
        });

        // 移除普通敌人
        enemies = enemies.filter(enemy => enemy.type === 'boss');
    }
}

// 敌人类
class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;

        if (type === 'small') {
            this.width = 30;
            this.height = 30;
            this.health = 10;
            this.shootRate = 60;
            this.speed = 2;
            this.score = 100;
        } else if (type === 'boss') {
            this.width = 100;
            this.height = 100;
            this.health = BOSS_HEALTH;
            this.shootRate = 30;
            this.speed = 1;
            this.pattern = 0;
            this.patternTimer = 0;
            this.score = 5000;
        }

        this.shootCooldown = this.shootRate;
    }

    update() {
        // 移动逻辑
        if (this.type === 'small') {
            this.y += this.speed;

            // 射出屏幕后移除
            if (this.y > GAME_HEIGHT + this.height) {
                return false;
            }
        } else if (this.type === 'boss') {
            // Boss移动逻辑
            if (this.y > 150) {
                this.y = 150;
                this.x += Math.sin(gameTime / 50) * 2;

                // 限制Boss移动范围
                this.x = Math.max(this.width/2, Math.min(GAME_WIDTH - this.width/2, this.x));
            } else {
                this.y += this.speed;
            }

            // Boss弹幕模式
            this.patternTimer++;
            if (this.patternTimer > 300) {
                this.pattern = (this.pattern + 1) % 3;
                this.patternTimer = 0;
            }
        }

        // 射击逻辑
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        } else {
            this.shoot();
            this.shootCooldown = this.shootRate;
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
        }
    }

    shoot() {
        if (this.type === 'small') {
            // 小敌机射击
            enemyBullets.push({
                x: this.x,
                y: this.y + this.height/2,
                width: 6,
                height: 6,
                speed: ENEMY_BULLET_SPEED,
                angle: Math.PI/2 // 向下射击
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
                            speed: ENEMY_BULLET_SPEED * 0.7,
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
                            speed: ENEMY_BULLET_SPEED,
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
                            speed: ENEMY_BULLET_SPEED * 0.8,
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
        document.getElementById('stage').textContent = '关底';
        document.getElementById('boss-health-text').textContent = 'BOSS';
    }
}

// 更新Boss血量显示
function updateBossHealth() {
    if (bossSpawned) {
        let boss = enemies.find(e => e.type === 'boss');
        if (boss) {
            let healthPercent = (boss.health / BOSS_HEALTH) * 100;
            document.getElementById('boss-health-bar').style.width = healthPercent + '%';

            if (boss.health <= 0) {
                // Boss被击败
                score += 5000;
                document.getElementById('score').textContent = score;
                document.getElementById('boss-health-text').textContent = '击败！';

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
                    enemies.splice(j, 1);
                }

                break;
            }
        }
    }

    // 敌人子弹与玩家碰撞
    if (player.invincible === 0) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            let bullet = enemyBullets[i];

            // 计算子弹与玩家的距离
            let dx = bullet.x - player.x;
            let dy = bullet.y - player.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.hitboxSize/2 + bullet.width/2) {
                // 玩家被击中
                lives--;
                document.getElementById('lives').textContent = lives;

                // 移除子弹
                enemyBullets.splice(i, 1);

                // 设置无敌时间
                player.invincible = 120;

                // 检查游戏是否结束
                if (lives <= 0) {
                    endGame();
                    return;
                }

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

    // 检测碰撞
    checkCollisions();

    // 绘制游戏对象
    drawGameObjects();

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
    window.location.href = '../../game.html';
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
});

// 初始化事件监听器
window.onload = function() {
    document.getElementById('restart-btn').addEventListener('click', initGame);
    document.getElementById('home-btn').addEventListener('click', goToHomePage);
};