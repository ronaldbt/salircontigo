CREATE TABLE IF NOT EXISTS watch_rooms (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  host_name TEXT NOT NULL,
  guest_name TEXT NOT NULL DEFAULT '',
  guest_token TEXT NOT NULL DEFAULT '',
  generation INTEGER NOT NULL DEFAULT 0,
  sharer TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS watch_rooms_host_idx ON watch_rooms (host_id, created_at DESC);

CREATE TABLE IF NOT EXISTS watch_ice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL REFERENCES watch_rooms (id) ON DELETE CASCADE,
  generation INTEGER NOT NULL,
  sender TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS watch_ice_room_idx ON watch_ice (room_id, generation);

CREATE TABLE IF NOT EXISTS watch_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES watch_rooms (id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS watch_messages_room_idx ON watch_messages (room_id, created_at);
