use crate::models::{Achievement, PlayerData, Condition, Comparison, RequiredValues};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

// 使用 Lazy 和 Mutex 来创建一个全局的、线程安全的、只加载一次的成就数据容器
static ACHIEVEMENTS: Lazy<Mutex<HashMap<String, Achievement>>> = Lazy::new(|| {
    Mutex::new(HashMap::new())
});

/// 检查单个条件是否满足 (这个函数和 loader.rs 里的几乎一样)
fn check_condition(condition: &Condition, player_data: &PlayerData) -> bool {
    let player_value = player_data.values.get(&condition.name).cloned().unwrap_or(0);
    let required_value = condition.value;

    match condition.comparison {
        Comparison::GreaterThan => player_value > required_value,
        Comparison::LessThan => player_value < required_value,
        Comparison::Equal => player_value == required_value,
        Comparison::GreaterThanOrEqual => player_value >= required_value,
        Comparison::LessThanOrEqual => player_value <= required_value,
        Comparison::NotEqual => player_value != required_value,
    }
}

/// 从 `./data/achievements` 目录加载所有成就文件
/// 这个函数只在第一次被调用时真正执行IO操作
async fn load_all_achievements() -> Result<(), std::io::Error> {
    let mut achievements_map = ACHIEVEMENTS.lock().await;
    // 如果已经加载过了, 就直接返回, 避免重复读取文件
    if !achievements_map.is_empty() {
        return Ok(());
    }

    println!("🏆 正在加载所有成就...");
    let dir_path = PathBuf::from("./data/achievements");
    // 如果文件夹不存在，就创建一个
    if !dir_path.exists() {
        fs::create_dir_all(&dir_path).await?;
        println!("  -> 'data/achievements' 文件夹不存在，已自动创建。");
    }

    let mut entries = fs::read_dir(dir_path).await?;

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            let filename_stem = path.file_stem().unwrap().to_str().unwrap().to_string();
            let content = fs::read_to_string(&path).await?;
            match serde_json::from_str::<Achievement>(&content) {
                Ok(mut achievement) => {
                    // 把文件名作为唯一ID存入结构体
                    achievement.filename = filename_stem.clone();
                    achievements_map.insert(filename_stem, achievement);
                }
                Err(e) => {
                    eprintln!("❌ 解析成就文件 {:?} 失败: {}", path, e);
                }
            }
        }
    }
    println!("  -> ✅ 成功加载 {} 个成就。", achievements_map.len());
    Ok(())
}

/// 检查并解锁玩家的新成就
/// 会修改传入的 player_data, 并返回新解锁的成就列表
pub async fn check_and_unlock_achievements(player_data: &mut PlayerData) -> Vec<String> {
    // 确保在检查前，成就数据已经被加载到内存
    if let Err(e) = load_all_achievements().await {
        eprintln!("❌ 致命错误: 无法加载成就数据: {}", e);
        return Vec::new();
    }

    let achievements_map = ACHIEVEMENTS.lock().await;
    let mut newly_unlocked = Vec::new();

    for (filename, achievement) in achievements_map.iter() {
        // 如果玩家已经拥有这个成就了, 就跳过
        if player_data.achievements.contains(filename) {
            continue;
        }

        // 检查这个成就的所有条件
        let req: &RequiredValues = &achievement.required_values;
        let conditions_met = if req.logic.to_uppercase() == "AND" {
            // AND 逻辑: 所有条件都必须为 true
            req.conditions.iter().all(|cond| check_condition(cond, player_data))
        } else {
            // OR 逻辑: 只要有一个条件为 true
            req.conditions.iter().any(|cond| check_condition(cond, player_data))
        };

        if conditions_met {
            // 条件满足！解锁成就！
            player_data.achievements.push(filename.clone());
            newly_unlocked.push(filename.clone());
            println!("🎉 成就解锁! 玩家 '{}' 获得了 '{}'!", player_data.username, achievement.name);
        }
    }

    newly_unlocked
}

// 加载并返回所有成就的克隆版本
pub async fn get_all_achievements() -> Result<HashMap<String, Achievement>, std::io::Error> {
    // 确保成就数据已加载到内存
    load_all_achievements().await?;
    // 获取锁，并克隆数据后立即释放锁
    let achievements_map = ACHIEVEMENTS.lock().await;
    Ok(achievements_map.clone())
}