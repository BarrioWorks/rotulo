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
