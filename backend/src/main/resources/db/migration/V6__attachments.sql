CREATE TABLE attachments (
    id            BIGSERIAL PRIMARY KEY,
    task_id       BIGINT       NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploader_id   BIGINT       NOT NULL REFERENCES users(id),
    filename      VARCHAR(255) NOT NULL,
    content_type  VARCHAR(128),
    size_bytes    BIGINT       NOT NULL,
    storage_path  VARCHAR(512) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_task ON attachments(task_id);
