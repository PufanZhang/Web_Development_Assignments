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

    let nextX = originalX;
    let nextY = originalY;

    if (player.keysPressed.w) nextY -= player.speed;
    if (player.keysPressed.s) nextY += player.speed;
    if (player.keysPressed.a) nextX -= player.speed;
    if (player.keysPressed.d) nextX += player.speed;

    // --- X轴碰撞检测 ---
    const playerXRect = { ...player, x: nextX, y: originalY };
    let collidedX = false;
    for (const wall of walls) {
        if (isRectColliding(playerXRect, wall)) {
            // 如果发生碰撞，就修正nextX的值，让其刚好贴在墙边
            if (nextX > originalX) { // 向右移动时撞墙
                nextX = wall.x - player.width;
                collidedX = true;
            } else if (nextX < originalX) { // 向左移动时撞墙
                nextX = wall.x + wall.width;
                collidedX = true;
            }
            break; // 找到一个碰撞就够了
        }
    }
    player.x = nextX;

    // --- Y轴碰撞检测 ---
    const playerYRect = { ...player, x: player.x, y: nextY };
    let collidedY = false;
    for (const wall of walls) {
        if (isRectColliding(playerYRect, wall)) {
            // 如果发生碰撞，就修正nextY的值
            if (nextY > originalY) { // 向下移动时撞墙
                nextY = wall.y - player.height;
                collidedY = true;
            } else if (nextY < originalY) { // 向上移动时撞墙
                nextY = wall.y + wall.height;
                collidedY = true;
            }
            break; // 找到一个碰撞就够了
        }
    }
    player.y = nextY;

    // 只有在位置实际发生变化时才更新样式
    if (player.x !== originalX || player.y !== originalY) {
        player.updateStyle();
    }
}