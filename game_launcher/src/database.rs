use crate::models::{AuthRequest, ModifyValueResponse, PlayerData};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;

// --- 辅助函数 ---

// 获取用户凭据文件的路径
fn get_users_path() -> PathBuf {
    PathBuf::from("../data/users.json")
}

// 获取特定玩家存档文件的路径
fn get_player_data_path(username: &str) -> PathBuf {
    // 确保 `players` 文件夹存在
    let dir = PathBuf::from("../data/players");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).expect("Failed to create players directory");
    }
    dir.join(format!("{}.json", username))
}

// SHA256 加密密码
fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

// --- 核心数据库函数 ---

// 读取所有用户凭据
async fn read_users() -> Result<HashMap<String, String>, std::io::Error> {
    let path = get_users_path();
    if !path.exists() {
        return Ok(HashMap::new()); // 如果文件不存在，返回一个空的用户列表
    }
    let content = fs::read_to_string(path).await?;
    let users = serde_json::from_str(&content).unwrap_or_else(|_| HashMap::new());
    Ok(users)
}

// 写入所有用户凭据
async fn write_users(users: &HashMap<String, String>) -> Result<(), std::io::Error> {
    let path = get_users_path();

    // 在写入前，确保父目录 "./data" 存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }
    let content = serde_json::to_string_pretty(users)?;
    let mut file = fs::File::create(path).await?;
    file.write_all(content.as_bytes()).await?;
    Ok(())
}

// --- 对外暴露的接口 ---

// 注册新用户
pub async fn register_user(req: &AuthRequest) -> Result<(), &'static str> {
    let mut users = read_users().await.map_err(|_| "Failed to read user database")?;

    if users.contains_key(&req.username) {
        return Err("Username is already taken");
    }

    let hashed_password = hash_password(&req.password);
    users.insert(req.username.clone(), hashed_password);

    write_users(&users).await.map_err(|_| "Failed to save new user")?;

    // 创建初始化的玩家存档
    let initial_data = PlayerData::default_for_user(&req.username);
    save_player_data(&initial_data).await.map_err(|_| "Failed to create initial player data")?;

    Ok(())
}

// 验证用户登录
pub async fn login_user(req: &AuthRequest) -> Result<bool, &'static str> {
    let users = read_users().await.map_err(|_| "Failed to read user database")?;

    match users.get(&req.username) {
        Some(stored_hash) => {
            let hashed_input = hash_password(&req.password);
            if stored_hash == &hashed_input {
                Ok(true) // 密码正确
            } else {
                Ok(false) // 密码错误
            }
        }
        None => Ok(false), // 用户不存在
    }
}

// 保存玩家数据
pub async fn save_player_data(data: &PlayerData) -> Result<(), std::io::Error> {
    let path = get_player_data_path(&data.username);

    // 在写入前，确保父目录 "./data/players" 存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content).await
}

// 读取玩家数据
pub async fn load_player_data(username: &str) -> Result<PlayerData, std::io::Error> {
    let path = get_player_data_path(username);
    let content = fs::read_to_string(path).await?;
    let data = serde_json::from_str(&content)?;
    Ok(data)
}

pub async fn modify_player_value(
    username: &str,
    value_name: &str,
    amount: i32,
) -> Result<ModifyValueResponse, std::io::Error> {
    // 1. 先把玩家的完整数据读出来
    let mut player_data = load_player_data(username).await?;

    // 2. 找到对应的数值，进行计算
    let current_value = player_data.values.entry(value_name.to_string()).or_insert(0);
    *current_value += amount;
    let new_value = *current_value;

    // 3. 把修改后的完整数据存回去
    save_player_data(&player_data).await?;

    // 4. 返回成功信息和新的数值
    Ok(ModifyValueResponse {
        value_name: value_name.to_string(),
        new_value,
    })
}