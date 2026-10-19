//! Which of Pagehaven's three kinds of host a request is for.

use crate::settings::Settings;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Host {
    /// The application: dashboard, editor, API.
    App,
    /// The draft of one project, addressed by a preview token.
    Preview(String),
    /// A managed address `<slug>.<sites_domain>`.
    Site(String),
    /// Any other hostname, which may be a verified custom domain.
    Custom(String),
    /// A Host header that cannot be a website.
    Invalid,
}

/// A DNS hostname: lowercase letters, digits and hyphens in labels of 1 to 63, at most 253 in total.
pub fn is_hostname(host: &str) -> bool {
    host.len() <= 253
        && host.contains('.')
        && host.split('.').all(|label| {
            !label.is_empty()
                && label.len() <= 63
                && !label.starts_with('-')
                && !label.ends_with('-')
                && label
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        })
        && !host
            .rsplit('.')
            .next()
            .is_some_and(|tld| tld.bytes().all(|b| b.is_ascii_digit()))
}

pub fn classify(header: Option<&str>, settings: &Settings) -> Host {
    let Some(header) = header else {
        return Host::Invalid;
    };
    let authority = header.trim().trim_end_matches('.').to_ascii_lowercase();
    if authority == settings.app_authority() {
        return Host::App;
    }
    let host = match authority.rsplit_once(':') {
        Some((host, port)) if port.bytes().all(|b| b.is_ascii_digit()) => host.to_owned(),
        _ => authority.clone(),
    };
    let label_of = |domain: &str| {
        host.strip_suffix(domain)
            .and_then(|rest| rest.strip_suffix('.'))
            .filter(|label| !label.is_empty() && !label.contains('.'))
            .map(str::to_owned)
    };
    if let Some(label) = label_of(&settings.preview_domain) {
        return Host::Preview(label);
    }
    if let Some(label) = label_of(&settings.sites_domain) {
        return Host::Site(label);
    }
    if host == settings.app_host()
        || host == settings.preview_domain
        || host == settings.sites_domain
    {
        return Host::Invalid;
    }
    if is_hostname(&host) {
        Host::Custom(host)
    } else {
        Host::Invalid
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn settings() -> Settings {
        Settings {
            app_origin: "https://pagehaven.app".to_owned(),
            scheme: "https".to_owned(),
            public_port: None,
            sites_domain: "pagehaven.site".to_owned(),
            preview_domain: "preview.pagehaven.site".to_owned(),
            data_dir: "data".into(),
            secret: "x".repeat(32),
            secure_cookies: true,
            client_ip_header: None,
            custom_domains: true,
            abuse_email: None,
            dns_over_https: String::new(),
            server_ipv4: String::new(),
            limits: Default::default(),
        }
    }

    #[test]
    fn hosts_route_to_the_app_previews_sites_and_custom_domains() {
        let s = settings();
        assert_eq!(classify(Some("pagehaven.app"), &s), Host::App);
        assert_eq!(
            classify(Some("abc-123.preview.pagehaven.site"), &s),
            Host::Preview("abc-123".to_owned())
        );
        assert_eq!(
            classify(Some("harbor.pagehaven.site"), &s),
            Host::Site("harbor".to_owned())
        );
        assert_eq!(
            classify(Some("www.harborbakery.com"), &s),
            Host::Custom("www.harborbakery.com".to_owned())
        );
        assert_eq!(
            classify(Some("a.b.pagehaven.site"), &s),
            Host::Custom("a.b.pagehaven.site".to_owned())
        );
        assert_eq!(classify(Some("pagehaven.site"), &s), Host::Invalid);
        assert_eq!(classify(Some("10.0.0.1"), &s), Host::Invalid);
        assert_eq!(classify(Some("evil/../x"), &s), Host::Invalid);
        assert_eq!(classify(None, &s), Host::Invalid);
    }
}
