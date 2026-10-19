use super::support::*;

#[tokio::test]
#[serial_test::serial]
async fn text_edits_persist_undo_redo_and_reject_stale_tabs() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        let original = p.html(&server, "index.html").await;
        let h1 = element(&original, "h1");
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":h1,"html":"Fresh bread today"}),
        )
        .await;
        assert!(p
            .html(&server, "index.html")
            .await
            .contains("Fresh bread today"));
        let state = get(&server, &p.api("editor"), &cookie)
            .await
            .json::<Value>();
        assert_eq!(state["project"]["revision"], p.revision);
        assert!(p.revision > 0);
        let r = post(&server, &p.api("edits"), &cookie)
            .json(&json!({"base_revision":0,"page":"index.html","edit":{"op":"set_text","element":h1,"html":"stale"}}))
            .await;
        r.assert_status_conflict();
        assert_eq!(r.json::<Value>()["revision"], p.revision);
        p.change(&server, &cookie, "undo", json!({})).await;
        assert_eq!(p.html(&server, "index.html").await, original);
        p.change(&server, &cookie, "redo", json!({})).await;
        assert!(p
            .html(&server, "index.html")
            .await
            .contains("Fresh bread today"));
        let index = p.html(&server, "index.html").await;
        let about = p.html(&server, "about.html").await;
        p.edit(
            &server,
            &cookie,
            "about.html",
            json!({"op":"set_text","element":element(&about,"h1"),"html":"Our independent story"}),
        )
        .await;
        assert!(p
            .html(&server, "about.html")
            .await
            .contains("Our independent story"));
        assert_eq!(p.html(&server, "index.html").await, index);
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn links_and_styles_accept_safe_values_and_reject_injections() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        let html = p.html(&server, "index.html").await;
        let link = element(&html, "a");
        let h1 = element(&html, "h1");
        for edit in [
            json!({"op":"set_link","element":link,"href":"javascript:alert(1)","new_tab":false}),
            json!({"op":"set_style","element":h1,"styles":{"color":"red; background:url(javascript:alert(1))"}}),
        ] {
            post(&server, &p.api("edits"), &cookie)
                .json(&json!({"base_revision":p.revision,"page":"index.html","edit":edit}))
                .await
                .assert_status_unprocessable_entity();
            assert_eq!(p.html(&server, "index.html").await, html);
        }
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_link","element":link,"href":"https://example.com/menu","new_tab":true}),
        )
        .await;
        let html = p.html(&server, "index.html").await;
        let selector = format!("a[data-ph-id='{link}']");
        assert_eq!(attr(&html, &selector, "href"), "https://example.com/menu");
        assert_eq!(attr(&html, &selector, "target"), "_blank");
        let rel = attr(&html, &selector, "rel");
        assert!(rel.contains("noopener") && rel.contains("noreferrer"));
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_style","element":h1,"styles":{"color":"#112233"}}),
        )
        .await;
        assert!(attr(
            &p.html(&server, "index.html").await,
            &format!("[data-ph-id='{h1}']"),
            "style"
        )
        .contains("#112233"));
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn replacement_images_are_served_as_png_and_disguised_php_is_rejected() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        let png = std::fs::read("fixtures/images/replacement-small.png").unwrap();
        let r = upload(
            &server,
            &cookie,
            &p.api("images"),
            png.clone(),
            "replacement.png",
        )
        .await;
        r.assert_status(axum::http::StatusCode::CREATED);
        let hash = r.json::<Value>()["upload"].as_str().unwrap().to_owned();
        let image = element(&p.html(&server, "index.html").await, "img");
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_image","element":image,"upload":hash,"alt":"Fresh image"}),
        )
        .await;
        let html = p.html(&server, "index.html").await;
        let selector = format!("img[data-ph-id='{image}']");
        let src = attr(&html, &selector, "src");
        assert_eq!(src, format!("images/uploads/{}.png", &hash[..16]));
        assert_eq!(attr(&html, &selector, "alt"), "Fresh image");
        let r = hosted(&server, &p.preview, &format!("/{src}")).await;
        r.assert_status_ok();
        r.assert_header("content-type", "image/png");
        assert_eq!(r.as_bytes().as_ref(), png.as_slice());
        upload(
            &server,
            &cookie,
            &p.api("images"),
            b"<?php echo 'pwned'; ?>".to_vec(),
            "image.png",
        )
        .await
        .assert_status_unprocessable_entity();
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn pages_can_be_added_renamed_and_deleted_but_the_home_page_is_protected() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        p.change(
            &server,
            &cookie,
            "pages",
            json!({"from":"index.html","path":"offers.html","title":"Offers"}),
        )
        .await;
        assert!(p
            .html(&server, "offers.html")
            .await
            .contains("<title>Offers</title>"));
        let link = element(&p.html(&server, "index.html").await, "a");
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_link","element":link,"href":"offers.html","new_tab":false}),
        )
        .await;
        p.change(
            &server,
            &cookie,
            "pages/rename",
            json!({"from":"offers.html","to":"specials.html"}),
        )
        .await;
        let html = p.html(&server, "index.html").await;
        assert_eq!(
            attr(&html, &format!("a[data-ph-id='{link}']"), "href"),
            "specials.html"
        );
        hosted(&server, &p.preview, "/offers.html")
            .await
            .assert_status_not_found();
        p.html(&server, "specials.html").await;
        p.change(
            &server,
            &cookie,
            "pages/delete",
            json!({"path":"specials.html"}),
        )
        .await;
        hosted(&server, &p.preview, "/specials.html")
            .await
            .assert_status_not_found();
        for (route, body) in [
            (
                "pages/rename",
                json!({"base_revision":p.revision,"from":"index.html","to":"home.html"}),
            ),
            (
                "pages/delete",
                json!({"base_revision":p.revision,"path":"index.html"}),
            ),
        ] {
            post(&server, &p.api(route), &cookie)
                .json(&body)
                .await
                .assert_status_unprocessable_entity();
        }
        p.html(&server, "index.html").await;
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn page_writes_reject_excessive_depth() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &cookie).await;
        let state = pagehaven::state::Pagehaven::from(&ctx);
        let id = project_id(&ctx, &p.pid).await;
        let source = format!("{}<p>text</p>{}", "<div>".repeat(500), "</div>".repeat(500));
        let mut document = pagehaven::document::Document::parse(&source);
        document.assign_ids();
        let source = document.serialize();
        let target = element(&source, "p");
        let blob = state.store.put_bytes(source.as_bytes()).unwrap();
        pagehaven::db::exec(&ctx.db, "UPDATE draft_files SET blob = ?, bytes = ? WHERE project_id = ? AND path = 'index.html'", [blob.to_string().into(), (source.len() as i64).into(), id.into()]).await.unwrap();
        post(&server, &p.api("edits"), &cookie).json(&json!({"base_revision":p.revision,"page":"index.html","edit":{"op":"set_text","element":target,"html":format!("{}text{}", "<b>".repeat(20), "</b>".repeat(20))}})).await.assert_status_unprocessable_entity();

        let deep = format!("{}text{}", "<div>".repeat(513), "</div>".repeat(513));
        let blob = state.store.put_bytes(deep.as_bytes()).unwrap();
        pagehaven::db::exec(&ctx.db, "UPDATE draft_files SET blob = ?, bytes = ? WHERE project_id = ? AND path = 'about.html'", [blob.to_string().into(), (deep.len() as i64).into(), id.into()]).await.unwrap();
        post(&server, &p.api("pages"), &cookie).json(&json!({"base_revision":p.revision,"from":"about.html","path":"copy.html","title":"Copy"})).await.assert_status_unprocessable_entity();
        post(&server, &p.api("pages/rename"), &cookie).json(&json!({"base_revision":p.revision,"from":"about.html","to":"renamed.html"})).await.assert_status_unprocessable_entity();
    }).await;
}

#[tokio::test]
#[serial_test::serial]
async fn history_and_release_restore_reject_legacy_deep_pages() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let mut p = Project::new(&server, &cookie).await;
        p.publish(&server, &cookie).await;
        let html = p.html(&server, "index.html").await;
        p.edit(
            &server,
            &cookie,
            "index.html",
            json!({"op":"set_text","element":element(&html,"h1"),"html":"Changed"}),
        )
        .await;
        let state = pagehaven::state::Pagehaven::from(&ctx);
        let deep = format!("{}text{}", "<div>".repeat(513), "</div>".repeat(513));
        let blob = state.store.put_bytes(deep.as_bytes()).unwrap();
        pagehaven::db::exec(
            &ctx.db,
            "UPDATE release_files SET draft_blob = ?, draft_bytes = ? WHERE path = 'index.html'",
            [blob.to_string().into(), (deep.len() as i64).into()],
        )
        .await
        .unwrap();
        post(&server, &p.api("releases/1/restore"), &cookie)
            .json(&json!({"base_revision":p.revision}))
            .await
            .assert_status_unprocessable_entity();
        pagehaven::db::exec(
            &ctx.db,
            "UPDATE edit_files SET before_blob = ?, before_bytes = ? WHERE path = 'index.html'",
            [blob.to_string().into(), (deep.len() as i64).into()],
        )
        .await
        .unwrap();
        post(&server, &p.api("undo"), &cookie)
            .json(&json!({"base_revision":p.revision}))
            .await
            .assert_status_unprocessable_entity();
        assert!(p.html(&server, "index.html").await.contains("Changed"));
    })
    .await;
}
