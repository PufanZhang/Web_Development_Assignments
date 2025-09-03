mod handlers;
mod loader;
mod models;
mod database;
mod auth;

use actix_files::Files;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use std::env;
use tokio::io::{stdin, AsyncBufReadExt, BufReader};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;

// 专门处理根路径"/"的请求，重定向到login.html
#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Found().append_header(("Location", "/login.html")).finish()
}

async fn developer_mode_processor() {
    println!("\n💡 提示：输入 'developer mode' 进入开发者模式。");
    let mut lines = BufReader::new(stdin()).lines();
    let mut in_developer_mode = false;

    // 循环监听命令行输入
    while let Ok(Some(line)) = lines.next_line().await {
        let input = line.trim();

        if input == "developer mode" {
            in_developer_mode = !in_developer_mode;
            if in_developer_mode {
                println!("✅ 已进入开发者模式。");
                println!("   - 输入 'exit' 退出开发者模式。");
                println!("   - 使用格式: 'username variable_name +/-amount' 修改玩家数值。");
                println!("     例如: 'testuser gold +100' 或 'testuser suspicion -10'");
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

            // 解析命令
            let parts: Vec<&str> = input.split_whitespace().collect();
            if parts.len() != 3 {
                eprintln!("❌ 命令格式错误。正确格式: 'username variable_name +/-amount'");
                continue;
            }

            let username = parts[0];
            let value_name = parts[1];
            let amount_str = parts[2];

            // 解析带符号的数值
            let amount: i32 = match amount_str.parse() {
                Ok(num) => num,
                Err(_) => {
                    eprintln!("❌ 数值 '{}' 无效。", amount_str);
                    continue;
                }
            };

            // 调用数据库函数进行修改
            match database::modify_player_value_dev(username, value_name, amount).await {
                Ok((v_name, new_val)) => {
                    println!("✅ 成功! 用户 '{}' 的数值 '{}' 已更新为: {}", username, v_name, new_val);
                }
                Err(e) => {
                    eprintln!("❌ 操作失败: {}", e);
                }
            }
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    const HOST: &str = "127.0.0.1";
    const PORT: u16 = 8080;
    let active_users = web::Data::new(Arc::new(Mutex::new(HashSet::<String>::new())));

    let game_url = format!("http://{}:{}/login.html", HOST, PORT);

    let current_dir = env::current_dir().unwrap_or_default();
    println!("💡 当前工作目录: {:?}", current_dir);
    println!("游戏服务器启动中...");

    let server = HttpServer::new(move || {
        App::new()
            .app_data(active_users.clone())
            .service(
                web::scope("/api")
                    .service(handlers::register)
                    .service(handlers::login)
                    .service(handlers::logout_and_save)
                    .service(handlers::get_map_data)
                    .service(handlers::save_player_data)
                    .service(handlers::load_player_data)
                    .service(handlers::modify_value)
                    .service(handlers::create_manual_save)
                    .service(handlers::load_manual_save)
                    .service(handlers::get_save_file_names)
            )
            .service(Files::new("/js", "./js"))
            .service(Files::new("/css", "./css"))
            .service(Files::new("/data", "./data"))
            .service(Files::new("/assets", "./assets"))
            .service(Files::new("/minigame", "./minigame"))
            .service(index) // 处理根路径
            .service(
                Files::new("/", "./htmls")
                    .index_file("login.html")
                    .use_last_modified(true),
            )
    })
        .bind((HOST, PORT))?;
    // 从绑定的服务器实例中获取监听地址
    let addr = server.addrs()[0];
    println!("✅ 服务器已成功启动，正在监听: http://{}", addr);
    println!("🚀 准备在浏览器中打开游戏...");

    // 调用 opener 打开浏览器
    match opener::open(&game_url) {
        Ok(_) => println!("🎉 浏览器已打开! 如果没有，请手动访问 {}", game_url),
        Err(e) => eprintln!("🤔 无法自动打开浏览器: {}", e),
    }

    println!("\n游戏服务中... 请不要关闭此窗口。");
    println!("按 Ctrl+C 即可退出服务器。");
    tokio::spawn(developer_mode_processor());
    // 运行服务器 (这是一个阻塞调用，会一直运行直到程序退出)
    server.run().await
}