-- M3: Comments + activity log for issues.

CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body        TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_comments_task ON comments(task_id);

CREATE TABLE activity_log (
    id           BIGSERIAL PRIMARY KEY,
    task_id      BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    actor_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(32) NOT NULL,  -- CREATED / FIELD_CHANGED / COMMENTED / ASSIGNED / UNASSIGNED
    field        VARCHAR(32),
    old_value    TEXT,
    new_value    TEXT,
    message      TEXT,
    at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_activity_task ON activity_log(task_id);
CREATE INDEX idx_activity_at   ON activity_log(at);
