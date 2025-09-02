mod handlers;
mod loader;
mod models;
mod database;
mod auth;

use std::env;
use std::path::PathBuf;
use actix_files::Files;
use actix_web::{App, HttpServer, web, get, Responder, HttpResponse};


#[get("/{filename:.*\\.html}")]
async fn serve_html(path_param: web::Path<String>) -> impl Responder {
    let filename = path_param.into_inner();
    let mut path = PathBuf::from("./htmls");
    path.push(&filename);
    match std::fs::read_to_string(&path) {
        Ok(content) => HttpResponse::Ok().content_type("text/html").body(content),
        Err(_) => HttpResponse::NotFound().body(format!("404 Not Found: Could not find '{}'", filename)),
    }
}

// 专门处理根路径"/"的请求，重定向到login.html
#[get("/")]
async fn index() -> impl Responder {
    HttpResponse::Found().append_header(("Location", "/login.html")).finish()
}

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
            .service(Files::new("/js", "./js"))
            .service(Files::new("/css", "./css"))
            .service(Files::new("/assets", "./assets"))
            .service(Files::new("/minigame", "./minigame"))
            .service(index) // 处理根路径
            .service(serve_html) // 处理所有.html文件的请求
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

    // 运行服务器 (这是一个阻塞调用，会一直运行直到程序退出)
    server.run().await
}