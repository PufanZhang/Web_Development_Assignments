use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- 从 JSON 文件中直接读取的原始数据结构 ---

// 物件的显示条件
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "snake_case")]
pub enum Comparison {
    GreaterThan,
    LessThan,
    Equal,
    GreaterThanOrEqual,
    LessThanOrEqual,
    NotEqual,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Condition {
    pub name: String,
    pub comparison: Comparison,
    pub value: i32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RequiredValues {
    #[serde(default = "default_logic")] // 默认为 OR 逻辑
    pub logic: String,
    pub conditions: Vec<Condition>,
}

// 为 RequiredValues 的 logic 字段提供一个默认值
fn default_logic() -> String {
    "OR".to_string()
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
    #[serde(default)]
    pub story_key: Option<String>,
    #[serde(rename = "teleportData")]
    #[serde(default)]
    pub teleport_data: Option<Teleport>,
    #[serde(rename = "requiredValues")]
    #[serde(default)]
    pub required_values: Option<RequiredValues>,
    #[serde(default)]
    pub show_prompt: bool,
    #[serde(rename = "singleInteraction", default = "default_true")]
    pub single_interaction: bool,
}

fn default_true() -> bool {
    true
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
    #[serde(default = "default_width")]
    pub width: i32,
    #[serde(default = "default_height")]
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
    pub latent_objects: Vec<GameObject>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

// 玩家的位置信息
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayerPosition {
    pub map: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct MapState {
    #[serde(rename = "removedObjects", default)]
    pub removed_objects: Vec<String>,
}

// 完整的玩家存档数据结构
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayerData {
    pub username: String,
    pub address: PlayerPosition,
    pub values: HashMap<String, i32>,
    #[serde(rename = "mapStates", default)]
    pub map_states: HashMap<String, MapState>,
    pub achievements: Vec<String>,
    pub tools: Vec<String>,
}

// 为新用户创建默认存档
impl PlayerData {
    pub fn new_for_user(username: &str, initial_values: HashMap<String, i32>) -> Self {
        PlayerData {
            username: username.to_string(),
            address: PlayerPosition {
                map: String::new(),
                x: -1.0,
                y: -1.0,
            },
            values: initial_values,
            achievements: Vec::new(),
            tools: Vec::new(),
            map_states: HashMap::new(),
        }
    }
}

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

#[derive(serde::Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LogoutRequest {
    pub token: String,
    pub player_data: PlayerData,
}

// 用于 token 自动登录的请求体
#[derive(Deserialize, Debug)]
pub struct TokenLoginRequest {
    pub token: String,
}

// token 自动登录成功后的响应体
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LoginWithTokenResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_data: Option<PlayerData>,
}

#[derive(serde::Deserialize, Debug)]
pub struct ApiLogoutRequest {
    pub token: String,
    pub username: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub id: i32,
    #[serde(rename = "type")]
    pub achievement_type: String,
    pub name: String,
    #[serde(default)]
    pub r#abstract: String,
    pub description_uncompleted: String,
    pub description_completed: String,
    pub icon: String,
    pub required_values: RequiredValues,
    #[serde(skip)]
    pub filename: String,
}

#[derive(Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FrontendAchievement {
    pub id: String, // 用文件名作为唯一 ID
    pub name: String,
    pub r#abstract: String,
    pub description: String,
    pub icon: String,
    pub completed: bool,
    pub achievement_type: String, // 加上分类信息
}