-- Preserve filesystem cleanup work across transaction failures and restarts.
CREATE TABLE attachment_cleanup_outbox (
    id              BIGSERIAL PRIMARY KEY,
    storage_path    VARCHAR(512) NOT NULL UNIQUE,
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error      VARCHAR(128)
);

CREATE INDEX idx_attachment_cleanup_due
    ON attachment_cleanup_outbox(next_attempt_at, id);
