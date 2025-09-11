// 地图配置和数据
export const MAP_CONFIG = {
    width: 4000, // 地图总宽度
    height: 400, // 地图高度
    gravity: 0.5, // 重力系数
    player: {
        width: 20,
        height: 30,
        speed: 3,
        jumpForce: 12
    }
};

// 平台和陷阱数据
export const MAP_DATA = {
    // 地面平台
    platforms: [
        // 起始区域 - 飞船
        { x: 0, y: 350, width: 200, height: 50, type: "ground" },
        // 第一段跳跃
        { x: 250, y: 320, width: 100, height: 30, type: "platform" },
        { x: 400, y: 290, width: 100, height: 30, type: "platform" },
        { x: 550, y: 260, width: 100, height: 30, type: "platform" },
        // 第一个陷阱区域
        { x: 700, y: 350, width: 200, height: 50, type: "ground" },
        // 第二个陷阱区域 - 带有裂缝的地面
        { x: 950, y: 350, width: 50, height: 50, type: "ground" },
        { x: 1050, y: 350, width: 100, height: 50, type: "ground" },
        // 空中平台
        { x: 1200, y: 300, width: 80, height: 20, type: "platform" },
        { x: 1350, y: 250, width: 80, height: 20, type: "platform" },
        { x: 1500, y: 200, width: 80, height: 20, type: "platform" },
        // 回到地面
        { x: 1650, y: 350, width: 300, height: 50, type: "ground" },
        // 激光陷阱区域
        { x: 2000, y: 350, width: 200, height: 50, type: "ground" },
        // 最后一段跳跃
        { x: 2300, y: 300, width: 80, height: 20, type: "platform" },
        { x: 2450, y: 250, width: 80, height: 20, type: "platform" },
        { x: 2600, y: 200, width: 80, height: 20, type: "platform" },
        // 终点区域 - 基地
        { x: 2750, y: 350, width: 250, height: 50, type: "ground" }
    ],

    // 陷阱
    traps: [
        // 坠落陷阱 (有裂缝的地面)
        { x: 1000, y: 350, width: 50, height: 50, type: "fall-trap" },
        // 弹簧陷阱
        { x: 750, y: 300, width: 30, height: 30, type: "spring-trap" },
        { x: 850, y: 300, width: 30, height: 30, type: "spring-trap" },
        // 重力陷阱
        { x: 1250, y: 150, width: 40, height: 40, type: "gravity-trap" },
        { x: 1400, y: 100, width: 40, height: 40, type: "gravity-trap" },
        // 激光陷阱
        { x: 2050, y: 300, width: 30, height: 30, type: "laser-trap", direction: "down" },
        { x: 2150, y: 300, width: 30, height: 30, type: "laser-trap", direction: "down" }
    ],

    // 存档点 (隐性)
    checkpoints: [
        { x: 200, y: 300 },  // 起始点后
        { x: 650, y: 300 },  // 第一个陷阱区域前
        { x: 1600, y: 300 }, // 重力陷阱后
        { x: 2250, y: 300 }  // 激光陷阱后
    ],

    // 起点和终点
    startPoint: { x: 50, y: 300 },
    endPoint: { x: 2850, y: 300, width: 100, height: 50 }
};

// 星空背景的星星
export const STARS = [];
// 生成随机星星
for (let i = 0; i < 100; i++) {
    STARS.push({
        x: Math.random() * MAP_CONFIG.width,
        y: Math.random() * MAP_CONFIG.height / 2,
        size: Math.random() * 2 + 1,
        brightness: Math.random() * 0.5 + 0.5
    });
}