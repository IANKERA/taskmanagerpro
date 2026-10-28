-- M4: Labels (project-scoped) + Watchers (issue ↔ user m2m).

CREATE TABLE labels (
    id          BIGSERIAL PRIMARY KEY,
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(64) NOT NULL,
    color       VARCHAR(16) NOT NULL DEFAULT '#6b7280',  -- hex incl. '#'
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_label_per_project UNIQUE (project_id, name)
);
CREATE INDEX idx_labels_project ON labels(project_id);

CREATE TABLE task_labels (
    task_id  BIGINT NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
    label_id BIGINT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
);
CREATE INDEX idx_task_labels_label ON task_labels(label_id);

CREATE TABLE watchers (
    task_id BIGINT NOT NULL REFERENCES tasks(id)  ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
    since   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id)
);
CREATE INDEX idx_watchers_user ON watchers(user_id);
