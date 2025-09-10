mod handlers;
mod loader;
mod models;
mod database;
mod auth;
mod dev_mode;

use actix_files::Files;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use std::collections::HashSet;
use std::env;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::net::TcpListener;
use std::io;

// 专门处理根路径"/"的请求，重定向到login.html
#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Found().append_header(("Location", "/login.html")).finish()
}

// 从起始端口开始，查找一个可用的 TCP 端口
fn find_available_port(host: &str, start_port: u16) -> Option<u16> {
    let mut port = start_port;
    println!("🔎 正在从端口 {} 开始寻找可用端口...", port);
    while port < 65535 {
        // 尝试绑定地址，如果成功，说明该端口可用
        if TcpListener::bind((host, port)).is_ok() {
            println!("✅ 找到可用端口: {}", port);
            return Some(port);
        }
        // 如果失败，则尝试下一个端口
        port += 1;
    }
    // 如果循环结束仍未找到，返回 None
    None
}

/// 等待用户按键后退出程序
fn pause_and_exit() {
    println!("\n请按 Enter 键退出程序...");
    let mut buffer = String::new();
    // 读取用户输入，程序会在此暂停
    io::stdin().read_line(&mut buffer).unwrap_or_default();
    // 用户按键后，函数结束，程序将退出
}

#[actix_web::main]
async fn main() -> io::Result<()> {
    const HOST: &str = "127.0.0.1";
    const START_PORT: u16 = 8080;

    // 自动寻找一个空闲端口
    let port = match find_available_port(HOST, START_PORT) {
        Some(p) => p,
        None => {
            // 如果找不到端口，则打印错误信息并等待用户输入
            eprintln!("❌ 错误: 在 {}-65535 范围内找不到任何可用的网络端口。", START_PORT);
            eprintln!("这可能是因为所有端口都被其他程序（如其他游戏、下载软件或系统服务）占用了。");
            eprintln!("请尝试关闭一些其他程序后再重新启动本游戏。");
            pause_and_exit();
            // 正常退出程序
            return Ok(());
        }
    };

    let active_users = web::Data::new(Arc::new(Mutex::new(HashSet::<String>::new())));

    let game_url = format!("http://{}:{}/login.html", HOST, port);

    let current_dir = env::current_dir().unwrap_or_default();
    println!("💡 当前工作目录: {:?}", current_dir);
    println!("游戏服务器启动中...");
    let active_users_for_dev_mode = active_users.clone();

    let server = HttpServer::new(move || {
        App::new()
            .app_data(active_users.clone())
            .service(
                web::scope("/api")
                    .service(handlers::register)
                    .service(handlers::login)
                    .service(handlers::login_with_token)
                    .service(handlers::logout)
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
        .bind((HOST, port))?;
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
    tokio::spawn(dev_mode::developer_mode_processor(
        active_users_for_dev_mode,
    ));
    // 运行服务器 (这是一个阻塞调用，会一直运行直到程序退出)
    server.run().await
}