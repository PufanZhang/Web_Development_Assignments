use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// --- 核心数据结构 ---

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PlayerData {
    pub username: String,
    pub address: PlayerPosition,
    pub values: HashMap<String, i32>,
    #[serde(rename = "mapStates", default)]
    pub map_states: HashMap<String, MapState>,
    pub achievements: Vec<String>,
    #[serde(rename = "saveTime", skip_serializing_if = "Option::is_none", default)]
    pub save_time: Option<String>,
    #[serde(rename = "totalPlayTimeSeconds", default)]
    pub total_play_time_seconds: u64,
    #[serde(rename = "lastLoginTimestamp", default)]
    pub last_login_timestamp: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UserCredentials {
    pub username: String,
    pub password_hash: String,
}

// --- 用于打包导出的结构体 ---

#[derive(Serialize, Deserialize, Debug)]
pub struct UserExportData {
    pub username: String,
    pub password_hash: String,
    pub player_data: PlayerData,
    // 手动存档是可选的，因为新用户可能没有
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub manual_saves: Option<HashMap<String, PlayerData>>,
}