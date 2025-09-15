import { debugManager } from './debug.js';
import { achievementNotifier } from './achievementNotifier.js';
import { player } from "./world/player.js";

window.playerDataCache = null;
const onValueChangeCallbacks = [];

// --- 辅助函数：统一处理 API 请求 ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem("jwt_token");
    const headers = {
        'Content-Type': 'application/json',
    };
    // 如果 token 存在，就把它加到请求头里
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`/api${endpoint}`, options);
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return true;
        }
        return await response.json();
    } catch (error) {
        console.error(`Network Error on ${method} ${endpoint}:`, error);
        alert('网络连接错误，请检查服务器是否开启！');
        return null;
    }
}

// --- 用户认证模块 ---
export const auth = {
    async register(username, password) {
        // 注册成功后直接返回完整的响应体，包含 token
        return await apiRequest('/auth/register', 'POST', {username, password});
    },

    async login(username, password) {
        // 登录成功后直接返回完整的响应体，包含 token
        return await apiRequest('/auth/login', 'POST', {username, password});
    },

    async loginWithToken(token) {
        return await apiRequest('/auth/login_with_token', 'POST', {token});
    },

    async deletePlayer(username) {
        console.log(`正在向服务器请求注销用户: ${username}...`);
        // 后端需要 token 来验证用户身份，需要 username 来做二次确认
        return await apiRequest('/auth/delete_player', 'POST', { username });
    }
};

// --- 资源加载器 ---
export const loader = {
    async loadMap(mapId) {
        console.log(`向服务器请求地图 ${mapId} 的打包数据...`);
        const packedData = await apiRequest(`/map_data/${mapId}`);
        if (packedData) {
            console.log(`✅ 成功接收到地图 ${mapId} 的数据包!`);
        }
        return packedData;
    },

    async loadStory(storyKey) {
        try {
            const response = await fetch(`data/stories/${storyKey}.json`);
            if (!response.ok) throw new Error(`文件加载失败: ${storyKey}`);
            return await response.json();
        } catch (error) {
            console.error(`加载故事 "${storyKey}" 失败:`, error);
            return null;
        }
    }
};

// --- 游戏存档模块 ---
export const gameState = {
    onValueChange(callback) {
        if (typeof callback === 'function') {
            onValueChangeCallbacks.push(callback);
        }
    },

    // 从后端加载玩家数据, username 会从 token 中解析，不需要作为参数
    async loadPlayerData() {
        console.log(`正在从服务器加载当前玩家的数据...`);
        // 后端会根据 token 里的信息来加载正确的玩家数据
        const data = await apiRequest(`/player/load`);
        if (data) {
            window.playerDataCache = data;
            console.log("玩家数据加载并缓存成功！", window.playerDataCache);
        }
        return data;
    },

    // 只更新本地缓存，不需要 username
    saveLocation(mapId, position) {
        if (!window.playerDataCache) {
            console.warn("玩家数据缓存不存在，无法更新位置。");
            return;
        }
        window.playerDataCache.address = { map: mapId, x: position.x, y: position.y };
    },

    // 从缓存中读取，也不需要 username
    loadLocation() {
        return window.playerDataCache ? (window.playerDataCache.address || null) : null;
    },

    // --- 数值系统核心函数 ---

    // 获取特定数值 (现在从缓存中读取)
    getValue(valueName) {
        if (!window.playerDataCache) {
            console.warn(`无法获取数值 [${valueName}]，因为玩家数据未加载。`);
            return 0;
        }
        const value = window.playerDataCache.values?.[valueName] || 0;
        debugManager.updateValue(valueName, value);
        return value;
    },

    // 修改特定数值 (现在通过 API 与后端同步)
    async modifyValue(username, valueName, amount) {
        if (!window.playerDataCache) {
            console.error("无法修改数值，玩家数据未加载！");
            return;
        }
        if (amount){
            console.log(`请求修改数值 [${valueName}]，变化量: ${amount}`);
            const response = await apiRequest('/player/modify_value', 'POST', {
                username,
                valueName,
                amount
            });

            if (response) {
                const newValue = response.newValue;
                if (window.playerDataCache) {
                    window.playerDataCache.values[valueName] = newValue;
                }
                debugManager.updateValue(valueName, newValue);
                console.log(`数值 [${valueName}] 同步成功，新值: ${newValue}`);
                if (response.unlockedAchievements && response.unlockedAchievements.length > 0) {
                    console.log(`🎉 恭喜！解锁了 ${response.unlockedAchievements.length} 个新成就!`);
                    response.unlockedAchievements.forEach(ach => {
                        achievementNotifier.show(ach);
                    });
                }
                console.log("数值已变更，正在触发回调...");
                onValueChangeCallbacks.forEach(cb => cb());
            }
        }
    },

    recordObjectRemoval(mapId, objectId) {
        if (!window.playerDataCache) {
            console.warn("玩家数据缓存不存在，无法记录物体移除。");
            return;
        }
        // 确保 mapStates 对象的存在
        if (!window.playerDataCache.mapStates) {
            window.playerDataCache.mapStates = {};
        }
        // 确保当前地图的状态容器存在
        if (!window.playerDataCache.mapStates[mapId]) {
            window.playerDataCache.mapStates[mapId] = { removedObjects: [] };
        }
        // 将物体 ID 添加到“已移除”列表中，防止重复添加
        if (!window.playerDataCache.mapStates[mapId].removedObjects.includes(objectId)) {
            window.playerDataCache.mapStates[mapId].removedObjects.push(objectId);
            console.log(`[存档缓存] 物体 ${objectId} 在地图 ${mapId} 上已被标记为移除。`);
        }
    },

    getRemovedObjects(mapId) {
        if (window.playerDataCache && window.playerDataCache.mapStates && window.playerDataCache.mapStates[mapId]) {
            return window.playerDataCache.mapStates[mapId].removedObjects || [];
        }
        return []; // 如果没有记录，返回空数组
    },

    async createSaveFile(saveName) {
        if (!window.playerDataCache) {
            console.error("无法创建手动存档，因为玩家数据缓存不存在！");
            alert("存档失败：玩家数据未加载。");
            return;
        }
        console.log(`正在创建手动存档，名称: ${saveName}...`);
        this.saveLocation(window.playerDataCache.address.map, { x: player.x, y: player.y });
        const response = await apiRequest(`/player/savefile/${saveName}`, 'POST', window.playerDataCache);
        if (response) {
            console.log(`✅ 手动存档 [${saveName}] 创建成功！`);
        } else {
            console.error(`手动存档 [${saveName}] 创建失败。`);
        }
    },

    async loadSaveFile(saveName) {
        console.log(`正在加载手动存档，名称: [${saveName}]...`);
        const response = await apiRequest(`/player/loadfile/${saveName}`, 'POST');
        if (response) {
            console.log(`✅ 手动存档 [${saveName}] 读取成功！`);
            return true;
        } else {
            console.error(`手动存档 [${saveName}] 读取失败。`);
            return false;
        }
    },

    async getAllSaveFiles() {
        console.log("正在向服务器请求所有存档信息...");
        const data = await apiRequest('/player/enquire_all_savefiles');
        if (data) {
            console.log("✅ 成功获取所有存档信息！", data);
        }
        return data;
    },

    async getFormattedPlaytime() {
        console.log("正在向服务器请求游戏总时长...");
        const data = await apiRequest('/player/playtime');

        if (data && typeof data.totalPlayTimeSeconds === 'number') {
            const totalSeconds = data.totalPlayTimeSeconds;
            console.log(`✅ 成功获取游戏总时长: ${totalSeconds} 秒`);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return `${hours}小时${minutes}分钟${seconds}秒`;
        } else {
            console.error("获取游戏总时长失败或返回格式不正确。");
            return "无法获取";
        }
    },

    async getPlaytimeInSeconds() {
        console.log("正在向服务器请求原始游戏总时长(秒)...");
        const data = await apiRequest('/player/playtime');
        if (data && typeof data.totalPlayTimeSeconds === 'number') {
            return data.totalPlayTimeSeconds;
        }
        return 0; // 失败时返回0
    }
};

export const achievements = {
    async loadAll() {
        console.log("正在从服务器加载所有成就信息...");
        const data = await apiRequest(`/achievements/all`);
        if (data) {
            console.log("✅ 成功加载所有成就信息！", data);
        }
        return data;
    },

    async getCategoryCompletionCounts() {
        // 调用 loadAll 函数拿到所有数据
        const allAchievements = await this.loadAll();
        if (!allAchievements) {
            console.error("无法获取成就数据，无法计算完成数量。");
            return {};
        }

        const counts = {};
        // 遍历所有分类
        for (const category in allAchievements) {
            counts[category] = allAchievements[category].filter(ach => ach.completed).length;
        }

        console.log("✅ 各分类成就完成数统计完毕:", counts);
        return counts;
    }
};

// --- 辅助函数 ---
export function getCurrentUser() {
    return localStorage.getItem("user");
}