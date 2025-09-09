import { auth, gameState } from "./game/modules/dataManager.js";

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem("jwt_token");

    if (token) {
        console.log("【main_menu.js】: 检测到 token，正在通知后端恢复在线状态...");
        gameState.loadPlayerData().then(playerData => {
            if (playerData) {
                console.log("【main_menu.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
            } else {
                showNotification("Token 无效或已过期，请重新登录。");
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // 获取所有交互元素
    const particlesContainer = document.getElementById('particles');
    const startButton = document.querySelector('.start-btn');
    const saveButton = document.querySelector('.save-btn');
    const achievementButton = document.querySelector('.achievement-btn');
    const aboutButton = document.querySelector('.about-btn');
    const logoutButton = document.querySelector('.login-btn'); // 这个按钮现在是登出功能

    // 1. 创建粒子背景效果
    function createParticles() {
        if (!particlesContainer) return;
        const particleCount = 50; // 定义粒子数量

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
            particlesContainer.appendChild(particle);
        }
    }

    // 2. 统一的通知显示函数
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%;
            transform: translateX(-50%); background: rgba(0, 0, 0, 0.8);
            color: white; padding: 15px 30px; border-radius: 25px;
            z-index: 1000; font-size: 1em; backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            animation: slideDown 0.3s ease-out;
        `;
        notification.textContent = message;

        // 动态创建动画效果的 <style> 标签，确保动画生效
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);

        // 3秒后自动移除通知
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.3s ease-out reverse forwards';
            setTimeout(() => {
                notification.remove();
                style.remove();
            }, 300);
        }, 3000);
    }

    // 3. 按钮点击事件处理函数
    function handleStartGame() {
        showNotification('正在启动游戏...');
        console.log('开始游戏被点击');
        window.location.href = 'game.html';
    }

    function handleSaveManagement() {
        showNotification('打开存档管理...');
        window.location.href = 'save-system.html';
    }

    function handleAchievements() {
        showNotification('查看成就系统...');
        window.location.href = 'achievement.html';
    }

    function handleAbout() {
        showNotification('显示关于信息...');
        console.log('关于我们被点击');
        window.location.href = 'AboutUs.html';
    }

    // 4. 绑定事件监听器
    if(startButton) startButton.addEventListener('click', handleStartGame);
    if(saveButton) saveButton.addEventListener('click', handleSaveManagement);
    if(achievementButton) achievementButton.addEventListener('click', handleAchievements);
    if(aboutButton) aboutButton.addEventListener('click', handleAbout);

    function logout() {
        const token = localStorage.getItem('jwt_token');
        const user = localStorage.getItem('user');
        if (token) {
            const data = {
                token: token,
                username: user,
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon('/api/auth/logout', blob);
        }
    }

    // 登出按钮逻辑
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            console.log("【main_menu.js】: 正在请求登出...");
            showNotification('正在退出登录...');
            logout();
            localStorage.clear();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 400);
        });
    }

    // 5. 键盘快捷键支持
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case '1': handleStartGame(); break;
            case '2': handleSaveManagement(); break;
            case '3': handleAchievements(); break;
            case '4': handleAbout(); break;
        }
    });

    // 6. 鼠标视差效果
    document.addEventListener('mousemove', (e) => {
        const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

        const particles = document.querySelectorAll('.particle');
        particles.forEach(particle => {
            const speed = parseFloat(particle.style.animationDuration) / 5;
            const moveX = mouseX * speed * 10;
            const moveY = mouseY * speed * 10;
            particle.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });

    // 7. 关闭浏览器自动登出
    window.addEventListener('beforeunload', logout);

    // --- 页面加载完成时初始化 ---
    createParticles();
});