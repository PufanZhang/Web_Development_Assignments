use crate::models::{AuthRequest, ModifyValueResponse, PlayerData, UnlockedAchievement, SaveFileIntro, SaveFileDisplayData};
use crate::achievements;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use std::io::{Error, ErrorKind};
use chrono::Local;


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

fn get_save_intro_path(save_name: &str) -> PathBuf {
    // 确保 `savefile_intro` 文件夹存在
    let dir = PathBuf::from("./data/savefile_intro");
    if !dir.exists() {
        std::fs::create_dir_all(&dir).expect("Failed to create savefile_intro directory");
    }
    dir.join(format!("{}.json", save_name))
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

    // 调用成就检查函数，并接收新解锁的成就 ID 列表
    let newly_unlocked_ids = achievements::check_and_unlock_achievements(&mut player_data).await;
    let mut unlocked_achievements_details = None;

    if !newly_unlocked_ids.is_empty() {
        // 如果有新解锁的成就，获取所有成就的定义
        if let Ok(all_achievements) = achievements::get_all_achievements().await {
            let mut details = Vec::new();
            for id in newly_unlocked_ids {
                // 根据 ID 找到对应的成就详情
                if let Some(achievement) = all_achievements.get(&id) {
                    details.push(UnlockedAchievement {
                        id: id.clone(),
                        name: achievement.name.clone(),
                        icon: achievement.icon.clone(),
                        achievement_type: achievement.achievement_type.clone(),
                    });
                }
            }
            unlocked_achievements_details = Some(details);
        }
    }

    // 4. 把修改后的完整数据存回去
    save_player_data(&player_data).await?;

    // 5. 返回成功信息、新的数值以及新解锁的成就列表
    Ok(ModifyValueResponse {
        value_name: value_name.to_string(),
        new_value,
        unlocked_achievements: unlocked_achievements_details,
    })
}

// 一个专门用于手动存档的函数
pub async fn create_manual_save(save_name: &str, data: &mut PlayerData) -> Result<(), Error> {
    // 1. 获取当前时间并更新 PlayerData 对象
    let now = Local::now();
    data.save_time = Some(now.format("%Y-%m-%d %H:%M:%S").to_string());

    // 2. 读取存档集合文件
    let path = get_save_file_path(&data.username);
    let mut saves: HashMap<String, PlayerData> = if path.exists() {
        let content = fs::read_to_string(&path).await?;
        serde_json::from_str(&content).unwrap_or_else(|_| HashMap::new())
    } else {
        HashMap::new()
    };

    // 3. 插入或更新带有最新时间的存档数据
    saves.insert(save_name.to_string(), data.clone());

    // 4. 将更新后的存档集合写回文件
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
    if let Some(mut player_data_to_load) = saves.get(save_name).cloned() {
        // 在加载存档前，先读取玩家当前的成就
        let current_player_data = load_player_data(username).await?;

        // 用当前玩家的成就覆盖掉存档文件里的成就
        player_data_to_load.achievements = current_player_data.achievements;

        // 保存整合了最新成就的存档数据
        save_player_data(&player_data_to_load).await
    } else {
        Err(Error::new(ErrorKind::NotFound, "Specified save name not found."))
    }
}

pub async fn get_all_save_display_data(username: &str) -> Result<Vec<SaveFileDisplayData>, Error> {
    let save_collection_path = get_save_file_path(username);

    if !save_collection_path.exists() {
        return Ok(Vec::new()); // 如果没有任何存档，返回空列表
    }

    // 1. 读取包含所有手动存档数据的集合文件
    let content = fs::read_to_string(&save_collection_path).await?;
    let saves: HashMap<String, PlayerData> = serde_json::from_str(&content)?;

    let mut display_data_list = Vec::new();

    // 2. 遍历每一个存档
    for (save_name, player_data) in saves {
        let intro_path = get_save_intro_path(&save_name);

        // 3. 读取对应的静态介绍文件
        if intro_path.exists() {
            let intro_content = fs::read_to_string(&intro_path).await?;
            if let Ok(intro) = serde_json::from_str::<SaveFileIntro>(&intro_content) {
                // 4. 组合数据
                let display_data = SaveFileDisplayData {
                    id: intro.id,
                    file_name: intro.file_name,
                    // 关键：save_time 从 PlayerData 中获取，如果不存在则提供一个默认值
                    save_time: player_data.save_time.unwrap_or_else(|| "N/A".to_string()),
                    location: intro.location,
                    description: intro.description,
                    progress: intro.progress,
                };
                display_data_list.push(display_data);
            }
        }
    }

    // 5. 按 ID 排序后返回
    display_data_list.sort_by_key(|data| data.id);
    Ok(display_data_list)
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
    achievements::check_and_unlock_achievements(&mut player_data).await;

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
    achievements::check_and_unlock_achievements(&mut player_data).await;

    // 4. 保存修改后的数据
    if let Err(e) = save_player_data(&player_data).await {
        return Err(format!("Failed to save player data: {}", e));
    }

    // 5. 返回成功信息
    Ok((value_name.to_string(), new_value))
}