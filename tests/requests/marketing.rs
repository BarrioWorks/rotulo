use super::support::*;

fn select<'a>(document: &'a scraper::Html, css: &str) -> Vec<scraper::ElementRef<'a>> {
    document
        .select(&scraper::Selector::parse(css).unwrap())
        .collect()
}

#[tokio::test]
#[serial_test::serial]
async fn compatible_exports_page_quotes_the_refusal_and_links_to_sign_up() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        for cookie in ["", cookie.as_str()] {
            let response = get(&server, "/compatible-exports", cookie).await;
            response.assert_status_ok();
            let document = scraper::Html::parse_document(&response.text());
            assert_eq!(select(&document, "h1").len(), 1);
            let quotes: Vec<String> = select(&document, "blockquote p")
                .iter()
                .map(|q| q.text().collect())
                .collect();
            assert!(quotes.contains(
                &"This ZIP contains source code rather than a finished website. Export the built static website files and try again.".to_owned()
            ));
            assert!(select(&document, "main a[href='/register']").len() == 1);
        }
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn home_links_to_compatible_exports_from_the_page_and_the_footer() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let response = get(&server, "/", "").await;
        response.assert_status_ok();
        let document = scraper::Html::parse_document(&response.text());
        assert_eq!(select(&document, "h1").len(), 1);
        assert!(!select(&document, "main a[href='/compatible-exports']").is_empty());
        assert!(!select(&document, "footer a[href='/compatible-exports']").is_empty());
    })
    .await;
}

fn words(text: impl Iterator<Item = impl AsRef<str>>) -> String {
    text.map(|part| part.as_ref().to_owned())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[tokio::test]
#[serial_test::serial]
async fn marketing_guides_are_public_and_have_accessible_content_and_internal_links() {
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let cookie = register(&server, "guides@example.com").await;
        for cookie in ["", cookie.as_str()] {
            for path in [
                "/compatible-exports",
                "/visual-html-editor",
                "/static-website-hosting",
            ] {
                let response = get(&server, path, cookie).await;
                response.assert_status_ok();
                let document = scraper::Html::parse_document(&response.text());
                assert_eq!(select(&document, "h1").len(), 1, "{path}");
                assert_eq!(
                    select(&document, "main a[href='/register']").len(),
                    1,
                    "{path}"
                );
                let mut previous = 0;
                for heading in select(
                    &document,
                    "main h1, main h2, main h3, main h4, main h5, main h6",
                ) {
                    let level: usize = heading.value().name()[1..].parse().unwrap();
                    assert!(level <= previous + 1, "skipped heading level at {path}");
                    previous = level;
                }
                for link in select(&document, "main a") {
                    assert!(!words(link.text()).is_empty(), "empty link at {path}");
                }
                for image in select(&document, "main img") {
                    for attribute in ["width", "height", "alt"] {
                        assert!(!image.value().attr(attribute).unwrap().is_empty());
                    }
                    assert_eq!(image.value().attr("loading"), Some("lazy"));
                }
                for other in [
                    "/",
                    "/compatible-exports",
                    "/visual-html-editor",
                    "/static-website-hosting",
                ] {
                    if other != path {
                        assert!(
                            !select(&document, &format!("main a[href='{other}']")).is_empty(),
                            "{path} missing {other}"
                        );
                    }
                }
            }
        }
    })
    .await;
}
