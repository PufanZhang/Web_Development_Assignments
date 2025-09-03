import {debugManager} from '../debug.js';

window.playerDataCache = null;

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
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`API Error on ${method} ${endpoint}:`, errorData.message);
            // 如果是 401 未授权，可能是 token 过期，提示并跳转到登录页
            if (response.status === 401) {
                alert("登录状态已过期，请重新登录！");
                localStorage.clear(); // 清理过期的 token
                window.location.href = 'login.html';
            } else {
                alert(`请求失败: ${errorData.message}`);
            }
            return null;
        }
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
    async savePlayerData(playerData) {
        console.log("正在保存玩家数据到服务器...", playerData);
        await apiRequest('/player/save', 'POST', playerData);
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
        console.log(`正在创建手动存档，名称: [${saveName}]...`);
        this.saveLocation(window.playerDataCache.address.map, { x: player.x, y: player.y });
        const response = await apiRequest(`/player/savefile/${saveName}`, 'POST', window.playerDataCache);
        if (response) {
            console.log(`✅ 手动存档 [${saveName}] 创建成功！`);
            alert(`存档点已保存：${saveName}`);
        } else {
            console.error(`手动存档 [${saveName}] 创建失败。`);
            alert("存档失败，请稍后再试。");
        }
    }
};

// --- 辅助函数 ---
export function getCurrentUser() {
    return localStorage.getItem("user");
}