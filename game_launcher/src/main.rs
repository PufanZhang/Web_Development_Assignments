mod handlers;
mod loader;
mod models;
mod database;
mod auth;

use std::env;
use actix_files::Files;
use actix_web::{App, HttpServer, web};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    const HOST: &str = "127.0.0.1";
    const PORT: u16 = 8080;

    let game_url = format!("http://{}:{}/login.html", HOST, PORT);

    let current_dir = env::current_dir().unwrap_or_default();
    println!("💡 当前工作目录: {:?}", current_dir);
    println!("游戏服务器启动中...");

    let server = HttpServer::new(|| {
        App::new()
            .service(
                web::scope("/api")
                    .service(handlers::register)
                    .service(handlers::login)
                    .service(handlers::get_map_data)
                    .service(handlers::save_player_data)
                    .service(handlers::load_player_data)
                    .service(handlers::modify_value)
            )
            .service(
                Files::new("/", ".")
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

    // 运行服务器 (这是一个阻塞调用，会一直运行直到程序退出)
    server.run().await
}