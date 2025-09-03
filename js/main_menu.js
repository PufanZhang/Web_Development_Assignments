import { auth, gameState } from './modules/dataManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logout-button');
    const token = localStorage.getItem("jwt_token");

    // 自动重连逻辑
    // 如果用户只是从游戏返回主页，token 依然存在
    if (token) {
        console.log("【main_menu.js】: 检测到 token，正在通知后端恢复在线状态...");
        gameState.loadPlayerData().then(playerData => {
            if (playerData) {
                console.log("【main_menu.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
            } else {
                console.alert("Token 无效或已过期，请重新登录。");
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }


    // 2. 登出按钮逻辑
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log("【main_menu.js】: 正在请求登出...");

            // 调用后端的登出接口，让后端移除 active user
            const response = await auth.logout();

            if (response) {
                console.log("【main_menu.js】: 后端登出成功。");
            } else {
                console.warn("【main_menu.js】: 后端登出失败或网络错误，但仍将清理本地数据。");
            }
            localStorage.clear();
            window.location.href = 'login.html';
        });
    }
});