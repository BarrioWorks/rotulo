use super::support::*;

#[tokio::test]
#[serial_test::serial]
async fn preview_hosts_isolate_drafts_and_only_serve_read_only_content_with_security_headers() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &cookie).await;
        let r = hosted(&server, &p.preview, "/").await;
        r.assert_status_ok();
        assert!(r.headers()["content-security-policy"]
            .to_str()
            .unwrap()
            .contains("frame-ancestors http://127.0.0.1:5150"));
        r.assert_header("x-robots-tag", "noindex, nofollow");
        r.assert_header("referrer-policy", "no-referrer");
        r.assert_header("x-content-type-options", "nosniff");
        assert!(!r.headers().contains_key("set-cookie"));
        assert!(r.text().contains("data-pagehaven=\"agent\""));
        assert!(r.text().contains("data-ph-can="));
        if std::path::Path::new("assets/static/js/agent/agent.js").exists() {
            let r = hosted(&server, &p.preview, "/__pagehaven/agent/agent.js").await;
            r.assert_status_ok();
            assert!(r
                .text()
                .starts_with("const PAGEHAVEN_APP_ORIGIN = \"http://127.0.0.1:5150\";"));
        } else {
            eprintln!("SKIP compiled agent response: assets/static/js/agent/agent.js is absent");
        }
        let state = pagehaven::state::Pagehaven::from(&ctx);
        let id = project_id(&ctx, &p.pid).await;
        let expired =
            pagehaven::preview::token(&state.settings.secret, id, pagehaven::db::now() - 86400);
        for host in [
            format!("{expired}.preview.localhost:5150"),
            "forged.preview.localhost:5150".into(),
        ] {
            for path in ["/", "/robots.txt", "/sitemap.xml"] {
                let r = hosted(&server, &host, path).await;
                r.assert_status_not_found();
                r.assert_header("x-robots-tag", "noindex, nofollow");
            }
        }
        let r = hosted(&server, &p.preview, "/projects")
            .add_header("cookie", &cookie)
            .await;
        r.assert_status_not_found();
        r.assert_header("x-robots-tag", "noindex, nofollow");
        assert!(!r.text().contains("Your websites"));
        let r = server
            .post("/api/imports")
            .add_header("host", p.preview.trim_start_matches("http://"))
            .add_header("origin", ORIGIN)
            .add_header("cookie", &cookie)
            .await;
        r.assert_status(axum::http::StatusCode::METHOD_NOT_ALLOWED);
        r.assert_header("x-robots-tag", "noindex, nofollow");
        let r = hosted(&server, &p.preview, "/..%2f..%2fetc/passwd").await;
        assert!(matches!(r.status_code().as_u16(), 400 | 404));
        assert!(!r.text().contains("root:x:"));
    })
    .await;
}
