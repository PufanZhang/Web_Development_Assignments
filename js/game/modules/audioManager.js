const FADE_DURATION = 2000; // 淡入淡出持续时间 (2秒)
const FADE_INTERVAL = 50;   // 音量更新频率 (每50毫秒)

let currentAudio = null;    // 当前正在播放的 Audio 元素
let targetVolume = 0.3;     // 目标音量 (0.0 to 1.0)

/**
 * 音量渐变辅助函数
 * @param {HTMLAudioElement} audio - 要操作的音频元素
 * @param {number} startVolume - 起始音量
 * @param {number} endVolume - 结束音量
 * @param {number} duration - 持续时间 (毫秒)
 * @param {function} onComplete - 渐变完成后的回调
 */
function fade(audio, startVolume, endVolume, duration, onComplete) {
    let currentVolume = startVolume;
    const steps = duration / FADE_INTERVAL;
    const volumeStep = (endVolume - startVolume) / steps;

    audio.volume = currentVolume; // 立即设置初始音量

    const fadeInterval = setInterval(() => {
        currentVolume += volumeStep;

        // 检查是否到达或超过目标音量
        if ((volumeStep > 0 && currentVolume >= endVolume) || (volumeStep < 0 && currentVolume <= endVolume)) {
            currentVolume = endVolume; // 精确设置最终音量
            clearInterval(fadeInterval);
            if (onComplete) {
                onComplete();
            }
        }
        // 限制音量在 0.0 和 1.0 之间
        audio.volume = Math.max(0, Math.min(1, currentVolume));
    }, FADE_INTERVAL);
}

export const audioManager = {
    /**
     * 初始化音频管理器
     * @param {number} initialVolume - 初始背景音乐音量
     */
    init(initialVolume = 0.5) {
        targetVolume = initialVolume;
        console.log("🎵 音频管理器已初始化。");
    },

    /**
     * 播放或切换背景音乐
     * @param {string | null} src - 音乐文件的路径, 如果为 null 则停止播放
     */
    playMusic(src) {
        // --- 淡出当前音乐 ---
        if (currentAudio) {
            const oldAudio = currentAudio;
            console.log(`正在淡出: ${oldAudio.src.split('/').pop()}`);
            fade(oldAudio, oldAudio.volume, 0, FADE_DURATION, () => {
                oldAudio.pause();
                oldAudio.src = ''; // 释放资源
                console.log("旧音乐已停止。");
            });
        }

        // --- 淡入新音乐 ---
        console.log(`准备播放新音乐: ${src}`);
        const newAudio = new Audio(src);
        newAudio.loop = true;
        currentAudio = newAudio;

        // 现代浏览器通常需要用户交互后才能播放音频，我们尝试播放，如果失败则在控制台提示
        const playPromise = newAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log(`正在淡入: ${src.split('/').pop()}`);
                fade(newAudio, 0, targetVolume, FADE_DURATION, null);
            }).catch(error => {
                console.warn(`无法自动播放背景音乐: ${error.message}。通常需要用户与页面进行一次交互。`);
                // 监听第一次用户交互事件来尝试再次播放
                const playOnFirstInteraction = () => {
                    newAudio.play().then(() => {
                        console.log(`用户交互后，正在淡入: ${src.split('/').pop()}`);
                        fade(newAudio, 0, targetVolume, FADE_DURATION, null);
                    });
                };
                window.addEventListener('click', playOnFirstInteraction, { once: true });
                window.addEventListener('keydown', playOnFirstInteraction, { once: true });
            });
        }
    }
};