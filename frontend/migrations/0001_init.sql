CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  invites_created INTEGER NOT NULL DEFAULT 0 CHECK (invites_created >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  kind TEXT NOT NULL CHECK (kind IN ('date', 'sorry')),
  steps TEXT NOT NULL,
  prompts TEXT NOT NULL DEFAULT '[]',
  languages TEXT NOT NULL,
  default_lang TEXT NOT NULL,
  copy TEXT NOT NULL,
  foods TEXT NOT NULL,
  times TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  callmebot_key TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS invites_user_id_idx ON invites (user_id);

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  invite_id TEXT NOT NULL REFERENCES invites (id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  no_attempts INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  food_id TEXT NOT NULL DEFAULT '',
  answers TEXT NOT NULL DEFAULT '[]',
  callmebot_ok INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS responses_invite_created_idx ON responses (invite_id, created_at DESC);
