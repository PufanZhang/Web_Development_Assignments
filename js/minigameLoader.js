import { gameState } from './modules/dataManager.js';
import { dialogueManager } from './modules/world/dialogue.js';

export const minigameLoader = {
    async load(minigameName, onWinStory, onLoseStory) {
        // 1. 暂停主游戏逻辑，并隐藏主游戏容器
        window.gameMode = 'minigame';
        const mainGameContainer = document.getElementById('game-container');
        if (mainGameContainer) mainGameContainer.style.display = 'none';

        // 用于追踪动态添加的元素，方便后续移除
        const addedElements = [];

        try {
            const htmlPath = '/minigame/' + minigameName + '/index.html';
            const response = await fetch(htmlPath);
            if (!response.ok) {
                throw new Error(`无法加载小游戏 HTML: ${response.statusText}`);
            }
            const htmlText = await response.text();
            const parser = new DOMParser();
            const minigameDoc = parser.parseFromString(htmlText, 'text/html');
            minigameDoc.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const newLink = document.createElement('link');
                newLink.rel = 'stylesheet';
                newLink.href = new URL(link.getAttribute('href'), response.url).href;
                document.head.appendChild(newLink);
                addedElements.push(newLink);
            });

            // 5. 创建小游戏容器，并注入 <body> 的内容
            const minigameContainer = document.createElement('div');
            minigameContainer.id = 'minigame-container';
            minigameContainer.innerHTML = minigameDoc.body.innerHTML;
            document.body.appendChild(minigameContainer);
            addedElements.push(minigameContainer);

            // 6. 按顺序加载并执行所有 <script> 标签
            const scripts = Array.from(minigameDoc.querySelectorAll('script'));
            for (const oldScript of scripts) {
                const newScript = document.createElement('script');
                // 复制所有属性 (src, type, etc.)
                for (const attr of oldScript.attributes) {
                    newScript.setAttribute(attr.name, attr.value);
                }

                if (oldScript.src) {
                    // 对于外部脚本，我们必须等待它加载完成
                    await new Promise((resolve, reject) => {
                        newScript.onload = resolve;
                        newScript.onerror = reject;
                        minigameContainer.appendChild(newScript);
                    });
                } else {
                    // 对于内联脚本，直接添加内容并插入即可
                    newScript.textContent = oldScript.textContent;
                    minigameContainer.appendChild(newScript);
                }
            }

            // 7. 提供全局关闭函数
            window.closeMinigame = (result) => {
                console.log(`小游戏 '${minigameName}' 已结束，结果:`, result);
                addedElements.forEach(el => el.parentNode.removeChild(el));
                delete window.closeMinigame;
                if (mainGameContainer) mainGameContainer.style.display = 'block';
                const token = localStorage.getItem("jwt_token");// 自动重连逻辑
                if (token) {
                    console.log("【minigameLoader.js】: 检测到 token，正在通知后端恢复在线状态...");
                    gameState.loadPlayerData().then(playerData => {
                        if (playerData) {
                            console.log("【minigameLoader.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
                        } else {
                            console.alert("Token 无效或已过期，请重新登录。");
                            localStorage.clear();
                            window.location.href = 'login.html';
                        }
                    });
                }
                window.gameMode = 'map';
                if (result.success && onWinStory) {
                    dialogueManager.start(onWinStory);
                } else if (!result.success && onLoseStory) {
                    dialogueManager.start(onLoseStory);
                }
            };

        } catch (error) {
            console.error(`加载小游戏 '${minigameName}' 出错:`, error);
            if (mainGameContainer) mainGameContainer.style.display = 'block';
            window.gameMode = 'map';
        }
    }
};