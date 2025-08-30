use tiny_http::{Server, Response, Header, Request, Method, StatusCode};
use std::fs;
use std::path::{Path, PathBuf};
use std::env;

fn main() {
    // 尝试在本地的任意一个空闲端口上启动服务器
    let server = match Server::http("127.0.0.1:0") {
        Ok(s) => s,
        Err(e) => {
            println!("❌ 启动服务器失败: {}", e);
            println!("按 Enter 键退出...");
            let mut line = String::new();
            std::io::stdin().read_line(&mut line).unwrap();
            return;
        }
    };

    // 获取服务器实际监听的地址和端口
    let addr = server.server_addr().to_string();
    let full_url = format!("http://{}/login.html", addr);

    println!("✅ 服务器已成功启动，正在监听: http://{}", addr);
    println!("🚀 准备在浏览器中打开游戏...");

    // 使用 opener 库自动打开浏览器
    match opener::open(&full_url) {
        Ok(_) => println!("🎉 浏览器已打开! 如果没有，请手动访问上面的地址。"),
        Err(e) => println!("🤔 无法自动打开浏览器: {}", e),
    }

    println!("\n游戏服务中... 请不要关闭此窗口。");
    println!("按 Ctrl+C 即可退出服务器。");

    // 循环处理来自浏览器的请求
    for request in server.incoming_requests() {
        handle_request(request);
    }
}

// 处理每一个请求
fn handle_request(request: Request) {
    // 打印出浏览器请求了哪个文件
    println!("请求: {} {}", request.method(), request.url());

    if *request.method() != Method::Get {
        let response = Response::empty(StatusCode(405));
        let _ = request.respond(response);
        return;
    }

    // 将 URL 路径转换为本地文件路径
    let mut file_path = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

    // 如果请求的是根目录 "/"，我们就返回 "login.html"
    let requested_url = if request.url() == "/" {
        "/login.html"
    } else {
        request.url()
    };

    // 把 URL 开头的 "/" 去掉
    file_path.push(requested_url.trim_start_matches('/'));

    // 读取文件内容
    match fs::read(&file_path) {
        Ok(data) => {
            // 根据文件后缀名猜一下它的 Content-Type，这样浏览器才能正确显示
            let content_type = get_content_type(&file_path);
            let header = Header::from_bytes(&b"Content-Type"[..], content_type).unwrap();

            // 把文件内容和一个 "200 OK" 的状态码一起发回给浏览器
            let response = Response::from_data(data).with_header(header);
            let _ = request.respond(response);
        }
        Err(_) => {
            // 如果文件没找到，就返回一个 "404 Not Found"
            let response = Response::from_string("404 Not Found").with_status_code(404);
            let _ = request.respond(response);
        }
    }
}

// 辅助函数用来判断文件类型
fn get_content_type(path: &Path) -> &'static str {
    match path.extension().and_then(|s| s.to_str()) {
        Some("html") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js") => "application/javascript; charset=utf-8",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("json") => "application/json",
        _ => "application/octet-stream",
    }
}