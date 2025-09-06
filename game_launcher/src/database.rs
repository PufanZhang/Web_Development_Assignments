use crate::models::{AuthRequest, ModifyValueResponse, PlayerData};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use std::io::{Error, ErrorKind};


#[derive(Debug)]
pub enum ModifyValueError {
    Io(Error),
    InvalidValueName(String),
}

pub enum LoginOutcome {
    Success,
    UserNotFound,
    IncorrectPassword,
}

impl From<Error> for ModifyValueError {
    fn from(err: Error) -> Self {
        ModifyValueError::Io(err)
    }
}

// --- 辅助函数 ---

// 获取用户凭据文件的路径
fn get_users_path() -> PathBuf {
    PathBuf::from("./data/users.json")
}

// 获取特定玩家存档文件的路径
fn get_player_data_path(username: &str) -> PathBuf {
    // 确保 `players` 文件夹存在
    let dir = PathBuf::from("./data/players");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).expect("Failed to create players directory");
    }
    dir.join(format!("{}.json", username))
}

fn get_save_file_path(username: &str) -> PathBuf {
    // 确保 `save_files` 文件夹存在
    let dir = PathBuf::from("./data/save_files");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).expect("Failed to create save files directory");
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

// 读取并解析初始数值配置文件
async fn load_initial_values() -> Result<HashMap<String, i32>, Error> {
    let path = PathBuf::from("./data/value_initialize.json");
    let content = fs::read_to_string(path).await?;
    let values: HashMap<String, i32> = serde_json::from_str(&content)?;
    Ok(values)
}

// --- 核心数据库函数 ---

// 读取所有用户凭据
async fn read_users() -> Result<HashMap<String, String>, Error> {
    let path = get_users_path();
    if !path.exists() {
        return Ok(HashMap::new()); // 如果文件不存在，返回一个空的用户列表
    }
    let content = fs::read_to_string(path).await?;
    let users = serde_json::from_str(&content).unwrap_or_else(|_| HashMap::new());
    Ok(users)
}

// 写入所有用户凭据
async fn write_users(users: &HashMap<String, String>) -> Result<(), Error> {
    let path = get_users_path();

    // 默认 ./data文件夹存在，因为它是运行游戏的资源库
    let content = serde_json::to_string_pretty(users)?;
    let mut file = fs::File::create(path).await?;
    file.write_all(content.as_bytes()).await?;
    Ok(())
}

// --- 对外暴露的接口 ---

// In src/database.rs

// 注册新用户
pub async fn register_user(req: &AuthRequest) -> Result<(), &'static str> {
    let mut users = read_users().await.map_err(|_| "Failed to read user database")?;

    if users.contains_key(&req.username) {
        return Err("Username is already taken");
    }

    // 在写入用户信息前，先确保初始数值文件可读
    let initial_values = load_initial_values()
        .await
        .map_err(|_| "Server configuration error: Cannot read initial values.")?;

    let hashed_password = hash_password(&req.password);
    users.insert(req.username.clone(), hashed_password);

    write_users(&users).await.map_err(|_| "Failed to save new user")?;

    // 使用从文件加载的初始值创建玩家存档
    let initial_data = PlayerData::new_for_user(&req.username, initial_values);
    save_player_data(&initial_data).await.map_err(|_| "Failed to create initial player data")?;

    Ok(())
}

// 验证用户登录
pub async fn login_user(req: &AuthRequest) -> Result<LoginOutcome, &'static str> {
    let users = read_users().await.map_err(|_| "Failed to read user database")?;

    match users.get(&req.username) {
        Some(stored_hash) => {
            let hashed_input = hash_password(&req.password);
            if stored_hash == &hashed_input {
                Ok(LoginOutcome::Success) // 密码正确
            } else {
                Ok(LoginOutcome::IncorrectPassword) // 密码错误
            }
        }
        None => Ok(LoginOutcome::UserNotFound), // 用户不存在
    }
}

// 保存玩家数据
pub async fn save_player_data(data: &PlayerData) -> Result<(), Error> {
    let path = get_player_data_path(&data.username);

    // 在写入前，确保父目录 "./data/players" 存在
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }
    let content = serde_json::to_string_pretty(data)?;
    fs::write(path, content).await
}

// 读取玩家数据
pub async fn load_player_data(username: &str) -> Result<PlayerData, Error> {
    let path = get_player_data_path(username);
    let content = fs::read_to_string(path).await?;
    let data = serde_json::from_str(&content)?;
    Ok(data)
}

pub async fn modify_player_value(
    username: &str,
    value_name: &str,
    amount: i32,
) -> Result<ModifyValueResponse, ModifyValueError> {
    // 1. 先把玩家的完整数据读出来
    let mut player_data = load_player_data(username).await?;

    // 2. 检查 value_name 是否合法 (是否存在于玩家的数值列表中)
    if !player_data.values.contains_key(value_name) {
        return Err(ModifyValueError::InvalidValueName(value_name.to_string()));
    }

    // 3. 找到对应的数值，进行计算
    //    此时 unwrap 是安全的，因为我们已经检查过 key 的存在
    let current_value = player_data.values.get_mut(value_name).unwrap();
    *current_value += amount;
    let new_value = *current_value;

    // 4. 把修改后的完整数据存回去
    save_player_data(&player_data).await?;

    // 5. 返回成功信息和新的数值
    Ok(ModifyValueResponse {
        value_name: value_name.to_string(),
        new_value,
    })
}

pub async fn save_file(save_name: &str, data: &PlayerData) -> Result<(), Error> {
    let path = get_save_file_path(&data.username);

    // 读取已有的存档，如果文件不存在或解析失败，则创建一个新的空存档集合
    let mut saves: HashMap<String, PlayerData> = if path.exists() {
        let content = fs::read_to_string(&path).await?;
        serde_json::from_str(&content).unwrap_or_else(|_| HashMap::new())
    } else {
        HashMap::new()
    };

    // 插入或更新指定名称的存档
    saves.insert(save_name.to_string(), data.clone());

    // 将更新后的存档集合写回文件
    let content = serde_json::to_string_pretty(&saves)?;
    fs::write(path, content).await
}

pub async fn load_save_file(username: &str, save_name: &str) -> Result<(), Error> {
    let path = get_save_file_path(username);

    if !path.exists() {
        // 如果连存档文件都没有，直接返回“未找到”错误
        return Err(Error::new(ErrorKind::NotFound, "Save file not found."));
    }
    let content = fs::read_to_string(&path).await?;
    let saves: HashMap<String, PlayerData> = serde_json::from_str(&content)?;

    // 从存档集合中找到对应的存档点
    if let Some(player_data_to_load) = saves.get(save_name) {
        // 如果找到了，就调用现有的 save_player_data 函数，
        save_player_data(player_data_to_load).await
    } else {
        // 如果没找到指定名称的存档，返回“未找到”错误
        Err(Error::new(ErrorKind::NotFound, "Specified save name not found."))
    }
}

pub async fn get_manual_save_names(username: &str) -> Result<Vec<String>, Error> {
    let path = get_save_file_path(username);

    if !path.exists() {
        // 如果存档文件不存在，说明没有任何存档，返回一个空列表
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path).await?;
    let saves: HashMap<String, PlayerData> = serde_json::from_str(&content)?;

    // 提取所有的 key (也就是存档名) 并返回
    let names = saves.keys().cloned().collect();
    Ok(names)
}

// --- 开发者模式函数 --- //
pub async fn modify_player_value_dev(username: &str, value_name: &str, amount: i32) -> Result<(String, i32), String> {
    // 1. 读取玩家数据
    let mut player_data = match load_player_data(username).await {
        Ok(data) => data,
        Err(_) => return Err(format!("User '{}' not found.", username)),
    };

    // 2. 检查 value_name 是否合法
    if !player_data.values.contains_key(value_name) {
        return Err(format!("Invalid value name: '{}'. This value does not exist for the player.", value_name));
    }

    // 3. 修改数值 (unwrap 是安全的)
    let current_value = player_data.values.get_mut(value_name).unwrap();
    *current_value += amount;
    let new_value = *current_value;

    // 4. 保存修改后的数据
    if let Err(e) = save_player_data(&player_data).await {
        return Err(format!("Failed to save player data: {}", e));
    }

    // 5. 返回成功信息
    Ok((value_name.to_string(), new_value))
}

pub async fn set_player_value_dev(username: &str, value_name: &str, new_value: i32) -> Result<(String, i32), String> {
    // 1. 读取玩家数据
    let mut player_data = match load_player_data(username).await {
        Ok(data) => data,
        Err(_) => return Err(format!("User '{}' not found.", username)),
    };

    // 2. 检查 value_name 是否合法
    if !player_data.values.contains_key(value_name) {
        return Err(format!("Invalid value name: '{}'. This value does not exist for the player.", value_name));
    }

    // 3. 直接设置新值 (unwrap 是安全的)
    let value_to_set = player_data.values.get_mut(value_name).unwrap();
    *value_to_set = new_value;

    // 4. 保存修改后的数据
    if let Err(e) = save_player_data(&player_data).await {
        return Err(format!("Failed to save player data: {}", e));
    }

    // 5. 返回成功信息
    Ok((value_name.to_string(), new_value))
}