// 成就数据 - 完全按照您要求的数量
import { auth, gameState} from "./modules/dataManager.js";

const achievementData = {
    memory: [
        {
            id: 1,
            name: '记忆碎片 Alpha',
            description: '发现了来自量子档案库的第一个记忆碎片。这个碎片包含了人类与星智慧体首次接触的回声，保存在结晶化的神经模式中。',
            completed: true,
            icon: '🌟'
        },
        {
            id: 2,
            name: '记忆碎片 Beta',
            description: '获取了包含童年经历的第二个记忆碎片，这些记忆被上传到神经网络中。这些保存的记忆展示了数字融合时代之前的生活。',
            completed: true,
            icon: '🎮'
        },
        {
            id: 3,
            name: '记忆碎片 Gamma',
            description: '访问了揭示量子革命记忆的第三个碎片。体验那些构建我们数字现实基础的人们的希望和梦想。',
            completed: false,
            icon: '⚛️'
        },
        {
            id: 4,
            name: '记忆碎片 Delta',
            description: '解锁了包含合成友谊协议的第四个碎片。见证意识转移早期人类与AI关系的演变过程。',
            completed: false,
            icon: '🔗'
        },
        {
            id: 5,
            name: '记忆碎片 Epsilon',
            description: '解码了保存第一个数字爱情故事的第五个碎片。这些记忆展示了情感连接如何在新时代超越物理界限。',
            completed: false,
            icon: '💫'
        },
        {
            id: 6,
            name: '完整档案',
            description: '成功将所有记忆碎片组装成主意识档案。你现在拥有人类经验和进化的完整数字历史。',
            completed: false,
            icon: '🧠'
        }
    ],
    decrypt: [
        {
            id: 1,
            name: '密码破解者',
            description: '使用基础神经接口和模式识别算法成功解密了你的第一个量子加密数据流。',
            completed: false,
            icon: '🔍'
        },
        {
            id: 2,
            name: '密码大师',
            description: '使用增强认知算法和深度学习神经网络破解了高级加密协议，进行复杂的模式分析。',
            completed: true,
            icon: '🧠'
        },
        {
            id: 3,
            name: '量子解码器',
            description: '掌握了所有三个级别的量子加密，获得了对机密数字档案和禁忌知识数据库的访问权限。',
            completed: false,
            icon: '⚛️'
        }
    ],
    character: [
        {
            id: 1,
            name: '解锁 ARIA-7',
            description: '成功激活了高级AI伙伴ARIA-7，配备预测算法和时间分析能力，用于战略任务规划。',
            completed: false,
            icon: '🤖'
        },
        {
            id: 2,
            name: '解锁 NEXUS',
            description: '启动了战术机器人NEXUS，这是一个配备先进武器系统和战场协调协议的战斗专用单位。',
            completed: false,
            icon: '⚔️'
        },
        {
            id: 3,
            name: '解锁 LUNA',
            description: '激活了量子法师LUNA，通过先进全息投影系统掌握数字法术和现实操控的大师。',
            completed: true,
            icon: '🔮'
        },
        {
            id: 4,
            name: '解锁 守护者',
            description: '唤醒了传说中的守护者协议，拥有全球防护能力和古代智慧档案的终极防御系统。',
            completed: false,
            icon: '🛡️'
        }
    ],
    mission: [
        {
            id: 1,
            name: '首次接触',
            description: '成功完成了你在数字领域的第一个任务，与量子意识网络建立了联系。',
            completed: true,
            icon: '🎯'
        },
        {
            id: 2,
            name: '深度渗透',
            description: '完成了高级隐秘任务，渗透安全数据要塞而未触发任何安全协议或警报。',
            completed: false,
            icon: '👁️'
        },
        {
            id: 3,
            name: '最终协议',
            description: '执行了终极任务序列，获得了对主AI网络的控制权，按照你的意志重塑数字宇宙。',
            completed: false,
            icon: '👑'
        }
    ]
};

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
        memory: '记忆碎片收集',
        decrypt: '解密大师',
        character: '角色收集者',
        mission: '任务指挥官'
    };
    title.textContent = categoryNames[category] || '成就详情';

    // 清空之前内容
    grid.innerHTML = '';

    // 生成成就项
    achievementData[category].forEach(ach => {
        const item = document.createElement('div');
        item.className = 'achievement-item';
        if (ach.completed) item.classList.add('completed');
        item.innerHTML = `
            <h4><span class="achievement-icon">${ach.icon}</span> ${ach.name}</h4>
            <p>${ach.description}</p>
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
        alert('系统：已在主界面');
    }
}

// 更新进度显示
function updateProgress() {
    ['memory', 'decrypt', 'character', 'mission'].forEach(category => {
        const total = achievementData[category].length;
        const completedCount = achievementData[category].filter(ach => ach.completed).length;
        const progressPercent = (completedCount / total) * 100;

        document.getElementById(`${category}-progress`).textContent = completedCount;
        const progressFill = document.querySelector(`.${category}-progress`);
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
    });
}

// 初始化进度条
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
    updateProgress();
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