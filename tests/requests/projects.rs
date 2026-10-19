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
