CREATE TABLE IF NOT EXISTS issue_templates (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(128) NOT NULL,
    description TEXT,
    issue_type  VARCHAR(16) NOT NULL DEFAULT 'TASK',
    priority    VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    body_template TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    UNIQUE(project_id, name)
);
