-- Add email column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Notification preferences per user
CREATE TABLE IF NOT EXISTS notification_preferences (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notify_assigned     BOOLEAN NOT NULL DEFAULT TRUE,
    notify_mentioned    BOOLEAN NOT NULL DEFAULT TRUE,
    notify_watching     BOOLEAN NOT NULL DEFAULT TRUE,
    notify_comment      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id)
);
