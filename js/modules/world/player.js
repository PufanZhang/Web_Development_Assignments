export const player = {
    element: document.getElementById('player'),
    x: 400,
    y: 300,
    speed: 3,
    width: 50,
    height: 50,
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

    updateStyle() {
        this.element.style.top = `${this.y}px`;
        this.element.style.left = `${this.x}px`;
    }
};