use super::support::*;
use axum::http::StatusCode;
use rotulo::db;

fn stored_blobs(ctx: &loco_rs::app::AppContext) -> std::collections::BTreeSet<String> {
    let store = &rotulo::state::Rotulo::from(ctx).store;
    std::fs::read_dir(store.root().join("blobs"))
        .unwrap()
        .flat_map(|prefix| std::fs::read_dir(prefix.unwrap().path()).unwrap())
        .map(|file| file.unwrap().file_name().to_string_lossy().into_owned())
        .collect()
}

async fn opened(server: &TestServer, cookie: &str, pid: &str) -> Project {
    let state = get(server, &format!("/api/projects/{pid}/editor"), cookie)
        .await
        .json::<Value>();
    Project {
        pid: pid.to_owned(),
        preview: state["preview_origin"].as_str().unwrap().into(),
        site: state["project"]["site_url"].as_str().unwrap().into(),
        revision: state["project"]["revision"].as_i64().unwrap(),
    }
}

async fn create(server: &TestServer, cookie: &str, name: &str) -> TestResponse {
    post(server, "/api/projects", cookie)
        .json(&json!({ "name": name }))
        .await
}

async fn draft(ctx: &loco_rs::app::AppContext, pid: &str) -> Vec<(String, String, i64)> {
    let id = project_id(ctx, pid).await;
    db::all(
        &ctx.db,
        "SELECT path, blob, bytes FROM draft_files WHERE project_id = ? ORDER BY path",
        [id.into()],
    )
    .await
    .unwrap()
    .iter()
    .map(|r| {
        (
            r.try_get("", "path").unwrap(),
            r.try_get("", "blob").unwrap(),
            r.try_get("", "bytes").unwrap(),
        )
    })
    .collect()
}

async fn rows(ctx: &loco_rs::app::AppContext, table: &str, pid: &str) -> i64 {
    let id = project_id(ctx, pid).await;
    db::one(
        &ctx.db,
        &format!("SELECT COUNT(*) AS n FROM {table} WHERE project_id = ?"),
        [id.into()],
    )
    .await
    .unwrap()
    .unwrap()
    .try_get("", "n")
    .unwrap()
}

#[tokio::test]
#[serial_test::serial]
async fn a_starter_website_is_created_edited_and_published() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let r = create(&server, &cookie, "  Fern & <Co>  ").await;
        r.assert_status(StatusCode::CREATED);
        let body = r.json::<Value>();
        assert_eq!(body["name"], "Fern & <Co>");
        let pid = body["pid"].as_str().unwrap();
        assert_eq!(draft(&ctx, pid).await.len(), 1, "one self-contained page");

        let mut p = opened(&server, &cookie, pid).await;
        assert_eq!(p.revision, 0);
        let html = p.html(&server, "index.html").await;
        assert!(html.contains("<title>Fern &amp; &lt;Co&gt;</title>"));
        let parsed = scraper::Html::parse_document(&html);
        assert_eq!(
            parsed
                .select(&scraper::Selector::parse("co").unwrap())
                .count(),
            0,
            "the name is text, never markup"
        );
        for selector in ["nav", "header", "section.hero h1", "article.card", "footer"] {
            element(&html, selector);
        }
        assert_eq!(
            scraper::Html::parse_document(&html)
                .select(&scraper::Selector::parse("article.card").unwrap())
                .count(),
            3
        );
        let h1 = element(&html, "h1");
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":h1,"html":"Ferns delivered weekly"}),
        )
        .await;
        assert_eq!(
            element(&p.html(&server, "index.html").await, "h1"),
            h1,
            "IDs are stable"
        );
        p.publish(&server, &cookie).await;
        let live = hosted(&server, &p.site, "/").await;
        live.assert_status_ok();
        assert!(live.text().contains("Ferns delivered weekly"));
        assert!(live.text().contains("@media") || live.text().contains("auto-fit"));
        assert!(!live.text().contains("data-ph-"));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn creation_accepts_only_a_valid_name_from_a_signed_in_same_origin_request() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        create(&server, &cookie, "   ")
            .await
            .assert_status_unprocessable_entity();
        create(&server, &cookie, &"x".repeat(81))
            .await
            .assert_status_unprocessable_entity();
        post(&server, "/api/projects", &cookie)
            .json(&json!({"name":"Mine","html":"<script>alert(1)</script>"}))
            .await
            .assert_status_unprocessable_entity();
        create(&server, "", "Anonymous")
            .await
            .assert_status_unauthorized();
        server
            .post("/api/projects")
            .add_header("host", HOST)
            .add_header("origin", "https://attacker.example")
            .add_header("cookie", &cookie)
            .json(&json!({"name":"Forged"}))
            .await
            .assert_status_forbidden();
        let list = get(&server, "/projects", &cookie).await.text();
        assert!(!list.contains("Forged") && !list.contains("Anonymous"));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn a_duplicate_copies_the_draft_and_nothing_that_belongs_to_the_original() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut source = Project::new(&server, &cookie).await;
        let html = source.html(&server, "index.html").await;
        source
            .edit(
                &server,
                &cookie,
                "index.html",
                json!({"op":"set_text","element":element(&html,"h1"),"html":"Original headline"}),
            )
            .await;
        source.publish(&server, &cookie).await;
        let source_id = project_id(&ctx, &source.pid).await;
        db::exec(
            &ctx.db,
            "INSERT INTO domains (project_id, hostname, token, verified_at, created_at) VALUES (?, 'harbor.example.com', 'proof', 1, 1)",
            [source_id.into()],
        )
        .await
        .unwrap();
        let source_draft = draft(&ctx, &source.pid).await;
        let source_name = get(&server, &source.api("editor"), &cookie).await.json::<Value>()["project"]["name"]
            .as_str()
            .unwrap()
            .to_owned();

        let r = post(&server, &source.api("duplicate"), &cookie).json(&json!({})).await;
        r.assert_status(StatusCode::CREATED);
        let body = r.json::<Value>();
        assert_eq!(body["name"], format!("{source_name} copy"));
        let pid = body["pid"].as_str().unwrap();
        assert_ne!(pid, source.pid);
        assert_eq!(draft(&ctx, pid).await, source_draft, "same files, same immutable blobs");
        for table in ["edits", "releases", "domains", "imports"] {
            assert_eq!(rows(&ctx, table, pid).await, 0, "{table} stays with the original");
        }

        let state = get(&server, &format!("/api/projects/{pid}/editor"), &cookie).await.json::<Value>();
        assert_eq!(state["project"]["revision"], 0);
        assert!(state["project"]["live_release"].is_null());
        assert_eq!(state["history"]["can_undo"], false);
        let mut copy = opened(&server, &cookie, pid).await;
        assert_ne!(copy.site, source.site, "a fresh web address");
        assert_ne!(copy.preview, source.preview, "a fresh preview token");
        hosted(&server, &copy.site, "/").await.assert_status_not_found();

        let copied = copy.html(&server, "index.html").await;
        assert!(copied.contains("Original headline"));
        copy.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":element(&copied,"h1"),"html":"Copy headline"}),
        )
        .await;
        copy.publish(&server, &cookie).await;
        assert!(hosted(&server, &copy.site, "/").await.text().contains("Copy headline"));

        assert_eq!(draft(&ctx, &source.pid).await, source_draft, "the original is untouched");
        assert!(source.html(&server, "index.html").await.contains("Original headline"));
        for host in [source.site.as_str(), "http://harbor.example.com"] {
            let live = hosted(&server, host, "/").await.text();
            assert!(live.contains("Original headline") && !live.contains("Copy headline"));
        }

        let named = post(&server, &source.api("duplicate"), &cookie)
            .json(&json!({"name":"  Harbor spring sale "}))
            .await;
        named.assert_status(StatusCode::CREATED);
        assert_eq!(named.json::<Value>()["name"], "Harbor spring sale");
        post(&server, &source.api("duplicate"), &cookie)
            .json(&json!({"name":"y".repeat(81)}))
            .await
            .assert_status_unprocessable_entity();
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn a_long_name_still_fits_after_copy_is_added() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let long = "L".repeat(80);
        let pid = create(&server, &cookie, &long).await.json::<Value>()["pid"]
            .as_str()
            .unwrap()
            .to_owned();
        let r = post(&server, &format!("/api/projects/{pid}/duplicate"), &cookie)
            .json(&json!({}))
            .await;
        r.assert_status(StatusCode::CREATED);
        let name = r.json::<Value>()["name"].as_str().unwrap().to_owned();
        assert_eq!(name.chars().count(), 80);
        assert!(name.ends_with(" copy"));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn only_the_owner_can_duplicate_and_suspended_websites_stay_put() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let alice = register(&server, "alice@example.com").await;
        let bob = register(&server, "bob@example.com").await;
        let source = Project::new(&server, &alice).await;
        let r = post(&server, &source.api("duplicate"), &bob)
            .json(&json!({}))
            .await;
        r.assert_status_not_found();
        post(&server, &source.api("duplicate"), "")
            .json(&json!({}))
            .await
            .assert_status_unauthorized();
        let bobs = get(&server, "/projects", &bob).await.text();
        assert!(!bobs.contains("Harbor Bakery"));

        let id = project_id(&ctx, &source.pid).await;
        db::exec(
            &ctx.db,
            "UPDATE projects SET suspended_at = 1 WHERE id = ?",
            [id.into()],
        )
        .await
        .unwrap();
        post(&server, &source.api("duplicate"), &alice)
            .json(&json!({}))
            .await
            .assert_status_unprocessable_entity();
        let count: i64 = db::one(&ctx.db, "SELECT COUNT(*) AS n FROM projects", [])
            .await
            .unwrap()
            .unwrap()
            .try_get("", "n")
            .unwrap();
        assert_eq!(count, 1);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn concurrent_creations_cannot_exceed_the_website_limit() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let existing_blobs = stored_blobs(&ctx);
        let first = create(&server, &cookie, "First").await.json::<Value>();
        let pid = first["pid"].as_str().unwrap().to_owned();
        let user_id: i64 = db::one(&ctx.db, "SELECT user_id FROM projects WHERE pid = ?", [pid.as_str().into()])
            .await
            .unwrap()
            .unwrap()
            .try_get("", "user_id")
            .unwrap();
        let limit = rotulo::state::Rotulo::from(&ctx).settings.limits.projects_per_user as i64;
        for n in 2..limit {
            db::exec(
                &ctx.db,
                "INSERT INTO projects (pid, user_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Filler', ?, 0, 0)",
                [format!("filler-{n}").into(), user_id.into(), format!("filler-{n}").into()],
            )
            .await
            .unwrap();
        }
        let duplicate_url = format!("/api/projects/{pid}/duplicate");
        let racer_one = format!("Racer {}", uuid::Uuid::new_v4());
        let racer_two = format!("Racer {}", uuid::Uuid::new_v4());
        let (a, b, c) = tokio::join!(
            create(&server, &cookie, &racer_one),
            create(&server, &cookie, &racer_two),
            async { post(&server, &duplicate_url, &cookie).json(&json!({})).await },
        );
        let statuses = [a.status_code(), b.status_code(), c.status_code()];
        assert_eq!(statuses.iter().filter(|s| **s == StatusCode::CREATED).count(), 1, "{statuses:?}");
        for r in [a, b, c] {
            if r.status_code() != StatusCode::CREATED {
                r.assert_status_forbidden();
                assert_eq!(r.json::<Value>()["error"], "project_limit");
            }
        }
        let stored = stored_blobs(&ctx);
        let referenced: Vec<String> = db::all(&ctx.db, "SELECT DISTINCT blob FROM draft_files", []).await.unwrap()
            .iter().map(|row| row.try_get("", "blob").unwrap()).collect();
        assert!(stored.difference(&existing_blobs).all(|blob| referenced.contains(blob)), "quota refusals must not retain starter blobs");
        let count: i64 = db::one(&ctx.db, "SELECT COUNT(*) AS n FROM projects WHERE user_id = ?", [user_id.into()])
            .await
            .unwrap()
            .unwrap()
            .try_get("", "n")
            .unwrap();
        assert_eq!(count, limit);
        let r = upload(&server, &cookie, "/api/imports", fixture("harbor-bakery"), "website.zip").await;
        r.assert_status_forbidden();
    })
    .await;
}
