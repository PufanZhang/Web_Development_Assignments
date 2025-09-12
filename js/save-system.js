// 存档数据 - 删除支线和收集品进度
import { auth, gameState} from "./game/modules/dataManager.js";
import { audioManager } from "./game/modules/audioManager.js";
import { VOLUME, SAVE_MUSIC } from "./game/config.js";

let saveData = [];

// const saveData = [
//     {
//         id: 1,
//         name: '量子探索者',
//         level: '量子迷宫 - 第七层',
//         playTime: '24小时 36分钟',
//         lastSave: '2024-01-15 14:30',
//         mainProgress: 75,
//         achievements: {
//             memory: { completed: 3, total: 6 },
//             decrypt: { completed: 1, total: 3 },
//             character: { completed: 2, total: 4 },
//             mission: { completed: 2, total: 3 }
//         }
//     },
//     {
//         id: 2,
//         name: '数字游侠',
//         level: '虚拟城市 - 中央区',
//         playTime: '18小时 22分钟',
//         lastSave: '2024-01-14 20:15',
//         mainProgress: 45,
//         achievements: {
//             memory: { completed: 2, total: 6 },
//             decrypt: { completed: 0, total: 3 },
//             character: { completed: 1, total: 4 },
//             mission: { completed: 1, total: 3 }
//         }
//     },
//     {
//         id: 3,
//         name: '赛博武士',
//         level: '神经网络 - 深层节点',
//         playTime: '42小时 18分钟',
//         lastSave: '2024-01-13 16:45',
//         mainProgress: 90,
//         achievements: {
//             memory: { completed: 5, total: 6 },
//             decrypt: { completed: 3, total: 3 },
//             character: { completed: 4, total: 4 },
//             mission: { completed: 3, total: 3 }
//         }
//     }
// ];

let currentSaveId = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    audioManager.init(VOLUME);
    audioManager.playMusic(SAVE_MUSIC);
    const token = localStorage.getItem("jwt_token");
    if (token) {
        console.log("【main_menu.js】: 检测到 token，正在通知后端恢复在线状态...");
        gameState.loadPlayerData().then(playerData => {
            if (playerData) {
                console.log("【main_menu.js】: 后端状态已恢复。欢迎回来, ", playerData.username);
                loadAllSaveFiles();
            } else {
                console.alert("Token 无效或已过期，请重新登录。");
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }
    generateSaveCards();
});

async function loadAllSaveFiles() {
    const files = await gameState.getAllSaveFiles();
    if (files) {
        // 转换数据格式以匹配前端
        saveData = files.map(file => ({
            id: file.id,
            name: file.fileName,
            level: file.location,
            lastSave: file.saveTime,
            mainProgress: file.progress,
            description: file.description,
        }));
        generateSaveCards();
    }
}

function generateSaveCards() {
    const saveGrid = document.getElementById('saveGrid');
    const noSavesMessage = document.getElementById('noSavesMessage');
    saveGrid.innerHTML = '';

    if (saveData && saveData.length > 0) {
        // 如果有存档，显示存档列表，隐藏提示信息
        noSavesMessage.style.display = 'none';
        saveGrid.style.display = 'grid'; // 确保网格是可见的

        saveData.forEach(save => {
            const saveCard = document.createElement('div');
            saveCard.className = 'save-card';
            saveCard.onclick = () => openSaveDetail(save.id);

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
                        <span class="stat-mini-label">存档时间</span>
                        <span class="stat-mini-value">${save.lastSave}</span>
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
    } else {
        // 如果没有存档，隐藏存档列表，显示提示信息
        noSavesMessage.style.display = 'block';
        saveGrid.style.display = 'none'; // 隐藏空的网格
    }
}

// 打开存档详情
function openSaveDetail(saveId) {
    currentSaveId = saveId;
    const save = saveData.find(s => s.id === saveId);
    if (!save) return;

    // 更新存档信息
    document.getElementById('avatarText').textContent = `存档 ${save.id.toString().padStart(2, '0')}`;
    document.getElementById('saveName').textContent = save.name;
    document.getElementById('lastSave').textContent = save.lastSave;
    document.getElementById('currentLevel').textContent = save.level;
    const descriptionElement = document.getElementById('saveDescription');
    if(descriptionElement) {
        descriptionElement.textContent = save.description;
    }


    // 只更新主线进度条
    updateProgressBar('mainProgressBar', save.mainProgress);
    document.getElementById('mainProgress').textContent = save.mainProgress + '%';

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


// 返回主界面
function goBack() {
    window.location.href = 'index.html';
}

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

async function loadSave() {
    if (currentSaveId !== null) {
        const save = saveData.find(s => s.id === currentSaveId);
        if (save) {
            const success = await gameState.loadSaveFile(save.name);
            if (success) {
                document.getElementById('loadConfirmModal').style.display = 'block';
            }
        }
    }
}

// 关闭确认弹窗
function closeLoadConfirmModal() {
    document.getElementById('loadConfirmModal').style.display = 'none';
}

function enterGame() {
    console.log("正在进入游戏...");
    window.location.href = 'game.html';
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
window.goBack = goBack;
window.closeSaveDetail = closeSaveDetail;
window.loadSave = loadSave;
window.closeLoadConfirmModal = closeLoadConfirmModal;
window.enterGame = enterGame;
window.addEventListener('beforeunload', logout);