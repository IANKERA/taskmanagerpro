-- Preserve child issues and task records when their parent or assignee is deleted.
DO $migration$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'tasks'::regclass
          AND c.confrelid = 'tasks'::regclass
          AND c.contype = 'f'
          AND a.attname = 'parent_id'
    LOOP
        EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE tasks
        ADD CONSTRAINT tasks_parent_id_fkey
            FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE SET NULL;

    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'tasks'::regclass
          AND c.confrelid = 'users'::regclass
          AND c.contype = 'f'
          AND a.attname = 'assignee_id'
    LOOP
        EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE tasks
        ADD CONSTRAINT tasks_assignee_id_fkey
            FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;

    -- Reporter attribution is required and must remain attached to its issue.
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'tasks'::regclass
          AND c.confrelid = 'users'::regclass
          AND c.contype = 'f'
          AND a.attname = 'reporter_id'
    LOOP
        EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    ALTER TABLE tasks
        ADD CONSTRAINT tasks_reporter_id_fkey
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE RESTRICT;
END;
$migration$;
