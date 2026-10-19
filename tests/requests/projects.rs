use super::support::*;
use pagehaven::{db, projects};

const TAKEN: &str = "That web address is taken. Please choose another.";

#[tokio::test]
#[serial_test::serial]
async fn a_slug_claim_checks_ownership_after_a_stale_availability_check() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let alice = register(&server, "alice@example.com").await;
        let bob = register(&server, "bob@example.com").await;
        let a = Project::new(&server, &alice).await;
        let b = Project::new(&server, &bob).await;
        let a = projects::reload(&ctx.db, project_id(&ctx, &a.pid).await)
            .await
            .unwrap();
        let b = projects::reload(&ctx.db, project_id(&ctx, &b.pid).await)
            .await
            .unwrap();
        assert!(
            projects::slug_available(&ctx.db, b.user_id, "racing-slug", None)
                .await
                .unwrap()
        );
        projects::claim_slug(&ctx.db, a.user_id, "racing-slug")
            .await
            .unwrap();
        let result = projects::claim_slug(&ctx.db, b.user_id, "racing-slug").await;
        assert!(
            result.is_err(),
            "another user's claim was silently accepted"
        );
        assert_eq!(result.unwrap_err().to_string(), TAKEN);
        projects::claim_slug(&ctx.db, a.user_id, "racing-slug")
            .await
            .unwrap();
        let r = post(&server, &format!("/api/projects/{}/settings", b.pid), &bob)
            .json(&json!({"name":"Bob's website","slug":"racing-slug"}))
            .await;
        r.assert_status_unprocessable_entity();
        assert_eq!(r.json::<Value>()["message"], TAKEN);
        assert_eq!(projects::reload(&ctx.db, b.id).await.unwrap().slug, b.slug);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn settings_slug_collisions_are_readable_and_roll_back_the_claim() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &cookie).await;
        let id = project_id(&ctx, &p.pid).await;
        let before = projects::reload(&ctx.db, id).await.unwrap();
        db::exec(
            &ctx.db,
            "CREATE TRIGGER collide_slug BEFORE UPDATE OF slug ON projects BEGIN
             INSERT INTO projects (pid, user_id, name, slug, created_at, updated_at)
             VALUES ('collision', NEW.user_id, 'Collision', NEW.slug, 0, 0); END",
            [],
        )
        .await
        .unwrap();
        let r = post(&server, &p.api("settings"), &cookie)
            .json(&json!({"name":"Renamed website","slug":"racing-slug"}))
            .await;
        r.assert_status_unprocessable_entity();
        assert_eq!(r.json::<Value>()["message"], TAKEN);
        assert!(db::one(
            &ctx.db,
            "SELECT slug FROM slug_claims WHERE slug = 'racing-slug'",
            []
        )
        .await
        .unwrap()
        .is_none());
        let after = projects::reload(&ctx.db, id).await.unwrap();
        assert_eq!(after.name, before.name);
        assert_eq!(after.slug, before.slug);
        db::exec(&ctx.db, "DROP TRIGGER collide_slug", [])
            .await
            .unwrap();
        post(&server, &p.api("settings"), &cookie)
            .json(&json!({"name":"Renamed website","slug":"racing-slug"}))
            .await
            .assert_status_ok();
        assert_eq!(
            projects::reload(&ctx.db, id).await.unwrap().slug,
            "racing-slug"
        );
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn import_slug_collisions_are_readable_and_roll_back_the_claim() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        db::exec(
            &ctx.db,
            "CREATE TRIGGER collide_slug BEFORE INSERT ON projects BEGIN
             INSERT INTO projects (pid, user_id, name, slug, created_at, updated_at)
             VALUES ('collision', NEW.user_id, 'Collision', NEW.slug, 0, 0); END",
            [],
        )
        .await
        .unwrap();
        let r = upload(
            &server,
            &cookie,
            "/api/imports",
            fixture("harbor-bakery"),
            "site.zip",
        )
        .await;
        r.assert_status_unprocessable_entity();
        assert_eq!(r.json::<Value>()["message"], TAKEN);
        assert!(db::one(&ctx.db, "SELECT slug FROM slug_claims", [])
            .await
            .unwrap()
            .is_none());
        assert!(db::one(&ctx.db, "SELECT id FROM projects", [])
            .await
            .unwrap()
            .is_none());
        db::exec(&ctx.db, "DROP TRIGGER collide_slug", [])
            .await
            .unwrap();
        Project::new(&server, &cookie).await;
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn deleting_a_website_requires_its_owner_and_name_and_preserves_its_address() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let alice = register(&server, "alice@example.com").await;
        let bob = register(&server, "bob@example.com").await;
        let p = Project::new(&server, &alice).await;
        let other = Project::new(&server, &bob).await;
        p.publish(&server, &alice).await;
        let id = project_id(&ctx, &p.pid).await;
        let project = projects::reload(&ctx.db, id).await.unwrap();
        let state = pagehaven::state::Pagehaven::from(&ctx);
        let blob = pagehaven::drafts::files(&ctx.db, id).await.unwrap()[0].blob.clone();
        let outside = state.store.staging().unwrap();
        std::fs::write(outside.path().join("sentinel"), b"keep").unwrap();
        std::os::unix::fs::symlink(outside.path(), state.store.release_dir(id, 1).join("outside")).unwrap();
        let url = format!("/api/projects/{}", p.pid);
        server.delete(&url).add_header("host", HOST).add_header("origin", ORIGIN)
            .add_header("cookie", &bob).json(&json!({"confirm_name":project.name})).await.assert_status_not_found();
        server.delete(&url).add_header("host", HOST).add_header("origin", ORIGIN)
            .add_header("cookie", &alice).json(&json!({"confirm_name":"Wrong name"})).await.assert_status_unprocessable_entity();
        hosted(&server, &p.site, "/").await.assert_status_ok();
        server.delete(&url).add_header("host", HOST).add_header("origin", "https://attacker.example")
            .add_header("cookie", &alice).json(&json!({"confirm_name":project.name})).await.assert_status_forbidden();
        db::exec(&ctx.db, "INSERT INTO domains (project_id, hostname, token, verified_at, created_at) VALUES (?, 'deleted.example.com', 'test', 1, 1)", [id.into()]).await.unwrap();
        hosted(&server, "http://deleted.example.com", "/").await.assert_status_ok();
        server.delete(&url).add_header("host", HOST).add_header("origin", ORIGIN)
            .add_header("cookie", &alice).json(&json!({"confirm_name":project.name})).await.assert_status(axum::http::StatusCode::NO_CONTENT);
        let deleted_site = hosted(&server, &p.site, "/").await;
        deleted_site.assert_status_not_found();
        assert!(deleted_site.text().contains("No website here yet"));
        hosted(&server, "http://deleted.example.com", "/").await.assert_status_not_found();
        get(&server, &p.api("editor"), &alice).await.assert_status_not_found();
        assert!(!state.store.releases_dir(id).exists());
        assert!(!state.store.root().join("archives").join(&p.pid).exists());
        assert!(state.store.read(&blob).is_ok());
        assert_eq!(std::fs::read(outside.path().join("sentinel")).unwrap(), b"keep");
        for table in ["draft_files", "edits", "imports", "releases", "domains"] {
            assert!(db::one(&ctx.db, &format!("SELECT project_id FROM {table} WHERE project_id = ?"), [id.into()]).await.unwrap().is_none());
        }
        post(&server, &other.api("settings"), &bob).json(&json!({"name":"Bob", "slug":project.slug})).await.assert_status_unprocessable_entity();
    }).await;
}
#[tokio::test]
#[serial_test::serial]
async fn dashboard_distinguishes_draft_published_changes_and_offline() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        let badge = |label: &str| format!(">{label}</span>");
        assert!(get(&server, "/projects", &cookie)
            .await
            .text()
            .contains(&badge("Not published yet")));
        p.publish(&server, &cookie).await;
        assert!(get(&server, "/projects", &cookie)
            .await
            .text()
            .contains(&badge("Published")));
        let h1 = element(&p.html(&server, "index.html").await, "h1");
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":h1,"html":"Unpublished bread"}),
        )
        .await;
        assert!(get(&server, "/projects", &cookie)
            .await
            .text()
            .contains(&badge("Changes not published")));
        p.change(&server, &cookie, "undo", json!({})).await;
        assert!(get(&server, "/projects", &cookie)
            .await
            .text()
            .contains(&badge("Published")));
        let id = project_id(&ctx, &p.pid).await;
        db::exec(
            &ctx.db,
            "UPDATE projects SET suspended_at = 1 WHERE id = ?",
            [id.into()],
        )
        .await
        .unwrap();
        assert!(get(&server, "/projects", &cookie)
            .await
            .text()
            .contains(&badge("Offline")));
        db::exec(
            &ctx.db,
            "UPDATE projects SET suspended_at = NULL, live_release_id = NULL WHERE id = ?",
            [id.into()],
        )
        .await
        .unwrap();
        assert!(get(&server, "/projects", &cookie)
            .await
            .text()
            .contains(&badge("Offline")));
    })
    .await;
}
