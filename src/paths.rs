//! Paths inside a site, as they appear in URLs and in the draft.

use percent_encoding::percent_decode_str;

/// Turns a request path into a site path: decoded, no leading slash, no `.`/`..`, no backslashes.
/// `""` is the site root.
pub fn from_request(path: &str) -> Option<String> {
    let decoded = percent_decode_str(path).decode_utf8().ok()?;
    let mut segments = Vec::new();
    for segment in decoded.split('/') {
        if segment.is_empty() {
            continue;
        }
        if segment == "." || segment == ".." || segment.contains('\\') || segment.chars().any(char::is_control) {
            return None;
        }
        segments.push(segment);
    }
    let joined = segments.join("/");
    (joined.len() <= 1024).then_some(joined)
}

/// The draft or release files a request path may mean, in order of preference.
pub fn candidates(path: &str, trailing_slash: bool) -> Vec<String> {
    if path.is_empty() {
        return vec!["index.html".to_owned()];
    }
    if trailing_slash {
        return vec![format!("{path}/index.html")];
    }
    let mut out = vec![path.to_owned()];
    if !path.rsplit('/').next().unwrap_or("").contains('.') {
        out.push(format!("{path}.html"));
        out.push(format!("{path}/index.html"));
    }
    out
}

/// A URL from the page at `from` to the site file `to`, both site paths.
pub fn relative_url(from: &str, to: &str) -> String {
    let from_dir: Vec<&str> = from.split('/').collect::<Vec<_>>().split_last().map(|(_, dir)| dir.to_vec()).unwrap_or_default();
    let to_parts: Vec<&str> = to.split('/').collect();
    let common = from_dir.iter().zip(&to_parts).take_while(|(a, b)| a == b).count();
    let mut parts: Vec<String> = std::iter::repeat_n("..".to_owned(), from_dir.len() - common).collect();
    parts.extend(to_parts[common..].iter().map(|p| (*p).to_owned()));
    parts.join("/")
}

/// A page path a user may create: lowercase `name.html` or `folder/name.html`.
pub fn valid_page_path(path: &str) -> bool {
    let Some(stem) = path.strip_suffix(".html") else { return false };
    let segments: Vec<&str> = stem.split('/').collect();
    segments.len() <= 3
        && segments.iter().all(|s| {
            (1..=60).contains(&s.len())
                && s.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
                && !s.starts_with('-')
        })
        && crate::import::policy::classify(path).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_paths_cannot_escape_the_site() {
        assert_eq!(from_request("/").as_deref(), Some(""));
        assert_eq!(from_request("/menu%20card.html").as_deref(), Some("menu card.html"));
        assert_eq!(from_request("/a//b/").as_deref(), Some("a/b"));
        assert_eq!(from_request("/../etc/passwd"), None);
        assert_eq!(from_request("/%2e%2e/etc/passwd"), None);
        assert_eq!(from_request("/a/%5c..%5cb"), None);
        assert_eq!(from_request("/%00"), None);
    }

    #[test]
    fn pages_are_found_with_or_without_their_extension() {
        assert_eq!(candidates("", false), ["index.html"]);
        assert_eq!(candidates("about", false), ["about", "about.html", "about/index.html"]);
        assert_eq!(candidates("blog", true), ["blog/index.html"]);
        assert_eq!(candidates("css/site.css", false), ["css/site.css"]);
    }

    #[test]
    fn relative_urls_climb_out_of_folders() {
        assert_eq!(relative_url("index.html", "images/a.jpg"), "images/a.jpg");
        assert_eq!(relative_url("blog/post.html", "images/a.jpg"), "../images/a.jpg");
        assert_eq!(relative_url("blog/post.html", "blog/b.jpg"), "b.jpg");
    }

    #[test]
    fn new_page_names_are_simple() {
        assert!(valid_page_path("offers.html"));
        assert!(valid_page_path("blog/first-post.html"));
        assert!(!valid_page_path("Offers.html"));
        assert!(!valid_page_path("../x.html"));
        assert!(!valid_page_path("x.php"));
        assert!(!valid_page_path(".well-known/x.html"));
    }
}
