//! Custom domains. A hostname routes to a project only after its owner proves control of its DNS
//! with a TXT record holding that project's own random token.

use std::time::Duration;

use sea_orm::{DatabaseConnection, QueryResult, TransactionTrait};
use serde::Serialize;

use crate::{db, error::ApiError, hosts, projects::Project, settings::Settings, store::random_token};

const PER_PROJECT: usize = 5;
pub const TXT_PREFIX: &str = "_pagehaven";

#[derive(Debug, Clone, Serialize)]
pub struct Domain {
    pub id: i64,
    pub hostname: String,
    pub status: &'static str,
    pub txt_name: String,
    pub txt_value: String,
    pub last_error: Option<String>,
    pub url: String,
}

fn from_row(row: &QueryResult, settings: &Settings) -> Result<Domain, ApiError> {
    let hostname: String = row.try_get("", "hostname")?;
    let token: String = row.try_get("", "token")?;
    let verified: Option<i64> = row.try_get("", "verified_at")?;
    Ok(Domain {
        id: row.try_get("", "id")?,
        txt_name: format!("{TXT_PREFIX}.{hostname}"),
        txt_value: format!("pagehaven-verify={token}"),
        status: if verified.is_some() { "verified" } else { "pending" },
        last_error: row.try_get("", "last_error")?,
        url: settings.custom_origin(&hostname),
        hostname,
    })
}

pub async fn list(db: &DatabaseConnection, settings: &Settings, project: &Project) -> Result<Vec<Domain>, ApiError> {
    let rows = db::all(db, "SELECT id, hostname, token, verified_at, last_error FROM domains WHERE project_id = ? ORDER BY id", [project.id.into()]).await?;
    rows.iter().map(|r| from_row(r, settings)).collect()
}

pub fn normalize(settings: &Settings, input: &str) -> Result<String, ApiError> {
    let host = input.trim().trim_end_matches('.').to_ascii_lowercase();
    let host = host.strip_prefix("https://").or_else(|| host.strip_prefix("http://")).unwrap_or(&host).trim_end_matches('/').to_owned();
    if !hosts::is_hostname(&host) {
        return Err(ApiError::Invalid("Enter a domain name like www.example.com. Use the punycode form (xn--…) for international names.".to_owned()));
    }
    let ours = [settings.app_host(), settings.sites_domain.clone(), settings.preview_domain.clone()];
    if ours.iter().any(|d| host == *d || host.ends_with(&format!(".{d}"))) {
        return Err(ApiError::Invalid("That address belongs to Pagehaven. Your website already has its own Pagehaven address.".to_owned()));
    }
    Ok(host)
}

pub async fn add(db: &DatabaseConnection, settings: &Settings, project: &Project, input: &str) -> Result<Domain, ApiError> {
    let hostname = normalize(settings, input)?;
    if list(db, settings, project).await?.len() >= PER_PROJECT {
        return Err(ApiError::Invalid(format!("A website can have up to {PER_PROJECT} custom domains.")));
    }
    let inserted = db::insert(
        db,
        "INSERT INTO domains (project_id, hostname, token, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(project_id, hostname) DO NOTHING",
        [project.id.into(), hostname.as_str().into(), random_token(16).into(), db::now().into()],
    )
    .await;
    let id = match inserted {
        Ok(id) => id,
        Err(sea_orm::DbErr::Custom(_)) => return Err(ApiError::Invalid("That domain is already connected to this website.".to_owned())),
        Err(error) => return Err(error.into()),
    };
    find(db, settings, project, id).await
}

async fn find(db: &DatabaseConnection, settings: &Settings, project: &Project, id: i64) -> Result<Domain, ApiError> {
    let row = db::one(db, "SELECT id, hostname, token, verified_at, last_error FROM domains WHERE id = ? AND project_id = ?", [id.into(), project.id.into()]).await?;
    row.as_ref().map(|r| from_row(r, settings)).transpose()?.ok_or(ApiError::NotFound)
}

pub async fn remove(db: &DatabaseConnection, project: &Project, id: i64) -> Result<(), ApiError> {
    let removed = db::exec(db, "DELETE FROM domains WHERE id = ? AND project_id = ?", [id.into(), project.id.into()]).await?;
    if removed == 0 {
        return Err(ApiError::NotFound);
    }
    Ok(())
}

#[derive(serde::Deserialize)]
struct DnsAnswer {
    #[serde(default, rename = "Answer")]
    answer: Vec<DnsRecord>,
}

#[derive(serde::Deserialize)]
struct DnsRecord {
    #[serde(rename = "type")]
    kind: u16,
    data: String,
}

/// TXT values for `name`, joined from their quoted chunks, via DNS over HTTPS.
pub async fn txt_records(settings: &Settings, name: &str) -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder().timeout(Duration::from_secs(6)).build().map_err(|e| e.to_string())?;
    let response = client
        .get(&settings.dns_over_https)
        .query(&[("name", name), ("type", "TXT")])
        .header("accept", "application/dns-json")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let answer: DnsAnswer = response.json().await.map_err(|e| e.to_string())?;
    Ok(answer
        .answer
        .into_iter()
        .filter(|r| r.kind == 16)
        .map(|r| r.data.split('"').enumerate().filter(|(i, _)| i % 2 == 1).map(|(_, s)| s).collect::<String>())
        .collect())
}

/// Looks up the TXT record. On success this project owns the hostname, and any other project
/// that had verified it loses it, because current DNS control is the proof of ownership.
pub async fn check(db: &DatabaseConnection, settings: &Settings, project: &Project, id: i64) -> Result<Domain, ApiError> {
    let row = db::one(db, "SELECT hostname, token FROM domains WHERE id = ? AND project_id = ?", [id.into(), project.id.into()]).await?.ok_or(ApiError::NotFound)?;
    let hostname: String = row.try_get("", "hostname")?;
    let token: String = row.try_get("", "token")?;
    let expected = format!("pagehaven-verify={token}");
    let outcome = txt_records(settings, &format!("{TXT_PREFIX}.{hostname}")).await;
    let tx = db.begin().await?;
    match outcome {
        Ok(records) if records.iter().any(|r| r.trim() == expected) => {
            db::exec(
                &tx,
                "UPDATE domains SET verified_at = NULL, last_error = 'Another Pagehaven website proved ownership of this domain.' WHERE hostname = ? AND id != ? AND verified_at IS NOT NULL",
                [hostname.as_str().into(), id.into()],
            )
            .await?;
            db::exec(&tx, "UPDATE domains SET verified_at = COALESCE(verified_at, ?), last_checked_at = ?, last_error = NULL WHERE id = ?", [db::now().into(), db::now().into(), id.into()]).await?;
        }
        Ok(_) => {
            db::exec(
                &tx,
                "UPDATE domains SET last_checked_at = ?, last_error = ? WHERE id = ?",
                [db::now().into(), "We couldn't find the TXT record yet. DNS changes can take up to an hour to appear.".into(), id.into()],
            )
            .await?;
        }
        Err(error) => {
            tracing::warn!(%error, %hostname, "DNS lookup failed");
            db::exec(&tx, "UPDATE domains SET last_checked_at = ?, last_error = ? WHERE id = ?", [db::now().into(), "We couldn't reach DNS right now. Please try again.".into(), id.into()]).await?;
        }
    }
    tx.commit().await?;
    find(db, settings, project, id).await
}

/// Whether the reverse proxy may obtain a certificate for `hostname`.
pub async fn certificate_allowed(db: &DatabaseConnection, settings: &Settings, hostname: &str) -> Result<bool, ApiError> {
    let hostname = hostname.trim().trim_end_matches('.').to_ascii_lowercase();
    match hosts::classify(Some(&hostname), settings) {
        hosts::Host::App => Ok(true),
        hosts::Host::Site(slug) => Ok(db::one(db, "SELECT id FROM projects WHERE slug = ? AND live_release_id IS NOT NULL", [slug.into()]).await?.is_some()),
        hosts::Host::Custom(host) => Ok(db::one(db, "SELECT id FROM domains WHERE hostname = ? AND verified_at IS NOT NULL", [host.into()]).await?.is_some()),
        hosts::Host::Preview(_) | hosts::Host::Invalid => Ok(false),
    }
}
