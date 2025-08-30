export const fightManager = {
    player: null,
    enemy: null,
    isRunning: false,
    isPlayerBuffActive: false,
    playerBuffTimer: 0,
    playerBuffDuration: 15,
    originalPlayerPosition: { x: 0, y: 0 },

    async start() {
        this.originalPlayerPosition.x = window.player.x;
        this.originalPlayerPosition.y = window.player.y;

        document.getElementById('map-view').style.display = 'none';
        document.getElementById('fight-view').style.display = 'block';

        this.initGame();
        this.isRunning = true;
        this.gameLoop();
    },

    end() {
        this.isRunning = false;
        document.getElementById('fight-view').style.display = 'none';
        document.getElementById('map-view').style.display = 'block';

        window.player.x = 400;
        window.player.y = 300;
        window.player.updateStyle();

        const enemyObject = document.querySelector('[data-fight-enemy]');
        if (enemyObject) {
            enemyObject.classList.add('hidden');
            const enemyData = window.currentMap.interactableObjects.find(
                obj => obj.element === enemyObject
            );
            if (enemyData) {
                enemyData.interacted = true;
            }
        }
    },

    initGame() {
        this.player = {
            element: document.getElementById('player-fighter'),
            x: 200,
            y: 500,
            width: 80,
            height: 120,
            speed: 5,
            jumpForce: 20,
            velocityY: 0,
            isGrounded: false,
            maxHealth: 200,
            health: 200,
            state: 'idle',
            facing: 'right',
            attackCooldown: 0,
            attackRate: 0.5,
            isBlocking: false,
            attackDamage: 12,
            attacklocked: 0,
            attackRange: 100,
            prevState: 'idle' // 新增：记录前一个状态
        };

        this.enemy = {
            element: document.getElementById('enemy-fighter'),
            x: 1000,
            y: 500,
            width: 80,
            height: 120,
            speed: 3,
            maxHealth: 200,
            health: 200,
            state: 'idle',
            facing: 'left',
            aiTimer: 0,
            attackDamage: 12,
            attacklocked: 0,
            attackRange: 100
        };

        this.keysPressed = {};
        this.mouseButtons = {};

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        this.updateHealthBars();
        this.updatePlayerState('idle');
        this.updateEnemyState('idle');
    },

    handleKeyDown(e) {
        if (!this.isRunning) return;

        this.keysPressed[e.key] = true;

        if (e.key === 'a') {
            this.player.facing = 'left';
        } else if (e.key === 'd') {
            this.player.facing = 'right';
        }

        if (e.key === 'q' && !this.isPlayerBuffActive) {
            this.activatePlayerBuff();
        }
    },

    handleKeyUp(e) {
        this.keysPressed[e.key] = false;
    },

    handleMouseDown(e) {
        if (!this.isRunning) return;

        this.mouseButtons[e.button] = true;

        if (e.button === 0 && this.player.attackCooldown <= 0 && this.player.attacklocked === 0) {
            this.playerAttack();
        }

        if (e.button === 2) {
            this.playerBlock(true);
        }
    },

    handleMouseUp(e) {
        this.mouseButtons[e.button] = false;
        if (e.button === 0) {
            this.player.attacklocked = 0;
        }

        if (e.button === 2) {
            this.playerBlock(false);
        }
    },

    playerAttack() {
        // 允许在行走和跳跃状态下攻击
        if (this.player.state === 'hurt') return;

        // 记录攻击前的状态
        this.player.prevState = this.player.state;

        // 根据当前状态决定攻击状态
        let attackState;
        if (this.player.state === 'walk') {
            attackState = 'walk-and-attack';
        } else if (this.player.state === 'jump') {
            attackState = 'jump-and-attack';
        } else {
            attackState = 'attack';
        }
        this.player.attacklocked = 1;

        this.updatePlayerState(attackState);
        this.player.attackCooldown = 1 / (this.isPlayerBuffActive ?
            this.player.attackRate * 2 : this.player.attackRate);

        // 攻击结束后恢复状态
        setTimeout(() => {
            if (this.player.state === attackState) {
                this.updatePlayerState(this.player.prevState);
            }
        }, 400);
    },

    playerBlock(isBlocking) {
        if (this.player.state === 'jump' || this.player.state === 'hurt') return;

        this.player.isBlocking = isBlocking;
        this.updatePlayerState(isBlocking ? 'block' : 'idle');
    },

    activatePlayerBuff() {
        this.isPlayerBuffActive = true;
        this.playerBuffTimer = this.playerBuffDuration;

        const effect = document.createElement('div');
        effect.className = 'skill-effect';
        effect.style.left = `${this.player.x - 60}px`;
        effect.style.top = `${this.player.y - 40}px`;
        document.getElementById('arena').appendChild(effect);

        setTimeout(() => {
            effect.remove();
            this.isPlayerBuffActive = false;
        }, this.playerBuffDuration * 1000);

        this.updatePlayerState('skill');
        setTimeout(() => {
            if (this.player.state === 'skill') {
                this.updatePlayerState('idle');
            }
        }, 500);
    },

    gameLoop() {
        if (!this.isRunning) return;

        this.handleInput();
        this.updatePhysics();
        this.updateTimers();
        this.updateAI();
        this.checkCollisions();
        this.updateRender();

        requestAnimationFrame(() => this.gameLoop());
    },

    handleInput() {
        // 如果在攻击状态，不允许移动
        if (this.player.state.includes('attack')) return;

        if (this.keysPressed['a']) {
            this.player.x -= this.player.speed;
            this.player.facing = 'left';
            this.updatePlayerState('walk');
        } else if (this.keysPressed['d']) {
            this.player.x += this.player.speed;
            this.player.facing = 'right';
            this.updatePlayerState('walk');
        } else if (this.player.state === 'walk' && !this.player.isBlocking) {
            this.updatePlayerState('idle');
        }

        if (this.keysPressed['w'] && this.player.isGrounded) {
            this.player.velocityY = -this.player.jumpForce;
            this.player.isGrounded = false;
            this.updatePlayerState('jump');
        }
    },

    updatePhysics() {
        // 重力 - 对所有非地面状态生效
        if (!this.player.isGrounded) {
            this.player.velocityY += 0.8;
            this.player.y += this.player.velocityY;
        }

        // 地面检测
        if (this.player.y > 500) {
            this.player.y = 500;
            this.player.velocityY = 0;
            this.player.isGrounded = true;

            // 如果是从跳跃状态落地，恢复为之前的状态
            if (this.player.state === 'jump' || this.player.state === 'jump-and-attack') {
                this.updatePlayerState(this.player.prevState || 'idle');
            }
        }

        // 边界检测
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > 1520) this.player.x = 1520;
    },

    updateTimers() {
        if (this.player.attackCooldown > 0) {
            this.player.attackCooldown -= 1/60;
        }

        if (this.isPlayerBuffActive) {
            this.playerBuffTimer -= 1/60;
            const timerElement = document.getElementById('player-buff-timer');
            if (timerElement) {
                timerElement.style.width = `${(this.playerBuffTimer / this.playerBuffDuration) * 100}%`;
            }

            if (this.playerBuffTimer <= 0) {
                this.isPlayerBuffActive = false;
            }
        }
    },

    updateAI() {
        this.enemy.aiTimer++;

        if (this.player.x < this.enemy.x) {
            this.enemy.facing = 'left';
        } else {
            this.enemy.facing = 'right';
        }
        const distance = Math.abs(this.player.x - this.enemy.x);

        if (distance < 600 && distance >= 100) {
            if (this.player.x < this.enemy.x) {
                this.enemy.x -= this.enemy.speed;
            } else {
                this.enemy.x += this.enemy.speed;
            }
            this.updateEnemyState('walk');
        }
        else if (distance >= 600) {
            this.updateEnemyState('idle');
        }
        if (distance < 100 &&this.enemy.aiTimer % 60 === 0 && this.enemy.attacklocked === 0) {
            this.enemyAttack();
        }

        if (this.enemy.x < 0) this.enemy.x = 0;
        if (this.enemy.x > 1520) this.enemy.x = 1520;
    },

    enemyAttack() {
        this.updateEnemyState('attack');

        this.enemy.attacklocked = 1;

        setTimeout(() => {
            if (this.enemy.state === 'attack') {
                this.updateEnemyState('idle');
            }
        }, 400);

    },

    checkCollisions() {
        // 检测玩家攻击碰撞
        if (this.player.state.includes('attack')) {
            const attackX =     this.player.facing === 'right' ?
                this.player.x + this.player.attackRange :
                this.player.x - this.player.attackRange;

            if (this.checkAttackHit(attackX, this.player.attackRange, this.player, this.enemy) && this.player.attacklocked === 1) {
                this.enemy.health -= this.isPlayerBuffActive ?
                    this.player.attackDamage * 2 : this.player.attackDamage;
                this.player.attacklocked = 2;
                this.updateEnemyState('hurt');
                this.updateHealthBars();
                setTimeout(() => {
                    if (this.enemy.state === 'hurt') {
                        this.updateEnemyState('idle');
                    }
                }, 300);
            }
        }

        // 检测敌人攻击
        if (this.enemy.state === 'attack') {
            const attackX = this.enemy.facing === 'right' ?
                this.enemy.x + this.enemy.attackRange :
                this.enemy.x - this.enemy.attackRange;

            if (this.checkAttackHit(attackX, this.enemy.attackRange, this.enemy, this.player) && this.enemy.attacklocked === 1) {
                let damage = this.enemy.attackDamage;

                if (this.player.isBlocking) {
                    const isBlockingCorrectDirection =
                        (this.enemy.facing === 'right' && this.player.facing === 'left') ||
                        (this.enemy.facing === 'left' && this.player.facing === 'right');

                    damage = this.isPlayerBuffActive || isBlockingCorrectDirection ?
                        0 : damage / 2;
                }

                this.player.health -= damage;
                this.enemy.attacklocked = 2;
                setTimeout(() => {
                    if(this.enemy.attacklocked === 2) {
                        this.enemy.attacklocked = 0;
                    }
                }, 400);
                this.updatePlayerState('hurt');
                this.updateHealthBars();
                setTimeout(() => {
                    if (this.player.state === 'hurt') {
                        this.updatePlayerState('idle');
                    }
                }, 300);
            }
        }

        if (this.player.health <= 0) {
            this.showResult(false);
        } else if (this.enemy.health <= 0) {
            this.showResult(true);
        }
    },

    checkAttackHit(attackX, attackRange, attacker, target) {
        const horizontalHit = (
            attackX < target.x + target.width &&
            attackX + attackRange > target.x
        );

        const verticalHit = (
            attacker.y < target.y + target.height * 0.8 &&
            attacker.y + attacker.height * 0.7 > target.y
        );

        return horizontalHit && verticalHit;
    },

    updateRender() {
        this.player.element.style.left = `${this.player.x}px`;
        this.player.element.style.top = `${this.player.y}px`;

        // 根据面向方向设置transform，并保持攻击动画方向正确
        if (this.player.facing === 'left') {
            this.player.element.style.transform = 'scaleX(-1)';
        } else {
            this.player.element.style.transform = 'scaleX(1)';
        }

        this.enemy.element.style.left = `${this.enemy.x}px`;
        this.enemy.element.style.top = `${this.enemy.y}px`;
        this.enemy.element.style.transform = this.enemy.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
    },

    updatePlayerState(state) {
        // 记录前一个状态（除了受伤状态）
        if (state !== 'hurt') {
            this.player.prevState = this.player.state;
        }

        this.player.state = state;
        this.player.element.className = `fighter ${state}`;

        // 保持方向
        if (this.player.facing === 'left') {
            this.player.element.style.transform = 'scaleX(-1)';
        } else {
            this.player.element.style.transform = 'scaleX(1)';
        }
    },

    updateEnemyState(state) {
        this.enemy.state = state;
        this.enemy.element.className = `fighter enemy ${state}`;

        if (this.enemy.facing === 'left') {
            this.enemy.element.style.transform = 'scaleX(-1)';
        } else {
            this.enemy.element.style.transform = 'scaleX(1)';
        }
    },

    updateHealthBars() {
        document.getElementById('player-health').style.width = `${100 * this.player.health / this.player.maxHealth}%`;
        document.getElementById('enemy-health').style.width = `${100 * this.enemy.health / this.enemy.maxHealth}%`;
    },

    showResult(playerWon) {
        this.isRunning = false;

        const resultElement = document.getElementById('fight-result');
        resultElement.textContent = playerWon ? "胜利！" : "失败...";
        resultElement.style.display = 'block';

        setTimeout(() => {
            resultElement.style.display = 'none';
            this.end();
        }, 2000);
    }
};