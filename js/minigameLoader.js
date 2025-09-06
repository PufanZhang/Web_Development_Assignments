import { gameState } from './modules/dataManager.js';
import { dialogueManager } from './modules/world/dialogue.js';

export const minigameLoader = {
    async load(minigameName, onWinStory, onLoseStory) {
        // 1. 暂停主游戏逻辑，并隐藏主游戏容器
        window.gameMode = 'minigame';
        const mainGameContainer = document.getElementById('game-container');
        if (mainGameContainer) mainGameContainer.style.display = 'none';

        // --- 使用 iframe 替代直接注入 DOM ---
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
                            if (result.success && onWinStory) {
                                dialogueManager.start(onWinStory);
                            } else if (!result.success && onLoseStory) {
                                dialogueManager.start(onLoseStory);
                            }
                        } else {
                            alert("Token 无效或已过期，请重新登录。"); // 使用 alert 替代 console.alert
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