use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TABLE users (
                    id INTEGER PRIMARY KEY,
                    pid TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                    name TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER NOT NULL
                );
                CREATE INDEX sessions_user ON sessions(user_id);
                CREATE TABLE projects (
                    id INTEGER PRIMARY KEY,
                    pid TEXT NOT NULL UNIQUE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
                    slug TEXT NOT NULL UNIQUE,
                    revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
                    live_release_id INTEGER REFERENCES releases(id),
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE INDEX projects_user ON projects(user_id, updated_at);
                CREATE TABLE slug_claims (
                    slug TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
                );
                CREATE TABLE imports (
                    id INTEGER PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    archive_path TEXT NOT NULL,
                    archive_sha256 TEXT NOT NULL,
                    archive_bytes INTEGER NOT NULL,
                    file_count INTEGER NOT NULL,
                    content_bytes INTEGER NOT NULL,
                    root_dir TEXT NOT NULL,
                    report_json TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE draft_files (
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    path TEXT NOT NULL CHECK (length(path) BETWEEN 1 AND 1024),
                    blob TEXT NOT NULL CHECK (length(blob) = 64),
                    bytes INTEGER NOT NULL CHECK (bytes >= 0),
                    PRIMARY KEY (project_id, path)
                ) WITHOUT ROWID;
                CREATE TABLE edits (
                    id INTEGER PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    revision INTEGER NOT NULL,
                    kind TEXT NOT NULL,
                    summary_json TEXT NOT NULL,
                    state TEXT NOT NULL CHECK (state IN ('applied', 'undone', 'discarded')),
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL
                );
                CREATE INDEX edits_project_state ON edits(project_id, state, id);
                CREATE TABLE edit_files (
                    edit_id INTEGER NOT NULL REFERENCES edits(id) ON DELETE CASCADE,
                    path TEXT NOT NULL,
                    before_blob TEXT,
                    before_bytes INTEGER,
                    after_blob TEXT,
                    after_bytes INTEGER,
                    PRIMARY KEY (edit_id, path),
                    CHECK (before_blob IS NOT NULL OR after_blob IS NOT NULL),
                    CHECK ((before_blob IS NULL) = (before_bytes IS NULL)),
                    CHECK ((after_blob IS NULL) = (after_bytes IS NULL))
                ) WITHOUT ROWID;
                CREATE TABLE releases (
                    id INTEGER PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    number INTEGER NOT NULL CHECK (number >= 1),
                    draft_revision INTEGER NOT NULL,
                    file_count INTEGER NOT NULL,
                    content_bytes INTEGER NOT NULL,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at INTEGER NOT NULL,
                    UNIQUE (project_id, number)
                );
                CREATE TABLE release_files (
                    release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
                    path TEXT NOT NULL,
                    blob TEXT NOT NULL,
                    bytes INTEGER NOT NULL,
                    draft_blob TEXT NOT NULL,
                    draft_bytes INTEGER NOT NULL,
                    PRIMARY KEY (release_id, path)
                ) WITHOUT ROWID;
                CREATE TABLE domains (
                    id INTEGER PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    hostname TEXT NOT NULL,
                    token TEXT NOT NULL,
                    verified_at INTEGER,
                    last_checked_at INTEGER,
                    last_error TEXT,
                    created_at INTEGER NOT NULL,
                    UNIQUE (project_id, hostname)
                );
                CREATE UNIQUE INDEX domains_verified_hostname ON domains(hostname) WHERE verified_at IS NOT NULL;",
            )
            .await?;
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Err(DbErr::Migration(
            "The initial migration cannot be reverted".to_owned(),
        ))
    }
}
