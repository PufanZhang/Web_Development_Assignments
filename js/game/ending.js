import { achievements, gameState } from './modules/dataManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem("jwt_token");

    if (!token) {
        alert("登录状态已过期，请重新登录。");
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }
    const playerData = await gameState.loadPlayerData();
    if (!playerData) {
        alert("无法恢复玩家会话，请重新登录。");
        window.location.href = 'login.html';
    }
    console.log("【achievement.js】: 玩家状态已恢复。欢迎回来, ", playerData.username);

    const statsElement = document.querySelector('.stats');
    if (!statsElement) {
        console.error("未找到显示统计数据的元素！");
        return;
    }

    statsElement.textContent = '统计数据正在努力加载中...';

    try {
        const [formattedTime, achievementCounts] = await Promise.all([
            gameState.getFormattedPlaytime(),
            achievements.getCategoryCompletionCounts()
        ]);

        // 获取 memory 和 character 分类的完成数量，如果数据不存在就默认为 0
        const memoryCompleted = achievementCounts.memory || 0;
        const characterCompleted = achievementCounts.character || 0;
        const suspicionValue = gameState.getValue('suspicion');

        const line1 = `通关时间：${formattedTime}　解锁人物数量：${characterCompleted}/4`;
        const line2 = `已收集记忆碎片：${memoryCompleted}/6　怀疑度最终值：${suspicionValue}%`;
        statsElement.innerHTML = `${line1}<br>${line2}`;
    } catch (error) {
        console.error("加载统计数据时发生错误:", error);
        statsElement.textContent = '统计数据加载失败 T_T';
    }
});

document.addEventListener('keydown', () => {
    window.location.href = 'index.html';
});