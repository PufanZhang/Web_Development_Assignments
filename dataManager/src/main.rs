mod models;

use fslock::LockFile;
use models::{PlayerData, UserExportData};
use std::collections::HashMap;
use std::io::{self, Write};
use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use tokio::fs;


fn get_data_dir() -> PathBuf {
    PathBuf::from("data")
}

fn get_users_path() -> PathBuf {
    get_data_dir().join("users.json")
}

fn get_player_data_path(username: &str) -> PathBuf {
    get_data_dir().join("players").join(format!("{}.json", username))
}

fn get_save_file_path(username: &str) -> PathBuf {
    get_data_dir().join("save_files").join(format!("{}.json", username))
}

async fn read_users() -> io::Result<HashMap<String, String>> {
    let path = get_users_path();
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(path).await?;
    Ok(serde_json::from_str(&content).unwrap_or_default())
}

async fn write_users(users: &HashMap<String, String>) -> io::Result<()> {
    let path = get_users_path();
    let content = serde_json::to_string_pretty(users)?;
    fs::write(path, content).await
}

async fn delete_player_files(username: &str) -> Result<(), String> {
    let mut users = read_users().await.map_err(|e| format!("读取用户数据库失败: {}", e))?;
    if users.remove(username).is_none() {
        println!("-> 警告: 在用户凭据文件中未找到 '{}'。", username);
    }
    write_users(&users).await.map_err(|e| format!("写入用户数据库失败: {}", e))?;
    println!("-> 已从凭据文件中移除 '{}'。", username);

    let player_data_path = get_player_data_path(username);
    if player_data_path.exists() {
        fs::remove_file(player_data_path).await.map_err(|e| format!("删除主存档失败: {}", e))?;
        println!("-> 已删除主存档文件。");
    }

    let save_file_path = get_save_file_path(username);
    if save_file_path.exists() {
        fs::remove_file(save_file_path).await.map_err(|e| format!("删除手动存档失败: {}", e))?;
        println!("-> 已删除手动存档文件。");
    }

    Ok(())
}


// --- 管理器功能实现 ---

async fn list_users() {
    println!("\n--- 当前用户列表 ---");
    match read_users().await {
        Ok(users) if users.is_empty() => println!("还没有任何用户。"),
        Ok(users) => {
            for username in users.keys() {
                println!("- {}", username);
            }
        }
        Err(e) => eprintln!("读取用户列表失败: {}", e),
    }
}

async fn delete_user() {
    print!("请输入要删除的用户名: ");
    io::stdout().flush().unwrap();
    let mut username = String::new();
    io::stdin().read_line(&mut username).unwrap();
    let username = username.trim();

    if username.is_empty() {
        println!("用户名不能为空。");
        return;
    }

    print!("警告！这将永久删除 '{}' 的所有数据，无法恢复！\n确定要继续吗? (输入 'yes' 确认): ", username);
    io::stdout().flush().unwrap();
    let mut confirmation = String::new();
    io::stdin().read_line(&mut confirmation).unwrap();

    if confirmation.trim().eq_ignore_ascii_case("yes") {
        match delete_player_files(username).await {
            Ok(_) => println!("\n✅ 用户 '{}' 已被成功删除。", username),
            Err(e) => eprintln!("\n❌ 删除失败: {}", e),
        }
    } else {
        println!("操作已取消。");
    }
}

async fn export_user() {
    print!("请输入要导出的用户名: ");
    io::stdout().flush().unwrap();
    let mut username = String::new();
    io::stdin().read_line(&mut username).unwrap();
    let username = username.trim();

    // 步骤 1-3 和之前一样，收集数据
    let users = match read_users().await { Ok(u) => u, Err(e) => { eprintln!("读取用户数据库失败: {}", e); return; } };
    let password_hash = match users.get(username) { Some(hash) => hash.clone(), None => { eprintln!("用户 '{}' 不存在。", username); return; } };
    let player_data: PlayerData = match fs::read(get_player_data_path(username)).await {
        Ok(data) => match serde_json::from_slice(&data) { Ok(pd) => pd, Err(e) => { eprintln!("解析主存档失败: {}", e); return; } },
        Err(e) => { eprintln!("读取主存档失败: {}", e); return; }
    };
    let save_file_path = get_save_file_path(username);
    let manual_saves: Option<HashMap<String, PlayerData>> = if save_file_path.exists() {
        if let Ok(content) = fs::read(save_file_path).await { serde_json::from_slice(&content).ok() } else { None }
    } else { None };

    let export_data = UserExportData {
        username: username.to_string(),
        password_hash,
        player_data,
        manual_saves,
    };

    // 步骤 4: 将数据转换为 JSON 字符串
    let json_string = match serde_json::to_string(&export_data) {
        Ok(s) => s,
        Err(e) => { eprintln!("数据转换为JSON失败: {}", e); return; }
    };

    // 步骤 5: 将 JSON 字符串进行 Base64 编码
    let encoded_data = general_purpose::STANDARD.encode(json_string.as_bytes());

    // 步骤 6: 写入文件
    let filename = format!("{}_{}.gamedata", username, chrono::Local::now().format("%Y%m%d"));
    match fs::write(&filename, encoded_data).await {
        Ok(_) => println!("\n✅ 成功导出用户 '{}' 的数据到文件: {}", username, filename),
        Err(e) => eprintln!("\n❌ 写入导出文件失败: {}", e),
    }
}

// --- import_user (已更新为 Base64) ---
async fn import_user() {
    print!("请输入要导入的数据文件路径 (例如: user_20250914.gamedata): ");
    io::stdout().flush().unwrap();
    let mut file_path = String::new();
    io::stdin().read_line(&mut file_path).unwrap();
    let file_path = file_path.trim();

    // 步骤 1: 读取整个文件内容 (现在是 Base64 字符串)
    let encoded_data = match fs::read_to_string(file_path).await {
        Ok(data) => data,
        Err(e) => { eprintln!("读取文件失败: {}", e); return; }
    };

    // 步骤 2: 将 Base64 字符串解码回 JSON 字符串
    let decoded_bytes = match general_purpose::STANDARD.decode(encoded_data.trim()) {
        Ok(bytes) => bytes,
        Err(e) => { eprintln!("文件内容不是有效的 Base64 格式: {}", e); return; }
    };
    let json_string = match String::from_utf8(decoded_bytes) {
        Ok(s) => s,
        Err(e) => { eprintln!("解码后的数据不是有效的 UTF-8 文本: {}", e); return; }
    };

    // 步骤 3: 将 JSON 字符串解析为我们的数据结构
    let mut import_data: UserExportData = match serde_json::from_str(&json_string) {
        Ok(data) => data,
        Err(e) => { eprintln!("文件格式无效或已损坏: {}", e); return; }
    };

    // 后续的重命名逻辑完全不用变！
    let original_username = import_data.username.clone();
    println!("-> 成功解析文件，准备导入用户 '{}'...", original_username);
    let mut users = match read_users().await { Ok(u) => u, Err(e) => { eprintln!("读取用户数据库失败: {}", e); return; } };
    let mut final_username = original_username.clone();

    if users.contains_key(&original_username) {
        println!("警告！用户 '{}' 已存在。", original_username);
        loop {
            print!("请选择操作: [1] 覆盖现有用户, [2] 重命名并作为新用户导入, [3] 取消\n> ");
            io::stdout().flush().unwrap();
            let mut choice = String::new();
            io::stdin().read_line(&mut choice).unwrap();
            match choice.trim() {
                "1" => { println!("-> 将覆盖现有用户 '{}'。", final_username); break; }
                "2" => {
                    loop {
                        print!("请输入新的用户名: ");
                        io::stdout().flush().unwrap();
                        let mut new_username_input = String::new();
                        io::stdin().read_line(&mut new_username_input).unwrap();
                        let new_username = new_username_input.trim();
                        if new_username.is_empty() { println!("用户名不能为空，请重新输入。"); continue; }
                        if users.contains_key(new_username) { println!("用户名 '{}' 已被占用，请换一个。", new_username); continue; }
                        final_username = new_username.to_string();
                        println!("-> 用户将以新名称 '{}' 导入。", final_username);
                        import_data.username = final_username.clone();
                        import_data.player_data.username = final_username.clone();
                        if let Some(manual_saves) = &mut import_data.manual_saves {
                            for save_data in manual_saves.values_mut() { save_data.username = final_username.clone(); }
                        }
                        break;
                    }
                    break;
                }
                "3" => { println!("操作已取消。"); return; }
                _ => { println!("无效输入，请输入 1, 2 或 3。"); }
            }
        }
    }

    // 写入数据的逻辑也完全不用变
    users.insert(final_username.clone(), import_data.password_hash);
    if let Err(e) = write_users(&users).await { eprintln!("写入用户凭据失败: {}", e); return; }
    let player_data_content = serde_json::to_string_pretty(&import_data.player_data).unwrap();
    if let Err(e) = fs::write(get_player_data_path(&final_username), player_data_content).await { eprintln!("写入主存档失败: {}", e); return; }
    if let Some(manual_saves) = import_data.manual_saves {
        let manual_saves_content = serde_json::to_string_pretty(&manual_saves).unwrap();
        if let Err(e) = fs::write(get_save_file_path(&final_username), manual_saves_content).await { eprintln!("写入手动存档失败: {}", e); return; }
    }
    println!("\n✅ 成功导入用户 '{}' 的数据！", final_username);
}

// --- 主程序入口 ---

#[tokio::main]
async fn main() {
    // --- 文件锁逻辑 ---
    let lock_file_path = "game_server.lock";
    let mut lock_file = LockFile::open(lock_file_path).expect("无法创建锁文件");

    if !lock_file.try_lock().expect("无法获取锁状态") {
        eprintln!("❌ 致命错误: 游戏服务器当前正在运行中。");
        eprintln!("请先关闭游戏服务器，再使用本工具。");
        println!("\n按 Enter 键退出...");
        let mut buffer = String::new();
        io::stdin().read_line(&mut buffer).unwrap_or_default();
        return;
    }
    // --- 文件锁逻辑结束 ---

    println!("===========================");
    println!("  游戏数据管理器 v0.1.0");
    println!("===========================");

    loop {
        println!("\n请选择要执行的操作:");
        println!("  1. 查看所有用户");
        println!("  2. 导出用户数据");
        println!("  3. 导入用户数据");
        println!("  4. 删除用户");
        println!("  q. 退出");
        print!("> ");
        io::stdout().flush().unwrap();

        let mut choice = String::new();
        io::stdin().read_line(&mut choice).unwrap();

        match choice.trim() {
            "1" => list_users().await,
            "2" => export_user().await,
            "3" => import_user().await,
            "4" => delete_user().await,
            "q" | "Q" => break,
            _ => println!("无效的输入，请重新选择。"),
        }
    }
}
