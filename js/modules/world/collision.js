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

    // 1. 计算玩家“希望”移动到的下一个位置
    let targetX = originalX;
    let targetY = originalY;

    if (player.keysPressed.w) targetY -= player.speed;
    if (player.keysPressed.s) targetY += player.speed;
    if (player.keysPressed.a) targetX -= player.speed;
    if (player.keysPressed.d) targetX += player.speed;

    // 2. 独立检测X轴的碰撞，并确定最终的X坐标
    let finalX = targetX;
    const playerXRect = { ...player, x: targetX, y: originalY };
    for (const wall of walls) {
        if (isRectColliding(playerXRect, wall)) {
            if (targetX > originalX) { // 向右撞墙
                finalX = wall.x - player.width;
            } else if (targetX < originalX) { // 向左撞墙
                finalX = wall.x + wall.width;
            }
            break;
        }
    }

    // 3. 独立检测Y轴的碰撞，并确定最终的Y坐标
    let finalY = targetY;
    const playerYRect = { ...player, x: finalX, y: targetY }; // X用的是修正后的finalX，防止穿墙角
    for (const wall of walls) {
        if (isRectColliding(playerYRect, wall)) {
            if (targetY > originalY) { // 向下撞墙
                finalY = wall.y - player.height;
            } else if (targetY < originalY) { // 向上撞墙
                finalY = wall.y + wall.height;
            }
            break;
        }
    }

    // 4. 最后，一次性更新玩家的最终位置
    player.x = finalX;
    player.y = finalY;

    // 只有在位置实际发生变化时才更新样式，避免不必要的渲染
    if (player.x !== originalX || player.y !== originalY) {
        player.updateStyle();
    }
}