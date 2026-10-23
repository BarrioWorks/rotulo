//! Which files a site may contain, how they are served, and how their content is checked.

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileKind {
    Html,
    Css,
    Js,
    Json,
    SourceMap,
    WebManifest,
    Text,
    Csv,
    Xml,
    Svg,
    Png,
    Jpeg,
    Gif,
    Webp,
    Avif,
    Ico,
    Woff,
    Woff2,
    Ttf,
    Otf,
    Eot,
    Mp4,
    Webm,
    Mp3,
    Ogg,
    Wav,
    Pdf,
    Wasm,
}

/// Why a file in the archive is left out of the site.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Skip {
    /// Code or configuration for a web server, which Rótulo never runs.
    ServerCode,
    /// Keys, environment files, version control: probably included by accident.
    Secret,
    /// Archives inside the archive are never extracted.
    Archive,
    /// Files created by operating systems and editors.
    SystemJunk,
    /// Paths Rótulo keeps for itself or that could be abused for certificates.
    Reserved,
    /// Project source and tooling files that a browser never loads.
    Source,
    /// Anything without a known, safe browser type.
    Unsupported,
}

impl Skip {
    pub fn describe(self) -> &'static str {
        match self {
            Self::ServerCode => "server code or server settings, which Rótulo never runs",
            Self::Secret => "looks like a private key, password file or version-control data",
            Self::Archive => "an archive inside the ZIP",
            Self::SystemJunk => "a file created by the computer, not part of the website",
            Self::Reserved => "a reserved address",
            Self::Source => "project source or tooling, not needed by the finished website",
            Self::Unsupported => "a file type websites don't use",
        }
    }

    /// Worth showing prominently in the import report.
    pub fn is_notable(self) -> bool {
        matches!(self, Self::Secret | Self::ServerCode)
    }
}

impl FileKind {
    pub fn mime(self) -> &'static str {
        match self {
            Self::Html => "text/html; charset=utf-8",
            Self::Css => "text/css; charset=utf-8",
            Self::Js => "text/javascript; charset=utf-8",
            Self::Json | Self::SourceMap => "application/json",
            Self::WebManifest => "application/manifest+json",
            Self::Text => "text/plain; charset=utf-8",
            Self::Csv => "text/csv; charset=utf-8",
            Self::Xml => "application/xml",
            Self::Svg => "image/svg+xml",
            Self::Png => "image/png",
            Self::Jpeg => "image/jpeg",
            Self::Gif => "image/gif",
            Self::Webp => "image/webp",
            Self::Avif => "image/avif",
            Self::Ico => "image/x-icon",
            Self::Woff => "font/woff",
            Self::Woff2 => "font/woff2",
            Self::Ttf => "font/ttf",
            Self::Otf => "font/otf",
            Self::Eot => "application/vnd.ms-fontobject",
            Self::Mp4 => "video/mp4",
            Self::Webm => "video/webm",
            Self::Mp3 => "audio/mpeg",
            Self::Ogg => "audio/ogg",
            Self::Wav => "audio/wav",
            Self::Pdf => "application/pdf",
            Self::Wasm => "application/wasm",
        }
    }

    pub fn is_text(self) -> bool {
        matches!(
            self,
            Self::Html
                | Self::Css
                | Self::Js
                | Self::Json
                | Self::SourceMap
                | Self::WebManifest
                | Self::Text
                | Self::Csv
                | Self::Xml
                | Self::Svg
        )
    }

    /// Raster images that a user may upload as a replacement in the editor.
    pub fn is_raster_image(self) -> bool {
        matches!(
            self,
            Self::Png | Self::Jpeg | Self::Gif | Self::Webp | Self::Avif
        )
    }

    pub fn extension(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Gif => "gif",
            Self::Webp => "webp",
            Self::Avif => "avif",
            _ => "bin",
        }
    }

    /// Checks that the start of the file matches the type its name claims.
    /// Text kinds are checked for UTF-8 separately, over the whole file.
    pub fn matches_content(self, head: &[u8]) -> bool {
        let starts = |sig: &[u8]| head.starts_with(sig);
        match self {
            Self::Png => starts(b"\x89PNG\r\n\x1a\n"),
            Self::Jpeg => starts(b"\xff\xd8\xff"),
            Self::Gif => starts(b"GIF87a") || starts(b"GIF89a"),
            Self::Webp => head.len() >= 12 && &head[..4] == b"RIFF" && &head[8..12] == b"WEBP",
            Self::Avif => {
                head.len() >= 12
                    && &head[4..8] == b"ftyp"
                    && (&head[8..12] == b"avif"
                        || &head[8..12] == b"avis"
                        || &head[8..12] == b"mif1")
            }
            Self::Ico => starts(b"\x00\x00\x01\x00") || starts(b"\x89PNG\r\n\x1a\n"),
            Self::Woff => starts(b"wOFF"),
            Self::Woff2 => starts(b"wOF2"),
            Self::Ttf => starts(b"\x00\x01\x00\x00") || starts(b"true") || starts(b"ttcf"),
            Self::Otf => starts(b"OTTO") || starts(b"\x00\x01\x00\x00"),
            Self::Eot => head.len() >= 36 && head[34..36] == [0x4c, 0x50],
            Self::Mp4 => head.len() >= 8 && &head[4..8] == b"ftyp",
            Self::Webm => starts(b"\x1a\x45\xdf\xa3"),
            Self::Mp3 => {
                starts(b"ID3") || (head.len() >= 2 && head[0] == 0xff && head[1] & 0xe0 == 0xe0)
            }
            Self::Ogg => starts(b"OggS"),
            Self::Wav => head.len() >= 12 && &head[..4] == b"RIFF" && &head[8..12] == b"WAVE",
            Self::Pdf => starts(b"%PDF-"),
            Self::Wasm => starts(b"\x00asm"),
            Self::Html
            | Self::Css
            | Self::Js
            | Self::Json
            | Self::SourceMap
            | Self::WebManifest
            | Self::Text
            | Self::Csv
            | Self::Xml
            | Self::Svg => true,
        }
    }

    /// Sniffs a raster image upload from its bytes alone.
    pub fn sniff_raster(head: &[u8]) -> Option<Self> {
        [Self::Png, Self::Jpeg, Self::Gif, Self::Webp, Self::Avif]
            .into_iter()
            .find(|kind| kind.matches_content(head))
    }

    /// The kind used to serve a stored site path. Paths in a draft were classified at import.
    pub fn for_path(path: &str) -> Option<Self> {
        classify(path).ok()
    }
}

/// Classifies a normalized, relative, `/`-separated path inside the site root.
pub fn classify(path: &str) -> Result<FileKind, Skip> {
    let lower = path.to_ascii_lowercase();
    let segments: Vec<&str> = lower.split('/').collect();
    let name = *segments.last().unwrap_or(&"");

    if segments.iter().any(|s| {
        matches!(
            *s,
            "__macosx" | ".ds_store" | "thumbs.db" | "desktop.ini" | ".idea" | ".vscode"
        )
    }) || name.starts_with("._")
        || name.ends_with('~')
        || name.ends_with(".swp")
    {
        return Err(Skip::SystemJunk);
    }
    if segments
        .iter()
        .any(|s| matches!(*s, ".git" | ".svn" | ".hg" | ".ssh" | ".aws"))
        || name.starts_with(".env")
        || matches!(
            name,
            ".npmrc"
                | ".netrc"
                | ".pgpass"
                | "id_rsa"
                | "id_ed25519"
                | "id_ecdsa"
                | "credentials.json"
                | "secrets.json"
                | "service-account.json"
        )
        || [
            ".pem", ".key", ".p12", ".pfx", ".kdbx", ".sqlite", ".sqlite3", ".db",
        ]
        .iter()
        .any(|ext| name.ends_with(ext))
    {
        return Err(Skip::Secret);
    }
    if segments.first() == Some(&".well-known") || segments.first() == Some(&"__rotulo") {
        return Err(Skip::Reserved);
    }
    let javascript = [".js", ".mjs", ".cjs"]
        .iter()
        .any(|ext| name.ends_with(ext));
    if javascript
        && ((segments.len() == 1 && matches!(name, "server.js" | "server.mjs" | "server.cjs"))
            || segments
                .first()
                .is_some_and(|dir| matches!(*dir, "api" | "server" | "functions"))
            || name.contains(".server."))
    {
        return Err(Skip::ServerCode);
    }
    if matches!(
        name,
        ".htaccess"
            | ".htpasswd"
            | "web.config"
            | ".user.ini"
            | "php.ini"
            | "nginx.conf"
            | "_redirects"
            | "_headers"
            | "vercel.json"
            | "netlify.toml"
            | "dockerfile"
            | "procfile"
            | "makefile"
    ) || name.starts_with("docker-compose")
    {
        return Err(Skip::ServerCode);
    }
    if segments.contains(&"node_modules")
        || matches!(
            name,
            "package.json"
                | "package-lock.json"
                | "yarn.lock"
                | "pnpm-lock.yaml"
                | "bun.lockb"
                | "bun.lock"
                | "tsconfig.json"
                | "jsconfig.json"
                | ".gitignore"
                | ".gitattributes"
                | ".editorconfig"
                | ".prettierrc"
                | ".eslintrc"
                | ".eslintrc.json"
                | "readme"
                | "license"
        )
    {
        return Err(Skip::Source);
    }

    let extension = name.rsplit_once('.').map_or("", |(_, ext)| ext);
    match extension {
        "html" | "htm" => Ok(FileKind::Html),
        "css" => Ok(FileKind::Css),
        "js" | "mjs" => Ok(FileKind::Js),
        "json" => Ok(FileKind::Json),
        "map" => Ok(FileKind::SourceMap),
        "webmanifest" => Ok(FileKind::WebManifest),
        "txt" | "md" => Ok(FileKind::Text),
        "csv" => Ok(FileKind::Csv),
        "xml" => Ok(FileKind::Xml),
        "svg" => Ok(FileKind::Svg),
        "png" | "apng" => Ok(FileKind::Png),
        "jpg" | "jpeg" => Ok(FileKind::Jpeg),
        "gif" => Ok(FileKind::Gif),
        "webp" => Ok(FileKind::Webp),
        "avif" => Ok(FileKind::Avif),
        "ico" => Ok(FileKind::Ico),
        "woff" => Ok(FileKind::Woff),
        "woff2" => Ok(FileKind::Woff2),
        "ttf" => Ok(FileKind::Ttf),
        "otf" => Ok(FileKind::Otf),
        "eot" => Ok(FileKind::Eot),
        "mp4" | "m4v" => Ok(FileKind::Mp4),
        "webm" => Ok(FileKind::Webm),
        "mp3" => Ok(FileKind::Mp3),
        "ogg" | "oga" => Ok(FileKind::Ogg),
        "wav" => Ok(FileKind::Wav),
        "pdf" => Ok(FileKind::Pdf),
        "wasm" => Ok(FileKind::Wasm),
        "zip" | "tar" | "gz" | "tgz" | "bz2" | "xz" | "7z" | "rar" | "zst" | "jar" | "war" => {
            Err(Skip::Archive)
        }
        "php" | "phtml" | "php3" | "php4" | "php5" | "phar" | "asp" | "aspx" | "ashx" | "jsp"
        | "jspx" | "cgi" | "pl" | "py" | "rb" | "sh" | "bash" | "zsh" | "ps1" | "bat" | "cmd"
        | "exe" | "dll" | "so" | "dylib" | "bin" | "elf" | "msi" | "deb" | "rpm" | "apk"
        | "app" | "shtml" | "htaccess" | "lua" | "go" | "rs" | "java" | "class" | "cs" | "c"
        | "cpp" | "h" => Err(Skip::ServerCode),
        "ts" | "tsx" | "jsx" | "mts" | "cts" | "vue" | "svelte" | "astro" | "scss" | "sass"
        | "less" | "styl" | "toml" | "yaml" | "yml" | "lock" | "mdx" => Err(Skip::Source),
        _ => Err(Skip::Unsupported),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn server_code_and_secrets_are_never_hosted() {
        assert_eq!(classify("api/index.php"), Err(Skip::ServerCode));
        assert_eq!(classify("api/contact.js"), Err(Skip::ServerCode));
        assert_eq!(classify("server.js"), Err(Skip::ServerCode));
        assert_eq!(classify("functions/contact.mjs"), Err(Skip::ServerCode));
        assert_eq!(classify("chunks/page.server.js"), Err(Skip::ServerCode));
        assert_eq!(classify("assets/server.js"), Ok(FileKind::Js));
        assert_eq!(classify("api/products.json"), Ok(FileKind::Json));
        assert_eq!(classify(".htaccess"), Err(Skip::ServerCode));
        assert_eq!(classify("web.config"), Err(Skip::ServerCode));
        assert_eq!(classify(".env.production"), Err(Skip::Secret));
        assert_eq!(classify(".git/config"), Err(Skip::Secret));
        assert_eq!(classify("certs/server.key"), Err(Skip::Secret));
        assert_eq!(classify("backup.zip"), Err(Skip::Archive));
        assert_eq!(
            classify(".well-known/acme-challenge/abc"),
            Err(Skip::Reserved)
        );
        assert_eq!(classify("__rotulo/agent.js"), Err(Skip::Reserved));
    }

    #[test]
    fn website_files_are_hosted_with_their_own_type() {
        assert_eq!(
            classify("index.html").map(FileKind::mime),
            Ok("text/html; charset=utf-8")
        );
        assert_eq!(classify("assets/Index-4F2A.JS"), Ok(FileKind::Js));
        assert_eq!(classify("fonts/lato.woff2"), Ok(FileKind::Woff2));
        assert_eq!(classify("img/logo.svg"), Ok(FileKind::Svg));
    }

    #[test]
    fn content_must_match_the_claimed_type() {
        assert!(FileKind::Png.matches_content(b"\x89PNG\r\n\x1a\n...."));
        assert!(!FileKind::Png.matches_content(b"<?php system($_GET['x']);"));
        assert_eq!(
            FileKind::sniff_raster(b"\xff\xd8\xff\xe0...."),
            Some(FileKind::Jpeg)
        );
        assert_eq!(FileKind::sniff_raster(b"<svg xmlns="), None);
    }
}
