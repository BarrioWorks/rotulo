use super::support::*;

#[tokio::test]
#[serial_test::serial]
async fn another_user_cannot_access_any_project_route_or_retarget_a_preview_token() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let alice = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &alice).await;
        p.publish(&server, &alice).await;
        let domain = post(&server, &p.api("domains"), &alice)
            .json(&json!({"hostname":"www.harbor-example.com"}))
            .await
            .json::<Value>();
        let id = domain["domain"]["id"].as_i64().unwrap();
        let bob = register(&server, "bob@example.com").await;
        for route in ["editor", "assets", "releases", "domains"] {
            get(&server, &p.api(route), &bob)
                .await
                .assert_status_not_found();
        }
        for (route, body) in [
            (
                "edits".to_owned(),
                json!({"base_revision":0,"page":"index.html","edit":{"op":"set_page_meta","title":"Stolen","description":""}}),
            ),
            (
                "undo".into(),
                json!({"base_revision":0}),
            ),
            (
                "redo".into(),
                json!({"base_revision":0}),
            ),
            (
                "pages".into(),
                json!({"base_revision":0,"from":"index.html","path":"offers.html","title":"Offers"}),
            ),
            (
                "pages/rename".into(),
                json!({"base_revision":0,"from":"about.html","to":"stolen.html"}),
            ),
            (
                "pages/delete".into(),
                json!({"base_revision":0,"path":"about.html"}),
            ),
            (
                "settings".into(),
                json!({"name":"Stolen","slug":"stolen-site"}),
            ),
            (
                "publish".into(),
                json!({"base_revision":0}),
            ),
            ("releases/1/activate".into(), json!({})),
            (
                "releases/1/restore".into(),
                json!({"base_revision":0}),
            ),
            (
                "domains".into(),
                json!({"hostname":"www.stolen-example.com"}),
            ),
            (format!("domains/{id}/check"), json!({})),
            (format!("domains/{id}/delete"), json!({})),
        ] {
            let r = post(&server, &p.api(&route), &bob).json(&body).await;
            assert_eq!(
                r.status_code(),
                axum::http::StatusCode::NOT_FOUND,
                "{route}: {}",
                r.text()
            );
        }
        upload(
            &server,
            &bob,
            &p.api("images"),
            std::fs::read("fixtures/images/replacement-small.png").unwrap(),
            "image.png",
        )
        .await
        .assert_status_not_found();
        get(&server, &format!("/projects/{}", p.pid), &bob)
            .await
            .assert_status_not_found();
        let other = Project::new(&server, &bob).await;
        let alice_host = p.preview.trim_start_matches("http://");
        let bob_id = other
            .preview
            .trim_start_matches("http://")
            .split('-')
            .next()
            .unwrap();
        let forged = format!("{bob_id}-{}", alice_host.split_once('-').unwrap().1);
        hosted(&server, &forged, "/")
            .await
            .assert_status_not_found();
        let alice_id = alice_host.split('-').next().unwrap();
        let forged = format!(
            "{alice_id}-{}",
            other
                .preview
                .trim_start_matches("http://")
                .split_once('-')
                .unwrap()
                .1
        );
        hosted(&server, &forged, "/")
            .await
            .assert_status_not_found();
    })
    .await;
}
