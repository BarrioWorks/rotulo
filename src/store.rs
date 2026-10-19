//! Files on disk: original archives, content-addressed blobs, release directories and staging.

use std::{
    fmt, fs,
    io::{self, Write},
    os::unix::fs::{DirBuilderExt, OpenOptionsExt, PermissionsExt},
    path::{Path, PathBuf},
};

use rand::RngCore;
use sha2::{Digest, Sha256};

/// SHA-256 of a file body, lowercase hex.
#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct Blob(String);

impl Blob {
    pub fn parse(value: &str) -> Option<Self> {
        (value.len() == 64
            && value
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b)))
        .then(|| Self(value.to_owned()))
    }

    pub fn of(bytes: &[u8]) -> Self {
        Self(hex(&Sha256::digest(bytes)))
    }

    pub fn from_digest(digest: &[u8]) -> Self {
        Self(hex(digest))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Blob {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

pub fn random_token(bytes: usize) -> String {
    let mut buffer = vec![0u8; bytes];
    rand::rngs::OsRng.fill_bytes(&mut buffer);
    hex(&buffer)
}

#[derive(Debug, Clone)]
pub struct Store {
    root: PathBuf,
}

const DIR_MODE: u32 = 0o750;
const PRIVATE_DIR_MODE: u32 = 0o700;
const BLOB_MODE: u32 = 0o440;

impl Store {
    /// Creates the layout and removes staging left behind by a crash.
    pub fn open(root: &Path) -> io::Result<Self> {
        let store = Self {
            root: root.to_path_buf(),
        };
        for dir in ["archives", "blobs", "releases"] {
            create_dir_all(&store.root.join(dir), DIR_MODE)?;
        }
        let tmp = store.root.join("tmp");
        if tmp.exists() {
            fs::remove_dir_all(&tmp)?;
        }
        create_dir_all(&tmp, PRIVATE_DIR_MODE)?;
        Ok(store)
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// A fresh 0700 directory under `tmp/` with an unpredictable name, removed when dropped.
    pub fn staging(&self) -> io::Result<Staging> {
        let path = self.root.join("tmp").join(random_token(16));
        fs::DirBuilder::new().mode(PRIVATE_DIR_MODE).create(&path)?;
        Ok(Staging { path: Some(path) })
    }

    pub fn blob_path(&self, blob: &Blob) -> PathBuf {
        self.root.join("blobs").join(&blob.0[..2]).join(&blob.0)
    }

    pub fn read(&self, blob: &Blob) -> io::Result<Vec<u8>> {
        fs::read(self.blob_path(blob))
    }

    pub fn put_bytes(&self, bytes: &[u8]) -> io::Result<Blob> {
        let blob = Blob::of(bytes);
        let target = self.blob_path(&blob);
        if target.exists() {
            return Ok(blob);
        }
        create_dir_all(target.parent().expect("blob has a parent"), DIR_MODE)?;
        let staged = self
            .root
            .join("tmp")
            .join(format!("blob-{}", random_token(12)));
        {
            let mut file = fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .mode(0o600)
                .open(&staged)?;
            file.write_all(bytes)?;
            file.sync_data()?;
        }
        self.adopt(&staged, &blob)?;
        Ok(blob)
    }

    /// Moves a staged file whose hash is already known into the blob store.
    pub fn adopt(&self, staged: &Path, blob: &Blob) -> io::Result<()> {
        let target = self.blob_path(blob);
        if target.exists() {
            return fs::remove_file(staged);
        }
        create_dir_all(target.parent().expect("blob has a parent"), DIR_MODE)?;
        fs::set_permissions(staged, fs::Permissions::from_mode(BLOB_MODE))?;
        fs::rename(staged, target)
    }

    pub fn archive_path(&self, project_pid: &str, sha256: &str) -> PathBuf {
        self.root
            .join("archives")
            .join(project_pid)
            .join(format!("{sha256}.zip"))
    }

    pub fn keep_archive(
        &self,
        staged: &Path,
        project_pid: &str,
        sha256: &str,
    ) -> io::Result<PathBuf> {
        let target = self.archive_path(project_pid, sha256);
        create_dir_all(
            target.parent().expect("archive has a parent"),
            PRIVATE_DIR_MODE,
        )?;
        fs::set_permissions(staged, fs::Permissions::from_mode(0o400))?;
        fs::rename(staged, &target)?;
        Ok(target)
    }

    pub fn releases_dir(&self, project_id: i64) -> PathBuf {
        self.root.join("releases").join(project_id.to_string())
    }

    pub fn release_dir(&self, project_id: i64, number: i64) -> PathBuf {
        self.releases_dir(project_id).join(number.to_string())
    }
}

pub fn create_dir_all(path: &Path, mode: u32) -> io::Result<()> {
    fs::DirBuilder::new()
        .recursive(true)
        .mode(mode)
        .create(path)
}

/// A staging directory that is deleted unless [`Staging::keep`] is called.
#[derive(Debug)]
pub struct Staging {
    path: Option<PathBuf>,
}

impl Staging {
    pub fn path(&self) -> &Path {
        self.path.as_deref().expect("staging is alive")
    }

    pub fn keep(mut self) -> PathBuf {
        self.path.take().expect("staging is alive")
    }
}

impl Drop for Staging {
    fn drop(&mut self) {
        if let Some(path) = self.path.take() {
            if let Err(error) = fs::remove_dir_all(&path) {
                tracing::warn!(%error, path = %path.display(), "staging cleanup failed");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_failed_job_leaves_no_staging_behind() {
        let root = std::env::temp_dir().join(format!("ph-store-{}", random_token(6)));
        let store = Store::open(&root).unwrap();
        let path = {
            let staging = store.staging().unwrap();
            fs::write(staging.path().join("partial"), b"x").unwrap();
            staging.path().to_path_buf()
        };
        assert!(!path.exists());
        assert_eq!(fs::read_dir(root.join("tmp")).unwrap().count(), 0);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn blobs_are_read_only_and_deduplicated() {
        let root = std::env::temp_dir().join(format!("ph-store-{}", random_token(6)));
        let store = Store::open(&root).unwrap();
        let a = store.put_bytes(b"hello").unwrap();
        let b = store.put_bytes(b"hello").unwrap();
        assert_eq!(a, b);
        let mode = fs::metadata(store.blob_path(&a))
            .unwrap()
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o440);
        assert_eq!(store.read(&a).unwrap(), b"hello");
        fs::remove_dir_all(root).unwrap();
    }
}
