import { gameState } from './dataManager.js';
import { dialogueManager } from './world/dialogue.js';
import {GAME_LIST} from "../config";

export const minigameLoader = {
    async load(minigameName, onWinStory, onLoseStory) {
        // 1. 暂停主游戏逻辑，并隐藏主游戏容器
        window.gameMode = 'minigame';
        const mainGameContainer = document.getElementById('game-container');
        if (mainGameContainer) mainGameContainer.style.display = 'none';
        const iframe = document.createElement('iframe');
        iframe.id = 'minigame-iframe';
        iframe.src = `/minigame/${minigameName}/index.html`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        // 2. 设置消息监听器，用于接收来自 iframe 的关闭请求
        const messageHandler = (event) => {
            // 安全性检查：确保消息来自 iframe
            if (event.source !== iframe.contentWindow) {
                return;
            }

            const { type, result } = event.data;

            if (type === 'closeMinigame') {
                console.log(`小游戏 '${minigameName}' 已结束，结果:`, result);

                // 3. 清理工作：移除 iframe 和事件监听器
                document.body.removeChild(iframe);
                window.removeEventListener('message', messageHandler);

                // 4. 恢复主游戏逻辑
                if (mainGameContainer) mainGameContainer.style.display = 'block';

                const token = localStorage.getItem("jwt_token"); // 自动重连逻辑
                if (token) {
                    console.log("【minigameLoader.js】: 检测到 token，正在通知后端恢复在线状态...");
                    gameState.loadPlayerData().then(playerData => {
                        if (playerData) {
                            console.log("【minigameLoader.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
                            let endStory = null;
                            if (result.success && onWinStory) {
                               endStory = onWinStory;
                            } else if (!result.success && onLoseStory) {
                                endStory = onLoseStory;
                            }
                            if (endStory) {
                                dialogueManager.start(endStory, (endAction) => {
                                    if (endAction){
                                        const teleportData = endAction.teleportData || interactedObject.teleportData;
                                        if (endAction.type === 'teleport' && teleportData) {
                                            onTeleport(teleportData);
                                        }

                                        if (GAME_LIST.includes(endAction.type)) {
                                            console.log(`接收到 ${endAction.type} 动作，正在加载游戏...`);
                                            minigameLoader.load(endAction.type, endAction.onWin, endAction.onLose);
                                        }

                                        if (endAction.type === 'saveFile' && endAction.saveFileName) {
                                            console.log(`存档名称${endAction.saveFileName}正在存档...`);
                                            gameState.createSaveFile(endAction.saveFileName);
                                        }
                                    }
                                });
                            }
                        } else {
                            alert("Token 无效或已过期，请重新登录。");
                            localStorage.clear();
                            window.location.href = 'login.html';
                        }
                    });
                }
                window.gameMode = 'map';
            }
        };

        window.addEventListener('message', messageHandler);
    }
};