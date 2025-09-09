use crate::models::{Comparison, Condition, GameObject, MapInfo, PackedMapData, PlayerData};
use futures::future::try_join_all;
use std::path::PathBuf;
use tokio::fs;

// 错误类型，方便统一处理
#[derive(Debug)]
pub enum LoadError {
    Io(std::io::Error),
    Json(serde_json::Error),
    NotFound,
}

impl From<std::io::Error> for LoadError {
    fn from(err: std::io::Error) -> Self {
        if err.kind() == std::io::ErrorKind::NotFound {
            LoadError::NotFound
        } else {
            LoadError::Io(err)
        }
    }
}

impl From<serde_json::Error> for LoadError {
    fn from(err: serde_json::Error) -> Self {
        LoadError::Json(err)
    }
}

// 异步读取并解析一个 JSON 文件
async fn read_json_file<T: serde::de::DeserializeOwned>(path: PathBuf) -> Result<T, LoadError> {
    let content = fs::read_to_string(&path).await?; // 在函数内部进行借用
    let data = serde_json::from_str(&content)?;
    Ok(data)
}

fn check_condition(condition: &Condition, player_data: &PlayerData) -> bool {
    // 从玩家存档里找到对应的数值, 如果找不到, 就默认为 0
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

fn should_display_object(obj: &GameObject, player_data: &Option<PlayerData>) -> bool {
    // 如果没有玩家数据 (比如未登录), 或者物件本身没有显示要求, 则直接显示
    let Some(player) = player_data else { return true; };
    let Some(req) = &obj.required_values else { return true; };

    if req.logic.to_uppercase() == "AND" {
        // AND 逻辑: 所有条件都必须为 true
        req.conditions.iter().all(|cond| check_condition(cond, player))
    } else {
        // OR 逻辑: 只要有一个条件为 true
        req.conditions.iter().any(|cond| check_condition(cond, player))
    }
}

pub async fn load_and_pack_map_data(map_id: &str, player_data: &Option<PlayerData>) -> Result<PackedMapData, LoadError> {
    println!("📦 开始打包地图: {}", map_id);

    let map_path = PathBuf::from(format!("./data/maps/{}.json", map_id));
    let map_info: MapInfo = read_json_file(map_path).await?; // 直接传递所有权
    println!("  -> 已加载地图信息: {}", map_info.name);

    let object_futures = map_info.objects.iter().map(|obj_id| {
        let obj_path = PathBuf::from(format!("./data/objects/{}.json", obj_id));
        read_json_file::<GameObject>(obj_path)
    });

    let all_game_objects: Vec<GameObject> = try_join_all(object_futures).await?;
    println!("  -> 已加载 {} 个物件", all_game_objects.len());

    let (visible_objects, latent_objects): (Vec<GameObject>, Vec<GameObject>) = all_game_objects
        .into_iter()
        .partition(|obj| should_display_object(obj, player_data));
    println!("  -> 过滤后剩下 {} 个可见物件和 {} 个潜在物件", visible_objects.len(), latent_objects.len());

    let mut asset_manifest = vec![map_info.background.clone()];
    for obj in &visible_objects {
        asset_manifest.push(obj.image.clone());
    }
    for obj in &latent_objects {
        asset_manifest.push(obj.image.clone());
    }
    asset_manifest.sort();
    asset_manifest.dedup();
    println!("  -> 生成了包含 {} 个图片的资源清单", asset_manifest.len());

    let packed_data = PackedMapData {
        name: map_info.name,
        background: map_info.background,
        walls: map_info.walls,
        objects: visible_objects,
        latent_objects,
        width: map_info.width,
        height: map_info.height,
        entry_story_key: map_info.entry_story_key,
        asset_manifest,
    };

    println!("✅ 地图 {} 打包完成！", map_id);
    Ok(packed_data)
}