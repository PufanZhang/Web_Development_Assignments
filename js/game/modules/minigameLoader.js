import { gameState } from './dataManager.js';

export const minigameLoader = {
    async load(minigameName, onMinigameEnd) {
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
        const messageHandler = async (event) => {
            // 安全性检查：确保消息来自 iframe
            if (event.source !== iframe.contentWindow) {
                return;
            }

            const {type, result} = event.data;

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
                    // 等待玩家数据加载完成，以确保在线状态恢复
                    const playerData = await gameState.loadPlayerData();
                    if (playerData) {
                        console.log("【minigameLoader.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
                    } else {
                        alert("Token 无效或已过期，请重新登录。");
                        localStorage.clear();
                        window.location.href = 'login.html';
                    }
                }
                if (onMinigameEnd) {
                    onMinigameEnd(result);
                }
                window.gameMode = 'map';
            }
        };

        window.addEventListener('message', messageHandler);
    }
};