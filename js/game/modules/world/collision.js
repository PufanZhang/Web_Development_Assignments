function isRectColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

export function handlePlayerCollision(player, walls) {
    const originalX = player.x;
    const originalY = player.y;

    // 步骤 1: 处理X轴的移动和碰撞
    const playerXRect = { x: player.targetX, y: originalY, width: player.width, height: player.height };

    let finalX = player.targetX; // 假设目标X坐标有效

    for (const wall of walls) {
        if (isRectColliding(playerXRect, wall)) {
            if (player.targetX > originalX) {
                finalX = wall.x - player.width;
            } else if (player.targetX < originalX) {
                finalX = wall.x + wall.width;
            }
            break;
        }
    }

    // 立刻应用经过X轴校正后的位置
    player.x = finalX;

    // 步骤 2: 处理Y轴的移动和碰撞
    const playerYRect = { x: player.x, y: player.targetY, width: player.width, height: player.height };

    let finalY = player.targetY; // 假设目标Y坐标有效

    for (const wall of walls) {
        if (isRectColliding(playerYRect, wall)) {
            if (player.targetY > originalY) {
                finalY = wall.y - player.height;
            } else if (player.targetY < originalY) {
                finalY = wall.y + wall.height;
            }
            break;
        }
    }

    // 应用经过Y轴校正后的位置
    player.y = finalY;

    // 步骤 3: 只有在最终位置发生变化时才更新样式，以优化性能
    if (player.x !== originalX || player.y !== originalY) {
        player.updateStyle();
    }
}