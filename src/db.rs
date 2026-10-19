//! Thin helpers over raw SQL, in the style of the other Loco apps on this server.

use sea_orm::{ConnectionTrait, DbBackend, DbErr, QueryResult, Statement, Value};

pub fn stmt(sql: &str, values: impl IntoIterator<Item = Value>) -> Statement {
    Statement::from_sql_and_values(DbBackend::Sqlite, sql, values)
}

pub async fn exec<C: ConnectionTrait>(db: &C, sql: &str, values: impl IntoIterator<Item = Value>) -> Result<u64, DbErr> {
    Ok(db.execute_raw(stmt(sql, values)).await?.rows_affected())
}

pub async fn insert<C: ConnectionTrait>(db: &C, sql: &str, values: impl IntoIterator<Item = Value>) -> Result<i64, DbErr> {
    let row = db
        .query_one_raw(stmt(&format!("{sql} RETURNING id"), values))
        .await?
        .ok_or_else(|| DbErr::Custom("insert returned no row".to_owned()))?;
    row.try_get("", "id")
}

pub async fn one<C: ConnectionTrait>(db: &C, sql: &str, values: impl IntoIterator<Item = Value>) -> Result<Option<QueryResult>, DbErr> {
    db.query_one_raw(stmt(sql, values)).await
}

pub async fn all<C: ConnectionTrait>(db: &C, sql: &str, values: impl IntoIterator<Item = Value>) -> Result<Vec<QueryResult>, DbErr> {
    db.query_all_raw(stmt(sql, values)).await
}

pub fn now() -> i64 {
    chrono::Utc::now().timestamp()
}
