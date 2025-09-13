import { auth, gameState } from "./game/modules/dataManager.js";
import { audioManager } from "./game/modules/audioManager.js";
import { VOLUME, SAVE_MUSIC } from "./game/config.js";

let saveData = [];
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
                const hasReachedEnd = gameState.getValue('reachEnd');
                if (hasReachedEnd === 1) {
                    // 如果 reachEnd 是 1，说明已经通过关，正常加载存档列表
                    console.log("检测到通关记录，存档系统完全开放！");
                    loadAllSaveFiles();
                } else {
                    // 如果不是 1，说明还没通过关，显示限制弹窗
                    console.log("未检测到通关记录，限制读档功能。");
                    document.getElementById('saveContainer').classList.add('blurred'); // 虚化背景
                    document.getElementById('restrictionModal').style.display = 'flex'; // 显示弹窗
                }
            } else {
                console.alert("Token 无效或已过期，请重新登录。");
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }
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

// 点击模态框外部关闭 (只对加载确认弹窗有效)
window.onclick = function(event) {
    const loadModal = document.getElementById('loadConfirmModal');
    if (event.target === loadModal) {
        closeLoadConfirmModal();
    }
}

// 键盘事件 (Escape 键关闭)
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const loadModal = document.getElementById('loadConfirmModal');
        const saveDetail = document.getElementById('saveDetail');

        if (loadModal.style.display === 'flex') {
            closeLoadConfirmModal();
        } else if (saveDetail.style.display === 'block') {
            closeSaveDetail();
            window.location.href = 'index.html';
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