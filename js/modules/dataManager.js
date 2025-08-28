import { debugManager } from '../debug.js';

// --- 安全的哈希函数 ---
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 用户认证模块 ---
export const auth = {
    async register(username, password) {
        if (localStorage.getItem(username + "@login")) {
            return { success: false, message: "该用户名已被占用" };
        }
        const hashedPassword = await hashPassword(password);
        localStorage.setItem(username + "@login", hashedPassword);

        // 初始化玩家数据，包含位置、成就、道具和一个空的数值容器
        const initialData = {
            address: { map: "map1", x: 400, y: 300 },
            values: {}, // 新增：用于存放所有游戏数值的容器
            achievements: "",
            tools: ""
        };
        localStorage.setItem(username + "@data", JSON.stringify(initialData));
        return { success: true, message: "用户注册成功" };
    },

    async login(username, password) {
        const storedHash = localStorage.getItem(username + "@login");
        if (!storedHash) {
            return { success: false, message: "该用户不存在" };
        }
        const inputHash = await hashPassword(password);
        if (storedHash === inputHash) {
            localStorage.setItem("user", username);
            return { success: true, message: "登录成功！" };
        }
        return { success: false, message: "密码错误" };
    }
};

// --- 资源加载器 ---
export const loader = {
    // ... (这部分代码没有变化)
    async _fetchJson(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`文件加载失败: ${path}`);
        }
        return response.json();
    },
    async loadMap(mapId) {
        try {
            const mapInfo = await this._fetchJson(`data/maps/${mapId}.json`);
            const objectPromises = (mapInfo.objects || []).map(id =>
                this._fetchJson(`data/objects/${id}.json`)
            );
            const objects = await Promise.all(objectPromises);
            return {
                name: mapInfo.name,
                background: mapInfo.background,
                walls: mapInfo.walls || [],
                objects: objects
            };
        } catch (error) {
            console.error(`加载地图 "${mapId}" 时发生严重错误:`, error);
            return null;
        }
    },
    async loadStory(storyKey) {
        try {
            return await this._fetchJson(`data/stories/${storyKey}.json`);
        } catch (error) {
            console.error(`加载故事 "${storyKey}" 失败:`, error);
            return null;
        }
    }
};

// --- 游戏存档模块 (重构) ---
export const gameState = {
    // 获取当前用户的完整数据
    _getPlayerData(username) {
        const dataString = localStorage.getItem(username + "@data");
        return dataString ? JSON.parse(dataString) : null;
    },

    // 保存当前用户的完整数据
    _savePlayerData(username, data) {
        localStorage.setItem(username + "@data", JSON.stringify(data));
    },

    // 保存玩家位置
    saveLocation(username, mapId, position) {
        try {
            const data = this._getPlayerData(username);
            if (!data) return;
            data.address = { map: mapId, x: position.x, y: position.y };
            this._savePlayerData(username, data);
        } catch(e) {
            console.error("存档位置失败:", e);
        }
    },

    // 读取玩家位置
    loadLocation(username) {
        try {
            const data = this._getPlayerData(username);
            return data ? (data.address || null) : null;
        } catch(e) {
            console.error("读档位置失败:", e);
            return null;
        }
    },

    // --- 数值系统核心函数 ---

    // 获取特定数值
    getValue(username, valueName) {
        const data = this._getPlayerData(username);
        const value = data?.values?.[valueName] || 0;
        // 同时更新一下调试窗口，保证刷新后数值正确
        debugManager.updateValue(valueName, value);
        return value;
    },

    // 修改特定数值（增加或减少）
    modifyValue(username, valueName, amount) {
        try {
            const data = this._getPlayerData(username);
            if (!data) return;
            if (!data.values) {
                data.values = {};
            }
            const currentValue = data.values[valueName] || 0;
            const newValue = currentValue + amount;
            data.values[valueName] = newValue;
            this._savePlayerData(username, data);

            debugManager.updateValue(valueName, newValue);

            console.log(`数值[${valueName}] 变化: ${amount}。当前值: ${newValue}`);
        } catch(e) {
            console.error(`修改数值 "${valueName}" 失败:`, e);
        }
    }
};

// --- 辅助函数 ---
export function getCurrentUser() {
    return localStorage.getItem("user");
}