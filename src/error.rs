use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// Failures of a JSON API request, each with a sentence the user can read.
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Please sign in again.")]
    Unauthorized,
    #[error("We couldn't find that.")]
    NotFound,
    #[error(
        "This website was changed in another tab or window. Reload to see the latest version."
    )]
    Conflict { revision: i64 },
    #[error("{0}")]
    Invalid(String),
    #[error("{0}")]
    NotAllowed(String),
    #[error("{message}")]
    Rejected {
        code: &'static str,
        status: StatusCode,
        message: String,
    },
    #[error("You're doing that too often. Please wait a minute and try again.")]
    RateLimited,
    #[error("Pagehaven is busy with other websites right now. Please try again in a moment.")]
    Busy,
    #[error("Something went wrong on our side. Please try again.")]
    Internal(String),
}

impl ApiError {
    pub fn internal(error: impl std::fmt::Display) -> Self {
        Self::Internal(error.to_string())
    }

    fn code(&self) -> (StatusCode, &'static str) {
        match self {
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            Self::NotFound => (StatusCode::NOT_FOUND, "not_found"),
            Self::Conflict { .. } => (StatusCode::CONFLICT, "conflict"),
            Self::Invalid(_) => (StatusCode::UNPROCESSABLE_ENTITY, "invalid"),
            Self::NotAllowed(_) => (StatusCode::UNPROCESSABLE_ENTITY, "not_allowed"),
            Self::Rejected { code, status, .. } => (*status, code),
            Self::RateLimited => (StatusCode::TOO_MANY_REQUESTS, "rate_limited"),
            Self::Busy => (StatusCode::SERVICE_UNAVAILABLE, "busy"),
            Self::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal"),
        }
    }
}

impl From<sea_orm::DbErr> for ApiError {
    fn from(error: sea_orm::DbErr) -> Self {
        Self::internal(error)
    }
}

impl From<std::io::Error> for ApiError {
    fn from(error: std::io::Error) -> Self {
        Self::internal(error)
    }
}

impl From<crate::document::EditError> for ApiError {
    fn from(error: crate::document::EditError) -> Self {
        use crate::document::EditError;
        match &error {
            EditError::NotFound => Self::Rejected {
                code: "not_found",
                status: StatusCode::UNPROCESSABLE_ENTITY,
                message: error.to_string(),
            },
            EditError::NotAllowed(_) => Self::NotAllowed(error.to_string()),
            EditError::Invalid(_) => Self::Invalid(error.to_string()),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, code) = self.code();
        if let Self::Internal(detail) = &self {
            tracing::error!(%detail, "request failed");
        }
        let mut body = json!({"error": code, "message": self.to_string()});
        if let Self::Conflict { revision } = &self {
            body["revision"] = json!(revision);
        }
        (status, Json(body)).into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
