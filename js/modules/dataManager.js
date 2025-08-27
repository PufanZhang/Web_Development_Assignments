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

        const initialData = { address: "", v1: 0, achievements: "", tools: "" };
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
    // 加载单个JSON文件的小工具函数
    async _fetchJson(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`文件加载失败: ${path}`);
        }
        return response.json();
    },

    // 加载一张完整的地图
    async loadMap(mapId) {
        try {
            // 1. 先获取地图的“图书卡”
            const mapInfo = await this._fetchJson(`data/maps/${mapId}.json`);

            // 2. 根据卡上的索引，创建去各个书架取书的“任务列表”
            const objectPromises = (mapInfo.objects || []).map(id =>
                this._fetchJson(`data/objects/${id}.json`)
            );
            const portalPromises = (mapInfo.portals || []).map(id =>
                this._fetchJson(`data/portals/${id}.json`)
            );

            // 3. 同时执行所有取书任务
            const objects = await Promise.all(objectPromises);
            const portals = await Promise.all(portalPromises);

            // 4. 把所有信息组装好，返回一张完整的、随时可用的地图数据
            return {
                name: mapInfo.name,
                walls: mapInfo.walls || [],
                objects: objects,
                portals: portals
            };

        } catch (error) {
            console.error(`加载地图 "${mapId}" 时发生严重错误:`, error);
            return null; // 加载失败
        }
    },

    // 加载故事剧本（会被 DialogueManager 调用）
    async loadStory(storyKey) {
        try {
            return await this._fetchJson(`data/stories/${storyKey}.json`);
        } catch (error) {
            console.error(`加载故事 "${storyKey}" 失败:`, error);
            return null;
        }
    }
};

// --- 游戏存档模块 ---
export const gameState = {
    save(username, mapId, position) {
        try {
            const dataString = localStorage.getItem(username + "@data");
            if (!dataString) return;
            const data = JSON.parse(dataString);
            data.address = { map: mapId, x: position.x, y: position.y };
            localStorage.setItem(username + "@data", JSON.stringify(data));
        } catch(e) {
            console.error("存档失败:", e);
        }
    },

    load(username) {
        try {
            const dataString = localStorage.getItem(username + "@data");
            if (!dataString) return null;
            const data = JSON.parse(dataString);
            return data.address || null;
        } catch(e) {
            console.error("读档失败:", e);
            return null;
        }
    }
};

// 新增一个获取当前用户的辅助函数
export function getCurrentUser() {
    return localStorage.getItem("user");
}