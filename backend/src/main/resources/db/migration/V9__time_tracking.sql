-- M19: Time tracking — log hours spent on issues
CREATE TABLE time_logs (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minutes     INT NOT NULL CHECK (minutes > 0),
    description TEXT,
    logged_at   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_logs_task ON time_logs(task_id);
CREATE INDEX idx_time_logs_user ON time_logs(user_id);

-- Add estimated minutes column to tasks
ALTER TABLE tasks ADD COLUMN estimate_minutes INT;
