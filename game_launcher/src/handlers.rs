use crate::loader::{load_and_pack_map_data, LoadError};
use crate::database;
use actix_web::{get, post, web, HttpResponse, Responder};
use crate::models::{AuthRequest, AuthResponse, ModifyValueRequest, PlayerData};
use crate::auth::{create_jwt, AuthenticatedUser};

#[get("/map_data/{map_id}")]
pub async fn get_map_data( map_id: web::Path<String>, user: AuthenticatedUser) -> impl Responder {
    // 从 token 里拿到用户名
    let username = user.username;

    let player_data_result = database::load_player_data(&username).await;
    let player_data = player_data_result.ok();

    match load_and_pack_map_data(&map_id, &player_data).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(LoadError::NotFound) => {
            HttpResponse::NotFound().body(format!("Map '{}' not found.", map_id))
        }
        Err(e) => {
            match e {
                LoadError::Io(io_err) => {
                    eprintln!("[I/O Error] processing map {}: {}", map_id, io_err);
                }
                LoadError::Json(json_err) => {
                    eprintln!("[JSON Error] processing map {}: {}", map_id, json_err);
                }
                // NotFound 的情况已经在上面处理过了，这里逻辑上不会出现
                LoadError::NotFound => {}
            }
            HttpResponse::InternalServerError().body("Oops! Something went wrong on the server.")
        }
    }
}

#[post("/auth/register")]
pub async fn register(req: web::Json<AuthRequest>) -> impl Responder {
    match database::register_user(&req).await {
        Ok(_) => {
            // 注册成功后也直接签发 token, 实现自动登录
            match create_jwt(&req.username) {
                Ok(token) => HttpResponse::Ok().json(AuthResponse {
                    success: true,
                    message: "Registration successful!".to_string(),
                    token: Some(token),
                }),
                Err(_) => HttpResponse::InternalServerError().json(AuthResponse {
                    success: false,
                    message: "Could not create token.".to_string(),
                    token: None,
                }),
            }
        },
        Err(msg) => HttpResponse::Conflict().json(AuthResponse {
            success: false,
            message: msg.to_string(),
            token: None,
        }),
    }
}

#[post("/auth/login")]
pub async fn login(req: web::Json<AuthRequest>) -> impl Responder {
    match database::login_user(&req).await {
        Ok(true) => {
            // 登录成功, 签发 token
            match create_jwt(&req.username) {
                Ok(token) => HttpResponse::Ok().json(AuthResponse {
                    success: true,
                    message: "Login successful!".to_string(),
                    token: Some(token),
                }),
                Err(_) => HttpResponse::InternalServerError().json(AuthResponse {
                    success: false,
                    message: "Could not create token.".to_string(),
                    token: None,
                }),
            }
        },
        Ok(false) => HttpResponse::Unauthorized().json(AuthResponse {
            success: false,
            message: "Invalid username or password.".to_string(),
            token: None,
        }),
        Err(msg) => HttpResponse::InternalServerError().json(AuthResponse {
            success: false,
            message: msg.to_string(),
            token: None,
        }),
    }
}

#[post("/player/save")]
pub async fn save_player_data(data: web::Json<PlayerData>, user: AuthenticatedUser) -> impl Responder {
    // 确保请求体里的 username 和 token 里的是同一个人
    if data.username != user.username {
        return HttpResponse::Forbidden().finish();
    }
    match database::save_player_data(&data).await {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

#[get("/player/load")]
pub async fn load_player_data(user: AuthenticatedUser) -> impl Responder {
    match database::load_player_data(&user.username).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::NotFound().finish(),
    }
}

#[post("/player/modify_value")]
pub async fn modify_value(req: web::Json<ModifyValueRequest>, user: AuthenticatedUser) -> impl Responder {
    if req.username != user.username {
        return HttpResponse::Forbidden().finish();
    }
    match database::modify_player_value(&req.username, &req.value_name, req.amount).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(_) => HttpResponse::InternalServerError().body("Failed to modify player value."),
    }
}

#[post("/player/savefile/{save_name}")]
pub async fn create_manual_save(
    path: web::Path<String>,
    data: web::Json<PlayerData>,
    user: AuthenticatedUser
) -> impl Responder {
    let save_name = path.into_inner();
    if data.username != user.username {
        return HttpResponse::Forbidden().finish();
    }

    match database::save_file(&save_name, &data).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(_) => HttpResponse::InternalServerError().body("Failed to save player file."),
    }
}

#[post("/player/loadfile/{save_name}")]
pub async fn load_manual_save(path: web::Path<String>, user: AuthenticatedUser) -> impl Responder {
    let save_name = path.into_inner();
    let username = &user.username;

    match database::load_save_file(username, &save_name).await {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            HttpResponse::NotFound().body(e.to_string()) // 如果存档不存在，返回 404 Not Found
        },
        Err(_) => HttpResponse::InternalServerError().finish(), // 其他错误，返回 500
    }
}

#[get("/player/enquire_all_savefiles")]
pub async fn get_save_file_names(user: AuthenticatedUser) -> impl Responder {
    match database::get_manual_save_names(&user.username).await {
        Ok(names) => HttpResponse::Ok().json(names),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}