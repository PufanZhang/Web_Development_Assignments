use crate::loader::{load_and_pack_map_data, LoadError};
use crate::database::{self, ModifyValueError};
use actix_web::{get, post, web, HttpResponse, Responder};
use crate::models::{AuthRequest, AuthResponse, ModifyValueRequest, PlayerData, LogoutRequest, TokenLoginRequest, LoginWithTokenResponse, ApiLogoutRequest};
use crate::auth::{create_jwt, AuthenticatedUser};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;

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
pub async fn login(req: web::Json<AuthRequest>, active_users: web::Data<Arc<Mutex<HashSet<String>>>>) -> impl Responder {
    match database::login_user(&req).await {
        Ok(true) => {
            // 检查用户是否已在集合中
            let mut users = active_users.lock().await;
            if users.contains(&req.username) {
                // 如果已存在，则拒绝登录
                return HttpResponse::Conflict().json(AuthResponse {
                    success: false,
                    message: "This account is already logged in elsewhere.".to_string(),
                    token: None,
                });
            }

            // 如果不存在，则将其加入集合
            users.insert(req.username.clone());

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

#[post("/auth/login_with_token")]
pub async fn login_with_token(
    req: web::Json<TokenLoginRequest>,
    active_users: web::Data<Arc<Mutex<HashSet<String>>>>,
) -> impl Responder {
    // 1. 验证 token 并获取用户名
    match crate::auth::validate_and_get_username(&req.token) {
        Ok(username) => {
            let mut users = active_users.lock().await;

            // 2. 检查此账号是否已在其他地方登录
            if users.contains(&username) {
                return HttpResponse::Conflict().json(LoginWithTokenResponse {
                    success: false,
                    message: "This account is already logged in elsewhere.".to_string(),
                    token: None,
                    player_data: None,
                });
            }

            // 3. 如果未登录，则添加到在线用户列表
            users.insert(username.clone());

            // 4. 签发一个新的 token
            match create_jwt(&username) {
                Ok(new_token) => {
                    // 5. 加载玩家数据
                    match database::load_player_data(&username).await {
                        Ok(player_data) => HttpResponse::Ok().json(LoginWithTokenResponse {
                            success: true,
                            message: "Login successful!".to_string(),
                            token: Some(new_token),
                            player_data: Some(player_data),
                        }),
                        Err(_) => HttpResponse::NotFound().json(LoginWithTokenResponse {
                            success: false,
                            message: "Player data not found.".to_string(),
                            token: None,
                            player_data: None,
                        }),
                    }
                }
                Err(_) => HttpResponse::InternalServerError().json(LoginWithTokenResponse {
                    success: false,
                    message: "Could not create new token.".to_string(),
                    token: None,
                    player_data: None,
                }),
            }
        }
        Err(_) => {
            // 如果 token 无效或已过期
            HttpResponse::Unauthorized().json(LoginWithTokenResponse {
                success: false,
                message: "Invalid or expired token.".to_string(),
                token: None,
                player_data: None,
            })
        }
    }
}

#[post("/player/logout")]
pub async fn logout_and_save(payload: web::Json<LogoutRequest>, active_users: web::Data<Arc<Mutex<HashSet<String>>>>
) -> impl Responder {
    // 1. 从请求体中拿出 token，手动进行验证
    match crate::auth::validate_and_get_username(&payload.token) {
        Ok(username) => {
            // 2. 安全检查：确保 token 里的用户名和 player_data 里的用户名一致
            if payload.player_data.username != username {
                return HttpResponse::Forbidden().body("Token username does not match player data.");
            }

            // 3. 从在线用户列表中移除该用户
            let mut users = active_users.lock().await;
            users.remove(&username);
            println!("User '{}' logged out and data saved.", username);

            // 4. 保存玩家数据
            match database::save_player_data(&payload.player_data).await {
                Ok(_) => HttpResponse::Ok().finish(),
                Err(e) => {
                    eprintln!("Failed to save player data on logout for user '{}': {}", username, e);
                    HttpResponse::InternalServerError().finish()
                },
            }
        }
        Err(_) => {
            // 如果 token 无效或过期
            HttpResponse::Unauthorized().body("Invalid token provided in payload.")
        }
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
pub async fn load_player_data(
    user: AuthenticatedUser,
    active_users: web::Data<Arc<Mutex<HashSet<String>>>>
) -> impl Responder {
    // 防止在刷新时被登出
    let mut users = active_users.lock().await;
    users.insert(user.username.clone());

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
        Err(e) => match e {
            ModifyValueError::InvalidValueName(name) => {
                HttpResponse::BadRequest().body(format!("Invalid value name: {}", name))
            }
            ModifyValueError::Io(_) => {
                HttpResponse::InternalServerError().body("Failed to modify player value due to a server error.")
            }
        },
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

// 用于在主页时登出
#[post("/auth/logout")]
pub async fn logout(
    req: web::Json<ApiLogoutRequest>,
    active_users: web::Data<Arc<Mutex<HashSet<String>>>>
) -> impl Responder {

    // 1. 手动从请求体中拿出 token 进行验证
    match crate::auth::validate_and_get_username(&req.token) {
        Ok(username_from_token) => {
            // 确认 token 里的用户名和请求体里的用户名是不是同一个人
            if req.username != username_from_token {
                return HttpResponse::Forbidden().body("Username in request body does not match token.");
            }

            let mut users = active_users.lock().await;
            users.remove(&username_from_token);
            println!("User '{}' logged out via API.", username_from_token);
            HttpResponse::Ok().finish()
        }
        // 验证失败，说明 token 是无效的或者过期了
        Err(_) => {
            HttpResponse::Unauthorized().body("Invalid token provided in payload.")
        }
    }
}