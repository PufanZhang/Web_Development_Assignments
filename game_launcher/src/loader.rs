use crate::models::{GameObject, MapInfo, PackedMapData};
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

pub async fn load_and_pack_map_data(map_id: &str) -> Result<PackedMapData, LoadError> {
    println!("📦 开始打包地图: {}", map_id);

    let map_path = PathBuf::from(format!("./data/maps/{}.json", map_id));
    let map_info: MapInfo = read_json_file(map_path).await?; // 直接传递所有权
    println!("  -> 已加载地图信息: {}", map_info.name);

    let object_futures = map_info.objects.iter().map(|obj_id| {
        let obj_path = PathBuf::from(format!("./data/objects/{}.json", obj_id));
        read_json_file::<GameObject>(obj_path)
    });

    let game_objects: Vec<GameObject> = try_join_all(object_futures).await?;
    println!("  -> 已加载 {} 个物件", game_objects.len());

    let mut asset_manifest = vec![map_info.background.clone()];
    for obj in &game_objects {
        asset_manifest.push(obj.image.clone());
    }
    // 去重
    asset_manifest.sort();
    asset_manifest.dedup();
    println!("  -> 生成了包含 {} 个图片的资源清单", asset_manifest.len());

    let packed_data = PackedMapData {
        name: map_info.name,
        background: map_info.background,
        walls: map_info.walls,
        objects: game_objects, // 在这里可以加入基于玩家存档的过滤逻辑
        entry_story_key: map_info.entry_story_key,
        asset_manifest,
    };

    println!("✅ 地图 {} 打包完成！", map_id);
    Ok(packed_data)
}