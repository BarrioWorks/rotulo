use super::support::*;

#[tokio::test]
#[serial_test::serial]
async fn releases_are_immutable_can_be_reactivated_and_can_be_restored_as_an_undoable_edit() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        let h1 = element(&p.html(&server, "index.html").await, "h1");
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":h1,"html":"Release one bread"}),
        )
        .await;
        let release = p.publish(&server, &cookie).await;
        assert_eq!(release["release"]["number"], 1);
        assert_eq!(release["release"]["live"], true);
        let first = hosted(&server, &p.site, "/").await;
        first.assert_status_ok();
        let first = first.text();
        assert!(first.contains("Release one bread"));
        assert!(!first.contains("data-ph-"));
        for (path, mime) in [
            ("/css/styles.css", "text/css; charset=utf-8"),
            ("/fonts/Lato-Regular.ttf", "font/ttf"),
            ("/images/hero.jpg", "image/jpeg"),
            ("/images/logo.svg", "image/svg+xml"),
        ] {
            let r = hosted(&server, &p.site, path).await;
            r.assert_status_ok();
            r.assert_header("content-type", mime);
            r.assert_header("x-content-type-options", "nosniff");
            assert!(!r.as_bytes().is_empty());
            assert_eq!(
                r.as_bytes(),
                hosted(&server, &p.preview, path).await.as_bytes()
            );
        }
        let state = rotulo::state::Rotulo::from(&ctx);
        let id = project_id(&ctx, &p.pid).await;
        let first_dir = state.store.release_dir(id, 1);
        assert!(first_dir.is_dir());
        let snapshot = directory_snapshot(&first_dir);
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":h1,"html":"Release two pastries"}),
        )
        .await;
        assert_eq!(p.publish(&server, &cookie).await["release"]["number"], 2);
        assert!(hosted(&server, &p.site, "/")
            .await
            .text()
            .contains("Release two pastries"));
        assert!(state.store.release_dir(id, 2).is_dir());
        assert_eq!(directory_snapshot(&first_dir), snapshot);
        let releases = get(&server, &p.api("releases"), &cookie)
            .await
            .json::<Value>();
        assert_eq!(releases["releases"][0]["number"], 2);
        assert_eq!(releases["releases"][0]["live"], true);
        assert_eq!(releases["releases"][1]["live"], false);
        post(&server, &p.api("releases/1/activate"), &cookie)
            .json(&json!({}))
            .await
            .assert_status_ok();
        assert_eq!(hosted(&server, &p.site, "/").await.text(), first);
        p.change(&server, &cookie, "releases/1/restore", json!({}))
            .await;
        let restored = p.html(&server, "index.html").await;
        assert!(restored.contains("Release one bread"));
        assert!(restored.contains("data-ph-id"));
        p.change(&server, &cookie, "undo", json!({})).await;
        assert!(p
            .html(&server, "index.html")
            .await
            .contains("Release two pastries"));
        let r = post(&server, &p.api("publish"), &cookie)
            .json(&json!({"base_revision":0}))
            .await;
        r.assert_status_conflict();
        assert_eq!(r.json::<Value>()["revision"], p.revision);
        rotulo::db::exec(
            &ctx.db,
            "DELETE FROM draft_files WHERE project_id = ? AND path = ?",
            [id.into(), "css/styles.css".into()],
        )
        .await
        .unwrap();
        let r = post(&server, &p.api("publish"), &cookie)
            .json(&json!({"base_revision":p.revision}))
            .await;
        r.assert_status_unprocessable_entity();
        assert!(r.json::<Value>()["message"]
            .as_str()
            .unwrap()
            .contains("css/styles.css"));
        assert_eq!(hosted(&server, &p.site, "/").await.text(), first);
        assert_eq!(directory_snapshot(&first_dir), snapshot);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn hidden_sections_stay_in_preview_and_disappear_from_the_published_site() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        let html = p.html(&server, "index.html").await;
        let section = element(&html, "section");
        let selector = format!("section[data-ph-id='{section}']");
        let marker = "Hidden section sentinel";
        let doc = scraper::Html::parse_document(&html);
        let heading = doc
            .select(&scraper::Selector::parse(&format!("{selector} h1, {selector} h2")).unwrap())
            .next()
            .unwrap()
            .value()
            .attr("data-ph-id")
            .unwrap()
            .to_owned();
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":heading,"html":marker}),
        )
        .await;
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"hide_section","element":section,"hidden":true}),
        )
        .await;
        let preview = p.html(&server, "index.html").await;
        assert!(preview.contains(marker));
        assert_eq!(attr(&preview, &selector, "data-ph-hidden"), "true");
        p.publish(&server, &cookie).await;
        let published = hosted(&server, &p.site, "/").await.text();
        assert!(!published.contains(marker));
        assert!(!published.contains("data-ph-"));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn unknown_sites_and_sites_without_a_live_release_return_not_found() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &cookie).await;
        for host in [&p.site, "http://unknown.sites.localhost:5150"] {
            let r = hosted(&server, host, "/").await;
            r.assert_status_not_found();
            assert!(r.text().contains("No website here yet"));
        }
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn an_operator_can_take_a_harmful_website_offline() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        p.publish(&server, &cookie).await;
        hosted(&server, &p.site, "/").await.assert_status_ok();
        let slug = p
            .site
            .trim_start_matches("http://")
            .split('.')
            .next()
            .unwrap()
            .to_owned();
        let vars = loco_rs::task::Vars::from_cli_args(vec![("slug".to_owned(), slug)]);
        loco_rs::task::Task::run(&rotulo::tasks::Unpublish, &ctx, &vars)
            .await
            .unwrap();
        let r = hosted(&server, &p.site, "/").await;
        r.assert_status_not_found();
        assert!(r.text().contains("Report a harmful website"));
        for route in ["publish", "releases/1/activate"] {
            let r = post(&server, &p.api(route), &cookie)
                .json(&json!({"base_revision":p.revision}))
                .await;
            r.assert_status_unprocessable_entity();
            assert_eq!(r.json::<Value>()["message"], "This website was taken offline after a report. Contact Rótulo support.");
        }
        let id = project_id(&ctx, &p.pid).await;
        let row = rotulo::db::one(&ctx.db, "SELECT suspended_at FROM projects WHERE id = ?", [id.into()])
            .await.unwrap().unwrap();
        assert!(row.try_get::<Option<i64>>("", "suspended_at").unwrap().is_some());
        rotulo::db::exec(
            &ctx.db,
            "INSERT INTO domains (project_id, hostname, token, verified_at, created_at) VALUES (?, 'reported.example.com', 'proof', 1, 1)",
            [id.into()],
        ).await.unwrap();
        // A stale live pointer must never bypass a suspension on either kind of host.
        rotulo::db::exec(&ctx.db, "UPDATE projects SET live_release_id = (SELECT id FROM releases WHERE project_id = ? AND number = 1) WHERE id = ?", [id.into(), id.into()]).await.unwrap();
        hosted(&server, &p.site, "/").await.assert_status_not_found();
        hosted(&server, "reported.example.com:5150", "/").await.assert_status_not_found();
        rotulo::db::exec(&ctx.db, "UPDATE projects SET live_release_id = NULL WHERE id = ?", [id.into()]).await.unwrap();
        loco_rs::task::Task::run(&rotulo::tasks::Reinstate, &ctx, &vars)
            .await
            .unwrap();
        hosted(&server, &p.site, "/").await.assert_status_not_found();
        post(&server, &p.api("releases/1/activate"), &cookie)
            .await
            .assert_status_ok();
        hosted(&server, &p.site, "/").await.assert_status_ok();
        hosted(&server, "reported.example.com:5150", "/").await.assert_status_ok();
        let h1 = element(&p.html(&server, "index.html").await, "h1");
        p.edit(&server, &cookie, "index.html", json!({"op":"set_text","element":h1,"html":"Reinstated website"})).await;
        assert_eq!(p.publish(&server, &cookie).await["release"]["number"], 2);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn unchanged_drafts_cannot_create_duplicate_live_releases() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        assert_eq!(
            get(&server, &p.api("editor"), &cookie)
                .await
                .json::<Value>()["draft_changed_since_publish"],
            true
        );
        p.publish(&server, &cookie).await;
        let h1 = element(&p.html(&server, "index.html").await, "h1");
        for undo in [false, true] {
            if undo {
                p.edit(
                    &server,
                    &cookie,
                    "index.html",
                    json!({"op":"set_text","element":h1,"html":"Temporary bread"}),
                )
                .await;
                p.change(&server, &cookie, "undo", json!({})).await;
            }
            assert_eq!(
                get(&server, &p.api("editor"), &cookie)
                    .await
                    .json::<Value>()["draft_changed_since_publish"],
                false
            );
            let r = post(&server, &p.api("publish"), &cookie)
                .json(&json!({"base_revision":p.revision}))
                .await;
            r.assert_status_unprocessable_entity();
            assert_eq!(r.json::<Value>()["error"], "nothing_to_publish");
            assert_eq!(
                r.json::<Value>()["message"],
                "Everything is already published."
            );
        }
        assert_eq!(
            get(&server, &p.api("releases"), &cookie)
                .await
                .json::<Value>()["releases"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":h1,"html":"New bread"}),
        )
        .await;
        assert_eq!(p.publish(&server, &cookie).await["release"]["number"], 2);
        let id = project_id(&ctx, &p.pid).await;
        rotulo::db::exec(
            &ctx.db,
            "UPDATE projects SET live_release_id = NULL WHERE id = ?",
            [id.into()],
        )
        .await
        .unwrap();
        assert_eq!(p.publish(&server, &cookie).await["release"]["number"], 3);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn site_misses_render_the_designed_template_and_abuse_contact_without_app_assets() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &cookie).await;
        let email = rotulo::state::Rotulo::from(&ctx)
            .settings
            .abuse_email
            .clone()
            .unwrap();
        for (host, path) in [
            ("http://unknown.sites.localhost:5150", "/"),
            (p.site.as_str(), "/"),
        ] {
            let response = hosted(&server, host, path).await;
            assert_site_miss(&response, &email, "No website here yet");
            let origin = &rotulo::state::Rotulo::from(&ctx).settings.app_origin;
            assert!(response
                .text()
                .contains(&format!("href=\"{origin}/projects\"")));
        }
        p.publish(&server, &cookie).await;
        let response = hosted(&server, &p.site, "/missing.html").await;
        assert_site_miss(&response, &email, "Page not found");
        let head = server
            .method(axum::http::Method::HEAD, "/missing.html")
            .add_header("host", p.site.strip_prefix("http://").unwrap())
            .await;
        head.assert_status_not_found();
        head.assert_header("x-content-type-options", "nosniff");
        assert!(head.as_bytes().is_empty());
        let state = rotulo::state::Rotulo::from(&ctx);
        let id = project_id(&ctx, &p.pid).await;
        std::fs::write(
            state.store.release_dir(id, 1).join("404.html"),
            "Website's own error page",
        )
        .unwrap();
        let custom = hosted(&server, &p.site, "/missing.html").await;
        custom.assert_status_not_found();
        assert_eq!(custom.text(), "Website's own error page");
    })
    .await;
}

fn assert_site_miss(response: &TestResponse, email: &str, heading: &str) {
    response.assert_status_not_found();
    response.assert_header("content-type", "text/html; charset=utf-8");
    response.assert_header("x-content-type-options", "nosniff");
    response.assert_header("referrer-policy", "strict-origin-when-cross-origin");
    assert!(!response.headers().contains_key("set-cookie"));
    let html = response.text();
    assert!(html.contains(&format!("<h1>{heading}</h1>")), "{html}");
    assert!(
        html.contains("Hosted with Rótulo"),
        "expected designed template footer, got {html:?}"
    );
    assert!(html.contains("Report a harmful website:"));
    assert!(html.contains(&format!("mailto:{email}")));
    assert!(!html.contains("/static/"));
    assert!(!html.contains("@font-face"));
}
