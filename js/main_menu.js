import { achievements, auth, gameState } from "./game/modules/dataManager.js";
import { audioManager } from "./game/modules/audioManager.js";
import { VOLUME, MAIN_MUSIC } from "./game/config.js";

let tutorialData = [];
let currentTutorialIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    audioManager.init(VOLUME);
    audioManager.playMusic(MAIN_MUSIC);

    // 获取所有交互元素
    const particlesContainer = document.getElementById('particles');
    const startButton = document.querySelector('.menu-buttons .start-btn');
    const saveButton = document.querySelector('.menu-buttons .save-btn');
    const achievementButton = document.querySelector('.menu-buttons .achievement-btn');
    const aboutButton = document.querySelector('.menu-buttons .about-btn');
    const panelLogoutButton = document.getElementById('panel-logout-btn');
    const showTutorialBtn = document.getElementById('show-tutorial-btn');

    // 新手教程UI元素
    const tutorialConfirmOverlay = document.getElementById('tutorial-confirm-overlay');
    const confirmYesBtn = document.getElementById('confirm-tutorial-yes');
    const confirmNoBtn = document.getElementById('confirm-tutorial-no');
    const tutorialMainOverlay = document.getElementById('tutorial-main-overlay');
    const tutorialCloseBtn = document.getElementById('tutorial-close');
    const tutorialImage = document.getElementById('tutorial-image');
    const tutorialDescription = document.getElementById('tutorial-description');
    const tutorialPrevBtn = document.getElementById('tutorial-prev');
    const tutorialNextBtn = document.getElementById('tutorial-next');
    const tutorialProgress = document.getElementById('tutorial-progress');

    // 恢复登录
    const token = localStorage.getItem("jwt_token");
    if (token) {
        console.log("【main_menu.js】: 检测到 token，正在通知后端恢复在线状态...");
        gameState.loadPlayerData().then(playerData => {
            if (playerData) {
                console.log("【main_menu.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
                if (!playerData.address || playerData.address.map === '') {
                    console.log("检测到新玩家，准备启动新手教程...");
                    tutorialConfirmOverlay.style.display = 'flex';
                    if (window.playerDataCache?.address) window.playerDataCache.address.map = 'tutorialFinished';
                }
                initializeUserInfoPanel();
            } else {
                showNotification("Token 无效或已过期，请重新登录。");
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

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
        if (token) {
            const data = {
                token: token,
                playerData: window.playerDataCache
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon('/api/player/logout', blob);
        }
    }

    // 登出按钮逻辑
    if (panelLogoutButton) {
        panelLogoutButton.addEventListener('click', async () => {
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

    // --- 用户信息面板逻辑 ---
    const userInfoPanel = document.getElementById('user-info-panel');
    const usernameDisplay = document.getElementById('username-display');
    const playtimeH = document.getElementById('playtime-h');
    const playtimeM = document.getElementById('playtime-m');
    const playtimeS = document.getElementById('playtime-s');
    const totalAchProgress = document.getElementById('total-ach-progress');

    // 定义各类成就的总数
    const achievementCategoryTotals = {
        memory: 6,
        decrypt: 3,
        character: 4,
        mission: 3
    };

    let totalPlaytimeSeconds = 0;
    let playtimeInterval = null;

    // 更新单个时间数字的函数，并附带翻页动画
    function updateDigit(element, newValue) {
        const paddedValue = String(newValue).padStart(2, '0');
        if (element.textContent !== paddedValue) {
            element.textContent = paddedValue;
            element.classList.add('flip');
            // 动画结束后移除 class，方便下次触发
            setTimeout(() => element.classList.remove('flip'), 400);
        }
    }

    // 更新整个时钟的显示
    function updatePlaytimeDisplay() {
        totalPlaytimeSeconds++;
        const hours = Math.floor(totalPlaytimeSeconds / 3600);
        const minutes = Math.floor((totalPlaytimeSeconds % 3600) / 60);
        const seconds = totalPlaytimeSeconds % 60;

        updateDigit(playtimeH, hours);
        updateDigit(playtimeM, minutes);
        updateDigit(playtimeS, seconds);
    }

    // 初始化并显示用户信息面板
    async function initializeUserInfoPanel() {
        const playerData = window.playerDataCache;
        if (!playerData) {
            console.warn("未找到玩家数据，无法初始化用户信息面板。");
            return;
        }

        // 1. 显示用户名
        usernameDisplay.textContent = playerData.username;

        // 2. 获取并设置成就进度
        try {
            const completionCounts = await achievements.getCategoryCompletionCounts();
            let totalCompleted = 0;
            let totalAchievements = 0;

            for (const category in achievementCategoryTotals) {
                const completed = completionCounts[category] || 0;
                const total = achievementCategoryTotals[category];
                totalCompleted += completed;
                totalAchievements += total;

                document.getElementById(`${category}-progress`).textContent = `${completed}/${total}`;
                const bar = document.getElementById(`${category}-bar`);
                if (bar) {
                    bar.style.width = `${(completed / total) * 100}%`;
                }
            }
            totalAchProgress.textContent = `${totalCompleted}/${totalAchievements}`;

        } catch (error) {
            console.error("加载成就进度失败:", error);
        }

        // 3. 获取并启动游戏时钟
        totalPlaytimeSeconds = await gameState.getPlaytimeInSeconds();
        if (playtimeInterval) clearInterval(playtimeInterval); // 清除旧的计时器
        updatePlaytimeDisplay(); // 立即更新一次
        playtimeInterval = setInterval(updatePlaytimeDisplay, 1000);

        // 4. 一切就绪后，显示面板
        userInfoPanel.style.display = 'block';
    }


    // 从服务器加载教程数据
    async function loadTutorialData() {
        try {
            const response = await fetch('/data/tutorial.json');
            if (!response.ok) throw new Error('教程文件加载失败!');
            tutorialData = await response.json();
            return true;
        } catch (error) {
            console.error(error);
            showNotification('无法加载新手教程，请稍后再试。');
            return false;
        }
    }

    // 根据索引显示特定教程页面
    function showTutorialPage(index) {
        if (!tutorialData || tutorialData.length === 0) return;

        const page = tutorialData[index];
        tutorialImage.src = page.image;
        tutorialDescription.textContent = page.description;
        tutorialProgress.textContent = `${index + 1} / ${tutorialData.length}`;

        // 判断是否为最后一页
        if (index === tutorialData.length - 1) {
            tutorialNextBtn.textContent = '启航！';
        } else {
            tutorialNextBtn.textContent = '下一页';
        }

        // 控制按钮的可见性
        tutorialPrevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        tutorialNextBtn.style.visibility = 'visible'; // “下一页”或“启航”按钮始终可见
    }

    // 开始教程
    async function startTutorial() {
        tutorialConfirmOverlay.style.display = 'none';
        const success = await loadTutorialData();
        if (success && tutorialData.length > 0) {
            currentTutorialIndex = 0;
            showTutorialPage(currentTutorialIndex);
            tutorialMainOverlay.style.display = 'flex';
        }
    }

    // 关闭所有教程弹窗
    function closeTutorial() {
        tutorialConfirmOverlay.style.display = 'none';
        tutorialMainOverlay.style.display = 'none';
    }

    // --- 教程事件监听器 ---
    if (confirmYesBtn) confirmYesBtn.addEventListener('click', startTutorial);
    if (confirmNoBtn) confirmNoBtn.addEventListener('click', closeTutorial);
    if (tutorialCloseBtn) tutorialCloseBtn.addEventListener('click', closeTutorial);

    if (tutorialNextBtn) {
        tutorialNextBtn.addEventListener('click', () => {
            // 判断当前是不是最后一页
            if (currentTutorialIndex < tutorialData.length - 1) {
                currentTutorialIndex++;
                showTutorialPage(currentTutorialIndex);
            } else {
                closeTutorial();
            }
        });
    }

    if (tutorialPrevBtn) {
        tutorialPrevBtn.addEventListener('click', () => {
            if (currentTutorialIndex > 0) {
                currentTutorialIndex--;
                showTutorialPage(currentTutorialIndex);
            }
        });
    }

    if (showTutorialBtn) {
        showTutorialBtn.addEventListener('click', () => {
            tutorialConfirmOverlay.style.display = 'none';
            startTutorial();
        });
    }

    // --- 注销账号弹窗逻辑 ---
    const showDeleteModalBtn = document.getElementById('show-delete-account-modal-btn');
    const deleteAccountOverlay = document.getElementById('delete-account-overlay');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let countdownInterval = null;

    if (showDeleteModalBtn) {
        showDeleteModalBtn.addEventListener('click', () => {
            deleteAccountOverlay.style.display = 'flex';
            confirmDeleteBtn.disabled = true;
            let secondsLeft = 3;
            confirmDeleteBtn.textContent = `确认注销 (${secondsLeft})`;

            // 开始倒计时
            countdownInterval = setInterval(() => {
                secondsLeft--;
                confirmDeleteBtn.textContent = `确认注销 (${secondsLeft})`;
                if (secondsLeft <= 0) {
                    clearInterval(countdownInterval);
                    confirmDeleteBtn.textContent = '确认注销';
                    confirmDeleteBtn.disabled = false;
                }
            }, 1000);
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteAccountOverlay.style.display = 'none';
            // 如果倒计时还在进行，就清除它
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (confirmDeleteBtn.disabled) return;

            const username = window.playerDataCache?.username;
            if (!username) {
                showNotification("错误：无法获取用户信息！");
                return;
            }

            showNotification("正在处理注销请求...");
            const result = await auth.deletePlayer(username);

            // 根据后端返回的结果处理
            if (result && result.success) {
                showNotification("账号已成功注销。");
                localStorage.clear();
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showNotification(result?.message || "注销失败，请稍后再试。");
                deleteAccountOverlay.style.display = 'none';
            }
        });
    }
});