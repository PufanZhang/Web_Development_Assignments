// 存档数据 - 删除支线和收集品进度
import { auth, gameState} from "./modules/dataManager.js";

const saveData = [
    {
        id: 1,
        name: '量子探索者',
        level: '量子迷宫 - 第七层',
        playTime: '24小时 36分钟',
        lastSave: '2024-01-15 14:30',
        mainProgress: 75,
        achievements: {
            memory: { completed: 3, total: 6 },
            decrypt: { completed: 1, total: 3 },
            character: { completed: 2, total: 4 },
            mission: { completed: 2, total: 3 }
        }
    },
    {
        id: 2,
        name: '数字游侠',
        level: '虚拟城市 - 中央区',
        playTime: '18小时 22分钟',
        lastSave: '2024-01-14 20:15',
        mainProgress: 45,
        achievements: {
            memory: { completed: 2, total: 6 },
            decrypt: { completed: 0, total: 3 },
            character: { completed: 1, total: 4 },
            mission: { completed: 1, total: 3 }
        }
    },
    {
        id: 3,
        name: '赛博武士',
        level: '神经网络 - 深层节点',
        playTime: '42小时 18分钟',
        lastSave: '2024-01-13 16:45',
        mainProgress: 90,
        achievements: {
            memory: { completed: 5, total: 6 },
            decrypt: { completed: 3, total: 3 },
            character: { completed: 4, total: 4 },
            mission: { completed: 3, total: 3 }
        }
    }
];

let currentSaveId = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem("jwt_token");
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
    generateSaveCards();
});

// 生成存档卡片
function generateSaveCards() {
    const saveGrid = document.getElementById('saveGrid');
    saveGrid.innerHTML = '';

    saveData.forEach(save => {
        const saveCard = document.createElement('div');
        saveCard.className = 'save-card';
        saveCard.onclick = () => openSaveDetail(save.id);

        const totalAchievements = Object.values(save.achievements).reduce((sum, cat) => sum + cat.completed, 0);
        const maxAchievements = Object.values(save.achievements).reduce((sum, cat) => sum + cat.total, 0);
        const achievementPercent = Math.round((totalAchievements / maxAchievements) * 100);

        saveCard.innerHTML = `
            <div class="save-card-header">
                <div class="save-avatar-mini">
                    存档 ${save.id.toString().padStart(2, '0')}
                </div>
                <div class="save-info">
                    <div class="save-title">${save.name}</div>
                    <div class="save-subtitle">${save.level}</div>
                </div>
            </div>
            <div class="save-stats-mini">
                <div class="stat-mini">
                    <span class="stat-mini-label">游戏时长</span>
                    <span class="stat-mini-value">${save.playTime}</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-label">成就完成</span>
                    <span class="stat-mini-value">${achievementPercent}%</span>
                </div>
            </div>
            <div class="save-progress-mini">
                <div class="progress-mini-label">
                    <span>主线进度</span>
                    <span>${save.mainProgress}%</span>
                </div>
                <div class="progress-mini-bar">
                    <div class="progress-mini-fill" style="width: ${save.mainProgress}%"></div>
                </div>
            </div>
        `;

        saveGrid.appendChild(saveCard);
    });
}

// 打开存档详情
function openSaveDetail(saveId) {
    currentSaveId = saveId;
    const save = saveData.find(s => s.id === saveId);
    if (!save) return;

    // 更新存档信息
    document.getElementById('avatarText').textContent = `存档 ${save.id.toString().padStart(2, '0')}`;
    document.getElementById('saveName').textContent = save.name;
    document.getElementById('playTime').textContent = save.playTime;
    document.getElementById('lastSave').textContent = save.lastSave;
    document.getElementById('currentLevel').textContent = save.level;

    // 只更新主线进度条
    updateProgressBar('mainProgressBar', save.mainProgress);
    document.getElementById('mainProgress').textContent = save.mainProgress + '%';

    // 更新成就统计
    updateAchievementStats(save.achievements);

    // 显示详情页面
    document.getElementById('saveDetail').style.display = 'block';

    // 添加进入动画
    setTimeout(() => {
        const detailContent = document.querySelector('.detail-content');
        if (detailContent) {
            detailContent.style.opacity = '1';
            detailContent.style.transform = 'translateY(0)';
        }
    }, 100);
}

// 更新进度条
function updateProgressBar(elementId, percentage) {
    const progressBar = document.getElementById(elementId);
    if (progressBar) {
        setTimeout(() => {
            progressBar.style.width = percentage + '%';
        }, 300);
    }
}

// 更新成就统计
function updateAchievementStats(achievements) {
    const categories = ['memory', 'decrypt', 'character', 'mission'];
    const categoryNames = {
        memory: '记忆碎片',
        decrypt: '解密任务',
        character: '角色收集',
        mission: '主线任务'
    };
    const categoryIcons = {
        memory: '🧬',
        decrypt: '🔐',
        character: '🤖',
        mission: '⚡'
    };

    // 创建成就统计容器
    let achievementStats = document.querySelector('.achievement-stats');
    if (!achievementStats) {
        console.error('Achievement stats container not found');
        return;
    }

    achievementStats.innerHTML = '';

    categories.forEach(category => {
        const data = achievements[category];
        const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

        const categoryElem = document.createElement('div');
        categoryElem.className = 'achievement-category';

        categoryElem.innerHTML = `
            <div class="category-icon">${categoryIcons[category]}</div>
            <div class="category-info">
                <span class="category-name">${categoryNames[category]}</span>
                <span class="category-count">${data.completed}/${data.total}</span>
            </div>
            <div class="category-progress">
                <div class="mini-progress-bar">
                    <div class="mini-progress-fill" style="width: ${percent}%"></div>
                </div>
            </div>
        `;

        achievementStats.appendChild(categoryElem);
    });

    // 更新单独的计数器
    const counters = {
        'memoryCount': achievements.memory,
        'decryptCount': achievements.decrypt,
        'characterCount': achievements.character,
        'missionCount': achievements.mission
    };

    Object.keys(counters).forEach(counterId => {
        const element = document.getElementById(counterId);
        if (element) {
            const data = counters[counterId];
            element.textContent = `${data.completed}/${data.total}`;
        }
    });

    // 更新迷你进度条
    const miniProgressBars = {
        'memoryProgressMini': achievements.memory,
        'decryptProgressMini': achievements.decrypt,
        'characterProgressMini': achievements.character,
        'missionProgressMini': achievements.mission
    };

    Object.keys(miniProgressBars).forEach(barId => {
        const element = document.getElementById(barId);
        if (element) {
            const data = miniProgressBars[barId];
            const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            element.style.width = percent + '%';
        }
    });
}

// 返回主界面
function goBack() {
    window.location.href = 'index.html';
}

window.goBack = goBack;

// 关闭存档详情
function closeSaveDetail() {
    const detailContent = document.querySelector('.detail-content');
    if (detailContent) {
        detailContent.style.opacity = '0';
        detailContent.style.transform = 'translateY(20px)';
    }

    setTimeout(() => {
        document.getElementById('saveDetail').style.display = 'none';
        currentSaveId = null;
    }, 300);
}

// 加载存档
function loadSave() {
    if (currentSaveId !== null) {
        alert(`正在加载存档 ${currentSaveId}...`);
        // 这里可以添加实际的加载逻辑
    }
}

// 删除存档
function deleteSave() {
    if (currentSaveId !== null) {
        document.getElementById('confirmModal').style.display = 'block';
    }
}

// 确认删除
function confirmDelete() {
    if (currentSaveId !== null) {
        const index = saveData.findIndex(s => s.id === currentSaveId);
        if (index !== -1) {
            saveData.splice(index, 1);
            generateSaveCards();
            alert(`存档 ${currentSaveId} 已删除`);
            closeSaveDetail();
        }
    }
    closeConfirmModal();
}

// 导出存档
function exportSave() {
    if (currentSaveId !== null) {
        const save = saveData.find(s => s.id === currentSaveId);
        if (save) {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(save, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `save_${currentSaveId}.json`);
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            dlAnchorElem.remove();
            alert(`存档 ${currentSaveId} 已导出`);
        }
    }
}

// 创建新存档
function createNewSave() {
    const newId = Math.max(...saveData.map(s => s.id)) + 1;
    const newSave = {
        id: newId,
        name: `新游戏 ${newId}`,
        level: '教程关卡',
        playTime: '0小时 0分钟',
        lastSave: new Date().toLocaleString('zh-CN'),
        mainProgress: 0,
        achievements: {
            memory: { completed: 0, total: 6 },
            decrypt: { completed: 0, total: 3 },
            character: { completed: 0, total: 4 },
            mission: { completed: 0, total: 3 }
        }
    };

    saveData.push(newSave);
    generateSaveCards();
    alert(`新存档 ${newId} 已创建`);
}

// 跳转到成就界面
function goToAchievements() {
    alert('跳转到成就界面');
    // 这里可以添加跳转到成就页面的逻辑
    // 例如：window.location.href = 'index.html';
}

// 关闭确认弹窗
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        closeConfirmModal();
    }
}

// 键盘事件
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        if (document.getElementById('confirmModal').style.display === 'block') {
            closeConfirmModal();
        } else if (document.getElementById('saveDetail').style.display === 'block') {
            closeSaveDetail();
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