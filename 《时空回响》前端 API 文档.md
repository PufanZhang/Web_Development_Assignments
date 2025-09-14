# 《时空回响》前端 API 文档



### **代码逻辑总览**



这个游戏的前端部分可以分为以下几个核心组成部分：

1. **游戏主逻辑 (Game Core):**
   - 位于 `js/game/main.js`，是游戏的入口和主循环。
   - 负责初始化游戏、加载地图、处理玩家输入、碰撞检测以及调用其他模块来更新游戏状态。
   - 通过一个 `gameLoop` 函数来不断刷新游戏画面和状态。
   - 管理一个全局的游戏模式状态 `window.gameMode`（例如 'map', 'dialogue', 'minigame'），以控制当前玩家可以进行的操作。
2. **数据管理器 (Data Manager):**
   - 位于 `js/game/modules/dataManager.js`，是整个游戏的数据中枢。
   - 封装了所有与后端 API 的交互，包括用户认证、玩家数据读写、存档管理、地图和成就数据加载等。
   - 使用 `apiRequest` 辅助函数统一处理 fetch 请求，并自动附加 JWT token。
   - 在前端维护一个 `window.playerDataCache` 对象作为玩家数据的缓存，减少不必要的后端请求。
3. **世界与交互 (World & Interaction):**
   - **地图构建 (`builder.js`):** 负责根据从后端获取的数据动态创建地图元素，包括背景、墙体和可交互对象。
   - **玩家控制 (`player.js`):** 定义了玩家对象的属性（如位置、速度）和方法（如移动、更新样式）。
   - **碰撞检测 (`collision.js`):** 提供了矩形碰撞检测逻辑，用于处理玩家与墙体之间的碰撞。
   - **交互系统 (`interaction.js`):** 检测玩家与可交互对象的距离，当玩家靠近时显示交互提示，并处理交互事件（通常是触发对话）。
4. **对话与剧情 (Dialogue & Story):**
   - **对话管理器 (`dialogue.js`):** 负责加载和管理故事情节（以 JSON 格式定义）。
   - 控制对话的流程，包括显示文本、角色立绘、处理玩家选项以及执行对话结束后的动作（如传送、存档）。
   - **对话渲染器 (`dialogue_renderer.js`):** 这是一个纯粹的“视图”模块，根据对话管理器的指令，将角色、文本和选项渲染到屏幕上。
5. **UI 模块 (UI Modules):**
   - **主菜单 (`main_menu.js`):** 游戏的启动页面，提供开始游戏、读档、查看成就等入口，并展示玩家信息面板。
   - **存档系统 (`save-system.js`):** 独立的存档管理页面，用于加载、删除存档。
   - **成就系统 (`achievement.js`):** 独立的成就展示页面，显示玩家已解锁和未解锁的成就。
   - **音频管理器 (`audioManager.js`):** 全局的音频控制模块，支持背景音乐的淡入淡出切换。
   - **成就通知 (`achievementNotifier.js`):** 当玩家解锁新成就时，在游戏画面上显示一个漂亮的悬浮通知。
6. **辅助与其他 (Utilities & Others):**
   - **配置文件 (`config.js`):** 存放游戏中的各种常量，如玩家速度、初始地图、音乐路径等，便于统一管理和修改。
   - **调试工具 (`debug.js`, `ruler.js`):** 用于在开发过程中显示调试信息（如玩家数值）和绘制坐标标尺。
   - **小游戏加载器 (`minigameLoader.js`):** 通过 `iframe` 加载和管理独立的 HTML 小游戏，并能在小游戏结束后将结果返回给主游戏。

------



### **前端核心 API 文档**



以下是该项目中一些最重要、可复用的模块和函数的 API 文档。



#### **1. 数据管理器 (`dataManager.js`)**



这是与后端通信和管理核心数据的接口。



##### `auth` (用户认证)



- `auth.register(username, password)`: 注册新用户。
- `auth.login(username, password)`: 用户登录。
- `auth.loginWithToken(token)`: 使用本地存储的 Token 自动登录。
- `auth.deletePlayer(username)`: 删除用户账号。



##### `loader` (资源加载)



- `loader.loadMap(mapId)`: 从后端加载指定地图的所有数据（包括对象、墙体、背景等）。
- `loader.loadStory(storyKey)`: 从 `data/stories/` 目录加载指定的 JSON 格式的故事文件。



##### `gameState` (游戏状态与存档)



- `async gameState.loadPlayerData()`: 从后端加载当前登录玩家的所有数据（包括数值、位置等）并缓存到 `window.playerDataCache`。这是进入游戏或需要最新数据时的关键函数。
- `gameState.getValue(valueName)`: 从前端缓存中快速读取玩家的特定数值（例如 'suspicion' 怀疑度）。
- `async gameState.modifyValue(username, valueName, amount)`: 修改玩家的特定数值。它会向后端发送请求，后端处理后会返回新的数值和可能解锁的成就。
- `async gameState.createSaveFile(saveName)`: 创建一个手动存档。函数会将在 `window.playerDataCache` 中的当前玩家数据完整地发送到后端保存。
- `async gameState.loadSaveFile(saveName)`: 加载一个手动存档。通知后端将会话数据切换到指定的存档文件。
- `async gameState.getAllSaveFiles()`: 获取当前用户的所有存档文件列表。
- `gameState.onValueChange(callback)`: 注册一个回调函数，当玩家数值发生变化时（通过 `modifyValue`）会被调用。这对于实现动态解锁的地图元素非常有用。



##### `achievements` (成就系统)



- `async achievements.loadAll()`: 从后端加载所有成就的分类、详情以及当前玩家的完成状态。



#### **2. 音频管理器 (`audioManager.js`)**



全局唯一的背景音乐播放控制器。

- `audioManager.init(initialVolume)`: 初始化音频管理器，设置一个初始音量。
- `audioManager.playMusic(src)`: 播放或切换背景音乐。该函数会自动处理当前音乐的淡出和新音乐的淡入，切换过程非常平滑。如果传入 `null` 或空字符串，则会停止播放音乐。



#### **3. 对话管理器 (`dialogue.js`)**



负责驱动游戏剧情的核心模块。

- `dialogueManager.init()`: 初始化对话管理器，绑定必要的事件监听。
- `async dialogueManager.start(storyKey, onEnd)`: 开始一段对话。
  - `storyKey`: 要加载的故事文件名（不含 `.json` 后缀）。
  - `onEnd`: 一个回调函数，在对话正常结束后被调用。它会接收一个 `endAction` 对象作为参数，里面包含了在故事结尾定义的特殊动作（如传送、存档等）。



#### **4. 小游戏加载器 (`minigameLoader.js`)**



用于在主游戏中嵌入和管理外部小游戏。

- `async minigameLoader.load(minigameName, onMinigameEnd)`: 加载并显示一个小游戏。
  - `minigameName`: 小游戏的文件夹名称，必须在 `GAME_LIST` (`config.js`) 中定义过。
  - `onMinigameEnd`: 小游戏结束后调用的回调函数。它会接收一个 `result` 对象（通常包含 `success` 字段），主游戏可以根据这个结果来决定后续的剧情走向。



#### **5. 成就通知 (`achievementNotifier.js`)**



用于在游戏界面上显示非阻塞的成就解锁通知。

- `achievementNotifier.init()`: 初始化通知模块，在游戏容器中创建用于显示通知的 DOM 元素。
- `achievementNotifier.show(achievement)`: 显示一条成就解锁通知。
  - `achievement`: 一个包含成就信息的对象，至少需要 `id`, `type`, `name`, `icon` 字段。



#### **6. 碰撞处理 (`collision.js`)**



提供通用的碰撞检测函数。

- `handlePlayerCollision(player, walls)`: 处理玩家与一组墙体之间的碰撞。这个函数非常巧妙，它分别处理 X 轴和 Y 轴的移动和碰撞，可以防止玩家在角落被卡住，实现丝滑的沿墙移动效果。
  - `player`: 玩家对象，需要有 `x`, `y`, `width`, `height`, `targetX`, `targetY` 属性。
  - `walls`: 一个包含多个墙体对象的数组，每个墙体对象需要有 `x`, `y`, `width`, `height` 属性。

希望这份文档能帮助您更好地理解和继续开发这个项目！