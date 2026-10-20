use axum_test::multipart::{MultipartForm, Part};
pub use axum_test::{TestRequest, TestResponse, TestServer};
pub use loco_rs::testing::request::request_with_create_db;
pub use pagehaven::app::App;
pub use serde_json::{json, Value};
pub const HOST: &str = "127.0.0.1:5150";
pub const ORIGIN: &str = "http://127.0.0.1:5150";
pub const PASSWORD: &str = "correct-horse-battery";
pub fn get(server: &TestServer, path: &str, cookie: &str) -> TestRequest {
    server
        .get(path)
        .add_header("host", HOST)
        .add_header("cookie", cookie)
}
pub fn post(server: &TestServer, path: &str, cookie: &str) -> TestRequest {
    server
        .post(path)
        .add_header("host", HOST)
        .add_header("origin", ORIGIN)
        .add_header("cookie", cookie)
}
pub fn hosted(server: &TestServer, origin: &str, path: &str) -> TestRequest {
    server
        .get(path)
        .add_header("host", origin.strip_prefix("http://").unwrap_or(origin))
}
pub async fn register(server: &TestServer, email: &str) -> String {
    let r = post(server, "/register", "")
        .form(&json!({"name":"Request Tester","email":email,"password":PASSWORD}))
        .await;
    r.assert_status(axum::http::StatusCode::SEE_OTHER);
    r.assert_header("location", "/projects/new");
    let cookie = r.headers()["set-cookie"].to_str().unwrap();
    assert!(cookie.contains("HttpOnly"));
    assert!(cookie.contains("SameSite=Lax"));
    cookie.split(';').next().unwrap().to_owned()
}
pub fn multipart(bytes: Vec<u8>, filename: &str) -> MultipartForm {
    MultipartForm::new().add_part("file", Part::bytes(bytes).file_name(filename.to_owned()))
}
pub async fn upload(
    server: &TestServer,
    cookie: &str,
    path: &str,
    bytes: Vec<u8>,
    filename: &str,
) -> TestResponse {
    post(server, path, cookie)
        .multipart(multipart(bytes, filename))
        .await
}
pub fn fixture(name: &str) -> Vec<u8> {
    std::fs::read(format!("fixtures/zips/{name}.zip")).unwrap()
}
pub async fn import(server: &TestServer, cookie: &str, name: &str) -> Value {
    let r = upload(server, cookie, "/api/imports", fixture(name), "website.zip").await;
    r.assert_status(axum::http::StatusCode::CREATED);
    r.json()
}
pub struct Project {
    pub pid: String,
    pub preview: String,
    pub site: String,
    pub revision: i64,
}
impl Project {
    pub async fn new(server: &TestServer, cookie: &str) -> Self {
        let imported = import(server, cookie, "harbor-bakery").await;
        let pid = imported["project"]["pid"].as_str().unwrap().to_owned();
        let state = get(server, &format!("/api/projects/{pid}/editor"), cookie)
            .await
            .json::<Value>();
        Self {
            pid,
            preview: state["preview_origin"].as_str().unwrap().into(),
            site: state["project"]["site_url"].as_str().unwrap().into(),
            revision: state["project"]["revision"].as_i64().unwrap(),
        }
    }
    pub fn api(&self, suffix: &str) -> String {
        format!("/api/projects/{}/{suffix}", self.pid)
    }
    pub async fn html(&self, server: &TestServer, page: &str) -> String {
        let r = hosted(server, &self.preview, &format!("/{page}")).await;
        r.assert_status_ok();
        r.text()
    }
    pub async fn edit(
        &mut self,
        server: &TestServer,
        cookie: &str,
        page: &str,
        edit: Value,
    ) -> Value {
        self.change(server, cookie, "edits", json!({"page":page,"edit":edit}))
            .await
    }
    pub async fn change(
        &mut self,
        server: &TestServer,
        cookie: &str,
        route: &str,
        mut body: Value,
    ) -> Value {
        body["base_revision"] = json!(self.revision);
        let r = post(server, &self.api(route), cookie).json(&body).await;
        r.assert_status_ok();
        let v = r.json::<Value>();
        self.revision = v["revision"].as_i64().unwrap();
        v
    }
    pub async fn publish(&self, server: &TestServer, cookie: &str) -> Value {
        let r = post(server, &self.api("publish"), cookie)
            .json(&json!({"base_revision":self.revision}))
            .await;
        r.assert_status(axum::http::StatusCode::CREATED);
        r.json()
    }
}
pub fn attr(html: &str, selector: &str, attribute: &str) -> String {
    let document = scraper::Html::parse_document(html);
    document
        .select(&scraper::Selector::parse(selector).unwrap())
        .next()
        .unwrap_or_else(|| panic!("missing {selector}"))
        .value()
        .attr(attribute)
        .unwrap()
        .to_owned()
}
pub fn element(html: &str, selector: &str) -> String {
    attr(html, selector, "data-ph-id")
}
pub async fn project_id(ctx: &loco_rs::app::AppContext, pid: &str) -> i64 {
    pagehaven::db::one(
        &ctx.db,
        "SELECT id FROM projects WHERE pid = ?",
        [pid.into()],
    )
    .await
    .unwrap()
    .unwrap()
    .try_get("", "id")
    .unwrap()
}
// Stored ZIP entries, with independent Unix modes for symlink rejection.
pub fn zip(entries: &[(&str, &[u8], u32)]) -> Vec<u8> {
    fn u16le(out: &mut Vec<u8>, n: u16) {
        out.extend(n.to_le_bytes());
    }
    fn u32le(out: &mut Vec<u8>, n: u32) {
        out.extend(n.to_le_bytes());
    }
    let mut out = Vec::new();
    let mut central = Vec::new();
    for &(name, body, mode) in entries {
        let offset = out.len() as u32;
        let size = body.len() as u32;
        let mut crc = flate2::Crc::new();
        crc.update(body);
        let crc = crc.sum();
        u32le(&mut out, 0x04034b50);
        u16le(&mut out, 20);
        u16le(&mut out, 0);
        u16le(&mut out, 0);
        u32le(&mut out, 0);
        u32le(&mut out, crc);
        u32le(&mut out, size);
        u32le(&mut out, size);
        u16le(&mut out, name.len() as u16);
        u16le(&mut out, 0);
        out.extend(name.as_bytes());
        out.extend(body);
        u32le(&mut central, 0x02014b50);
        u16le(&mut central, 0x0314);
        u16le(&mut central, 20);
        u16le(&mut central, 0);
        u16le(&mut central, 0);
        u32le(&mut central, 0);
        u32le(&mut central, crc);
        u32le(&mut central, size);
        u32le(&mut central, size);
        u16le(&mut central, name.len() as u16);
        u16le(&mut central, 0);
        u16le(&mut central, 0);
        u16le(&mut central, 0);
        u16le(&mut central, 0);
        u32le(&mut central, mode << 16);
        u32le(&mut central, offset);
        central.extend(name.as_bytes());
    }
    let start = out.len() as u32;
    out.extend(&central);
    u32le(&mut out, 0x06054b50);
    u16le(&mut out, 0);
    u16le(&mut out, 0);
    u16le(&mut out, entries.len() as u16);
    u16le(&mut out, entries.len() as u16);
    u32le(&mut out, central.len() as u32);
    u32le(&mut out, start);
    u16le(&mut out, 0);
    out
}

pub fn directory_snapshot(
    root: &std::path::Path,
) -> std::collections::BTreeMap<std::path::PathBuf, Vec<u8>> {
    fn visit(
        root: &std::path::Path,
        path: &std::path::Path,
        files: &mut std::collections::BTreeMap<std::path::PathBuf, Vec<u8>>,
    ) {
        for entry in std::fs::read_dir(path).unwrap() {
            let entry = entry.unwrap();
            let path = entry.path();
            if entry.file_type().unwrap().is_dir() {
                visit(root, &path, files);
            } else {
                files.insert(
                    path.strip_prefix(root).unwrap().to_owned(),
                    std::fs::read(path).unwrap(),
                );
            }
        }
    }
    let mut files = std::collections::BTreeMap::new();
    visit(root, root, &mut files);
    files
}
