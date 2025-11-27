CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY NOT NULL GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    app_id TEXT NOT NULL UNIQUE,
    client_id TEXT NOT NULL UNIQUE,
    client_secret TEXT NOT NULL,
    signing_secret TEXT NOT NULL,
    access_token TEXT
);
CREATE INDEX IF NOT EXISTS idx_workflows_app_id ON workflows (app_id);

CREATE TABLE IF NOT EXISTS config_tokens (
    id INTEGER PRIMARY KEY NOT NULL GENERATED ALWAYS AS IDENTITY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at REAL NOT NULL,
    user_id TEXT NOT NULL
);

-- all timestamps are in ms
