use super::support::*;
use axum::{
    extract::{Query, State},
    routing::get as route_get,
    Json, Router,
};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
type Records = Arc<Mutex<HashMap<String, String>>>;
struct DnsServer {
    records: Records,
    task: tokio::task::JoinHandle<()>,
}
impl Drop for DnsServer {
    fn drop(&mut self) {
        self.task.abort();
    }
}
async fn dns_answer(
    State(records): State<Records>,
    Query(query): Query<HashMap<String, String>>,
) -> Json<Value> {
    assert_eq!(query.get("type").map(String::as_str), Some("TXT"));
    let records = records.lock().unwrap();
    let answers = query
        .get("name")
        .and_then(|name| records.get(name))
        .map(|value| vec![json!({"type":16,"data":format!("\"{value}\"")})])
        .unwrap_or_default();
    Json(json!({"Answer":answers}))
}
async fn dns_server() -> DnsServer {
    let records = Records::default();
    let url =
        std::env::var("ROTULO_DOH").unwrap_or_else(|_| "http://127.0.0.1:5399/dns-query".into());
    let url = reqwest::Url::parse(&url).unwrap();
    assert_eq!(
        url.host_str(),
        Some("127.0.0.1"),
        "DNS fixture needs a loopback ROTULO_DOH"
    );
    let listener =
        tokio::net::TcpListener::bind(("127.0.0.1", url.port_or_known_default().unwrap()))
            .await
            .unwrap();
    let router = Router::new()
        .route(url.path(), route_get(dns_answer))
        .with_state(records.clone());
    let task = tokio::spawn(async move {
        axum::serve(listener, router).await.unwrap();
    });
    DnsServer { records, task }
}
async fn add(server: &TestServer, p: &Project, cookie: &str) -> Value {
    let r = post(server, &p.api("domains"), cookie)
        .json(&json!({"hostname":"www.harbor-example.com"}))
        .await;
    r.assert_status(axum::http::StatusCode::CREATED);
    r.json::<Value>()["domain"].clone()
}
async fn check(server: &TestServer, p: &Project, cookie: &str, id: &Value) -> Value {
    let r = post(server, &p.api(&format!("domains/{id}/check")), cookie).await;
    r.assert_status_ok();
    r.json::<Value>()["domain"].clone()
}
async fn tls(server: &TestServer, domain: &str, status: u16) {
    let r = get(
        server,
        &format!("/internal/tls/allowed?domain={domain}"),
        "",
    )
    .await;
    assert_eq!(r.status_code().as_u16(), status, "{domain}");
}

#[tokio::test]
#[serial_test::serial]
async fn dns_proof_routes_custom_domains_and_new_ownership_takes_over_atomically() {
    let dns = dns_server().await;
    request_with_create_db::<App, _, _>(|server, _ctx| async move {
        let alice = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &alice).await;
        let d = add(&server, &p, &alice).await;
        assert_eq!(d["status"], "pending");
        assert_eq!(d["txt_name"], "_rotulo.www.harbor-example.com");
        assert!(d["txt_value"]
            .as_str()
            .unwrap()
            .starts_with("rotulo-verify="));
        let pending = check(&server, &p, &alice, &d["id"]).await;
        assert_eq!(pending["status"], "pending");
        assert!(pending["last_error"].as_str().unwrap().contains("TXT"));
        hosted(&server, "www.harbor-example.com:5150", "/")
            .await
            .assert_status_not_found();
        tls(&server, "www.harbor-example.com", 404).await;
        tls(&server, "127.0.0.1", 200).await;
        let managed = p
            .site
            .trim_start_matches("http://")
            .split(':')
            .next()
            .unwrap();
        tls(&server, managed, 404).await;
        p.publish(&server, &alice).await;
        tls(&server, managed, 200).await;
        for host in [
            "sites.localhost",
            "x.sites.localhost",
            "preview.localhost",
            "x.preview.localhost",
            "127.0.0.1",
            "x.127.0.0.1",
        ] {
            post(&server, &p.api("domains"), &alice)
                .json(&json!({"hostname":host}))
                .await
                .assert_status_unprocessable_entity();
        }
        dns.records.lock().unwrap().insert(
            d["txt_name"].as_str().unwrap().into(),
            d["txt_value"].as_str().unwrap().into(),
        );
        assert_eq!(
            check(&server, &p, &alice, &d["id"]).await["status"],
            "verified"
        );
        tls(&server, "www.harbor-example.com", 200).await;
        let alice_site = hosted(&server, &p.site, "/").await.text();
        assert_eq!(
            hosted(&server, "www.harbor-example.com:5150", "/")
                .await
                .text(),
            alice_site
        );
        let bob = register(&server, "bob@example.com").await;
        let mut other = Project::new(&server, &bob).await;
        let heading = element(&other.html(&server, "index.html").await, "h1");
        other
            .edit(
                &server,
                &bob,
                "index.html",
                json!({"op":"set_text","element":heading,"html":"Bob owns this hostname now"}),
            )
            .await;
        other.publish(&server, &bob).await;
        let competing = add(&server, &other, &bob).await;
        assert_eq!(competing["status"], "pending");
        assert_ne!(competing["txt_value"], d["txt_value"]);
        assert_eq!(
            check(&server, &other, &bob, &competing["id"]).await["status"],
            "pending"
        );
        assert_eq!(
            hosted(&server, "www.harbor-example.com:5150", "/")
                .await
                .text(),
            alice_site
        );
        dns.records.lock().unwrap().insert(
            competing["txt_name"].as_str().unwrap().into(),
            competing["txt_value"].as_str().unwrap().into(),
        );
        assert_eq!(
            check(&server, &other, &bob, &competing["id"]).await["status"],
            "verified"
        );
        assert!(hosted(&server, "www.harbor-example.com:5150", "/")
            .await
            .text()
            .contains("Bob owns this hostname now"));
        let domains = get(&server, &p.api("domains"), &alice)
            .await
            .json::<Value>();
        assert_eq!(domains["domains"][0]["status"], "pending");
        assert!(domains["domains"][0]["last_error"].is_string());
        for domain in [
            "unknown.sites.localhost",
            "forged.preview.localhost",
            "unverified.example.com",
        ] {
            tls(&server, domain, 404).await;
        }
        post(
            &server,
            &other.api(&format!("domains/{}/delete", competing["id"])),
            &bob,
        )
        .await
        .assert_status(axum::http::StatusCode::NO_CONTENT);
        hosted(&server, "www.harbor-example.com:5150", "/")
            .await
            .assert_status_not_found();
        tls(&server, "www.harbor-example.com", 404).await;
    })
    .await;
}

#[tokio::test]
#[serial_test::serial]
async fn disabled_custom_domains_refuse_changes_routing_and_certificates() {
    request_with_create_db::<App, _, _>(|server, ctx| async move {
        let cookie = register(&server, "alice@example.com").await;
        let p = Project::new(&server, &cookie).await;
        p.publish(&server, &cookie).await;
        let d = add(&server, &p, &cookie).await;
        rotulo::db::exec(
            &ctx.db,
            "UPDATE domains SET verified_at = ? WHERE id = ?",
            [rotulo::db::now().into(), d["id"].as_i64().unwrap().into()],
        )
        .await
        .unwrap();
        hosted(&server, "www.harbor-example.com:5150", "/")
            .await
            .assert_status_ok();
        let mut settings = rotulo::state::Rotulo::from(&ctx).settings.clone();
        settings.custom_domains = false;
        ctx.shared_store
            .insert(Arc::new(rotulo::state::Rotulo::new(settings).unwrap()));
        for (route, body) in [
            (
                "domains".to_owned(),
                json!({"hostname":"other.example.com"}),
            ),
            (format!("domains/{}/check", d["id"]), json!({})),
        ] {
            let r = post(&server, &p.api(&route), &cookie).json(&body).await;
            r.assert_status_unprocessable_entity();
            assert_eq!(
                r.json::<Value>()["message"],
                "Custom domains are not available yet."
            );
        }
        hosted(&server, "www.harbor-example.com:5150", "/")
            .await
            .assert_status_not_found();
        tls(&server, "www.harbor-example.com", 404).await;
        hosted(&server, &p.site, "/").await.assert_status_ok();
        tls(&server, "127.0.0.1", 200).await;
    })
    .await;
}
