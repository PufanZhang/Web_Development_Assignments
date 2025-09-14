use crate::loader::{load_and_pack_map_data, LoadError};
use crate::database::{self, ModifyValueError, LoginOutcome};
use actix_web::{get, post, web, HttpResponse, Responder};
use crate::models::{AuthRequest, AuthResponse, ModifyValueRequest, PlayerData, LogoutRequest, TokenLoginRequest, LoginWithTokenResponse, ApiLogoutRequest, PlayTimeResponse};
use crate::auth::{create_jwt, AuthenticatedUser};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::achievements;
use crate::models::FrontendAchievement;
use std::collections::HashMap;
use chrono::Utc;

#[get("/map_data/{map_id}")]
pub async fn get_map_data( map_id: web::Path<String>,
                           user: AuthenticatedUser,
                           last_music_sent: web::Data<Arc<Mutex<HashMap<String, String>>>>,
) -> impl Responder {
    // 从 token 里拿到用户名
    let username = user.username;

    let player_data_result = database::load_player_data(&username).await;
    let player_data = player_data_result.ok();

    match load_and_pack_map_data(&map_id, &player_data).await {
        Ok(mut data) => { // 将 data 设为可变
            let mut music_state = last_music_sent.lock().await;
            let last_music = music_state.get(&username).cloned();

            match (&data.music, last_music) {
                (Some(current_music), Some(last)) if current_music == &last => {
                    // 音乐相同，从数据包中移除，不发送
                    data.music = None;
                }
                (Some(current_music), _) => {
                    // 音乐不同或之前没有音乐，更新状态
                    music_state.insert(username.clone(), current_music.clone());
                }
                (None, Some(_)) => {
                    // 新地图没有音乐，但之前有，移除记录
                    music_state.remove(&username);
                }
                _ => {
                    // 两边都没有音乐，什么都不用做
                }
            }
            HttpResponse::Ok().json(data)
        },
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
        Ok(LoginOutcome::Success) => {
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

            // 只有当用户不在活跃集合中时，才更新时间戳并加入
            users.insert(req.username.clone());

            let username = req.username.clone();
            tokio::spawn(async move {
                if let Ok(mut player_data) = database::load_player_data(&username).await {
                    player_data.last_login_timestamp = Utc::now().timestamp();
                    if let Err(e) = database::save_player_data(&player_data).await {
                        eprintln!("[Login Timestamp Error] Failed to save for user '{}': {}", username, e);
                    }
                }
            });

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
        Ok(LoginOutcome::IncorrectPassword) => HttpResponse::Unauthorized().json(AuthResponse {
            success: false,
            message: "Incorrect password.".to_string(),
            token: None,
        }),
        Ok(LoginOutcome::UserNotFound) => HttpResponse::Unauthorized().json(AuthResponse {
            success: false,
            message: "Username not found.".to_string(),
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
                        Ok(mut player_data) => {
                            // 记录登录时间戳并保存
                            player_data.last_login_timestamp = Utc::now().timestamp();
                            if database::save_player_data(&player_data).await.is_err() {
                                eprintln!("Error saving login timestamp for user '{}'", username);
                            }
                            HttpResponse::Ok().json(LoginWithTokenResponse {
                                success: true,
                                message: "Login successful!".to_string(),
                                token: Some(new_token),
                                player_data: Some(player_data), // 返回更新了时间戳的数据
                            })
                        },
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
    // 从请求体中拿出 token，手动进行验证
    match crate::auth::validate_and_get_username(&payload.token) {
        Ok(username) => {
            // 安全检查：确保 token 里的用户名和 player_data 里的用户名一致
            if payload.player_data.username != username {
                return HttpResponse::Forbidden().body("Token username does not match player data.");
            }

            let mut users = active_users.lock().await;
            // 只有当用户确实在活跃列表中时，才执行时长结算
            if users.remove(&username) {
                // 加载服务器端最新的玩家数据
                if let Ok(mut server_player_data) = database::load_player_data(&username).await {
                    let current_timestamp = Utc::now().timestamp();

                    // 使用服务器端的时间戳来计算会话时长
                    if server_player_data.last_login_timestamp > 0 {
                        let session_duration = current_timestamp - server_player_data.last_login_timestamp;
                        if session_duration > 0 {
                            server_player_data.total_play_time_seconds += session_duration as u64;
                        }
                    }

                    // 合并前端数据（除了成就和时间相关字段）
                    let client_data = payload.into_inner().player_data;
                    server_player_data.address = client_data.address;
                    server_player_data.values = client_data.values;
                    server_player_data.map_states = client_data.map_states;

                    // 保存整合后的数据
                    if let Err(e) = database::save_player_data(&server_player_data).await {
                        eprintln!("Failed to save player data on logout for user '{}': {}", username, e);
                        return HttpResponse::InternalServerError().finish();
                    }

                    println!("User '{}' logged out and data saved.", username);
                    HttpResponse::Ok().finish()
                } else {
                    eprintln!("Failed to load player data for user '{}' on logout.", username);
                    HttpResponse::InternalServerError().finish()
                }
            } else {
                // 如果用户本就不在线，直接返回成功，不做任何处理
                println!("User '{}' was not in the active set but sent a logout request. Ignored.", username);
                HttpResponse::Ok().finish()
            }
        }
        Err(_) => {
            // 如果 token 无效或过期
            HttpResponse::Unauthorized().body("Invalid token provided in payload.")
        }
    }
}

#[get("/player/load")]
pub async fn load_player_data(
    user: AuthenticatedUser,
    active_users: web::Data<Arc<Mutex<HashSet<String>>>>
) -> impl Responder {
    // 防止在刷新时被登出
    let mut users = active_users.lock().await;

    // 使用 insert 的返回值来判断用户是否是新登录
    let is_newly_inserted = users.insert(user.username.clone());

    // 如果是新插入的（即之前不在线），则更新其登录时间戳
    if is_newly_inserted {
        let username = user.username.clone();
        tokio::spawn(async move {
            if let Ok(mut player_data) = database::load_player_data(&username).await {
                player_data.last_login_timestamp = Utc::now().timestamp();
                if let Err(e) = database::save_player_data(&player_data).await {
                    eprintln!("[Timestamp Error on Load] Failed to save for user '{}': {}", username, e);
                }
            }
        });
    }

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
    user: AuthenticatedUser,
) -> impl Responder {
    let save_name = path.into_inner();
    let mut player_data = data.into_inner();
    if player_data.username != user.username {
        return HttpResponse::Forbidden().finish();
    }

    match database::create_manual_save(&save_name, &mut player_data).await {
        Ok(_) => HttpResponse::Ok().finish(),
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
pub async fn get_all_savefile_intros(user: AuthenticatedUser) -> impl Responder {
    // 调用新的数据库函数 get_all_save_display_data
    match database::get_all_save_display_data(&user.username).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

// 用于在主页时登出
#[post("/auth/logout")]
pub async fn logout(
    req: web::Json<ApiLogoutRequest>,
    active_users: web::Data<Arc<Mutex<HashSet<String>>>>
) -> impl Responder {
    // 手动从请求体中拿出 token 进行验证
    match crate::auth::validate_and_get_username(&req.token) {
        Ok(username_from_token) => {
            // 确认 token 里的用户名和请求体里的用户名是不是同一个人
            if req.username != username_from_token {
                return HttpResponse::Forbidden().body("Username in request body does not match token.");
            }

            let mut users = active_users.lock().await;
            // 只有当用户确实从活跃集合中被移除时，才更新游戏时长
            if users.remove(&username_from_token) {
                let username_clone = username_from_token.clone();
                tokio::spawn(async move {
                    if let Ok(mut player_data) = database::load_player_data(&username_clone).await {
                        let current_timestamp = Utc::now().timestamp();
                        if player_data.last_login_timestamp > 0 {
                            let session_duration = current_timestamp - player_data.last_login_timestamp;
                            if session_duration > 0 {
                                player_data.total_play_time_seconds += session_duration as u64;
                                if let Err(e) = database::save_player_data(&player_data).await {
                                    eprintln!("[Logout Playtime Error] Failed to save for user '{}': {}", username_clone, e);
                                }
                            }
                        }
                    }
                });
                println!("User '{}' logged out via API.", username_from_token);
            } else {
                println!("User '{}' was not in the active set but sent an API logout request. Ignored.", username_from_token);
            }
            HttpResponse::Ok().finish()
        }
        // 验证失败，说明 token 是无效的或者过期了
        Err(_) => {
            HttpResponse::Unauthorized().body("Invalid token provided in payload.")
        }
    }
}

#[get("/achievements/all")]
pub async fn get_all_achievements_status(user: AuthenticatedUser) -> impl Responder {
    // 1. 加载当前玩家的数据
    let player_data_result = database::load_player_data(&user.username).await;
    if player_data_result.is_err() {
        return HttpResponse::NotFound().body("Player data not found.");
    }
    let player_data = player_data_result.unwrap();

    // 2. 获取所有成就的定义
    let all_achievements_result = achievements::get_all_achievements().await;
    if all_achievements_result.is_err() {
        return HttpResponse::InternalServerError().body("Failed to load achievements data.");
    }
    let all_achievements = all_achievements_result.unwrap();

    // 3. 组合数据，按分类整理
    let mut categorized_achievements: HashMap<String, Vec<FrontendAchievement>> = HashMap::new();

    for (filename, achievement_details) in all_achievements {
        let completed = player_data.achievements.contains(&filename);

        // 根据完成状态决定使用哪个 description
        let description = if completed {
            achievement_details.description_completed.clone()
        } else {
            achievement_details.description_uncompleted.clone()
        };

        let frontend_achievement = FrontendAchievement {
            id: achievement_details.id.clone(),
            name: achievement_details.name.clone(),
            r#abstract: achievement_details.r#abstract.clone(),
            description, // 使用上面逻辑判断得出的 description
            icon: achievement_details.icon.clone(),
            completed,
            achievement_type: achievement_details.achievement_type.clone(),
        };

        // 放入对应的分类，如果分类不存在则创建
        categorized_achievements
            .entry(achievement_details.achievement_type)
            .or_default()
            .push(frontend_achievement);
    }

    HttpResponse::Ok().json(categorized_achievements)
}

#[get("/player/playtime")]
pub async fn get_play_time(user: AuthenticatedUser) -> impl Responder {
    match database::load_player_data(&user.username).await {
        Ok(player_data) => {
            let mut total_play_time = player_data.total_play_time_seconds;
            let current_timestamp = Utc::now().timestamp();

            // 如果玩家在线，则要加上本次登录到目前为止的时间，实现实时更新
            if player_data.last_login_timestamp > 0 && current_timestamp > player_data.last_login_timestamp {
                let current_session_duration = (current_timestamp - player_data.last_login_timestamp) as u64;
                total_play_time += current_session_duration;
            }

            HttpResponse::Ok().json(PlayTimeResponse {
                total_play_time_seconds: total_play_time,
            })
        },
        Err(_) => HttpResponse::NotFound().body("Player data not found."),
    }
}