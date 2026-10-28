CREATE TABLE recurring_rules (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by_id   BIGINT       NOT NULL REFERENCES users(id),
    name            VARCHAR(128) NOT NULL,
    title_template  VARCHAR(256) NOT NULL,
    description     TEXT,
    issue_type      VARCHAR(32)  NOT NULL DEFAULT 'TASK',
    priority        VARCHAR(32)  NOT NULL DEFAULT 'MEDIUM',
    assignee_username VARCHAR(64),
    cron_expression VARCHAR(64)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    last_run_at     TIMESTAMP,
    next_run_at     TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_project ON recurring_rules(project_id);
CREATE INDEX idx_recurring_next    ON recurring_rules(next_run_at) WHERE enabled = TRUE;
