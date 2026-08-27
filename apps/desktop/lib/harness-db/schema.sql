CREATE TABLE IF NOT EXISTS ask_thread (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ask_thread_updated_at_idx
  ON ask_thread (updated_at DESC);

CREATE TABLE IF NOT EXISTS ask_turn (
  id TEXT PRIMARY KEY NOT NULL,
  thread_id TEXT NOT NULL REFERENCES ask_thread(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  intent TEXT,
  planned_queries TEXT,
  used_fallback_plan INTEGER NOT NULL DEFAULT 0,
  groups TEXT,
  total_matches INTEGER,
  missing_sources TEXT,
  search_stage TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ask_turn_thread_created_idx
  ON ask_turn (thread_id, created_at);
