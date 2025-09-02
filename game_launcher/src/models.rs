use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- 从 JSON 文件中直接读取的原始数据结构 ---

// 物件的显示条件
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequiredValue {
    pub name: String,
    pub comparison: String,
    pub value: i32,
}

// 游戏物件 (从 object.json 读取)
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameObject {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub image: String,
    #[serde(default)] // storyKey 是可选的
    pub story_key: Option<String>,
    #[serde(default)]
    pub teleport: Option<Teleport>,
    #[serde(default)]
    pub required_value: Option<RequiredValue>,
}

// 传送点信息
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Teleport {
    pub target_map: String,
    pub target_x: i32,
    pub target_y: i32,
}

// 墙体碰撞区
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Wall {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

// 地图文件 (从 map.json 读取)
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MapInfo {
    pub name: String,
    pub background: String,
    pub walls: Vec<Wall>,
    pub objects: Vec<String>, // 物件 ID 列表
    #[serde(default = "default_width")] // 如果json里没有，就使用默认值
    pub width: i32,
    #[serde(default = "default_height")] // 如果json里没有，就使用默认值
    pub height: i32,
    #[serde(default)]
    pub entry_story_key: Option<String>,
}

fn default_width() -> i32 { 800 }
fn default_height() -> i32 { 600 }

// --- 最终打包后发送给前端的数据结构 ---

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PackedMapData {
    pub name: String,
    pub background: String,
    pub walls: Vec<Wall>,
    pub objects: Vec<GameObject>,
    pub width: i32,
    pub height: i32,
    pub entry_story_key: Option<String>,
    pub asset_manifest: Vec<String>, // 资源清单
}

// 登录/注册时，前端发送过来的 JSON 格式
#[derive(Deserialize, Debug)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
}

// 登录/注册成功后，后端返回给前端的 JSON 格式
#[derive(Serialize, Debug)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    // pub token: Option<String>, // 为未来的 token 认证留个位置
}

// 玩家的位置信息
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayerPosition {
    pub map: String,
    pub x: f64,
    pub y: f64,
}

// 完整的玩家存档数据结构
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayerData {
    pub username: String,
    pub address: PlayerPosition,
    pub values: HashMap<String, i32>,
    pub achievements: Vec<String>,
    pub tools: Vec<String>,
}

// 为新用户创建默认存档
impl PlayerData {
    pub fn default_for_user(username: &str) -> Self {
        PlayerData {
            username: username.to_string(),
            address: PlayerPosition {
                map: "map1".to_string(),
                x: 400.0,
                y: 300.0,
            },
            values: HashMap::new(),
            achievements: Vec::new(),
            tools: Vec::new(),
        }
    }
}

// (这个结构体暂时用不上，但为了和 database.rs 里的代码对应先写上)
#[derive(Serialize, Deserialize, Debug)]
pub struct UserCredentials {
    pub username: String,
    pub password_hash: String,
}

// 前端发送过来的请求格式
#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModifyValueRequest {
    pub username: String,
    pub value_name: String,
    pub amount: i32, // 要增加或减少的量
}

// 后端成功修改后返回的响应格式
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ModifyValueResponse {
    pub value_name: String,
    pub new_value: i32, // 修改后的新数值
}