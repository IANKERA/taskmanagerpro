-- Task maps these Hibernate-managed timestamps, but the original tasks table
-- and subsequent migrations did not create the corresponding columns.
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
