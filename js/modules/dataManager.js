import { debugManager } from '../debug.js';

let playerDataCache = null;

// --- 辅助函数：统一处理 API 请求 ---
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`/api${endpoint}`, options);
        if (!response.ok) {
            // 如果服务器返回错误，这里统一处理
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            console.error(`API Error on ${method} ${endpoint}:`, errorData.message);
            alert(`请求失败: ${errorData.message}`);
            return null;
        }
        // 如果响应体为空 (例如 200 OK 但没有内容)，返回 true 表示成功
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
        // 使用新的 API 接口
        const response = await apiRequest('/auth/register', 'POST', { username, password });
        return response ? { success: response.success, message: response.message } : { success: false, message: "请求失败" };
    },

    async login(username, password) {
        // 使用新的 API 接口
        const response = await apiRequest('/auth/login', 'POST', { username, password });
        if (response && response.success) {
            // 登录成功后，依然在浏览器中记录当前用户名
            localStorage.setItem("user", username);
            return { success: true, message: "登录成功！" };
        }
        return { success: false, message: (response ? response.message : "请求失败") };
    }
};

// --- 资源加载器 ---
export const loader = {
    async loadMap(mapId) {
        // 一次性获取所有打包好的地图数据
        console.log(`向服务器请求地图 ${mapId} 的打包数据...`);
        const packedData = await apiRequest(`/map_data/${mapId}`);
        if (packedData) {
            console.log(`✅ 成功接收到地图 ${mapId} 的数据包!`);
        }
        return packedData; // 直接返回打包好的数据
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
    // 保存玩家的完整数据到后端
    async savePlayerData(username, playerData) {
        console.log("正在保存玩家数据到服务器...", playerData);
        await apiRequest('/player/save', 'POST', playerData);
    },

    // 从后端加载玩家的完整数据
    async loadPlayerData(username) {
        console.log(`正在从服务器加载玩家 ${username} 的数据...`);
        const data = await apiRequest(`/player/load/${username}`);
        if (data) {
            // 将加载到的数据存入我们的全局缓存
            playerDataCache = data;
            console.log("玩家数据加载并缓存成功！", playerDataCache);
        }
        return data;
    },

    // 保存玩家位置 (现在它会更新缓存，并在需要时由主逻辑触发完整保存)
    saveLocation(username, mapId, position) {
        if (!playerDataCache || playerDataCache.username !== username) {
            console.warn("玩家数据缓存不存在或用户不匹配，无法更新位置。");
            return;
        }
        playerDataCache.address = { map: mapId, x: position.x, y: position.y };
        // 注意：这里只更新了本地缓存，完整的保存将由 beforeunload 事件来处理
    },

    // 读取玩家位置 (现在从缓存中读取)
    loadLocation(username) {
        // 这个函数现在只是为了兼容旧的调用方式，返回缓存中的位置信息
        return playerDataCache ? (playerDataCache.address || null) : null;
    },

    // --- 数值系统核心函数 ---

    // 获取特定数值 (现在从缓存中读取)
    getValue(username, valueName) {
        if (!playerDataCache || playerDataCache.username !== username) {
            console.warn(`无法获取数值 [${valueName}]，因为玩家数据未加载。`);
            return 0; // 返回默认值
        }
        const value = playerDataCache.values?.[valueName] || 0;
        debugManager.updateValue(valueName, value);
        return value;
    },

    // 修改特定数值 (现在通过 API 与后端同步)
    async modifyValue(username, valueName, amount) {
        console.log(`请求修改数值 [${valueName}]，变化量: ${amount}`);
        const response = await apiRequest('/player/modify_value', 'POST', {
            username,
            valueName,
            amount
        });

        if (response) {
            // 用服务器返回的最新值来更新我们的本地缓存
            const newValue = response.newValue;
            if (playerDataCache) {
                playerDataCache.values[valueName] = newValue;
            }
            debugManager.updateValue(valueName, newValue);
            console.log(`数值 [${valueName}] 同步成功，新值: ${newValue}`);
        }
    }
};

// --- 辅助函数 ---
export function getCurrentUser() {
    return localStorage.getItem("user");
}