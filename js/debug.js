// --- 调试UI管理器 ---

const elements = {
    debugView: null // 等待初始化
};

// 用于存储和显示所有需要追踪的数值
const trackedValues = {};

function render() {
    if (!elements.debugView) return;
    // 将所有追踪的数值格式化后显示出来
    elements.debugView.innerHTML = Object.entries(trackedValues)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
}

export const debugManager = {
    init() {
        elements.debugView = document.getElementById('debug-view');
        if (elements.debugView) {
            console.log("调试窗口已启动！");
            render();
        }
    },

    // 外部调用此函数来更新（或添加）一个要追踪的数值
    updateValue(name, value) {
        trackedValues[name] = value;
        render(); // 每次更新后重新渲染
    }
};