-- M5: Sprints, story points, parent/subtask links.

CREATE TABLE sprints (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(128) NOT NULL,
    goal        TEXT,
    state       VARCHAR(16) NOT NULL DEFAULT 'PLANNED',  -- PLANNED / ACTIVE / CLOSED
    start_date  DATE,
    end_date    DATE,
    started_at  TIMESTAMP,
    closed_at   TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sprint_state CHECK (state IN ('PLANNED','ACTIVE','CLOSED'))
);
CREATE INDEX idx_sprints_project ON sprints(project_id);

-- Postgres partial unique index: at most one ACTIVE sprint per project.
CREATE UNIQUE INDEX uq_one_active_sprint_per_project
    ON sprints(project_id) WHERE state = 'ACTIVE';

ALTER TABLE tasks
    ADD COLUMN sprint_id    BIGINT REFERENCES sprints(id) ON DELETE SET NULL,
    ADD COLUMN parent_id    BIGINT REFERENCES tasks(id)   ON DELETE SET NULL,
    ADD COLUMN story_points INTEGER;

CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
