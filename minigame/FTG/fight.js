import { gameState } from "../../js/game/modules/dataManager.js"

export const fightManager = {
    player: null,
    enemy: null,
    isRunning: false,
    isPlayerBuffActive: false,
    playerBuffTimer: 0,
    playerBuffDuration: 15,
    isBuffActivable: false,
    // 大招CD相关属性
    ultCooldown: 0,
    ultCooldownDuration: 1800, // 30秒 * 60帧/秒
    ultCooldownRecoveryRate: 1, // 每秒恢复的CD量
    isUltCooldown: false, // 标记是否处于CD状态
    originalPlayerPosition: { x: 0, y: 0 },
    animationFrameID: null,

    // 新增：敌人AI相关属性
    enemyBlockTimer: 0,
    enemyConsecutiveBlocks: 0,
    enemyMaxConsecutiveBlocks: 3,

    stopGameLoop() {
        if(this.animationFrameID) {
            cancelAnimationFrame(this.animationFrameID);
            this.animationFrameID = null;
        }
    },

    async start() {
        // this.originalPlayerPosition.x = window.player.x
        // this.originalPlayerPosition.y = window.player.y

        this.stopGameLoop();
        document.getElementsByClassName("btn-controls")[0].style.display = 'none';
        this.isRunning = false;
        // document.getElementById("map-view").style.display = "none"
        document.getElementById("fight-view").style.display = "block"

        await this.initGame()
        this.isRunning = true
        this.gameLoop()
    },

    end() {
        this.isRunning = false
        this.stopGameLoop()
        document.getElementsByClassName("btn-controls")[0].style.display = "block"
        // document.getElementById("fight-view").style.display = "none"
        // document.getElementById("map-view").style.display = "block"

        // window.player.x = 400
        // window.player.y = 300
        // window.player.updateStyle()

        // const enemyObject = document.querySelector("[data-fight-enemy]")
        // if (enemyObject) {
        //   enemyObject.classList.add("hidden")
        //   const enemyData = window.currentMap.interactableObjects.find(
        //     (obj) => obj.element === enemyObject
        //   )
        //   if (enemyData) {
        //     enemyData.interacted = true
        //   }
        // }
    },

    async dealBuff(){
        if(!playerDataCache){
            await gameState.loadPlayerData();
        }
        let oldOption = gameState.getValue('backpack');
        this.isBuffActivable = (oldOption === 4);
    },

    async initGame() {
        await this.backGroundDecision();
        this.player = {
            element: document.getElementById("player-fighter"),
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
            state: "idle",
            facing: "right",
            attackCooldown: 0,
            attackRate: 0.5,
            isBlocking: false,
            attackDamage: 12,
            attacklocked: 0,
            attackRange: 100,
            prevState: "idle",
        }

        this.enemy = {
            element: document.getElementById("enemy-fighter"),
            x: 1000,
            y: 500,
            width: 80,
            height: 120,
            speed: 3,
            maxHealth: 200,
            health: 200,
            state: "idle",
            facing: "left",
            aiTimer: 0,
            attackDamage: 12,
            attacklocked: 0,
            attackRange: 100,
            isBlocking: false, // 新增：敌人格挡状态
            blockTimer: 0,     // 新增：敌人格挡计时器
        }

        // 初始化大招状态
        this.isPlayerBuffActive = false;
        this.playerBuffTimer = 0;
        this.ultCooldown = 0;
        this.isUltCooldown = false;
        this.updateBuffTimerDisplay();

        this.dealBuff();
        // 初始化敌人AI状态
        this.enemyBlockTimer = 0;
        this.enemyConsecutiveBlocks = 0;
        this.enemyMaxConsecutiveBlocks = 3;

        this.keysPressed = {}
        //    this.mouseButtons = {};

        window.addEventListener("keydown", (e) => this.handleKeyDown(e))
        window.addEventListener("keyup", (e) => this.handleKeyUp(e))
        //        window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        //        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        this.updateHealthBars()
        this.updatePlayerState("idle")
        this.updateEnemyState("idle")
    },

    handleKeyDown(e) {
        if (!this.isRunning) return

        this.keysPressed[e.key] = true

        if (e.key === "a") {
            this.player.facing = "left"
        } else if (e.key === "d") {
            this.player.facing = "right"
        }

        // 修改大招触发条件，加入CD检查
        if (e.key === "q" && !this.isPlayerBuffActive && !this.isUltCooldown && this.isBuffActivable) {
            this.activatePlayerBuff()
        }

        if (
            e.key === "j" &&
            this.player.attackCooldown <= 0 &&
            this.player.attacklocked === 0
        ) {
            this.playerAttack()
        }
        if (e.key === "k") {
            this.playerBlock(true)
        }
    },

    handleKeyUp(e) {
        this.keysPressed[e.key] = false

        if (e.key === "j") {
            this.player.attacklocked = 0
        }
        if (e.key === "k") {
            this.playerBlock(false)
        }
    },

    /*    handleMouseDown(e) {
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
  */
    async backGroundDecision() {
        try {
            // 确保玩家数据已加载
            if(!window.playerDataCache){
                await gameState.loadPlayerData();
            }

            // 获取old数值
            let oldValue = gameState.getValue('old');

            // 获取背景元素
            let fightView = document.getElementById('fight-view');

            // 根据old值设置背景
            if (oldValue === 1) {
                fightView.style.backgroundImage = "url('/minigame/FTG/images/bg2.png')";
            } else {
                fightView.style.backgroundImage = "url('/minigame/FTG/images/bg1.png')";
            }
        } catch (error) {
            console.error("设置背景时出错:", error);
            // 出错时使用默认背景
            document.getElementById('fight-view').style.backgroundImage = "url('/minigame/FTG/images/bg1.png')";
        }
    },

    playerAttack() {
        // 允许在行走和跳跃状态下攻击
        if (this.player.state === "hurt") return

        // 记录攻击前的状态
        this.player.prevState = this.player.state

        // 根据当前状态决定攻击状态
        let attackState
        if (this.player.state === "walk") {
            attackState = "walk-and-attack"
        } else if (this.player.state === "jump") {
            attackState = "jump-and-attack"
        } else {
            attackState = "attack"
        }
        this.player.attacklocked = 1

        this.updatePlayerState(attackState)
        this.player.attackCooldown =
            1 /
            (this.isPlayerBuffActive
                ? this.player.attackRate * 2
                : this.player.attackRate)

        // 攻击结束后恢复状态
        setTimeout(() => {
            if (this.player.state === attackState) {
                this.updatePlayerState(this.player.prevState)
            }
        }, 400)
    },

    playerBlock(isBlocking) {
        if (this.player.state === "jump" || this.player.state === "hurt") return

        this.player.isBlocking = isBlocking
        this.updatePlayerState(isBlocking ? "block" : "idle")
    },

    activatePlayerBuff() {
        this.isPlayerBuffActive = true
        this.playerBuffTimer = this.playerBuffDuration

        // 设置大招CD（但不在激活期间恢复）
        this.ultCooldown = this.ultCooldownDuration;
        this.isUltCooldown = false; // 激活期间不处于CD状态

        const effect = document.createElement("div")
        effect.className = "skill-effect"
        effect.style.left = `${this.player.x - 60}px`
        effect.style.top = `${this.player.y - 40}px`
        document.getElementById("arena").appendChild(effect)

        // 大招持续时间结束后设置CD状态
        setTimeout(() => {
            effect.remove()
            this.isPlayerBuffActive = false
            this.isUltCooldown = true; // 大招结束后开始CD
        }, this.playerBuffDuration * 1000)

        this.updatePlayerState("skill")
        setTimeout(() => {
            if (this.player.state === "skill") {
                this.updatePlayerState("idle")
            }
        }, 500)
    },

    // 恢复大招CD
    recoverUltCooldown(amount) {
        if (this.isUltCooldown && this.ultCooldown > 0) {
            this.ultCooldown = Math.max(0, this.ultCooldown - amount);
            this.updateBuffTimerDisplay();

            // 如果CD恢复完成，重置状态
            if (this.ultCooldown <= 0) {
                this.isUltCooldown = false;
            }
        }
    },

    // 更新buff计时器显示
    updateBuffTimerDisplay() {
        const timerElement = document.getElementById("player-buff-timer");
        if (!timerElement) return;

        let percent = 0;

        if (this.isPlayerBuffActive) {
            // 大招激活期间显示剩余持续时间
            percent = (this.playerBuffTimer / this.playerBuffDuration) * 100;
            timerElement.style.backgroundColor = '#ffeb3b'; // 金色表示激活状态
        } else if (this.isUltCooldown) {
            // CD期间显示CD恢复进度
            percent = (1 - (this.ultCooldown / this.ultCooldownDuration)) * 100;
            timerElement.style.backgroundColor = '#9C27B0'; // 紫色表示CD状态
        } else {
            // 大招可用状态
            percent = 100;
            timerElement.style.backgroundColor = '#4CAF50'; // 绿色表示可用状态
        }

        timerElement.style.width = `${percent}%`;
    },

    gameLoop() {
        if (!this.isRunning) return

        this.handleInput()
        this.updatePhysics()
        this.updateTimers()
        this.updateAI()
        this.checkCollisions()
        this.updateRender()

        this.animationFrameID = requestAnimationFrame(() => this.gameLoop())
    },

    handleInput() {
        // 如果在攻击状态，不允许移动
        if (this.player.state.includes("attack")) return

        if (this.keysPressed["a"]) {
            this.player.x -= this.player.speed
            this.player.facing = "left"
            this.updatePlayerState("walk")
        } else if (this.keysPressed["d"]) {
            this.player.x += this.player.speed
            this.player.facing = "right"
            this.updatePlayerState("walk")
        } else if (this.player.state === "walk" && !this.player.isBlocking) {
            this.updatePlayerState("idle")
        }

        if (this.keysPressed["w"] && this.player.isGrounded) {
            this.player.velocityY = -this.player.jumpForce
            this.player.isGrounded = false
            this.updatePlayerState("jump")
        }
    },

    updatePhysics() {
        // 重力 - 对所有非地面状态生效
        if (!this.player.isGrounded) {
            this.player.velocityY += 0.8
            this.player.y += this.player.velocityY
        }

        // 地面检测
        if (this.player.y > 500) {
            this.player.y = 500
            this.player.velocityY = 0
            this.player.isGrounded = true

            // 如果是从跳跃状态落地，恢复为之前的状态
            if (
                this.player.state === "jump" ||
                this.player.state === "jump-and-attack"
            ) {
                this.updatePlayerState(this.player.prevState || "idle")
            }
        }

        // 边界检测
        if (this.player.x < 0) this.player.x = 0
        if (this.player.x > 1520) this.player.x = 1520
    },

    updateTimers() {
        if (this.player.attackCooldown > 0) {
            this.player.attackCooldown -= 1 / 60
        }

        if (this.isPlayerBuffActive) {
            this.playerBuffTimer -= 1 / 60
            this.updateBuffTimerDisplay();

            if (this.playerBuffTimer <= 0) {
                this.isPlayerBuffActive = false
                this.isUltCooldown = true; // 大招结束后开始CD
            }
        }

        // 更新大招CD（仅在大招结束后）
        if (this.isUltCooldown && this.ultCooldown > 0) {
            this.ultCooldown -= this.ultCooldownRecoveryRate;
            this.updateBuffTimerDisplay();

            if (this.ultCooldown <= 0) {
                this.ultCooldown = 0;
                this.isUltCooldown = false;
            }
        }

        // 更新敌人格挡计时器
        if (this.enemy.isBlocking) {
            this.enemy.blockTimer--;
            if (this.enemy.blockTimer <= 0) {
                this.enemy.isBlocking = false;
                this.updateEnemyState("idle");
            }
        }
    },

    updateAI() {
        this.enemy.aiTimer++;

        if (this.player.x < this.enemy.x) {
            this.enemy.facing = "left"
        } else {
            this.enemy.facing = "right"
        }
        const distance = Math.abs(this.player.x - this.enemy.x)

        if (distance < 600 && distance >= 100) {
            if (this.player.x < this.enemy.x) {
                this.enemy.x -= this.enemy.speed
            } else {
                this.enemy.x += this.enemy.speed
            }
            this.updateEnemyState("walk")
        } else if (distance >= 600) {
            this.updateEnemyState("idle")
        }

        // 修改攻击逻辑
        if (this.enemy.aiTimer % 60 === 0 && !this.enemy.isBlocking) {
            this.enemy.attacklocked = 1;

            if (distance < 100) {
                // 根据玩家是否开启大招决定行为概率
                let attackChance, blockChance;
                let maxConsecutiveBlocks;

                if (this.isPlayerBuffActive) {
                    // 玩家开启大招时：25%攻击，75%格挡
                    attackChance = 0.25;
                    blockChance = 0.75;
                    maxConsecutiveBlocks = 4;
                } else {
                    // 玩家未开启大招时：50%攻击，50%格挡
                    attackChance = 0.5;
                    blockChance = 0.5;
                    maxConsecutiveBlocks = 3;
                }

                // 检查连续格挡次数限制
                if (this.enemyConsecutiveBlocks >= maxConsecutiveBlocks) {
                    // 达到最大连续格挡次数，强制攻击
                    this.enemyAttack();
                    this.enemyConsecutiveBlocks = 0; // 重置连续格挡计数
                } else {
                    // 根据概率决定行为
                    const randomValue = Math.random();

                    if (randomValue < attackChance) {
                        // 攻击
                        this.enemyAttack();
                        this.enemyConsecutiveBlocks = 0; // 重置连续格挡计数
                    } else {
                        // 格挡
                        this.enemyBlock();
                        this.enemyConsecutiveBlocks++; // 增加连续格挡计数
                    }
                }
            }
        }

        if (this.enemy.x < 0) this.enemy.x = 0
        if (this.enemy.x > 1520) this.enemy.x = 1520
    },

    // 新增：敌人格挡函数
    enemyBlock() {
        this.enemy.isBlocking = true;
        this.enemy.blockTimer = 60; // 格挡持续1秒（60帧）
        this.updateEnemyState("block");

        // 设置格挡结束回调
        setTimeout(() => {
            if (this.enemy.isBlocking) {
                this.enemy.isBlocking = false;
                this.updateEnemyState("idle");
            }
        }, 1000);
    },

    enemyAttack() {
        this.updateEnemyState("attack")

        setTimeout(() => {
            if (this.enemy.state === "attack") {
                this.updateEnemyState("idle")
            }
        }, 400)
    },

    checkCollisions() {
        // 检测玩家攻击碰撞
        if (this.player.state.includes("attack")) {
            const attackX =
                this.player.facing === "right"
                    ? this.player.x + this.player.width
                    : this.player.x

            if (
                this.checkAttackHit(
                    attackX,
                    this.player.attackRange,
                    this.player,
                    this.enemy
                ) &&
                this.player.attacklocked === 1
            ) {
                // 敌人格挡时减少伤害
                let damage = this.isPlayerBuffActive
                    ? this.player.attackDamage * 2
                    : this.player.attackDamage;

                if (this.enemy.isBlocking) {
                    damage /= 2; // 格挡时伤害减半
                }

                this.enemy.health -= damage;
                this.player.attacklocked = 2;

                if (this.enemy.isBlocking) {
                    this.updateEnemyState("block-hit"); // 格挡受击状态
                } else {
                    this.updateEnemyState("hurt");
                }

                this.updateHealthBars();

                setTimeout(() => {
                    if (this.enemy.state === "hurt" || this.enemy.state === "block-hit") {
                        this.updateEnemyState(this.enemy.isBlocking ? "block" : "idle");
                    }
                }, 300);
            }
        }

        // 检测敌人攻击
        if (this.enemy.state === "attack") {
            const attackX =
                this.enemy.facing === "right"
                    ? this.enemy.x + this.enemy.width
                    : this.enemy.x

            if (
                this.checkAttackHit(
                    attackX,
                    this.enemy.attackRange,
                    this.enemy,
                    this.player
                ) &&
                this.enemy.attacklocked === 1
            ) {
                let damage = this.enemy.attackDamage

                if (this.player.isBlocking) {
                    const isBlockingCorrectDirection =
                        (this.enemy.facing === "right" && this.player.facing === "left") ||
                        (this.enemy.facing === "left" && this.player.facing === "right")

                    damage = isBlockingCorrectDirection
                        ? this.isPlayerBuffActive
                            ? 0
                            : damage / 3
                        : damage

                    // 格挡成功恢复5%大招CD
                    if (isBlockingCorrectDirection) {
                        this.recoverUltCooldown(this.ultCooldownDuration * 0.05);
                    }
                }

                this.player.health -= damage
                this.enemy.attacklocked = 2
                setTimeout(() => {
                    if (this.enemy.attacklocked === 2) {
                        this.enemy.attacklocked = 0
                    }
                }, 400)
                this.updatePlayerState("hurt")
                this.updateHealthBars()
                setTimeout(() => {
                    if (this.player.state === "hurt") {
                        this.updatePlayerState("idle")
                    }
                }, 300)
            }
        }

        if (this.player.health <= 0) {
            this.updateHealthBars();
            this.showResult(false)
        } else if (this.enemy.health <= 0) {
            this.updateHealthBars();
            this.showResult(true)
        }
    },

    checkAttackHit(attackX, attackRange, attacker, target) {
        const horizontalHit =
            attacker.facing === "right"
                ? attackX < target.x + target.width && attackX + attackRange > target.x
                : attackX > target.x && attackX - attackRange < target.x + target.width

        const verticalHit =
            attacker.y < target.y + target.height * 0.8 &&
            attacker.y + attacker.height * 0.7 > target.y

        return horizontalHit && verticalHit
    },

    updateRender() {
        this.player.element.style.left = `${this.player.x}px`
        this.player.element.style.top = `${this.player.y}px`

        // 根据面向方向设置transform，并保持攻击动画方向正确
        if (this.player.facing === "left") {
            this.player.element.style.transform = "scaleX(-1)"
        } else {
            this.player.element.style.transform = "scaleX(1)"
        }

        this.enemy.element.style.left = `${this.enemy.x}px`
        this.enemy.element.style.top = `${this.enemy.y}px`
        this.enemy.element.style.transform =
            this.enemy.facing === "left" ? "scaleX(-1)" : "scaleX(1)"
    },

    updatePlayerState(state) {
        // 记录前一个状态（除了受伤状态）
        if (state !== "hurt") {
            this.player.prevState = this.player.state
        }

        this.player.state = state
        this.player.element.className = `fighter ${state}`

        // 保持方向
        if (this.player.facing === "left") {
            this.player.element.style.transform = "scaleX(-1)"
        } else {
            this.player.element.style.transform = "scaleX(1)"
        }
    },

    updateEnemyState(state) {
        this.enemy.state = state
        this.enemy.element.className = `fighter enemy ${state}`

        if (this.enemy.facing === "left") {
            this.enemy.element.style.transform = "scaleX(-1)"
        } else {
            this.enemy.element.style.transform = "scaleX(1)"
        }
    },

    updateHealthBars() {
        document.getElementById("player-health").style.width = `${
            (100 * (this.player.health > 0 ? this.player.health : 0)) / this.player.maxHealth
        }%`
        document.getElementById("enemy-health").style.width = `${
            (100 * (this.enemy.health > 0 ? this.enemy.health : 0)) / this.enemy.maxHealth
        }%`
    },

    showResult(playerWon) {
        this.isRunning = false

        const resultElement = document.getElementById("fight-result")
        resultElement.textContent = playerWon ? "胜利！" : "失败..."
        resultElement.style.display = "block"

        setTimeout(() => {
            resultElement.style.display = "none"
            this.end()
        }, 2000)
    },
}