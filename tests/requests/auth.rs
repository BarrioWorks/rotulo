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

#[tokio::test]
#[serial_test::serial]
async fn sign_in_attempts_are_limited_per_address_and_never_echo_a_huge_email() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let huge = format!("{}@example.com", "a".repeat(100_000));
        let r = post(&server, "/login", "")
            .form(&json!({"email":huge,"password":"incorrect-password"}))
            .await;
        r.assert_status_ok();
        assert!(r.text().len() < 20_000);
        for n in 0..49 {
            let r = post(&server, "/login", "")
                .form(
                    &json!({"email":format!("u{n}@not-an-email"),"password":"incorrect-password"}),
                )
                .await;
            assert!(!r.text().contains("too often"), "attempt {n}");
        }
        let r = post(&server, "/login", "")
            .form(&json!({"email":"fresh@example.com","password":"incorrect-password"}))
            .await;
        assert!(r.text().contains("too often"));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn home_shows_the_configured_sites_domain_without_a_port() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let domain = pagehaven::state::Pagehaven::from(&ctx)
            .settings
            .sites_domain
            .clone();
        let response = get(&server, "/", "").await;
        response.assert_status_ok();
        let document = scraper::Html::parse_document(&response.text());
        let address = document
            .select(&scraper::Selector::parse(".mock-url").unwrap())
            .next()
            .unwrap()
            .text()
            .collect::<String>();
        assert_eq!(address, format!("harbor-bakery.{domain}"));
        assert!(!address.contains(':'));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn unknown_app_urls_render_the_not_found_template_with_security_headers() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        for cookie in ["", cookie.as_str()] {
            let response = get(&server, "/nope", cookie).await;
            response.assert_status_not_found();
            response.assert_header("x-content-type-options", "nosniff");
            assert!(response.headers().contains_key("content-security-policy"));
            assert!(
                response.text().contains("We couldn't find that page"),
                "expected the app not-found heading, got {:?}",
                response.text()
            );
        }
        let preview = hosted(&server, "invalid.preview.localhost:5150", "/nope").await;
        preview.assert_status_not_found();
        assert!(!preview.text().contains("We couldn't find that page"));
        let site = hosted(&server, "unknown.sites.localhost:5150", "/nope").await;
        site.assert_status_not_found();
        assert!(!site.text().contains("We couldn't find that page"));
        let response = post(&server, "/nope", "").await;
        assert!(matches!(response.status_code().as_u16(), 404 | 405));
    })
    .await;
}
