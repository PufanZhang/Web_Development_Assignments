import { DEBUG_TRACKED_VALUES } from '../config.js';

const elements = {
    debugView: null // 等待初始化
};

// 用于存储和显示所有需要追踪的数值
const trackedValues = {};

// 初始化 trackedValues，确保所有要追踪的值都有一个初始位置
function initializeTrackedValues() {
    for (const key in DEBUG_TRACKED_VALUES) {
        trackedValues[key] = 'N/A'; // 设置一个默认值
    }
}

function render() {
    if (!elements.debugView) return;
    // 使用 DEBUG_TRACKED_VALUES 来决定显示哪些值以及它们的中文名
    elements.debugView.innerHTML = Object.entries(DEBUG_TRACKED_VALUES)
        .map(([key, chineseName]) => `${chineseName}: ${trackedValues[key] !== 'N/A' ? trackedValues[key] : '...'}`)
        .join('<br>');
}

export const debugManager = {
    init() {
        elements.debugView = document.getElementById('debug-view');
        if (elements.debugView) {
            console.log("调试窗口已启动！");
            initializeTrackedValues();
            render();
        }
    },

    // 外部调用此函数来更新一个要追踪的数值
    updateValue(name, value) {
        // 只有当传入的 name 在追踪列表中时，才更新并重新渲染
        if (DEBUG_TRACKED_VALUES.hasOwnProperty(name)) {
            trackedValues[name] = value;
            render();
        }
    }
};