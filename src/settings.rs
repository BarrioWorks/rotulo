use std::path::PathBuf;

use loco_rs::app::AppContext;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Limits {
    pub upload_bytes: u64,
    pub content_bytes: u64,
    pub file_count: usize,
    pub depth: usize,
    pub file_bytes: u64,
    pub compression_ratio: u64,
    pub image_bytes: u64,
    pub projects_per_user: u64,
    pub concurrent_jobs: usize,
}

impl Default for Limits {
    fn default() -> Self {
        Self {
            upload_bytes: 25 * 1024 * 1024,
            content_bytes: 100 * 1024 * 1024,
            file_count: 2000,
            depth: 15,
            file_bytes: 20 * 1024 * 1024,
            compression_ratio: 200,
            image_bytes: 8 * 1024 * 1024,
            projects_per_user: 25,
            concurrent_jobs: 2,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct Settings {
    pub app_origin: String,
    pub scheme: String,
    #[serde(default)]
    pub public_port: Option<u16>,
    pub sites_domain: String,
    pub preview_domain: String,
    pub data_dir: PathBuf,
    pub secret: String,
    pub secure_cookies: bool,
    /// Confirms both user-content domains are on the Public Suffix List.
    #[serde(default)]
    pub user_content_on_public_suffix: bool,
    pub dns_over_https: String,
    pub server_ipv4: String,
    /// Header that carries the visitor's address, set by the trusted proxy in front of Pagehaven:
    /// `cf-connecting-ip` behind Cloudflare, `x-forwarded-for` (last entry) behind a plain proxy.
    #[serde(default)]
    pub client_ip_header: Option<String>,
    /// Whether owners may connect their own domains. Needs TLS for arbitrary hostnames.
    #[serde(default = "enabled")]
    pub custom_domains: bool,
    /// Where visitors report a harmful published website. Shown on Pagehaven's own error pages.
    #[serde(default)]
    pub abuse_email: Option<String>,
    #[serde(default)]
    pub limits: Limits,
}

fn enabled() -> bool {
    true
}

// A conservative last-two-labels check; localhost is itself a public suffix.
fn registrable_domain(host: &str) -> &str {
    host.rmatch_indices('.')
        .nth(1)
        .map_or(host, |(i, _)| &host[i + 1..])
}

impl Settings {
    pub fn from_context(ctx: &AppContext) -> loco_rs::Result<Self> {
        let value = ctx
            .config
            .settings
            .clone()
            .ok_or_else(|| loco_rs::Error::string("config is missing `settings`"))?;
        let settings: Self = serde_json::from_value(value)
            .map_err(|error| loco_rs::Error::string(&format!("invalid `settings`: {error}")))?;
        settings.validate()?;
        Ok(settings)
    }

    fn validate(&self) -> loco_rs::Result<()> {
        if self.secret.len() < 32 {
            return Err(loco_rs::Error::string(
                "settings.secret must be at least 32 bytes",
            ));
        }
        let app_host = self.app_host().trim_end_matches('.').to_owned();
        for user_content in [&self.sites_domain, &self.preview_domain] {
            let user_content = user_content.trim_end_matches('.').to_ascii_lowercase();
            if app_host == user_content || app_host.ends_with(&format!(".{user_content}")) {
                return Err(loco_rs::Error::string(
                    "the app origin must not be inside a user-content domain",
                ));
            }
            if !self.user_content_on_public_suffix
                && registrable_domain(&app_host) == registrable_domain(&user_content)
            {
                return Err(loco_rs::Error::string(
                    "the app and user-content domains must use different registrable domains, unless user_content_on_public_suffix confirms the user-content domains are on the Public Suffix List",
                ));
            }
        }
        Ok(())
    }

    /// `host[:port]` of the app origin, lowercase.
    pub fn app_authority(&self) -> String {
        self.app_origin
            .split_once("://")
            .map_or(self.app_origin.as_str(), |(_, rest)| rest)
            .trim_end_matches('/')
            .to_ascii_lowercase()
    }

    pub fn app_host(&self) -> String {
        let authority = self.app_authority();
        authority
            .rsplit_once(':')
            .filter(|(_, port)| port.chars().all(|c| c.is_ascii_digit()))
            .map_or(authority.clone(), |(host, _)| host.to_owned())
    }

    fn port_suffix(&self) -> String {
        self.public_port
            .map(|port| format!(":{port}"))
            .unwrap_or_default()
    }

    /// The visitor's address for rate limits, from the configured proxy header.
    pub fn client_ip(&self, headers: &axum::http::HeaderMap) -> String {
        let Some(name) = self.client_ip_header.as_deref() else {
            return "direct".to_owned();
        };
        let value = headers
            .get(name)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        // With X-Forwarded-For, earlier entries come from the client; the last one from our proxy.
        let value = if name.eq_ignore_ascii_case("x-forwarded-for") {
            value.rsplit(',').next().unwrap_or("")
        } else {
            value
        };
        value.trim().chars().take(64).collect()
    }

    pub fn site_origin(&self, slug: &str) -> String {
        format!(
            "{}://{slug}.{}{}",
            self.scheme,
            self.sites_domain,
            self.port_suffix()
        )
    }

    pub fn custom_origin(&self, hostname: &str) -> String {
        format!("{}://{hostname}{}", self.scheme, self.port_suffix())
    }

    pub fn preview_origin(&self, token: &str) -> String {
        format!(
            "{}://{token}.{}{}",
            self.scheme,
            self.preview_domain,
            self.port_suffix()
        )
    }

    /// CSP source that matches every preview origin.
    pub fn preview_source(&self) -> String {
        format!(
            "{}://*.{}{}",
            self.scheme,
            self.preview_domain,
            self.port_suffix()
        )
    }

    pub fn sites_source(&self) -> String {
        format!(
            "{}://*.{}{}",
            self.scheme,
            self.sites_domain,
            self.port_suffix()
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings(app: &str, sites: &str, preview: &str, public_suffix: bool) -> Settings {
        serde_json::from_value(serde_json::json!({
            "app_origin": format!("https://{app}"), "scheme": "https",
            "sites_domain": sites, "preview_domain": preview,
            "data_dir": "data", "secret": "x".repeat(32), "secure_cookies": true,
            "dns_over_https": "", "server_ipv4": "",
            "user_content_on_public_suffix": public_suffix,
        }))
        .unwrap()
    }

    #[test]
    fn app_and_user_content_must_not_share_a_registrable_domain() {
        for (app, sites, preview) in [
            ("pagehaven.com", "sites.pagehaven.com", "preview.other.net"),
            (
                "app.pagehaven.com",
                "sites.other.net",
                "preview.pagehaven.com",
            ),
            (
                "app.pagehaven.com",
                "sites.pagehaven.com",
                "preview.pagehaven.com",
            ),
            ("pagehaven.com", "SITES.PAGEHAVEN.COM.", "preview.other.net"),
        ] {
            assert!(
                settings(app, sites, preview, false).validate().is_err(),
                "accepted {app}, {sites}, {preview}"
            );
        }
        assert!(settings(
            "pagehaven.app",
            "pagehaven.site",
            "preview.pagehaven.site",
            false
        )
        .validate()
        .is_ok());
        assert!(settings(
            "app.localhost",
            "sites.localhost",
            "preview.localhost",
            false
        )
        .validate()
        .is_ok());
        assert!(settings(
            "127.0.0.1:5150",
            "sites.localhost",
            "preview.localhost",
            false
        )
        .validate()
        .is_ok());
    }

    #[test]
    fn public_suffix_acknowledgement_allows_siblings_but_not_the_app_inside_content() {
        assert!(settings(
            "app.pagehaven.com",
            "sites.pagehaven.com",
            "preview.pagehaven.com",
            true
        )
        .validate()
        .is_ok());
        for flag in [false, true] {
            assert!(settings(
                "app.sites.pagehaven.com",
                "sites.pagehaven.com",
                "preview.other.net",
                flag
            )
            .validate()
            .is_err());
            assert!(settings(
                "sites.pagehaven.com",
                "sites.pagehaven.com",
                "preview.other.net",
                flag
            )
            .validate()
            .is_err());
        }
    }
}
