use crate::database;
use actix_web::web;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::io::{stdin, AsyncBufReadExt, BufReader};
use tokio::sync::Mutex;

// 辅助函数：处理带符号的数值字符串（例如 "+100" 或 "-10"）
fn parse_signed_amount(amount_str: &str) -> Result<i32, String> {
    amount_str
        .parse()
        .map_err(|_| format!("❌ 数值 '{}' 无效。", amount_str))
}

// 辅助函数：处理直接设置的数值字符串
fn parse_set_amount(amount_str: &str) -> Result<i32, String> {
    amount_str
        .parse()
        .map_err(|_| format!("❌ 数值 '{}' 无效。", amount_str))
}

// 获取唯一活跃用户的用户名
async fn get_sole_active_user(
    active_users: &web::Data<Arc<Mutex<HashSet<String>>>>,
) -> Result<Option<String>, String> {
    let users = active_users.lock().await;
    if users.len() > 1 {
        let user_list: Vec<String> = users.iter().cloned().collect();
        Err(format!(
            "❌ 检测到多个在线用户: {:?}。请明确指定用户名。",
            user_list
        ))
    } else {
        Ok(users.iter().next().cloned())
    }
}

pub async fn developer_mode_processor(
    active_users: web::Data<Arc<Mutex<HashSet<String>>>>,
) {
    println!("\n💡 提示：输入 'developer mode' 进入开发者模式。");
    let mut lines = BufReader::new(stdin()).lines();
    let mut in_developer_mode = false;

    while let Ok(Some(line)) = lines.next_line().await {
        let input = line.trim();

        if input == "developer mode" {
            in_developer_mode = !in_developer_mode;
            if in_developer_mode {
                println!("✅ 已进入开发者模式。");
                println!("   - 输入 'exit' 退出开发者模式。");
            } else {
                println!("🚪 已退出开发者模式。");
            }
            continue;
        }

        if in_developer_mode {
            if input == "exit" {
                in_developer_mode = false;
                println!("🚪 已退出开发者模式。");
                continue;
            }

            let parts: Vec<&str> = input.split_whitespace().collect();
            let mut username: Option<String> = None;
            let command: Vec<&str>;

            // --- 解析命令和用户名 ---
            match parts.len() {
                2 | 3 => { // 省略用户名的格式
                    match get_sole_active_user(&active_users).await {
                        Ok(Some(uname)) => username = Some(uname),
                        Ok(None) => {
                            eprintln!("❌ 当前没有用户在线。");
                            continue;
                        }
                        Err(e) => {
                            eprintln!("{}", e);
                            continue;
                        }
                    }
                    command = parts;
                }
                4 => { // 明确指定用户名的格式
                    username = Some(parts[0].to_string());
                    command = parts[1..].to_vec();
                }
                _ => {
                    eprintln!("❌ 命令格式错误。");
                    continue;
                }
            }

            let final_username = username.unwrap(); // 此时 username 必定是 Some

            // --- 执行命令 ---
            if command.len() == 3 && command[0] == "set" {
                // SET 命令: set <variable> <amount>
                let value_name = command[1];
                let amount = match parse_set_amount(command[2]) {
                    Ok(num) => num,
                    Err(e) => {
                        eprintln!("{}", e);
                        continue;
                    }
                };
                match database::set_player_value_dev(&final_username, value_name, amount).await {
                    Ok((v_name, new_val)) => println!("✅ 成功! 用户 '{}' 的 '{}' 已被设置为: {}", final_username, v_name, new_val),
                    Err(e) => eprintln!("❌ 操作失败: {}", e),
                }

            } else if command.len() == 2 {
                // MODIFY 命令: <variable> +/-<amount>
                let value_name = command[0];
                let amount = match parse_signed_amount(command[1]) {
                    Ok(num) => num,
                    Err(e) => {
                        eprintln!("{}", e);
                        continue;
                    }
                };
                match database::modify_player_value_dev(&final_username, value_name, amount).await {
                    Ok((v_name, new_val)) => println!("✅ 成功! 用户 '{}' 的 '{}' 已更新为: {}", final_username, v_name, new_val),
                    Err(e) => eprintln!("❌ 操作失败: {}", e),
                }
            } else {
                eprintln!("❌ 命令格式错误。");
            }
        }
    }
}