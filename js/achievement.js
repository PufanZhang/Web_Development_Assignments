import { auth, gameState, achievements } from "./game/modules/dataManager.js";
import { audioManager } from "./game/modules/audioManager.js";
import {VOLUME, ACHIEVEMENT_MUSIC } from "./game/config.js";

let achievementData = {};
// 当前打开的分类
let currentCategory = null;

// 打开某个分类的成就列表
function openCategory(category) {
    currentCategory = category;
    const modal = document.getElementById('achievementModal');
    const grid = document.getElementById('achievementGrid');
    const title = document.getElementById('modalTitle');

    // 设置标题
    const categoryNames = {
        memory: '记忆碎片',
        decrypt: '解密大师',
        character: '角色收集',
        mission: '任务完成'
    };
    title.textContent = categoryNames[category] || '成就详情';

    // 清空之前内容
    grid.innerHTML = '';

    // 生成成就项
    achievementData[category].sort((a, b) => a.id - b.id);
    achievementData[category].forEach(ach => {
        const item = document.createElement('div');
        item.className = 'achievement-item';
        if (ach.completed) item.classList.add('completed');
        item.innerHTML = `
            <h4><span class="achievement-icon">${ach.icon}</span> ${ach.name}</h4>
            <p>${ach.abstract}</p>
        `;
        item.onclick = () => showAchievementDetail(ach);
        grid.appendChild(item);
    });

    modal.style.display = 'block';
}

// 关闭弹窗
function closeModal() {
    document.getElementById('achievementModal').style.display = 'none';
}

// 显示单个成就详情页面
function showAchievementDetail(achievement) {
    closeModal();
    const detail = document.getElementById('achievementDetail');
    document.getElementById('achievementIcon').textContent = achievement.icon;
    document.getElementById('achievementName').textContent = achievement.name;
    document.getElementById('achievementDescription').textContent = achievement.description;
    const status = document.getElementById('achievementStatus');
    status.innerHTML = `<span class="status-text">${achievement.completed ? '已完成' : '未完成'}</span>`;

    // 根据完成状态改变背景和状态样式
    const detailBackground = document.getElementById('detailBackground');
    const statusElement = document.getElementById('achievementStatus');
    if (achievement.completed) {
        detailBackground.style.background = 'linear-gradient(135deg, #0d4d0d 0%, #1a5a1a 50%, #0f3d2f 100%)';
        statusElement.style.borderColor = 'rgba(0, 255, 100, 0.6)';
        statusElement.style.background = 'rgba(0, 255, 100, 0.1)';
    } else {
        detailBackground.style.background = 'linear-gradient(135deg, #0d1421 0%, #1a1a2e 50%, #16213e 100%)';
        statusElement.style.borderColor = 'rgba(0, 255, 255, 0.5)';
        statusElement.style.background = 'rgba(0, 255, 255, 0.1)';
    }

    detail.style.display = 'block';
}

// 关闭成就详情页面
function closeDetail() {
    document.getElementById('achievementDetail').style.display = 'none';
}

// 返回按钮功能
function goBack() {
    if (document.getElementById('achievementDetail').style.display === 'block') {
        closeDetail();
    } else if (document.getElementById('achievementModal').style.display === 'block') {
        closeModal();
    } else {
        window.location.href = '/index.html';
    }
}

// 更新进度显示
function updateProgress() {
    ['memory', 'decrypt', 'character', 'mission'].forEach(category => {
        // 如果 achievementData 中没有这个分类，就使用一个空数组作为默认值
        const achievementsInCategory = achievementData[category] || [];

        const total = achievementsInCategory.length;
        const completedCount = achievementsInCategory.filter(ach => ach.completed).length;

        // 当 total 为 0 时，progressPercent 会是 NaN，需要处理一下
        const progressPercent = total > 0 ? (completedCount / total) * 100 : 0;

        const progressCountElement = document.getElementById(`${category}-progress`);
        if (progressCountElement) {
            progressCountElement.textContent = completedCount;
        }

        const progressFillElement = document.querySelector(`.${category}-progress`);
        if (progressFillElement) {
            progressFillElement.style.width = progressPercent + '%';
        }
    });
}

// 初始化进度条
document.addEventListener('DOMContentLoaded', async function() {
    audioManager.init(VOLUME);
    audioManager.playMusic(ACHIEVEMENT_MUSIC);
    const token = localStorage.getItem("jwt_token");

    if (!token) {
        alert("登录状态已过期，请重新登录。");
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    console.log("【achievement.js】: 正在恢复玩家在线状态...");
    try {
        // 步骤 1: 首先恢复玩家登录状态并加载数据
        const playerData = await gameState.loadPlayerData();
        if (!playerData) {
            // 如果恢复失败，说明 token 可能无效，直接跳转登录页
            throw new Error("无法恢复玩家会话，请重新登录。");
        }
        console.log("【achievement.js】: 玩家状态已恢复。欢迎回来, ", playerData.username);

        // 步骤 2: 成功后再加载所有成就信息
        console.log("【achievement.js】: 正在加载成就数据...");
        const achievementsData = await achievements.loadAll();
        if (!achievementsData) {
            throw new Error("加载成就数据失败。");
        }

        // 步骤 3: 使用获取到的数据更新页面
        console.log("【achievement.js】: 所有数据加载完毕，正在更新页面。");
        achievementData = achievementsData; // 将获取的数据赋给全局变量
        updateProgress(); // 使用新数据更新进度条

    } catch (error) {
        console.error(error.message);
        alert(error.message); // 向用户显示更具体的错误信息
        localStorage.clear();
        window.location.href = 'login.html';
    }
});

// 点击模态框外部关闭弹窗
window.onclick = function(event) {
    const modal = document.getElementById('achievementModal');
    if (event.target === modal) {
        closeModal();
    }
}

// 键盘快捷键支持
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (document.getElementById('achievementDetail').style.display === 'block') {
            closeDetail();
        } else if (document.getElementById('achievementModal').style.display === 'block') {
            closeModal();
        }
    }
});

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

window.addEventListener('beforeunload', logout);
window.openCategory = openCategory;
window.closeModal = closeModal;
window.closeDetail = closeDetail;
window.goBack = goBack;