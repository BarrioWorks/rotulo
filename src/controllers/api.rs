//! The JSON API used by the import screen and the editor. Every project route resolves the
//! project through `projects::owned`, so a user can only reach their own websites.

use std::io::Write;

use axum::routing::delete;
use axum::{
    extract::{DefaultBodyLimit, Multipart, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use loco_rs::prelude::{get, post, AppContext, Routes};
use sea_orm::TransactionTrait;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::{
    auth::ApiUser,
    db,
    document::{Document, PageEdit, StyleProperty},
    domains, drafts,
    drafts::{Change, Step},
    error::{ApiError, ApiResult},
    import::{self, policy::FileKind, ImportError, ImportRequest},
    paths, preview, projects,
    projects::Project,
    publish,
    state::{self, Rotulo},
    store::Blob,
};

fn project_json(state: &Rotulo, project: &Project, live: Option<&publish::Release>) -> Value {
    json!({
        "pid": project.pid,
        "name": project.name,
        "slug": project.slug,
        "revision": project.revision,
        "site_url": state.settings.site_origin(&project.slug),
        "live_release": live.map(|r| json!({"number": r.number, "created_at": r.created_at})),
    })
}

async fn page_list(ctx: &AppContext, state: &Rotulo, project: &Project) -> ApiResult<Vec<Value>> {
    let mut pages = Vec::new();
    for file in drafts::files(&ctx.db, project.id)
        .await?
        .into_iter()
        .filter(|f| drafts::is_page(&f.path))
    {
        let html = String::from_utf8_lossy(&state.store.read(&file.blob)?).into_owned();
        let document = Document::parse_checked(&html)?;
        pages.push(json!({"path": file.path, "title": document.title(), "description": document.description()}));
    }
    pages.sort_by_key(|p| {
        (
            p["path"] != "index.html",
            p["path"].as_str().unwrap_or("").to_owned(),
        )
    });
    Ok(pages)
}

async fn change_response(
    ctx: &AppContext,
    project_id: i64,
    applied: &drafts::Applied,
) -> ApiResult<Value> {
    let project = projects::reload(&ctx.db, project_id).await?;
    crate::events::record(
        &ctx.db,
        Some(project.user_id),
        Some(project_id),
        "first_edit",
        None,
    )
    .await;
    Ok(json!({
        "revision": applied.revision,
        "pages": applied.pages,
        "history": drafts::history(&ctx.db, project.id).await?,
        "draft_changed_since_publish": drafts::changed_since_publish(&ctx.db, &project).await?,
    }))
}

// ---------- Import ----------

/// "Harbor Bakery | Slow bread in Port Ellery" becomes "Harbor Bakery".
fn short_title(title: &str) -> String {
    let short = [" | ", " – ", " — ", " - ", " · ", " :: "]
        .iter()
        .filter_map(|sep| title.split_once(sep).map(|(head, _)| head))
        .min_by_key(|head| head.len())
        .unwrap_or(title);
    short.trim().chars().take(80).collect()
}

async fn read_field_text(
    field: axum::extract::multipart::Field<'_>,
    max: usize,
) -> ApiResult<String> {
    let text = field.text().await.map_err(|_| {
        ApiError::Invalid("The upload was interrupted. Please try again.".to_owned())
    })?;
    Ok(text.chars().take(max).collect())
}

fn import_error(error: ImportError) -> ApiError {
    match error {
        ImportError::ChooseFolder(_) => unreachable!("handled by the caller"),
        ImportError::Io(detail) => ApiError::internal(detail),
        other => ApiError::Rejected {
            code: "invalid_archive",
            status: StatusCode::UNPROCESSABLE_ENTITY,
            message: other.to_string(),
        },
    }
}

async fn create_import(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    mut multipart: Multipart,
) -> ApiResult<Response> {
    // A refused request records nothing, so the limiter also bounds the event writes.
    Rotulo::from(&ctx).limit(state::IMPORT, &user.id.to_string())?;
    let mut reason = None;
    let result = import_request(&ctx, &user, &mut multipart, &mut reason).await;
    if !result
        .as_ref()
        .is_ok_and(|response| response.status().is_success())
    {
        let category = reason.unwrap_or(match &result {
            Err(ApiError::Rejected {
                code: "too_large", ..
            }) => "too_large",
            _ => "other",
        });
        crate::events::record(
            &ctx.db,
            Some(user.id),
            None,
            "import_failed",
            Some(category),
        )
        .await;
    }
    result
}

async fn import_request(
    ctx: &AppContext,
    user: &crate::auth::User,
    multipart: &mut Multipart,
    reason: &mut Option<&'static str>,
) -> ApiResult<Response> {
    let state = Rotulo::from(ctx);
    let limits = state.settings.limits.clone();
    if projects::count(&ctx.db, user).await? >= limits.projects_per_user {
        return Err(projects::limit_reached(limits.projects_per_user));
    }
    let staging = state.store.staging()?;
    let archive = staging.path().join("upload.zip");
    let mut name = None;
    let mut root = None;
    let mut received = None;
    while let Some(mut field) = multipart.next_field().await.map_err(|_| {
        ApiError::Invalid("The upload was interrupted. Please try again.".to_owned())
    })? {
        match field.name() {
            Some("name") => name = Some(read_field_text(field, 80).await?),
            Some("root") => root = Some(read_field_text(field, 200).await?),
            Some("file") => {
                let mut out = std::fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&archive)?;
                let mut hasher = Sha256::new();
                let mut bytes = 0u64;
                while let Some(chunk) = field.chunk().await.map_err(|_| ApiError::Rejected {
                    code: "too_large",
                    status: StatusCode::PAYLOAD_TOO_LARGE,
                    message: format!(
                        "This ZIP is larger than {} MB.",
                        limits.upload_bytes / 1_048_576
                    ),
                })? {
                    bytes += chunk.len() as u64;
                    if bytes > limits.upload_bytes {
                        return Err(ApiError::Rejected {
                            code: "too_large",
                            status: StatusCode::PAYLOAD_TOO_LARGE,
                            message: format!(
                                "This ZIP is larger than {} MB.",
                                limits.upload_bytes / 1_048_576
                            ),
                        });
                    }
                    hasher.update(&chunk);
                    out.write_all(&chunk)?;
                }
                out.sync_data()?;
                received = Some((bytes, crate::store::hex(&hasher.finalize())));
            }
            _ => {}
        }
    }
    let Some((archive_bytes, archive_sha)) = received else {
        return Err(ApiError::Invalid("Choose a ZIP file to import.".to_owned()));
    };
    let root = root.filter(|r| !r.is_empty());
    let _slot = state.job_slot().await?;
    let site = {
        let archive = archive.clone();
        let extract = staging.path().join("files");
        crate::store::create_dir_all(&extract, 0o700)?;
        let limits = limits.clone();
        let started = std::time::Instant::now();
        let result = tokio::task::spawn_blocking(move || {
            import::import_archive(ImportRequest {
                archive: &archive,
                staging: &extract,
                limits: &limits,
                root: root.as_deref(),
            })
        })
        .await
        .map_err(ApiError::internal)?;
        tracing::info!(
            elapsed_ms = started.elapsed().as_millis() as u64,
            ok = result.is_ok(),
            "import finished"
        );
        if let Err(error) = &result {
            *reason = Some(crate::events::import_reason(error));
        }
        match result {
            Ok(site) => site,
            Err(ImportError::ChooseFolder(folders)) => {
                return Ok((
                    StatusCode::UNPROCESSABLE_ENTITY,
                    Json(json!({"error": "choose_folder", "message": "This ZIP contains more than one website folder. Choose the one to import.", "folders": folders})),
                )
                    .into_response())
            }
            Err(error) => return Err(import_error(error)),
        }
    };

    let display_name = name
        .map(|n| n.trim().to_owned())
        .filter(|n| !n.is_empty())
        .or_else(|| site.title.as_deref().map(short_title))
        .unwrap_or_else(|| "My website".to_owned());
    let pid = uuid::Uuid::new_v4().to_string();
    for file in &site.files {
        state.store.adopt(&file.staged, &file.blob)?;
    }
    let kept = state.store.keep_archive(&archive, &pid, &archive_sha)?;
    let committed = async {
        let tx = ctx.db.begin().await?;
        let project_id = projects::insert(
            &tx,
            user.id,
            &pid,
            &display_name,
            limits.projects_per_user,
        )
        .await?;
        let content_bytes: u64 = site.files.iter().map(|f| f.bytes).sum();
        db::exec(
            &tx,
            "INSERT INTO imports (project_id, archive_path, archive_sha256, archive_bytes, file_count, content_bytes, root_dir, report_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                project_id.into(),
                kept.to_string_lossy().into_owned().into(),
                archive_sha.into(),
                (archive_bytes as i64).into(),
                (site.files.len() as i64).into(),
                (content_bytes as i64).into(),
                site.root_dir.as_str().into(),
                serde_json::to_string(&site.report).map_err(ApiError::internal)?.into(),
                db::now().into(),
            ],
        )
        .await?;
        for file in &site.files {
            insert_draft_file(&tx, project_id, &file.path, &file.blob, file.bytes as i64).await?;
        }
        tx.commit().await?;
        Ok::<_, ApiError>(project_id)
    }
    .await;
    let project_id = match committed {
        Ok(id) => id,
        Err(error) => {
            // The project never existed, so its kept archive must not outlive the rollback.
            if let Some(dir) = kept.parent() {
                let _ = std::fs::remove_dir_all(dir);
            }
            return Err(error);
        }
    };
    crate::events::record(&ctx.db, Some(user.id), Some(project_id), "import_ok", None).await;
    drop(staging);
    let thumbnail = super::pages::thumbnail(ctx, &state, project_id).await;
    Ok((
        StatusCode::CREATED,
        Json(json!({
            "project": {"pid": pid, "name": display_name},
            "editor_url": format!("/projects/{pid}"),
            "report": site.report,
            "thumbnail_url": thumbnail,
        })),
    )
        .into_response())
}

async fn insert_draft_file<C: sea_orm::ConnectionTrait>(
    tx: &C,
    project_id: i64,
    path: &str,
    blob: &Blob,
    bytes: i64,
) -> ApiResult<()> {
    db::exec(
        tx,
        "INSERT INTO draft_files (project_id, path, blob, bytes) VALUES (?, ?, ?, ?)",
        [
            project_id.into(),
            path.into(),
            blob.to_string().into(),
            bytes.into(),
        ],
    )
    .await?;
    Ok(())
}

// ---------- New and duplicated websites ----------

fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// The starter home page named `name`, with element IDs assigned the way imports assign them.
fn starter_page(name: &str) -> ApiResult<String> {
    let html = include_str!("../starter.html").replace("{{name}}", &escape_html(name));
    let mut document = Document::parse_checked(&html)?;
    document.validate_depth()?;
    document.assign_ids();
    Ok(document.serialize())
}

fn created(pid: &str, name: &str) -> Response {
    (StatusCode::CREATED, Json(json!({"pid": pid, "name": name}))).into_response()
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CreateProject {
    name: String,
}

async fn create_project(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Json(body): Json<CreateProject>,
) -> ApiResult<Response> {
    let state = Rotulo::from(&ctx);
    state.limit(state::IMPORT, &user.id.to_string())?;
    let name = projects::valid_name(&body.name)?;
    let html = starter_page(&name)?;
    let pid = uuid::Uuid::new_v4().to_string();
    let tx = ctx.db.begin().await?;
    let project_id = projects::insert(
        &tx,
        user.id,
        &pid,
        &name,
        state.settings.limits.projects_per_user,
    )
    .await?;
    let blob = state.store.put_bytes(html.as_bytes())?;
    insert_draft_file(&tx, project_id, "index.html", &blob, html.len() as i64).await?;
    tx.commit().await?;
    Ok(created(&pid, &name))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DuplicateProject {
    #[serde(default)]
    name: Option<String>,
}

/// "Harbor Bakery" becomes "Harbor Bakery copy", shortening the name to stay within 80.
fn copy_name(name: &str) -> String {
    let head: String = name.chars().take(80 - " copy".len()).collect();
    format!("{} copy", head.trim_end())
}

/// Copies the current draft into a new project. Blobs are immutable and shared, so only the
/// file rows are copied. History, releases, domains and preview tokens stay with the source.
async fn duplicate_project(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<DuplicateProject>,
) -> ApiResult<Response> {
    let state = Rotulo::from(&ctx);
    state.limit(state::IMPORT, &user.id.to_string())?;
    let source = projects::owned(&ctx.db, &user, &pid).await?;
    publish::ensure_publishable(&source)?;
    let name = projects::valid_name(&body.name.unwrap_or_else(|| copy_name(&source.name)))?;
    let copy_pid = uuid::Uuid::new_v4().to_string();
    let tx = ctx.db.begin().await?;
    let project_id = projects::insert(
        &tx,
        user.id,
        &copy_pid,
        &name,
        state.settings.limits.projects_per_user,
    )
    .await?;
    // Check again inside the write transaction: the source may have been deleted or suspended.
    let source = projects::owned(&tx, &user, &pid).await?;
    publish::ensure_publishable(&source)?;
    db::exec(
        &tx,
        "INSERT INTO draft_files (project_id, path, blob, bytes)
         SELECT ?, path, blob, bytes FROM draft_files WHERE project_id = ?",
        [project_id.into(), source.id.into()],
    )
    .await?;
    tx.commit().await?;
    Ok(created(&copy_pid, &name))
}

// ---------- Editor ----------

/// Style properties supported by this server for the editor bootstrap.
const STYLE_PROPERTIES: [StyleProperty; 30] = {
    use StyleProperty::*;
    [
        Color,
        BackgroundColor,
        FontSize,
        FontWeight,
        TextAlign,
        PaddingTop,
        PaddingBottom,
        PaddingLeft,
        PaddingRight,
        MarginTop,
        MarginBottom,
        MarginLeft,
        MarginRight,
        Width,
        MaxWidth,
        Height,
        MinHeight,
        Display,
        FlexDirection,
        FlexWrap,
        JustifyContent,
        AlignItems,
        Gap,
        GridTemplateColumns,
        BorderWidth,
        BorderStyle,
        BorderColor,
        BorderRadius,
        Opacity,
        Overflow,
    ]
};

async fn editor_state(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let live = publish::live(&ctx.db, &project).await?;
    Ok(Json(json!({
        "project": project_json(&state, &project, live.as_ref()),
        "pages": page_list(&ctx, &state, &project).await?,
        "preview_origin": preview::origin(&state, project.id),
        "history": drafts::history(&ctx.db, project.id).await?,
        "draft_changed_since_publish": drafts::changed_since_publish(&ctx.db, &project).await?,
        "limits": {"image_bytes": state.settings.limits.image_bytes},
        "features": {
            "custom_domains": state.settings.custom_domains,
            "editor": {"style_properties": STYLE_PROPERTIES, "structural_editing": true},
        },
    })))
}

#[derive(Deserialize)]
struct EditBody {
    base_revision: i64,
    page: String,
    edit: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ImageEdit {
    #[allow(dead_code)]
    op: String,
    element: crate::document::ElementId,
    upload: String,
    alt: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BackgroundImageEdit {
    #[allow(dead_code)]
    op: String,
    element: crate::document::ElementId,
    upload: Option<String>,
    remove: Option<bool>,
}

/// Runs `work` under the project's lock after checking that the client saw the latest revision.
async fn locked<T, F, Fut>(
    ctx: &AppContext,
    user: &crate::auth::User,
    pid: &str,
    base: i64,
    work: F,
) -> ApiResult<T>
where
    F: FnOnce(Project) -> Fut,
    Fut: std::future::Future<Output = ApiResult<T>>,
{
    let state = Rotulo::from(ctx);
    state.limit(state::EDIT, &user.id.to_string())?;
    let project = projects::owned(&ctx.db, user, pid).await?;
    let lock = state.project_lock(project.id);
    let _guard = lock.lock().await;
    let project = projects::reload(&ctx.db, project.id).await?;
    if project.revision != base {
        return Err(ApiError::Conflict {
            revision: project.revision,
        });
    }
    work(project).await
}

/// The page's HTML. Parse it only where no `.await` follows, because a parsed page is not `Send`.
async fn read_page(
    ctx: &AppContext,
    state: &Rotulo,
    project: &Project,
    path: &str,
) -> ApiResult<String> {
    if !drafts::is_page(path) {
        return Err(ApiError::NotFound);
    }
    let file = drafts::file(&ctx.db, project.id, path)
        .await?
        .ok_or(ApiError::NotFound)?;
    Ok(String::from_utf8_lossy(&state.store.read(&file.blob)?).into_owned())
}

fn store_page(state: &Rotulo, path: &str, document: &Document) -> ApiResult<Change> {
    document.validate_depth()?;
    let bytes = document.serialize().into_bytes();
    let len = bytes.len() as i64;
    Ok(Change {
        path: path.to_owned(),
        after: Some((state.store.put_bytes(&bytes)?, len)),
    })
}

/// The site path of an uploaded image, and its blob, after checking it is a raster image.
fn uploaded_image(state: &Rotulo, upload: &str) -> ApiResult<(String, Blob, i64)> {
    let blob = Blob::parse(upload)
        .ok_or_else(|| ApiError::Invalid("Upload the image again.".to_owned()))?;
    let bytes = state
        .store
        .read(&blob)
        .map_err(|_| ApiError::Invalid("Upload the image again.".to_owned()))?;
    let kind = FileKind::sniff_raster(&bytes).ok_or_else(|| {
        ApiError::Invalid("Only PNG, JPEG, GIF, WebP and AVIF images can be used.".to_owned())
    })?;
    Ok((
        format!(
            "images/uploads/{}.{}",
            &blob.as_str()[..16],
            kind.extension()
        ),
        blob,
        bytes.len() as i64,
    ))
}

async fn create_edit(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<EditBody>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let user_id = user.id;
    let ctx = &ctx;
    let applied = locked(ctx, &user, &pid, body.base_revision, |project| async move {
        let html = read_page(ctx, &state, &project, &body.page).await?;
        let mut changes = Vec::new();
        let (edit, summary) = if body.edit.get("op").and_then(Value::as_str) == Some("set_image") {
            let image: ImageEdit = serde_json::from_value(body.edit.clone())
                .map_err(|_| ApiError::Invalid("That change isn't supported.".to_owned()))?;
            let (asset, blob, bytes) = uploaded_image(&state, &image.upload)?;
            changes.push(Change {
                path: asset.clone(),
                after: Some((blob, bytes)),
            });
            let edit = PageEdit::SetImage {
                element: image.element,
                src: paths::relative_url(&body.page, &asset),
                alt: image.alt,
            };
            (
                edit,
                json!({"page": body.page, "op": "set_image", "asset": asset}),
            )
        } else if body.edit.get("op").and_then(Value::as_str) == Some("set_background_image") {
            let image: BackgroundImageEdit = serde_json::from_value(body.edit.clone())
                .map_err(|_| ApiError::Invalid("That change isn't supported.".to_owned()))?;
            let src = match (image.upload, image.remove) {
                (Some(upload), None) => {
                    let (asset, blob, bytes) = uploaded_image(&state, &upload)?;
                    let src = paths::relative_url(&body.page, &asset);
                    changes.push(Change {
                        path: asset,
                        after: Some((blob, bytes)),
                    });
                    Some(src)
                }
                (None, Some(true)) => None,
                _ => {
                    return Err(ApiError::Invalid(
                        "Choose an uploaded photo or remove the background photo.".to_owned(),
                    ))
                }
            };
            let edit = PageEdit::SetBackgroundImage {
                element: image.element,
                src,
            };
            let summary = json!({"page": body.page, "op": edit.kind(), "element": edit.element()});
            (edit, summary)
        } else {
            let edit: PageEdit = serde_json::from_value(body.edit.clone())
                .map_err(|_| ApiError::Invalid("That change isn't supported.".to_owned()))?;
            let summary = json!({"page": body.page, "op": edit.kind(), "element": edit.element()});
            (edit, summary)
        };
        let mut sources = std::collections::HashMap::new();
        if matches!(
            edit,
            PageEdit::DuplicateElement { .. } | PageEdit::DuplicateSection { .. }
        ) {
            let mut bytes = 0_i64;
            let urls = Document::parse_checked(&html)?.stylesheet_urls();
            for href in urls
                .into_iter()
                .collect::<std::collections::BTreeSet<_>>()
                .into_iter()
                .take(100)
            {
                let Some(path) = import::references::resolve(&body.page, &href) else {
                    continue;
                };
                let Some(file) = drafts::file(&ctx.db, project.id, &path).await? else {
                    continue;
                };
                if file.bytes > 2 * 1024 * 1024 || bytes + file.bytes > 8 * 1024 * 1024 {
                    continue;
                }
                bytes += file.bytes;
                if let Ok(css) = String::from_utf8(state.store.read(&file.blob)?) {
                    sources.insert(href, css);
                }
            }
        }
        let page = {
            let mut document = Document::parse_checked(&html)?;
            document.set_copy_stylesheets(sources);
            document.apply(&edit)?;
            store_page(&state, &body.page, &document)?
        };
        changes.insert(0, page);
        let applied = drafts::commit(
            &ctx.db,
            &project,
            user_id,
            body.base_revision,
            edit.kind(),
            summary,
            changes,
        )
        .await?;
        change_response(ctx, project.id, &applied).await
    })
    .await?;
    Ok(Json(applied))
}

#[derive(Deserialize)]
struct BaseBody {
    base_revision: i64,
}

async fn history_step(
    ctx: AppContext,
    user: crate::auth::User,
    pid: String,
    base: i64,
    step: Step,
) -> ApiResult<Json<Value>> {
    let ctx = &ctx;
    let value = locked(ctx, &user, &pid, base, |project| async move {
        let applied = drafts::step(&ctx.db, &Rotulo::from(ctx).store, &project, base, step).await?;
        change_response(ctx, project.id, &applied).await
    })
    .await?;
    Ok(Json(value))
}

async fn undo(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<BaseBody>,
) -> ApiResult<Json<Value>> {
    history_step(ctx, user, pid, body.base_revision, Step::Undo).await
}

async fn redo(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<BaseBody>,
) -> ApiResult<Json<Value>> {
    history_step(ctx, user, pid, body.base_revision, Step::Redo).await
}

async fn upload_image(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    mut multipart: Multipart,
) -> ApiResult<Response> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    state.limit(state::UPLOAD, &user.id.to_string())?;
    let max = state.settings.limits.image_bytes;
    let too_large = || ApiError::Rejected {
        code: "too_large",
        status: StatusCode::PAYLOAD_TOO_LARGE,
        message: format!("Images can be up to {} MB.", max / 1_048_576),
    };
    let mut data = None;
    while let Some(mut field) = multipart.next_field().await.map_err(|_| {
        ApiError::Invalid("The upload was interrupted. Please try again.".to_owned())
    })? {
        if field.name() != Some("file") {
            continue;
        }
        let mut bytes = Vec::new();
        while let Some(chunk) = field.chunk().await.map_err(|_| too_large())? {
            if (bytes.len() + chunk.len()) as u64 > max {
                return Err(too_large());
            }
            bytes.extend_from_slice(&chunk);
        }
        data = Some(bytes);
    }
    let bytes = data.ok_or_else(|| ApiError::Invalid("Choose an image to upload.".to_owned()))?;
    if FileKind::sniff_raster(&bytes).is_none() {
        return Err(ApiError::Invalid(
            "Only PNG, JPEG, GIF, WebP and AVIF images can be used.".to_owned(),
        ));
    }
    let blob = state.store.put_bytes(&bytes)?;
    let (path, _, _) = uploaded_image(&state, blob.as_str())?;
    Ok((StatusCode::CREATED, Json(json!({"upload": blob.to_string(), "path": path, "url": format!("{}/{}", preview::origin(&state, project.id), path)}))).into_response())
}

// ---------- Pages ----------

#[derive(Deserialize)]
struct AddPage {
    base_revision: i64,
    from: String,
    path: String,
    title: String,
}

async fn add_page(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<AddPage>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let user_id = user.id;
    let ctx = &ctx;
    let value = locked(ctx, &user, &pid, body.base_revision, |project| async move {
        let path = body.path.trim().to_ascii_lowercase();
        if !paths::valid_page_path(&path) {
            return Err(ApiError::Invalid(
                "Page names use lowercase letters, numbers and hyphens, like offers.html."
                    .to_owned(),
            ));
        }
        if drafts::files(&ctx.db, project.id)
            .await?
            .iter()
            .any(|f| f.path.to_lowercase() == path.to_lowercase())
        {
            return Err(ApiError::Invalid(
                "A page with that name already exists.".to_owned(),
            ));
        }
        if path.contains('/') != body.from.contains('/')
            || path.rsplit_once('/').map(|p| p.0) != body.from.rsplit_once('/').map(|p| p.0)
        {
            return Err(ApiError::Invalid(
                "New pages are created next to the page they copy.".to_owned(),
            ));
        }
        let html = read_page(ctx, &state, &project, &body.from).await?;
        let change = {
            let mut document = Document::parse_checked(&html)?;
            let description = document.description().unwrap_or_default();
            document.apply(&PageEdit::SetPageMeta {
                title: body.title.clone(),
                description,
            })?;
            store_page(&state, &path, &document)?
        };
        let applied = drafts::commit(
            &ctx.db,
            &project,
            user_id,
            body.base_revision,
            "add_page",
            json!({"page": path, "from": body.from}),
            vec![change],
        )
        .await?;
        let mut value = change_response(ctx, project.id, &applied).await?;
        value["pages"] = json!(page_list(ctx, &state, &project).await?);
        Ok(value)
    })
    .await?;
    Ok(Json(value))
}

#[derive(Deserialize)]
struct RenamePage {
    base_revision: i64,
    from: String,
    to: String,
}

/// Points links that led to `from` at `to`, keeping any `#section` or `?query`.
fn relink(page: &str, href: &str, from: &str, to: &str) -> Option<String> {
    let target = import::references::resolve(page, href)?;
    let hits = target == from
        || import::references::page_candidates(&target)
            .iter()
            .any(|c| c == from);
    if !hits {
        return None;
    }
    let suffix = href.find(['#', '?']).map_or("", |i| &href[i..]);
    let base = if href.starts_with('/') {
        format!("/{to}")
    } else {
        paths::relative_url(page, to)
    };
    Some(format!("{base}{suffix}"))
}

async fn rename_page(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<RenamePage>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let user_id = user.id;
    let ctx = &ctx;
    let value = locked(ctx, &user, &pid, body.base_revision, |project| async move {
        let to = body.to.trim().to_ascii_lowercase();
        if body.from == "index.html" {
            return Err(ApiError::NotAllowed("The home page keeps its name.".to_owned()));
        }
        if !paths::valid_page_path(&to) || to.rsplit_once('/').map(|p| p.0) != body.from.rsplit_once('/').map(|p| p.0) {
            return Err(ApiError::Invalid("Page names use lowercase letters, numbers and hyphens, like offers.html, and stay in the same folder.".to_owned()));
        }
        let files = drafts::files(&ctx.db, project.id).await?;
        let source = files.iter().find(|f| f.path == body.from && drafts::is_page(&f.path)).ok_or(ApiError::NotFound)?;
        if files.iter().any(|f| f.path.to_lowercase() == to.to_lowercase()) {
            return Err(ApiError::Invalid("A page with that name already exists.".to_owned()));
        }
        let mut changes = vec![Change { path: body.from.clone(), after: None }, Change { path: to.clone(), after: Some((source.blob.clone(), source.bytes)) }];
        for page in files.iter().filter(|f| drafts::is_page(&f.path)) {
            let mut document = Document::parse_checked(&String::from_utf8_lossy(&state.store.read(&page.blob)?))?;
            document.validate_depth()?;
            let own_path = if page.path == body.from { to.as_str() } else { page.path.as_str() };
            if document.rewrite_hrefs(|href| relink(own_path, href, &body.from, &to)) {
                changes.retain(|c| c.path != own_path);
                changes.push(store_page(&state, own_path, &document)?);
            }
        }
        let applied = drafts::commit(&ctx.db, &project, user_id, body.base_revision, "rename_page", json!({"from": body.from, "to": to}), changes).await?;
        let mut value = change_response(ctx, project.id, &applied).await?;
        value["pages"] = json!(page_list(ctx, &state, &project).await?);
        Ok(value)
    })
    .await?;
    Ok(Json(value))
}

#[derive(Deserialize)]
struct DeletePage {
    base_revision: i64,
    path: String,
}

async fn delete_page(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<DeletePage>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let user_id = user.id;
    let ctx = &ctx;
    let value = locked(ctx, &user, &pid, body.base_revision, |project| async move {
        if body.path == "index.html" {
            return Err(ApiError::NotAllowed(
                "The home page can't be deleted.".to_owned(),
            ));
        }
        if !drafts::is_page(&body.path)
            || drafts::file(&ctx.db, project.id, &body.path)
                .await?
                .is_none()
        {
            return Err(ApiError::NotFound);
        }
        let changes = vec![Change {
            path: body.path.clone(),
            after: None,
        }];
        let applied = drafts::commit(
            &ctx.db,
            &project,
            user_id,
            body.base_revision,
            "delete_page",
            json!({"page": body.path}),
            changes,
        )
        .await?;
        let mut value = change_response(ctx, project.id, &applied).await?;
        value["pages"] = json!(page_list(ctx, &state, &project).await?);
        Ok(value)
    })
    .await?;
    Ok(Json(value))
}

async fn assets(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let origin = preview::origin(&state, project.id);
    let list: Vec<Value> = drafts::files(&ctx.db, project.id)
        .await?
        .into_iter()
        .map(|f| {
            let kind = match FileKind::for_path(&f.path) {
                Some(k) if k.is_raster_image() || k == FileKind::Svg || k == FileKind::Ico => "image",
                Some(FileKind::Woff | FileKind::Woff2 | FileKind::Ttf | FileKind::Otf | FileKind::Eot) => "font",
                Some(FileKind::Css) => "style",
                Some(FileKind::Js) => "script",
                Some(FileKind::Html) => "page",
                _ => "other",
            };
            json!({"path": f.path, "bytes": f.bytes, "kind": kind, "url": format!("{origin}/{}", f.path)})
        })
        .collect();
    Ok(Json(json!({"assets": list})))
}

#[derive(Deserialize)]
struct SettingsBody {
    name: String,
    slug: String,
}

async fn update_settings(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<SettingsBody>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let project = projects::update_settings(&ctx.db, &project, &body.name, &body.slug).await?;
    let live = publish::live(&ctx.db, &project).await?;
    Ok(Json(
        json!({"project": project_json(&state, &project, live.as_ref())}),
    ))
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct DeleteProject {
    confirm_name: String,
}

async fn delete_project(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<DeleteProject>,
) -> ApiResult<StatusCode> {
    let state = Rotulo::from(&ctx);
    state.limit(state::PUBLISH, &user.id.to_string())?;
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let lock = state.project_lock(project.id);
    let _guard = lock.lock().await;
    let tx = ctx.db.begin().await?;
    let project = projects::owned(&tx, &user, &pid).await?;
    if body.confirm_name != project.name {
        return Err(ApiError::Invalid(
            "Type the website's current name to delete it.".to_owned(),
        ));
    }
    db::exec(
        &tx,
        "DELETE FROM projects WHERE id = ?",
        [project.id.into()],
    )
    .await?;
    tx.commit().await?;
    state.store.remove_project_files(project.id, &project.pid);
    Ok(StatusCode::NO_CONTENT)
}

// ---------- Publishing ----------

async fn publish_draft(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<BaseBody>,
) -> ApiResult<Response> {
    let state = Rotulo::from(&ctx);
    state.limit(state::PUBLISH, &user.id.to_string())?;
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    publish::ensure_publishable(&project)?;
    let started = std::time::Instant::now();
    let release = publish::publish(&ctx.db, &state, &project, user.id, body.base_revision).await?;
    crate::events::record(&ctx.db, Some(user.id), Some(project.id), "publish", None).await;
    tracing::info!(
        elapsed_ms = started.elapsed().as_millis() as u64,
        files = release.file_count,
        "published"
    );
    let project = projects::reload(&ctx.db, project.id).await?;
    Ok((
        StatusCode::CREATED,
        Json(json!({"release": release, "site_url": state.settings.site_origin(&project.slug)})),
    )
        .into_response())
}

async fn releases(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    Ok(Json(
        json!({"releases": publish::list(&ctx.db, &project).await?, "site_url": state.settings.site_origin(&project.slug)}),
    ))
}

async fn activate_release(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path((pid, number)): Path<(String, i64)>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    state.limit(state::PUBLISH, &user.id.to_string())?;
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    publish::ensure_publishable(&project)?;
    let release = publish::activate(&ctx.db, &state, &project, number).await?;
    crate::events::record(&ctx.db, Some(user.id), Some(project.id), "publish", None).await;
    Ok(Json(json!({"release": release})))
}

async fn restore_release(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path((pid, number)): Path<(String, i64)>,
    Json(body): Json<BaseBody>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let project = projects::reload(&ctx.db, project.id).await?;
    if project.revision != body.base_revision {
        return Err(ApiError::Conflict {
            revision: project.revision,
        });
    }
    let applied = publish::restore(
        &ctx.db,
        &state,
        &project,
        user.id,
        number,
        body.base_revision,
    )
    .await?;
    let mut value = change_response(&ctx, project.id, &applied).await?;
    value["page_list"] = json!(page_list(&ctx, &state, &project).await?);
    Ok(Json(value))
}

// ---------- Domains ----------

async fn domains_list(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let list = domains::list(&ctx.db, &state.settings, &project).await?;
    let cname = format!("{}.{}", project.slug, state.settings.sites_domain);
    Ok(Json(
        json!({"domains": list, "dns": {"cname_target": cname, "a_record": state.settings.server_ipv4}}),
    ))
}

#[derive(Deserialize)]
struct DomainBody {
    hostname: String,
}

async fn domains_add(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path(pid): Path<String>,
    Json(body): Json<DomainBody>,
) -> ApiResult<Response> {
    let state = Rotulo::from(&ctx);
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    let domain = domains::add(&ctx.db, &state.settings, &project, &body.hostname).await?;
    Ok((StatusCode::CREATED, Json(json!({"domain": domain}))).into_response())
}

async fn domains_check(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path((pid, id)): Path<(String, i64)>,
) -> ApiResult<Json<Value>> {
    let state = Rotulo::from(&ctx);
    state.limit(state::DNS_CHECK, &user.id.to_string())?;
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    Ok(Json(
        json!({"domain": domains::check(&ctx.db, &state.settings, &project, id).await?}),
    ))
}

async fn domains_delete(
    State(ctx): State<AppContext>,
    ApiUser(user): ApiUser,
    Path((pid, id)): Path<(String, i64)>,
) -> ApiResult<StatusCode> {
    let project = projects::owned(&ctx.db, &user, &pid).await?;
    domains::remove(&ctx.db, &project, id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub fn routes(upload_bytes: u64, image_bytes: u64) -> Routes {
    let multipart_slack = 1024 * 1024;
    Routes::new()
        .prefix("/api")
        .add(
            "/imports",
            post(create_import).layer(DefaultBodyLimit::max(
                (upload_bytes + multipart_slack) as usize,
            )),
        )
        .add("/projects", post(create_project))
        .add("/projects/{pid}", delete(delete_project))
        .add("/projects/{pid}/duplicate", post(duplicate_project))
        .add("/projects/{pid}/editor", get(editor_state))
        .add("/projects/{pid}/edits", post(create_edit))
        .add("/projects/{pid}/undo", post(undo))
        .add("/projects/{pid}/redo", post(redo))
        .add(
            "/projects/{pid}/images",
            post(upload_image).layer(DefaultBodyLimit::max(
                (image_bytes + multipart_slack) as usize,
            )),
        )
        .add("/projects/{pid}/pages", post(add_page))
        .add("/projects/{pid}/pages/rename", post(rename_page))
        .add("/projects/{pid}/pages/delete", post(delete_page))
        .add("/projects/{pid}/assets", get(assets))
        .add("/projects/{pid}/settings", post(update_settings))
        .add("/projects/{pid}/publish", post(publish_draft))
        .add("/projects/{pid}/releases", get(releases))
        .add(
            "/projects/{pid}/releases/{number}/activate",
            post(activate_release),
        )
        .add(
            "/projects/{pid}/releases/{number}/restore",
            post(restore_release),
        )
        .add(
            "/projects/{pid}/domains",
            get(domains_list).post(domains_add),
        )
        .add("/projects/{pid}/domains/{id}/check", post(domains_check))
        .add("/projects/{pid}/domains/{id}/delete", post(domains_delete))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn advertised_style_properties_are_the_wire_names_once_each() {
        let names: Vec<String> = serde_json::from_value(json!(STYLE_PROPERTIES)).unwrap();
        let unique: std::collections::BTreeSet<&str> = names.iter().map(String::as_str).collect();
        assert_eq!(unique.len(), STYLE_PROPERTIES.len());
        for (name, property) in names.iter().zip(STYLE_PROPERTIES) {
            assert_eq!(name, property.css_name());
        }
    }
}
