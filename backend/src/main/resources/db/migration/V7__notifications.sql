CREATE TABLE notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id     BIGINT REFERENCES tasks(id) ON DELETE CASCADE,
    type        VARCHAR(32) NOT NULL,
    title       VARCHAR(256) NOT NULL,
    message     TEXT,
    issue_key   VARCHAR(32),
    project_key VARCHAR(16),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
