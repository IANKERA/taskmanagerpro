-- M20: Custom fields per project
CREATE TABLE custom_field_definitions (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    field_type  VARCHAR(16) NOT NULL,   -- TEXT, NUMBER, DATE, SELECT
    options     TEXT,                     -- JSON array for SELECT type, e.g. ["S","M","L","XL"]
    required    BOOLEAN NOT NULL DEFAULT false,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_custom_field UNIQUE (project_id, name)
);

CREATE TABLE custom_field_values (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    field_id    BIGINT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    value       TEXT,
    CONSTRAINT uq_field_value UNIQUE (task_id, field_id)
);

CREATE INDEX idx_cfv_task ON custom_field_values(task_id);
CREATE INDEX idx_cfv_field ON custom_field_values(field_id);
