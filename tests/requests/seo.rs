use super::support::*;

#[tokio::test]
#[serial_test::serial]
async fn discovery_is_app_only_and_uses_the_trusted_origin() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let r = get(&server, "/robots.txt", "")
            .add_header("x-forwarded-host", "attacker.example")
            .await;
        r.assert_status_ok();
        r.assert_header("content-type", "text/plain; charset=utf-8");
        assert!(r.text().contains("Disallow: /projects\n"));
        assert!(r.text().contains("Disallow: /api\n"));
        assert!(r.text().contains("Disallow: /editor\n"));
        assert!(r.text().contains(&format!("Sitemap: {ORIGIN}/sitemap.xml\n")));
        let r = get(&server, "/sitemap.xml", "").await;
        r.assert_status_ok();
        r.assert_header("content-type", "application/xml; charset=utf-8");
        assert_eq!(r.text(), format!("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url><loc>{ORIGIN}/</loc></url>\n  <url><loc>{ORIGIN}/compatible-exports</loc></url>\n  <url><loc>{ORIGIN}/visual-html-editor</loc></url>\n  <url><loc>{ORIGIN}/static-website-hosting</loc></url>\n</urlset>\n"));
        for host in ["absent.sites.localhost:5150", "customer.example:5150"] {
            for path in ["/robots.txt", "/sitemap.xml"] {
                let r = hosted(&server, host, path).await;
                r.assert_status_not_found();
                assert!(!r.text().contains("Sitemap:"));
                assert!(!r.text().contains("<urlset"));
            }
        }
    }).await;
}

#[tokio::test]
#[serial_test::serial]
async fn rendered_metadata_and_private_response_policies() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        for (path, key) in [
            ("/", "home"),
            ("/compatible-exports", "compatible_exports"),
            ("/visual-html-editor", "visual_html_editor"),
            ("/static-website-hosting", "static_website_hosting"),
            ("/login", "login"),
            ("/register", "register"),
        ] {
            let r = get(&server, &format!("{path}?utm_source=untrusted"), "")
                .add_header("x-forwarded-host", "attacker.example")
                .await;
            r.assert_status_ok();
            let html = r.text();
            let document = scraper::Html::parse_document(&html);
            let metadata = rotulo::controllers::seo::metadata(ORIGIN);
            let page = &metadata[key];
            let titles: Vec<_> = document
                .select(&scraper::Selector::parse("head title").unwrap())
                .collect();
            assert_eq!(titles.len(), 1);
            assert_eq!(
                titles[0].text().collect::<String>(),
                page["title"].as_str().unwrap()
            );
            assert_eq!(
                document
                    .select(&scraper::Selector::parse("meta[name=description]").unwrap())
                    .count(),
                1
            );
            for (selector, attribute, expected) in [
                (
                    "meta[name=description]",
                    "content",
                    page["description"].as_str().unwrap(),
                ),
                (
                    "meta[name=robots]",
                    "content",
                    page["robots"].as_str().unwrap(),
                ),
                (
                    "link[rel=canonical]",
                    "href",
                    page["canonical"].as_str().unwrap(),
                ),
                (
                    "meta[property='og:url']",
                    "content",
                    page["canonical"].as_str().unwrap(),
                ),
                (
                    "meta[property='og:title']",
                    "content",
                    page["title"].as_str().unwrap(),
                ),
                (
                    "meta[name='twitter:card']",
                    "content",
                    "summary_large_image",
                ),
                (
                    "meta[property='og:image']",
                    "content",
                    metadata["image"].as_str().unwrap(),
                ),
            ] {
                assert_eq!(attr(&html, selector, attribute), expected);
            }
            let schemas: Vec<_> = document
                .select(&scraper::Selector::parse("script[type='application/ld+json']").unwrap())
                .collect();
            if path == "/" {
                assert!(!r.headers().contains_key("x-robots-tag"));
                assert_eq!(schemas.len(), 1);
                let schema: Value =
                    serde_json::from_str(&schemas[0].text().collect::<String>()).unwrap();
                assert_eq!(schema["@graph"][1]["operatingSystem"], "Web");
                assert_eq!(schema["@graph"][1]["url"], format!("{ORIGIN}/"));
                assert!(!schema.to_string().contains("offers"));
            } else if matches!(path, "/login" | "/register") {
                r.assert_header("x-robots-tag", "noindex, follow");
                assert!(schemas.is_empty());
            } else {
                assert!(!r.headers().contains_key("x-robots-tag"));
            }
        }
        for path in [
            "/projects",
            "/projects/new",
            "/projects/missing",
            "/api/projects/missing/editor",
            "/missing",
        ] {
            get(&server, path, "")
                .await
                .assert_header("x-robots-tag", "noindex, nofollow");
        }
        for path in ["/login", "/register"] {
            post(&server, path, "")
                .form(&json!({"name":"", "email":"bad", "password":"bad"}))
                .await
                .assert_header("x-robots-tag", "noindex, follow");
        }
        let cookie = register(&server, "seo@example.com").await;
        let p = Project::new(&server, &cookie).await;
        for path in [
            "/projects".to_owned(),
            "/projects/new".to_owned(),
            format!("/projects/{}", p.pid),
        ] {
            let r = get(&server, &path, &cookie).await;
            r.assert_status_ok();
            r.assert_header("x-robots-tag", "noindex, nofollow");
            assert_eq!(
                attr(&r.text(), "meta[name=robots]", "content"),
                "noindex, nofollow"
            );
            assert!(!r.text().contains("rel=\"canonical\""));
        }
        let r = get(&server, "/missing", "").await;
        r.assert_status_not_found();
        assert_eq!(
            attr(&r.text(), "meta[name=robots]", "content"),
            "noindex, nofollow"
        );
    })
    .await;
}
