CREATE TABLE workflow_rules (
    id              BIGSERIAL PRIMARY KEY,
    project_id      BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(128) NOT NULL,
    trigger_field   VARCHAR(64)  NOT NULL,  -- status, issueType, priority, assignee
    trigger_value   VARCHAR(128) NOT NULL,  -- e.g. "DONE", "BUG", "HIGH"
    action_type     VARCHAR(64)  NOT NULL,  -- SET_FIELD, ADD_LABEL, ASSIGN
    action_field    VARCHAR(64),            -- target field for SET_FIELD
    action_value    VARCHAR(256) NOT NULL,  -- value to set / label id / username
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_project ON workflow_rules(project_id);
