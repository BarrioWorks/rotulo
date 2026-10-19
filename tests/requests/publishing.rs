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
        let state = pagehaven::state::Pagehaven::from(&ctx);
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
        pagehaven::db::exec(
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
        let p = Project::new(&server, &cookie).await;
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
        loco_rs::task::Task::run(&pagehaven::tasks::Unpublish, &ctx, &vars)
            .await
            .unwrap();
        let r = hosted(&server, &p.site, "/").await;
        r.assert_status_not_found();
        assert!(r.text().contains("Report a harmful website"));
    })
    .await;
}
