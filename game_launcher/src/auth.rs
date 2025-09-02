use actix_web::{dev::Payload, Error as ActixError, FromRequest, HttpRequest};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::future::{ready, Ready};

// --- 配置区 ---
const JWT_SECRET: &[u8] = b"your-super-secret-and-long-key-that-no-one-can-guess";
// 令牌有效期 (天)
const TOKEN_TTL_DAYS: i64 = 7;

lazy_static! {
    pub static ref ENCODING_KEY: EncodingKey = EncodingKey::from_secret(JWT_SECRET);
    pub static ref DECODING_KEY: DecodingKey = DecodingKey::from_secret(JWT_SECRET);
}

// 令牌里包含的数据
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

// 创建 JWT 的函数
pub fn create_jwt(username: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::days(TOKEN_TTL_DAYS))
        .expect("Failed to create expiration")
        .timestamp() as usize;

    let claims = Claims {
        sub: username.to_owned(),
        exp: expiration,
    };

    encode(&Header::default(), &claims, &ENCODING_KEY)
}

pub struct AuthenticatedUser {
    pub username: String,
}

impl FromRequest for AuthenticatedUser {
    type Error = ActixError;
    type Future = Ready<Result<Self, Self::Error>>;

    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        // 从请求头里找 "Authorization"
        if let Some(auth_header) = req.headers().get("Authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                // 格式通常是 "Bearer <token>"
                if auth_str.starts_with("Bearer ") {
                    let token = &auth_str[7..];
                    let validation = Validation::default();
                    // 解码和验证令牌
                    if let Ok(token_data) =
                        decode::<Claims>(token, &DECODING_KEY, &validation)
                    {
                        return ready(Ok(AuthenticatedUser {
                            username: token_data.claims.sub,
                        }));
                    }
                }
            }
        }
        // 如果上面任何一步失败了, 就返回未授权错误
        ready(Err(actix_web::error::ErrorUnauthorized("Invalid or missing token")))
    }
}