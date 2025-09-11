// import { player } from "../../js/modules/world/player.js"
import { fightManager } from "./fight.js"
import { minigameLoader } from "../../js/game/modules/minigameLoader.js";

// --- 全局游戏状态 ---
// window.gameMode = "map" // 'map' 或 'dialogue'
//let currentUser = null
// --- 当前地图的状态容器 ---
// let currentMap = {
//   id: null,
//   walls: [],
//   interactableObjects: [],
// }
// --- 游戏初始化 ---
async function initializeGame() {
    fightManager.start()
    const startButton = document.getElementById("start-game")
    const backButton = document.getElementById("back-game")
    startButton.addEventListener("click", () => {
        fightManager.start()
    })
    backButton.addEventListener("click", () => {
        const result = { success: false };
        window.parent.postMessage({ type: 'closeMinigame', result: result }, '*')
    })
}

document.addEventListener("DOMContentLoaded", initializeGame)
