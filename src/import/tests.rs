use super::testzip::{build, Item};
use super::*;
use std::os::unix::fs::PermissionsExt;

struct Fixture {
    dir: PathBuf,
    archive: PathBuf,
    staging: PathBuf,
}
impl Fixture {
    fn bytes(bytes: &[u8]) -> Self {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target/import-tests")
            .join(crate::store::random_token(12));
        fs::create_dir_all(&dir).unwrap();
        let archive = dir.join("site.zip");
        fs::write(&archive, bytes).unwrap();
        let staging = dir.join("staging");
        fs::create_dir(&staging).unwrap();
        Self {
            dir,
            archive,
            staging,
        }
    }
    fn new(items: &[Item]) -> Self {
        Self::bytes(&build(items))
    }
    fn import(&self, limits: &Limits, root: Option<&str>) -> Result<ImportedSite, ImportError> {
        import_archive(ImportRequest {
            archive: &self.archive,
            staging: &self.staging,
            limits,
            root,
        })
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.dir);
    }
}
fn page() -> Item {
    Item::new("index.html", "<title>Harbor</title><p>Hello</p>")
}

#[test]
fn a_complete_site_imports_pages_and_assets_with_final_hashes_and_private_generated_names() {
    let f=Fixture::new(&[Item::new("site/index.html",r#"<title>Harbor</title><link rel="stylesheet" href="css/site.css"><script src="app.js"></script><img src="logo.png"><a href="about">About</a>"#).deflated(),Item::new("site/about.html","<p>About</p>"),Item::new("site/css/site.css","@font-face {src:url('../font.woff2')}"),Item::new("site/app.js","console.log('hi')"),Item::new("site/logo.png",b"\x89PNG\r\n\x1a\n"),Item::new("site/font.woff2","wOF2font")]);
    let result = f.import(&Limits::default(), None).unwrap();
    assert_eq!(result.root_dir, "site");
    assert_eq!(result.report.pages.len(), 2);
    assert_eq!(result.files.len(), 6);
    assert!(result.report.missing.is_empty());
    assert_eq!(result.title.as_deref(), Some("Harbor"));
    for file in result.files {
        let bytes = fs::read(&file.staged).unwrap();
        assert_eq!(file.blob, Blob::of(&bytes));
        assert_eq!(file.bytes, bytes.len() as u64);
        assert!(file.staged.starts_with(&f.staging));
        assert_eq!(
            fs::metadata(&file.staged).unwrap().permissions().mode() & 0o777,
            0o600
        );
        if file.kind == policy::FileKind::Html {
            assert!(String::from_utf8(bytes).unwrap().contains("data-ph-id"));
        }
    }
}
#[test]
fn a_distribution_is_chosen_beside_its_source() {
    let f = Fixture::new(&[
        Item::new("index.html", "<script src='/src/main.tsx'></script>"),
        Item::new("package.json", "{}"),
        Item::new("src/main.tsx", "source"),
        Item::new("dist/index.html", "<script src='/assets/app.js'></script>"),
        Item::new("dist/assets/app.js", "built"),
    ]);
    assert_eq!(f.import(&Limits::default(), None).unwrap().root_dir, "dist");
}
#[test]
fn a_source_only_vite_project_explains_that_a_build_is_needed() {
    let f = Fixture::new(&[
        Item::new(
            "index.html",
            "<script type='module' src='/src/main.tsx'></script>",
        ),
        Item::new("package.json", "{}"),
        Item::new("src/main.tsx", "source"),
    ]);
    assert_eq!(f.import(&Limits::default(),None).unwrap_err().to_string(),"This ZIP contains source code rather than a finished website. Export the built static website files and try again.");
}
#[test]
fn dangerous_names_fail_without_writing_anything() {
    for name in [
        "../evil",
        "/etc/passwd",
        "C:\\x",
        "a\\b",
        "a//b",
        "a/./b",
        "a/../b",
        "a/\0x",
        "a/\u{7f}",
        "a:",
    ] {
        let f = Fixture::new(&[page(), Item::new(name, "bad")]);
        let err = f.import(&Limits::default(), None).unwrap_err();
        assert!(
            matches!(&err,ImportError::UnsafePath(p) if p==name),
            "{err}"
        );
        assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 0);
    }
}
#[test]
fn path_depth_and_byte_lengths_are_bounded() {
    for name in [
        format!("{}.html", "x".repeat(256)),
        format!(
            "{}/index.html",
            (0..16).map(|_| "a").collect::<Vec<_>>().join("/")
        ),
        (0..6)
            .map(|_| "a".repeat(200))
            .collect::<Vec<_>>()
            .join("/"),
    ] {
        let f = Fixture::new(&[Item::new(&name, "")]);
        assert!(matches!(
            f.import(&Limits::default(), None),
            Err(ImportError::UnsafePath(_))
        ));
    }
}
#[test]
fn symlinks_devices_and_path_collisions_are_rejected() {
    for mode in [0o120777, 0o020600, 0o060600, 0o010600, 0o140600] {
        let mut e = Item::new("link", "target");
        e.mode = mode;
        assert!(Fixture::new(&[page(), e])
            .import(&Limits::default(), None)
            .is_err());
    }
    for names in [["a.js", "A.js"], ["a", "a/b.js"], ["a/", "A/"]] {
        assert!(
            Fixture::new(&[page(), Item::new(names[0], ""), Item::new(names[1], "")])
                .import(&Limits::default(), None)
                .is_err()
        );
    }
}
#[test]
fn file_count_and_declared_sizes_are_rejected_before_inflating() {
    let mut corrupt = page();
    corrupt.crc = Some(0);
    let f = Fixture::new(&[corrupt, Item::new("a.js", "abc")]);
    for limits in [
        Limits {
            file_count: 1,
            ..Limits::default()
        },
        Limits {
            file_bytes: 1,
            ..Limits::default()
        },
        Limits {
            content_bytes: 1,
            ..Limits::default()
        },
    ] {
        assert!(matches!(
            f.import(&limits, None),
            Err(ImportError::Limit(_))
        ));
        assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 0);
    }
}
#[test]
fn lying_and_honest_deflate_bombs_are_stopped() {
    let mut bomb = Item::new("bomb.js", vec![0; 50 * 1024 * 1024]).deflated();
    bomb.declared = Some(1024);
    let f = Fixture::new(&[page(), bomb.clone()]);
    assert!(matches!(
        f.import(&Limits::default(), None),
        Err(ImportError::Limit(_))
    ));
    assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 0);
    bomb.declared = None;
    let f = Fixture::new(&[page(), bomb]);
    assert!(matches!(
        f.import(&Limits::default(), None),
        Err(ImportError::Limit(_))
    ));
}
#[test]
fn overlapping_entries_encryption_unknown_methods_and_local_disagreements_fail() {
    for change in 0..6 {
        let mut e = Item::new("a.js", "asset");
        match change {
            0 => e.offset = Some(0),
            1 => e.flags = 1,
            2 => e.flags = 64,
            3 => e.method = 99,
            4 => e.local_name = Some("b.js".into()),
            _ => e.declared = Some(u32::MAX),
        };
        let f = Fixture::new(&[page(), e]);
        assert!(f.import(&Limits::default(), None).is_err(), "case {change}");
    }
}
#[test]
fn malformed_truncated_prefixed_appended_and_zip64_archives_fail() {
    let original = build(&[page()]);
    let mut sentinel = original.clone();
    let n = sentinel.len();
    sentinel[n - 12..n - 10].copy_from_slice(&u16::MAX.to_le_bytes());
    let mut prefixed = b"junk".to_vec();
    prefixed.extend(&original);
    let mut appended = original.clone();
    appended.extend(b"junk");
    for bytes in [
        b"garbage".to_vec(),
        original[..original.len() - 1].to_vec(),
        sentinel,
        prefixed,
        appended,
        build(&[]),
    ] {
        assert!(Fixture::bytes(&bytes)
            .import(&Limits::default(), None)
            .is_err());
    }
}
#[test]
fn a_crc_mismatch_fails_and_removes_partial_staging_files() {
    let mut e = Item::new("a.js", "asset").deflated();
    e.crc = Some(0);
    let f = Fixture::new(&[page(), e]);
    assert!(f.import(&Limits::default(), None).is_err());
    assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 0);
}
#[test]
fn a_missing_stylesheet_is_fatal_but_a_missing_image_is_a_warning() {
    let f = Fixture::new(&[Item::new(
        "index.html",
        "<link rel='stylesheet' href='missing.css'>",
    )]);
    assert!(matches!(
        f.import(&Limits::default(), None),
        Err(ImportError::MissingFiles(_))
    ));
    let f = Fixture::new(&[Item::new("index.html", "<img src='missing.png'>")]);
    let site = f.import(&Limits::default(), None).unwrap();
    assert_eq!(site.report.missing.len(), 1);
    assert_eq!(site.report.warnings.len(), 1);
}
#[test]
fn private_server_archive_and_junk_files_are_reported_without_inflating() {
    let mut items = vec![page()];
    for name in [
        ".env",
        ".git/config",
        "api.php",
        ".htaccess",
        "nested.zip",
        "__MACOSX/junk",
    ] {
        let mut e = Item::new(name, "not inflated");
        e.crc = Some(0);
        items.push(e);
    }
    let site = Fixture::new(&items)
        .import(&Limits::default(), None)
        .unwrap();
    assert_eq!(site.report.skipped.len(), 6);
    assert_eq!(site.files.len(), 1);
    assert_eq!(site.report.skipped[0].reason, policy::Skip::Secret);
}
#[test]
fn fake_images_and_invalid_text_are_skipped_with_warnings() {
    let f = Fixture::new(&[
        page(),
        Item::new("evil.png", "<?php shell();?>"),
        Item::new("bad.txt", [255]),
    ]);
    let site = f.import(&Limits::default(), None).unwrap();
    assert_eq!(site.files.len(), 1);
    assert_eq!(site.report.skipped.len(), 2);
    assert_eq!(site.report.warnings.len(), 2);
}
#[test]
fn ambiguous_distributions_require_a_choice_and_accept_an_explicit_root() {
    let f = Fixture::new(&[
        Item::new("dist/index.html", "<p>Dist</p>"),
        Item::new("build/index.html", "<p>Build</p>"),
    ]);
    assert!(
        matches!(f.import(&Limits::default(),None),Err(ImportError::ChooseFolder(c)) if c==vec!["build","dist"])
    );
    assert_eq!(
        f.import(&Limits::default(), Some("dist")).unwrap().root_dir,
        "dist"
    );
}
#[test]
fn urls_resolve_relative_to_the_referencing_file_and_page_candidates_are_explicit() {
    for (from, url, want) in [
        ("css/a.css", "../font.woff2", "font.woff2"),
        ("a/b.html", "/hello%20world/?x#y", "hello world/index.html"),
        ("index.html", "./a/../b.png", "b.png"),
    ] {
        assert_eq!(references::resolve(from, url).as_deref(), Some(want));
    }
    for url in [
        "https://x",
        "data:x",
        "//host/x",
        "#x",
        "",
        "../../x",
        "%2e%2e/x",
        "/%2fhost/x",
        "java%73cript:x",
    ] {
        assert!(references::resolve("index.html", url).is_none(), "{url}");
    }
    assert_eq!(
        references::page_candidates("about"),
        vec!["about", "about.html", "about/index.html"]
    );
}
#[test]
fn html_and_css_extract_the_supported_reference_forms() {
    let html = r#"<script src="a.js"></script><link rel="stylesheet" href="a.css"><link rel="preload" as="font" href="a.woff"><img src="a.png" srcset="b.png 1x, c.png 2x"><source src="a.webm" srcset="d.png 2x"><video src="b.webm" poster="e.png"></video><audio src="a.mp3"></audio><a href="page">a</a><iframe src="frame"></iframe><p style="background:url(f.png)"></p><style>@import "b.css";a{background:URL('g.png')}</style><meta property="og:image" content="h.png">"#;
    let refs = references::html_references(html);
    for url in [
        "a.js", "a.css", "a.woff", "a.png", "b.png", "c.png", "a.webm", "d.png", "b.webm", "e.png",
        "a.mp3", "page", "frame", "f.png", "b.css", "g.png", "h.png",
    ] {
        assert!(refs.iter().any(|r| r.url == url), "{url}");
    }
    assert_eq!(
        references::css_references(
            "/*url(fake)*/ @import url(x.css); a{content:'url(fake)';background:url( x.png )}"
        ),
        vec!["x.css", "x.png"]
    );
}
#[test]
fn inline_bare_module_imports_and_missing_websites_are_rejected() {
    let f = Fixture::new(&[
        Item::new(
            "index.html",
            "<script type='module'>import React from 'react';</script>",
        ),
        Item::new("package.json", "{}"),
    ]);
    assert!(matches!(
        f.import(&Limits::default(), None),
        Err(ImportError::SourceOnly)
    ));
    assert!(matches!(
        Fixture::new(&[Item::new("a.txt", "hello")]).import(&Limits::default(), None),
        Err(ImportError::NoWebsite)
    ));
}
fn real_fixture(name: &str, root: Option<&str>, source: bool) {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("fixtures/zips")
        .join(format!("{name}.zip"));
    if !path.exists() {
        eprintln!("Skipping missing fixture {}", path.display());
        return;
    }
    let f = Fixture::bytes(&fs::read(path).unwrap());
    let start = std::time::Instant::now();
    let site = f.import(&Limits::default(), None);
    eprintln!("{name} import: {:?}", start.elapsed());
    if source {
        assert!(matches!(site, Err(ImportError::SourceOnly)));
    } else {
        let site = site.unwrap();
        assert!(!site.report.pages.is_empty());
        for file in &site.files {
            let bytes = fs::read(&file.staged).unwrap();
            assert_eq!(Blob::of(&bytes), file.blob);
            if file.kind == policy::FileKind::Html {
                assert!(std::str::from_utf8(&bytes).unwrap().contains("data-ph-id"));
            }
        }
        if let Some(root) = root {
            assert!(site.root_dir == root || site.root_dir.ends_with(&format!("/{root}")));
        }
    }
}
#[test]
fn harbor_bakery_fixture_imports() {
    real_fixture("harbor-bakery", None, false);
}
#[test]
fn northwind_studio_fixture_selects_dist() {
    real_fixture("northwind-studio", Some("dist"), false);
}
#[test]
fn a_bootstrap_template_repository_imports_its_dist_folder() {
    real_fixture("startbootstrap-agency", Some("dist"), false);
}
#[test]
fn a_tailwind_template_repository_imports_from_its_root() {
    real_fixture("landwind", Some(""), false);
}
#[test]
fn vite_source_only_fixture_requires_a_build() {
    real_fixture("vite-source-only", None, true);
}

#[test]
fn unicode_names_require_utf8_and_all_other_name_bytes_are_validated() {
    let mut good = Item::new("caf\u{e9}.html", "<p>French</p>");
    assert!(Fixture::new(&[page(), good.clone()])
        .import(&Limits::default(), None)
        .is_err());
    good.flags = 0x800;
    assert_eq!(
        Fixture::new(&[page(), good])
            .import(&Limits::default(), None)
            .unwrap()
            .report
            .pages
            .len(),
        2
    );
    let mut bytes = build(&[page()]);
    let central = bytes.windows(4).position(|w| w == b"PK\x01\x02").unwrap();
    bytes[30] = 255;
    bytes[central + 46] = 255;
    assert!(Fixture::bytes(&bytes)
        .import(&Limits::default(), None)
        .is_err());
}
#[test]
fn multidisk_local_flag_mismatches_and_central_directory_size_lies_are_rejected() {
    let original = build(&[page()]);
    for case in 0..5 {
        let mut bytes = original.clone();
        let end = bytes.len() - 22;
        match case {
            0 => bytes[end + 4] = 1,
            1 => bytes[end + 6] = 1,
            2 => bytes[6] = 1,
            3 => bytes[8] = 8,
            _ => bytes[end + 12] = 0,
        };
        assert!(
            Fixture::bytes(&bytes)
                .import(&Limits::default(), None)
                .is_err(),
            "case {case}"
        );
    }
}
#[test]
fn zip64_locators_and_extra_fields_are_rejected() {
    let mut bytes = build(&[page()]);
    let end = bytes.len() - 22;
    bytes.splice(end..end, b"PK\x06\x07".iter().copied().chain([0; 16]));
    assert!(Fixture::bytes(&bytes)
        .import(&Limits::default(), None)
        .is_err());
    let mut bytes = build(&[page()]);
    let cd = bytes.windows(4).position(|w| w == b"PK\x01\x02").unwrap();
    bytes[28..30].copy_from_slice(&4u16.to_le_bytes());
    bytes.splice(40..40, [1, 0, 0, 0]);
    let end = bytes.len() - 22;
    bytes[end + 16..end + 20].copy_from_slice(&((cd + 4) as u32).to_le_bytes());
    assert!(Fixture::bytes(&bytes)
        .import(&Limits::default(), None)
        .is_err());
}
#[test]
fn repeated_end_records_hidden_in_a_comment_are_rejected() {
    let mut bytes = build(&[page()]);
    let end = bytes.len() - 22;
    let second = bytes[end..].to_vec();
    bytes[end + 20..end + 22].copy_from_slice(&22u16.to_le_bytes());
    bytes.extend(second);
    assert!(Fixture::bytes(&bytes)
        .import(&Limits::default(), None)
        .is_err());
}
#[test]
fn valid_directories_and_data_descriptor_flags_work_without_creating_site_paths() {
    let mut dir = Item::new("assets/", "");
    dir.mode = 0o040755;
    let mut asset = Item::new("assets/app.js", "console.log(1)").deflated();
    asset.flags = 8;
    let f = Fixture::new(&[
        Item::new(
            "index.html",
            "\u{feff}<title>Hi</title><script src='assets/app.js'></script>",
        ),
        dir,
        asset,
    ]);
    let site = f.import(&Limits::default(), None).unwrap();
    assert_eq!(site.files.len(), 2);
    assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 2);
    assert!(!f.staging.join("assets").exists());
    assert_eq!(site.title.as_deref(), Some("Hi"));
}
#[test]
fn skipped_html_is_never_inflated_during_root_detection() {
    let mut secret = Item::new(".git/index.html", "<p>secret</p>");
    secret.crc = Some(0);
    let mut junk = Item::new("__MACOSX/index.html", "<p>junk</p>");
    junk.crc = Some(0);
    assert!(Fixture::new(&[page(), secret, junk])
        .import(&Limits::default(), None)
        .is_ok());
}
#[test]
fn missing_references_on_secondary_pages_and_inside_css_are_checked() {
    for item in [
        Item::new("about.html", "<script src='missing.js'></script>"),
        Item::new("a.css", "@import 'missing.css';"),
    ] {
        let f = Fixture::new(&[page(), item]);
        assert!(matches!(
            f.import(&Limits::default(), None),
            Err(ImportError::MissingFiles(_))
        ));
        assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 0);
    }
}
#[test]
fn module_detection_handles_comments_multiline_imports_and_import_meta() {
    for text in [
        "import { x }\n from 'react';",
        "/* a */ import /* b */ 'react';",
        "const x=import('react');",
    ] {
        let f = Fixture::new(&[Item::new(
            "index.html",
            format!("<script type='module'>{text}</script>"),
        )]);
        assert!(
            matches!(
                f.import(&Limits::default(), None),
                Err(ImportError::SourceOnly)
            ),
            "{text}"
        );
    }
    for text in [
        "// import x from 'react'\nconsole.log(1)",
        "const example=\"import x from 'react'\";",
        "console.log(import.meta.url)",
    ] {
        assert!(
            Fixture::new(&[Item::new(
                "index.html",
                format!("<script type='module'>{text}</script>")
            )])
            .import(&Limits::default(), None)
            .is_ok(),
            "{text}"
        );
    }
}
#[test]
fn public_is_a_distribution_only_when_no_other_built_candidate_exists() {
    let items = [
        Item::new("package.json", "{}"),
        Item::new("src/app.tsx", "source"),
        Item::new("public/index.html", "<p>public</p>"),
    ];
    assert_eq!(
        Fixture::new(&items)
            .import(&Limits::default(), None)
            .unwrap()
            .root_dir,
        "public"
    );
    let mut items = items.to_vec();
    items.push(Item::new("dist/index.html", "<p>built</p>"));
    assert_eq!(
        Fixture::new(&items)
            .import(&Limits::default(), None)
            .unwrap()
            .root_dir,
        "dist"
    );
}

#[test]
fn a_truncated_deflate_stream_fails_even_when_its_output_size_and_crc_match() {
    let mut bytes = build(&[page().deflated()]);
    let cd = bytes.windows(4).position(|w| w == b"PK\x01\x02").unwrap();
    let compressed = u32::from_le_bytes(bytes[18..22].try_into().unwrap());
    bytes.remove(cd - 1);
    let cd = cd - 1;
    let end = bytes.len() - 22;
    bytes[18..22].copy_from_slice(&(compressed - 1).to_le_bytes());
    bytes[cd + 20..cd + 24].copy_from_slice(&(compressed - 1).to_le_bytes());
    bytes[end + 16..end + 20].copy_from_slice(&(cd as u32).to_le_bytes());
    assert!(Fixture::bytes(&bytes)
        .import(&Limits::default(), None)
        .is_err());
}
#[test]
fn existing_staged_files_are_never_overwritten_and_errors_preserve_them() {
    let f = Fixture::new(&[Item::new(
        "index.html",
        "<script src='missing.js'></script>",
    )]);
    let existing = f.staging.join("existing");
    fs::write(&existing, "keep").unwrap();
    assert!(f.import(&Limits::default(), None).is_err());
    assert_eq!(fs::read_to_string(existing).unwrap(), "keep");
    assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 1);
}

#[test]
fn files_beside_the_chosen_distribution_are_silently_excluded() {
    let f = Fixture::new(&[
        Item::new("package.json", "{}"),
        Item::new("src/app.tsx", "source"),
        Item::new(".env", "secret"),
        Item::new("dist/index.html", "<p>built</p>"),
    ]);
    let site = f.import(&Limits::default(), None).unwrap();
    assert_eq!(site.root_dir, "dist");
    assert_eq!(site.files.len(), 1);
    assert!(site.report.skipped.is_empty());
    assert!(site.report.warnings.is_empty());
    let mut names = fs::read_dir(&f.dir)
        .unwrap()
        .map(|e| e.unwrap().file_name().into_string().unwrap())
        .collect::<Vec<_>>();
    names.sort();
    assert_eq!(names, vec!["site.zip", "staging"]);
}
#[test]
fn extract_enforces_running_budgets_before_writing_an_over_limit_chunk() {
    let f = Fixture::new(&[page(), Item::new("a.js", vec![0; 32 * 1024]).deflated()]);
    let mut archive = zip::Archive::open(&f.archive, &Limits::default()).unwrap();
    for limits in [
        Limits {
            file_bytes: 1024,
            ..Limits::default()
        },
        Limits {
            content_bytes: 1024,
            ..Limits::default()
        },
    ] {
        let mut bytes = Vec::new();
        let mut total = 0;
        assert!(matches!(
            archive.extract(1, &limits, &mut total, &mut bytes),
            Err(ImportError::Limit(_))
        ));
        assert!(bytes.is_empty());
    }
}
#[test]
fn the_largest_standard_zip_comment_is_supported() {
    let mut bytes = build(&[page()]);
    let len = bytes.len();
    bytes[len - 2..].copy_from_slice(&u16::MAX.to_le_bytes());
    bytes.extend(vec![b'x'; usize::from(u16::MAX)]);
    assert!(Fixture::bytes(&bytes)
        .import(&Limits::default(), None)
        .is_ok());
}

#[test]
fn css_imports_are_stylesheets_even_without_an_extension() {
    for html in [
        "<style>@import 'theme';</style>",
        "<style>@import url('theme');</style>",
    ] {
        let f = Fixture::new(&[Item::new("index.html", html)]);
        assert!(matches!(
            f.import(&Limits::default(), None),
            Err(ImportError::MissingFiles(_))
        ));
    }
    let f = Fixture::new(&[Item::new(
        "index.html",
        "<style>p{background:url('image.css')}</style>",
    )]);
    assert_eq!(
        f.import(&Limits::default(), None)
            .unwrap()
            .report
            .missing
            .len(),
        1
    );
}
#[test]
fn archives_that_record_permissions_without_a_file_type_import() {
    let mut index = page();
    index.mode = 0o600;
    let mut script = Item::new("a.js", "1");
    script.mode = 0o644;
    assert!(Fixture::new(&[index, script])
        .import(&Limits::default(), None)
        .is_ok());
}
#[test]
fn a_symlink_is_named_as_a_shortcut_in_the_message() {
    let mut link = Item::new("link.html", "../../etc/passwd");
    link.mode = 0o120777;
    let error = Fixture::new(&[page(), link])
        .import(&Limits::default(), None)
        .unwrap_err();
    assert!(error.to_string().contains("shortcut"), "{error}");
}
#[test]
fn a_page_built_by_javascript_imports_with_a_warning() {
    let spa = Fixture::new(&[
        Item::new(
            "index.html",
            r#"<title>App</title><div id="root"></div><noscript>Enable JavaScript</noscript><script type="module" src="app.js"></script>"#,
        ),
        Item::new("app.js", "document.body.append('hi')"),
    ])
    .import(&Limits::default(), None)
    .unwrap();
    assert_eq!(spa.report.warnings.len(), 1);
    assert!(spa.report.warnings[0].contains("JavaScript"));
    let written = Fixture::new(&[page(), Item::new("a.js", "1")])
        .import(&Limits::default(), None)
        .unwrap();
    assert!(written.report.warnings.is_empty());
}

#[test]
fn deeply_nested_pages_are_rejected_before_assigning_ids() {
    for depth in [513, 100_000] {
        let started = std::time::Instant::now();
        let html = format!("{}text{}", "<div>".repeat(depth), "</div>".repeat(depth));
        let f = Fixture::new(&[Item::new("index.html", html.as_bytes())]);
        let error = f.import(&Limits::default(), None).unwrap_err().to_string();
        assert_eq!(error, "index.html is nested too deeply to edit safely. Export the website again or simplify that page.");
        assert_eq!(fs::read_dir(&f.staging).unwrap().count(), 0);
        eprintln!("rejected import depth={depth}: {:?}", started.elapsed());
        assert!(started.elapsed() < std::time::Duration::from_secs(5));
    }
}

#[test]
fn unicode_lowercase_collisions_are_rejected_in_archives() {
    for names in [["Ü.html", "ü.html"], ["K.html", "k.html"]] {
        let mut one = Item::new(names[0], "<p>one</p>");
        let mut two = Item::new(names[1], "<p>two</p>");
        one.flags = 0x800;
        two.flags = 0x800;
        let f = Fixture::new(&[page(), one, two]);
        assert!(
            matches!(
                f.import(&Limits::default(), None),
                Err(ImportError::UnsafePath(_))
            ),
            "accepted {names:?}"
        );
    }
}
