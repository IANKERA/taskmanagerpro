-- M1: Introduce Project + ProjectMembership, backfill existing tasks into an INBOX project.

CREATE TABLE projects (
    id              BIGSERIAL PRIMARY KEY,
    project_key     VARCHAR(16) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    lead_user_id    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    next_issue_num  BIGINT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_memberships (
    id           BIGSERIAL PRIMARY KEY,
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_role VARCHAR(16) NOT NULL,
    joined_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX idx_pm_user    ON project_memberships(user_id);
CREATE INDEX idx_pm_project ON project_memberships(project_id);

-- Add project_id to tasks (nullable first so we can backfill).
ALTER TABLE tasks ADD COLUMN project_id BIGINT REFERENCES projects(id) ON DELETE RESTRICT;

-- Create the INBOX project (lead = first user if any).
INSERT INTO projects (project_key, name, description, lead_user_id)
VALUES (
    'INB',
    'Inbox',
    'Auto-created bucket for tasks that existed before projects were introduced.',
    (SELECT id FROM users ORDER BY id LIMIT 1)
);

-- Make every existing user a MEMBER of INBOX so they can keep seeing their tasks.
INSERT INTO project_memberships (project_id, user_id, project_role)
SELECT (SELECT id FROM projects WHERE project_key = 'INB'), u.id,
       CASE WHEN u.role = 'ROLE_ADMIN' THEN 'ADMIN' ELSE 'MEMBER' END
FROM users u;

-- Backfill every existing task into INBOX.
UPDATE tasks
SET project_id = (SELECT id FROM projects WHERE project_key = 'INB')
WHERE project_id IS NULL;

-- Now lock it down.
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
CREATE INDEX idx_tasks_project ON tasks(project_id);
