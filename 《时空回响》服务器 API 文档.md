# 《时空回响》服务器 API 文档





## 概述



本文档详细说明了《时空回响》服务器所提供的 API 接口。所有 API 均以 `/api` 为前缀。



## 认证



大部分 API 都需要通过 JSON Web Token (JWT) 进行身份验证。在成功登录或注册后，服务器会返回一个 Token。客户端在后续请求中，必须在 HTTP Header 的 `Authorization` 字段中携带此 Token，格式为 `Bearer <token>`。

------



## 身份验证接口 (`/api/auth`)





### 1. 用户注册



- **Endpoint:** `POST /api/auth/register`

- **描述:** 注册一个新用户。成功后会返回一个用于自动登录的 Token。

- **请求体 (JSON):**

  JSON

  ```
  {
    "username": "your_username",
    "password": "your_password"
  }
  ```

- **响应:**

  - **成功 (200 OK):**

    JSON

    ```
    {
      "success": true,
      "message": "Registration successful!",
      "token": "generated_jwt_token"
    }
    ```

  - **失败 (409 Conflict):** 如果用户名已被占用。

    JSON

    ```
    {
      "success": false,
      "message": "Username is already taken",
      "token": null
    }
    ```



### 2. 用户登录



- **Endpoint:** `POST /api/auth/login`

- **描述:** 使用用户名和密码登录。成功后返回 Token，并将用户标记为在线状态。

- **请求体 (JSON):** 同注册接口。

- **响应:**

  - **成功 (200 OK):**

    JSON

    ```
    {
      "success": true,
      "message": "Login successful!",
      "token": "generated_jwt_token"
    }
    ```

  - **失败 (401 Unauthorized):** 用户名或密码错误。

  - **失败 (409 Conflict):** 账号已在别处登录。



### 3. 使用 Token 自动登录



- **Endpoint:** `POST /api/auth/login_with_token`

- **描述:** 使用本地存储的 Token 进行自动登录，会返回一个新的 Token 和完整的玩家数据。

- **请求体 (JSON):**

  JSON

  ```
  {
    "token": "your_saved_jwt_token"
  }
  ```

- **响应 (200 OK):**

  JSON

  ```
  {
    "success": true,
    "message": "Login successful!",
    "token": "new_generated_jwt_token",
    "player_data": { ... } // 完整的 PlayerData 对象
  }
  ```



### 4. 主页登出



- **Endpoint:** `POST /api/auth/logout`

- **描述:** 用于在主页或登录页面执行的登出操作。此操作会更新玩家的总游戏时长。

- **请求体 (JSON):**

  JSON

  ```
  {
    "token": "your_jwt_token",
    "username": "your_username"
  }
  ```

- **响应:** `200 OK`



### 5. 注销账号



- **Endpoint:** `POST /api/auth/delete_player`

- **描述:** 永久删除用户账号及其所有相关数据（主存档、手动存档等）。

- **认证:** 需要有效的 Token。

- **请求体 (JSON):**

  JSON

  ```
  {
    "username": "your_username"
  }
  ```

- **响应 (200 OK):**

  JSON

  ```
  {
      "success": true,
      "message": "账号注销成功。"
  }
  ```

------



## 玩家数据接口 (`/api/player`)





### 1. 游戏内登出并保存



- **Endpoint:** `POST /api/player/logout`

- **描述:** 在游戏内退出时调用，会自动保存玩家的进度（位置、数值、地图状态等）并结算游戏时长。

- **请求体 (JSON):**

  JSON

  ```
  {
    "token": "your_jwt_token",
    "player_data": { ... } // 当前客户端的 PlayerData 对象
  }
  ```

- **响应:** `200 OK`



### 2. 加载玩家数据



- **Endpoint:** `GET /api/player/load`
- **描述:** 获取当前登录用户的完整玩家数据。
- **认证:** 需要有效的 Token。
- **响应 (200 OK):** 返回 `PlayerData` 对象的 JSON 格式。



### 3. 修改玩家数值



- **Endpoint:** `POST /api/player/modify_value`

- **描述:** 修改玩家的特定数值（如分数、金钱等），通常由游戏事件触发。此接口会自动检查并解锁相关成就。

- **认证:** 需要有效的 Token。

- **请求体 (JSON):**

  JSON

  ```
  {
    "username": "your_username",
    "value_name": "score", // 要修改的变量名
    "amount": 100 // 要增加或减少的数量（可为负数）
  }
  ```

- **响应 (200 OK):**

  JSON

  ```
  {
    "value_name": "score",
    "new_value": 500, // 修改后的新值
    "unlocked_achievements": [ ... ] // 可能新解锁的成就列表
  }
  ```



### 4. 获取游戏时长



- **Endpoint:** `GET /api/player/playtime`

- **描述:** 获取玩家的总游戏时长（秒），包含本次登录的实时时长。

- **认证:** 需要有效的 Token。

- **响应 (200 OK):**

  JSON

  ```
  {
      "total_play_time_seconds": 12345
  }
  ```

------



## 存档接口 (`/api/player`)





### 1. 创建手动存档



- **Endpoint:** `POST /api/player/savefile/{save_name}`
- **描述:** 创建一个手动存档。`save_name` 是存档的唯一标识符（例如 "save_slot_1"）。
- **认证:** 需要有效的 Token。
- **URL 参数:**
  - `save_name`: `String` - 存档名称。
- **请求体 (JSON):** 完整的 `PlayerData` 对象。
- **响应:** `200 OK`



### 2. 加载手动存档



- **Endpoint:** `POST /api/player/loadfile/{save_name}`
- **描述:** 将指定的手动存档数据覆盖到玩家当前的主存档中。
- **认证:** 需要有效的 Token。
- **URL 参数:**
  - `save_name`: `String` - 存档名称。
- **响应:**
  - **成功:** `200 OK`
  - **失败 (404 Not Found):** 如果找不到指定的存档。



### 3. 获取所有手动存档信息



- **Endpoint:** `GET /api/player/enquire_all_savefiles`
- **描述:** 获取该用户所有手动存档的展示信息列表，用于在读档界面显示。
- **认证:** 需要有效的 Token。
- **响应 (200 OK):** 返回一个 `SaveFileDisplayData` 对象的数组。

------



## 游戏内容接口





### 1. 获取地图数据



- **Endpoint:** `GET /api/map_data/{map_id}`
- **描述:** 获取指定地图的所有打包数据，包括背景、碰撞区、可见物件、潜在物件和资源清单等。
- **认证:** 需要有效的 Token。
- **URL 参数:**
  - `map_id`: `String` - 地图文件的名称（不含`.json`后缀）。
- **响应 (200 OK):** 返回 `PackedMapData` 对象的 JSON 格式。



### 2. 获取所有成就状态



- **Endpoint:** `GET /api/achievements/all`

- **描述:** 获取所有成就的定义以及当前玩家的完成状态，按成就类型分类。

- **认证:** 需要有效的 Token。

- **响应 (200 OK):**

  JSON

  ```
  {
    "主线剧情": [
      {
        "id": 1,
        "name": "旅程的开始",
        "description": "...",
        "icon": "...",
        "completed": true,
        "achievement_type": "主线剧情"
      }
    ],
    "探索发现": [ ... ]
  }
  ```