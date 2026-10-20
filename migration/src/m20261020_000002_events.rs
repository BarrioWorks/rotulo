use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            "CREATE TABLE events (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                project_id INTEGER,
                kind TEXT NOT NULL CHECK(kind IN ('signup','signin','import_ok','import_failed','first_edit','publish','returned')),
                detail TEXT CHECK(detail IS NULL OR length(detail) <= 40),
                created_at INTEGER NOT NULL
            );
            CREATE INDEX events_kind_created ON events(kind, created_at);
            CREATE INDEX events_user ON events(user_id);
            CREATE UNIQUE INDEX events_first_edit ON events(project_id) WHERE kind = 'first_edit';
            CREATE UNIQUE INDEX events_returned_day ON events(user_id, (created_at / 86400)) WHERE kind = 'returned';"
        ).await?;
        Ok(())
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE events")
            .await?;
        Ok(())
    }
}
