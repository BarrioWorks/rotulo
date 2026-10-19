use std::{path::Path, sync::Arc};

use async_trait::async_trait;
use axum::{
    extract::{Request, State},
    http::{header, Method, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Extension, Router,
};
use loco_rs::{
    app::{AppContext, Hooks, Initializer},
    bgworker::Queue,
    boot::{create_app, BootResult, StartMode},
    config::Config,
    controller::{views::engines, views::ViewEngine, AppRoutes},
    environment::Environment,
    task::Tasks,
    Result,
};
use migration::Migrator;

use crate::{
    controllers, domains, hosts, hosts::Host, preview, security, settings::Settings, sites,
    state::Pagehaven,
};

pub struct App;

#[async_trait]
impl Hooks for App {
    fn app_name() -> &'static str {
        env!("CARGO_CRATE_NAME")
    }

    fn app_version() -> String {
        env!("CARGO_PKG_VERSION").to_owned()
    }

    async fn boot(
        mode: StartMode,
        environment: &Environment,
        config: Config,
    ) -> Result<BootResult> {
        create_app::<Self, Migrator>(mode, environment, config).await
    }

    async fn after_context(ctx: AppContext) -> Result<AppContext> {
        let settings = Settings::from_context(&ctx)?;
        let state = Pagehaven::new(settings)
            .map_err(|e| loco_rs::Error::string(&format!("data directory: {e}")))?;
        ctx.shared_store.insert(Arc::new(state));
        Ok(ctx)
    }

    async fn initializers(_ctx: &AppContext) -> Result<Vec<Box<dyn Initializer>>> {
        Ok(vec![Box::new(ViewEngineInitializer)])
    }

    fn routes(ctx: &AppContext) -> AppRoutes {
        let limits = Settings::from_context(ctx)
            .map(|s| s.limits)
            .unwrap_or_default();
        AppRoutes::with_default_routes()
            .add_route(controllers::pages::routes())
            .add_route(controllers::api::routes(
                limits.upload_bytes,
                limits.image_bytes,
            ))
    }

    async fn after_routes(router: Router, ctx: &AppContext) -> Result<Router> {
        Ok(router.layer(axum::middleware::from_fn_with_state(
            ctx.clone(),
            route_by_host,
        )))
    }

    async fn connect_workers(_ctx: &AppContext, _queue: &Queue) -> Result<()> {
        Ok(())
    }

    fn register_tasks(_tasks: &mut Tasks) {}

    async fn truncate(_ctx: &AppContext) -> Result<()> {
        Ok(())
    }

    async fn seed(_ctx: &AppContext, _base: &Path) -> Result<()> {
        Ok(())
    }
}

pub struct ViewEngineInitializer;

#[async_trait]
impl Initializer for ViewEngineInitializer {
    fn name(&self) -> String {
        "view-engine".to_owned()
    }

    async fn after_routes(&self, router: Router, _ctx: &AppContext) -> Result<Router> {
        Ok(router.layer(Extension(ViewEngine::from(engines::TeraView::build()?))))
    }
}

/// Sends each request to the app, a draft preview or a published site, by its Host header.
/// Nothing but the app host ever reaches the app's routes or sees its cookies.
async fn route_by_host(State(ctx): State<AppContext>, request: Request, next: Next) -> Response {
    let state = Pagehaven::from(&ctx);
    let path = request.uri().path().to_owned();
    if path == "/internal/tls/allowed" {
        return tls_allowed(&ctx, &state, request.uri().query().unwrap_or("")).await;
    }
    if path == "/_ping" || path == "/_health" {
        // Health checks from a proxy or orchestrator address the container, not a hostname.
        return next.run(request).await;
    }
    let host = hosts::classify(
        request
            .headers()
            .get(header::HOST)
            .and_then(|v| v.to_str().ok()),
        &state.settings,
    );
    let read_only = matches!(*request.method(), Method::GET | Method::HEAD);
    match host {
        Host::App => {
            if security::unsafe_method(request.method())
                && !security::same_origin(&request, &state.settings)
            {
                return security::forbidden();
            }
            let mut response = next.run(request).await;
            security::app_headers(&mut response, &state.settings);
            response
        }
        _ if !read_only => (
            StatusCode::METHOD_NOT_ALLOWED,
            "Websites on Pagehaven are read-only.",
        )
            .into_response(),
        Host::Preview(token) => preview::serve(&ctx, &token, &path).await,
        Host::Site(_) | Host::Custom(_) => {
            sites::serve(&ctx, &host, &path, request.method() == Method::HEAD).await
        }
        Host::Invalid => sites::not_found(),
    }
}

/// Asked by the reverse proxy before it obtains a certificate (Caddy `on_demand_tls ask`).
async fn tls_allowed(ctx: &AppContext, state: &Pagehaven, query: &str) -> Response {
    let domain = query
        .split('&')
        .find_map(|pair| pair.strip_prefix("domain="))
        .unwrap_or("");
    let domain = percent_encoding::percent_decode_str(domain).decode_utf8_lossy();
    match domains::certificate_allowed(&ctx.db, &state.settings, &domain).await {
        Ok(true) => StatusCode::OK.into_response(),
        Ok(false) => StatusCode::NOT_FOUND.into_response(),
        Err(error) => error.into_response(),
    }
}
