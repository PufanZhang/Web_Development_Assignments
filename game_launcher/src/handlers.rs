use crate::loader::{load_and_pack_map_data, LoadError};
use crate::database;
use actix_web::{get, post, web, HttpResponse, Responder};
use crate::models::{AuthRequest, AuthResponse, ModifyValueRequest, PlayerData};

#[get("/map_data/{map_id}")]
async fn get_map_data(map_id: web::Path<String>) -> impl Responder {
    match load_and_pack_map_data(&map_id).await {
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
        Ok(_) => HttpResponse::Ok().json(AuthResponse {
            success: true,
            message: "Registration successful!".to_string(),
        }),
        Err(msg) => HttpResponse::Conflict().json(AuthResponse {
            success: false,
            message: msg.to_string(),
        }),
    }
}

#[post("/auth/login")]
pub async fn login(req: web::Json<AuthRequest>) -> impl Responder {
    match database::login_user(&req).await {
        Ok(true) => HttpResponse::Ok().json(AuthResponse {
            success: true,
            message: "Login successful!".to_string(),
        }),
        Ok(false) => HttpResponse::Unauthorized().json(AuthResponse {
            success: false,
            message: "Invalid username or password.".to_string(),
        }),
        Err(msg) => HttpResponse::InternalServerError().json(AuthResponse {
            success: false,
            message: msg.to_string(),
        }),
    }
}

#[post("/player/save")]
pub async fn save_player_data(data: web::Json<PlayerData>) -> impl Responder {
    match database::save_player_data(&data).await {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

#[get("/player/load/{username}")]
pub async fn load_player_data(username: web::Path<String>) -> impl Responder {
    match database::load_player_data(&username).await {
        Ok(data) => HttpResponse::Ok().json(data),
        Err(_) => HttpResponse::NotFound().finish(),
    }
}

#[post("/player/modify_value")]
pub async fn modify_value(req: web::Json<ModifyValueRequest>) -> impl Responder {
    match database::modify_player_value(&req.username, &req.value_name, req.amount).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(_) => HttpResponse::InternalServerError().body("Failed to modify player value."),
    }
}