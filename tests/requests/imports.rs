use super::support::*;
use pagehaven::{db, state::Pagehaven};

const SOURCE_MESSAGE: &str = "This ZIP contains source code rather than a finished website. Export the built static website files and try again.";

#[tokio::test]
#[serial_test::serial]
async fn finished_websites_import_and_source_projects_explain_the_required_export() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let harbor = import(&server, &cookie, "harbor-bakery").await;
        assert_eq!(harbor["report"]["pages"].as_array().unwrap().len(), 4);
        for key in ["skipped", "missing", "warnings"] {
            assert!(harbor["report"][key].is_array());
        }
        let pid = harbor["project"]["pid"].as_str().unwrap();
        assert_eq!(harbor["editor_url"], format!("/projects/{pid}"));
        let north = import(&server, &cookie, "northwind-studio").await;
        let mut pages = north["report"]["pages"].as_array().unwrap().clone();
        pages.sort_by_key(|p| p.as_str().unwrap().to_owned());
        assert_eq!(pages, vec![json!("about.html"), json!("index.html")]);
        let pid = north["project"]["pid"].as_str().unwrap();
        let id = project_id(&ctx, pid).await;
        let row = db::one(
            &ctx.db,
            "SELECT root_dir FROM imports WHERE project_id = ?",
            [id.into()],
        )
        .await
        .unwrap()
        .unwrap();
        assert_eq!(row.try_get::<String>("", "root_dir").unwrap(), "dist");
        let state = get(&server, &format!("/api/projects/{pid}/editor"), &cookie)
            .await
            .json::<Value>();
        let preview = state["preview_origin"].as_str().unwrap();
        let html = hosted(&server, preview, "/").await.text();
        for (selector, attribute, mime) in [
            ("link[rel=stylesheet]", "href", "text/css; charset=utf-8"),
            (
                "script[src^='/assets/']",
                "src",
                "text/javascript; charset=utf-8",
            ),
            ("img[src^='/assets/']", "src", "image/webp"),
        ] {
            let path = attr(&html, selector, attribute);
            assert!(path.starts_with("/assets/"));
            let r = hosted(&server, preview, &path).await;
            r.assert_status_ok();
            assert!(!r.as_bytes().is_empty());
            r.assert_header("content-type", mime);
        }
        let r = upload(
            &server,
            &cookie,
            "/api/imports",
            fixture("vite-source-only"),
            "source.zip",
        )
        .await;
        r.assert_status_unprocessable_entity();
        assert_eq!(r.json::<Value>()["message"], SOURCE_MESSAGE);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn hostile_archives_leave_no_projects_or_staging_files() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        for entry in [
            ("../escape.html", b"bad".as_slice(), 0o100644),
            ("link.html", b"/etc/passwd".as_slice(), 0o120777),
        ] {
            let archive = zip(&[("index.html", b"<h1>Home</h1>", 0o100644), entry]);
            upload(&server, &cookie, "/api/imports", archive, "hostile.zip")
                .await
                .assert_status_unprocessable_entity();
            let rows = db::all(&ctx.db, "SELECT id FROM projects", [])
                .await
                .unwrap();
            assert!(rows.is_empty());
            let tmp = Pagehaven::from(&ctx).settings.data_dir.join("tmp");
            assert_eq!(std::fs::read_dir(tmp).unwrap().count(), 0);
        }
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn upload_and_project_count_limits_are_enforced() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let limit = Pagehaven::from(&ctx).settings.limits.upload_bytes as usize;
        let r = upload(
            &server,
            &cookie,
            "/api/imports",
            vec![0; limit + 1],
            "large.zip",
        )
        .await;
        r.assert_status(axum::http::StatusCode::PAYLOAD_TOO_LARGE);
        let row = db::one(&ctx.db, "SELECT id FROM users", [])
            .await
            .unwrap()
            .unwrap();
        let user: i64 = row.try_get("", "id").unwrap();
        let insert = "INSERT INTO projects (pid,user_id,name,slug,revision,created_at,updated_at)
                      VALUES (?,?,?,?,0,0,0)";
        for n in 0..25 {
            db::exec(
                &ctx.db,
                insert,
                [
                    format!("limit-{n}").into(),
                    user.into(),
                    "Limit".into(),
                    format!("limit-{n}").into(),
                ],
            )
            .await
            .unwrap();
        }
        let r = upload(
            &server,
            &cookie,
            "/api/imports",
            fixture("harbor-bakery"),
            "site.zip",
        )
        .await;
        r.assert_status_forbidden();
        assert_eq!(r.json::<Value>()["error"], "project_limit");
    })
    .await;
}
