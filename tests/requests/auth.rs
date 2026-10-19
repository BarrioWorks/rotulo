use super::support::*;

#[tokio::test]
#[serial_test::serial]
async fn registering_signs_you_in_and_signing_out_revokes_the_cookie() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        get(&server, "/projects", &cookie).await.assert_status_ok();
        get(&server, "/api/projects/missing/editor", &cookie)
            .await
            .assert_status_not_found();
        post(&server, "/logout", &cookie)
            .await
            .assert_status(axum::http::StatusCode::SEE_OTHER);
        get(&server, "/api/projects/missing/editor", &cookie)
            .await
            .assert_status_unauthorized();
        let r = get(&server, "/projects", &cookie).await;
        r.assert_status(axum::http::StatusCode::SEE_OTHER);
        r.assert_header("location", "/login");
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn wrong_password_and_unknown_email_have_the_same_refusal() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        register(&server, "alice@example.com").await;
        for email in ["alice@example.com", "unknown@example.com"] {
            let r = post(&server, "/login", "")
                .form(&json!({"email":email,"password":"incorrect-password"}))
                .await;
            r.assert_status_ok();
            assert!(r.text().contains("Email or password is incorrect."));
            assert!(!r.headers().contains_key("set-cookie"));
        }
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn anonymous_requests_and_cross_origin_posts_are_refused() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        get(&server, "/api/projects/missing/editor", "")
            .await
            .assert_status_unauthorized();
        let r = get(&server, "/projects", "").await;
        r.assert_status(axum::http::StatusCode::SEE_OTHER);
        r.assert_header("location", "/login");
        let cookie = register(&server, "alice@example.com").await;
        server
            .post("/logout")
            .add_header("host", HOST)
            .add_header("cookie", &cookie)
            .await
            .assert_status_forbidden();
        server
            .post("/logout")
            .add_header("host", HOST)
            .add_header("origin", "http://evil.example")
            .add_header("cookie", &cookie)
            .await
            .assert_status_forbidden();
        get(&server, "/projects", &cookie).await.assert_status_ok();
    })
    .await;
}
