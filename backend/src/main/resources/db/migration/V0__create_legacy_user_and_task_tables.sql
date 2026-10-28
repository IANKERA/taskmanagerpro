-- Bootstrap the tables that predate Flyway migrations.
-- Existing non-empty databases are baselined at version 0 and skip this migration.

CREATE TABLE users (
    id       BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role     VARCHAR(255) NOT NULL
);

CREATE TABLE tasks (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      VARCHAR(255) NOT NULL,
    priority    VARCHAR(255) NOT NULL,
    due_date    TIMESTAMP,
    user_id     BIGINT REFERENCES users(id)
);
