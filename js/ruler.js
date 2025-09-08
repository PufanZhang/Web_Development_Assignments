// /js/ruler.js

let canvas = null;
let ctx = null;
let gameContainer = null;

/**
 * 初始化标尺，获取DOM元素并设置初始尺寸。
 * 这个函数应该在游戏初始化时被调用一次。
 */
export function initDebugRuler() {
    canvas = document.getElementById('debug-ruler');
    gameContainer = document.getElementById('game-container');

    if (!canvas || !gameContainer) {
        console.error("无法找到标尺Canvas或游戏容器元素。");
        return;
    }

    ctx = canvas.getContext('2d');
    // 让Canvas的尺寸与视口保持一致
    canvas.width = gameContainer.offsetWidth;
    canvas.height = gameContainer.offsetHeight;
}

/**
 * 根据当前的镜头坐标，更新并重绘标尺。
 * 这个函数应该在游戏循环中每一帧被调用。
 * @param {number} cameraX - 镜头在地图上的X坐标
 * @param {number} cameraY - 镜头在地图上的Y坐标
 */
export function updateDebugRuler(cameraX, cameraY) {
    if (!ctx) return;

    const viewportWidth = canvas.width;
    const viewportHeight = canvas.height;

    // 每一帧开始前，清空整个画布
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    const majorGridStep = 100;
    const minorGridStep = 50;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px Courier New';
    ctx.lineWidth = 1;

    // --- 绘制垂直线和X坐标 ---
    // 计算视野内第一条可见的垂直线
    const startX = Math.floor(cameraX / minorGridStep) * minorGridStep;

    for (let x = startX; x < cameraX + viewportWidth; x += minorGridStep) {
        // 将地图坐标转换为画布上的坐标
        const canvasX = x - cameraX;

        ctx.beginPath();
        ctx.moveTo(canvasX, 0);

        if (x % majorGridStep === 0) {
            ctx.lineTo(canvasX, viewportHeight);
            ctx.fillText(x.toString(), canvasX + 5, 15);
        } else {
            ctx.lineTo(canvasX, 15);
        }
        ctx.stroke();
    }

    // --- 绘制水平线和Y坐标 ---
    // 计算视野内第一条可见的水平线
    const startY = Math.floor(cameraY / minorGridStep) * minorGridStep;

    for (let y = startY; y < cameraY + viewportHeight; y += minorGridStep) {
        // 将地图坐标转换为画布上的坐标
        const canvasY = y - cameraY;

        ctx.beginPath();
        ctx.moveTo(0, canvasY);

        if (y % majorGridStep === 0) {
            ctx.lineTo(viewportWidth, canvasY);
            if (y > 0) ctx.fillText(y.toString(), 5, canvasY - 5);
        } else {
            ctx.lineTo(15, canvasY);
        }
        ctx.stroke();
    }
}