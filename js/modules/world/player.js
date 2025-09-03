import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_SPEED } from '../../config.js';

export const player = {
    element: document.getElementById('player'),
    x: 400,
    y: 300,
    speed: PLAYER_SPEED,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    targetX: 0,
    targetY: 0,
    keysPressed: { w: false, a: false, s: false, d: false },

    init() {
        window.addEventListener('keydown', (e) => {
            if (this.keysPressed[e.key] !== undefined) {
                this.keysPressed[e.key] = true;
            }
        });
        window.addEventListener('keyup', (e) => {
            if (this.keysPressed[e.key] !== undefined) {
                this.keysPressed[e.key] = false;
            }
        });
        this.updateStyle();
    },

    update() {
        this.targetX = this.x;
        this.targetY = this.y;

        if (this.keysPressed.w) this.targetY -= this.speed;
        if (this.keysPressed.s) this.targetY += this.speed;
        if (this.keysPressed.a) this.targetX -= this.speed;
        if (this.keysPressed.d) this.targetX += this.speed;
    },

    updateStyle() {
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
        this.element.style.top = `${this.y}px`;
        this.element.style.left = `${this.x}px`;
    },

    hide() {
        this.element.style.display = 'none';
    },

    show() {
        this.element.style.display = 'block';
    }
};