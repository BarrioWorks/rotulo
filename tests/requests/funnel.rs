use super::support::*;
use pagehaven::db;

async fn count(ctx: &loco_rs::app::AppContext, kind: &str) -> i64 {
    db::one(
        &ctx.db,
        "SELECT COUNT(*) AS n FROM events WHERE kind = ?",
        [kind.into()],
    )
    .await
    .unwrap()
    .unwrap()
    .try_get("", "n")
    .unwrap()
}

#[tokio::test]
#[serial_test::serial]
async fn requests_record_each_milestone_once_and_daily_returns_are_unique() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "funnel@example.com").await;
        assert_eq!(count(&ctx, "signup").await, 1);
        upload(
            &server,
            &cookie,
            "/api/imports",
            fixture("vite-source-only"),
            "private-name.zip",
        )
        .await
        .assert_status(axum::http::StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(count(&ctx, "import_failed").await, 1);
        let reason: String = db::one(
            &ctx.db,
            "SELECT detail FROM events WHERE kind = 'import_failed'",
            [],
        )
        .await
        .unwrap()
        .unwrap()
        .try_get("", "detail")
        .unwrap();
        assert_eq!(reason, "source_only");
        let mut project = Project::new(&server, &cookie).await;
        assert_eq!(count(&ctx, "import_ok").await, 1);
        for title in ["First title", "Second title"] {
            project
                .edit(
                    &server,
                    &cookie,
                    "index.html",
                    json!({"op":"set_page_meta", "title":title, "description":""}),
                )
                .await;
            assert_eq!(count(&ctx, "first_edit").await, 1);
        }
        project.publish(&server, &cookie).await;
        assert_eq!(count(&ctx, "publish").await, 1);
        for _ in 0..3 {
            get(&server, "/projects", &cookie).await.assert_status_ok();
        }
        assert_eq!(count(&ctx, "returned").await, 1);
        // A fresh process cache must still respect the database uniqueness constraint.
        ctx.shared_store
            .insert(std::sync::Arc::new(pagehaven::events::Returned::default()));
        get(&server, "/projects", &cookie).await.assert_status_ok();
        assert_eq!(count(&ctx, "returned").await, 1);
        db::exec(
            &ctx.db,
            "UPDATE events SET created_at = created_at - 86400 WHERE kind = 'returned'",
            [],
        )
        .await
        .unwrap();
        ctx.shared_store
            .insert(std::sync::Arc::new(pagehaven::events::Returned::default()));
        get(&server, &project.api("editor"), &cookie)
            .await
            .assert_status_ok();
        assert_eq!(count(&ctx, "returned").await, 2);
        post(&server, "/login", "")
            .form(&json!({"email":"funnel@example.com", "password":PASSWORD}))
            .await
            .assert_status(axum::http::StatusCode::SEE_OTHER);
        assert_eq!(count(&ctx, "signin").await, 1);
        // Analytics storage failures cannot break an otherwise valid page request.
        db::exec(&ctx.db, "DROP TABLE events", []).await.unwrap();
        ctx.shared_store
            .insert(std::sync::Arc::new(pagehaven::events::Returned::default()));
        get(&server, "/projects", &cookie).await.assert_status_ok();
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn rate_limited_imports_record_no_events() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "funnel-limit@example.com").await;
        let attempt = || upload(&server, &cookie, "/api/imports", b"nope!".to_vec(), "x.zip");
        for _ in 0..20 {
            attempt()
                .await
                .assert_status(axum::http::StatusCode::UNPROCESSABLE_ENTITY);
        }
        assert_eq!(count(&ctx, "import_failed").await, 20);
        for _ in 0..30 {
            attempt()
                .await
                .assert_status(axum::http::StatusCode::TOO_MANY_REQUESTS);
        }
        assert_eq!(count(&ctx, "import_failed").await, 20);
    })
    .await;
}
