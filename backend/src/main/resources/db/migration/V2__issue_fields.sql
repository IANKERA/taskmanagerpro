-- M2: turn Tasks into Issues.
--   * Rename user_id → assignee_id (assignee is now nullable, like Jira).
--   * Add reporter_id (NOT NULL).
--   * Add issue_key (e.g. "DEMO-1") — unique per project, generated from project.next_issue_num.
--   * Add issue_type (STORY/TASK/BUG/EPIC), default TASK.

-- 1. Rename user_id → assignee_id.
ALTER TABLE tasks RENAME COLUMN user_id TO assignee_id;

-- 2. Add reporter_id, then backfill before locking NOT NULL.
ALTER TABLE tasks ADD COLUMN reporter_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
UPDATE tasks t
SET reporter_id = COALESCE(
    t.assignee_id,
    (SELECT p.lead_user_id FROM projects p WHERE p.id = t.project_id),
    (SELECT id FROM users ORDER BY id LIMIT 1)
);
ALTER TABLE tasks ALTER COLUMN reporter_id SET NOT NULL;

-- 3. Add issue_type, default TASK.
ALTER TABLE tasks ADD COLUMN issue_type VARCHAR(16) NOT NULL DEFAULT 'TASK';

-- 4. Add issue_key (nullable so we can backfill).
ALTER TABLE tasks ADD COLUMN issue_key VARCHAR(32);

-- 5. Backfill issue_key for existing rows: PROJ-1, PROJ-2 in order within each project.
--    Also bump project.next_issue_num past the highest used number.
WITH numbered AS (
    SELECT id, project_id,
           ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) AS n
    FROM tasks
)
UPDATE tasks t
SET issue_key = p.project_key || '-' || numbered.n
FROM numbered, projects p
WHERE t.id = numbered.id
  AND p.id = numbered.project_id;

UPDATE projects p
SET next_issue_num = COALESCE(
    (SELECT MAX(numbered.n) + 1
     FROM (SELECT project_id,
                  ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY id) AS n
           FROM tasks) numbered
     WHERE numbered.project_id = p.id),
    1
);

-- 6. Lock issue_key down: NOT NULL + UNIQUE + indexed.
ALTER TABLE tasks ALTER COLUMN issue_key SET NOT NULL;
ALTER TABLE tasks ADD CONSTRAINT uq_tasks_issue_key UNIQUE (issue_key);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_reporter ON tasks(reporter_id);
