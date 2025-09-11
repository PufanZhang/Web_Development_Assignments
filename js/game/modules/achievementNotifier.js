let notifierContainer = null;

export const achievementNotifier = {
    /**
     * 初始化模块，在游戏容器中创建一个用于存放所有通知的父容器。
     */
    init() {
        // 确保只创建一个容器
        if (document.getElementById('achievement-notifier-container')) {
            return;
        }

        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            console.error("无法找到游戏容器，成就通知系统初始化失败！");
            return;
        }

        notifierContainer = document.createElement('div');
        notifierContainer.id = 'achievement-notifier-container';
        gameContainer.appendChild(notifierContainer);
        console.log("成就通知系统已启动！");
    },

    /**
     * 显示一条新的成就解锁通知。
     * @param {object} achievement - 包含成就信息的对象
     * @param {string} achievement.id - 成就的唯一ID
     * @param {string} achievement.type - 成就的类型
     * @param {string} achievement.name - 成就的名称
     * @param {string} achievement.icon - 代表成就的Emoji图标
     */
    show(achievement) {
        if (!notifierContainer) {
            console.error("通知容器未初始化，无法显示成就！");
            return;
        }

        // 1. 创建通知的HTML结构
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';

        notification.innerHTML = `
            <div class="ach-header">解锁成就——${achievement.type} ${achievement.id}</div>
            <div class="ach-body">
                <span class="ach-icon">${achievement.icon}</span>
                <span class="ach-name">${achievement.name}</span>
            </div>
        `;

        // 2. 将通知添加到容器中
        notifierContainer.appendChild(notification);

        // 3. 触发入场动画
        // 使用 requestAnimationFrame 确保元素已插入DOM并渲染，然后再添加动画类
        requestAnimationFrame(() => {
            notification.classList.add('visible');
        });

        // 4. 设置定时器，在5秒后自动移除通知
        setTimeout(() => {
            // 触发离场动画
            notification.classList.remove('visible');
            // 等待动画结束后再从DOM中移除元素
            notification.addEventListener('transitionend', () => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, { once: true }); // 确保事件只触发一次
        }, 5000); // 5秒后消失
    }
};