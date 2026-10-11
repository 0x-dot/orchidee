package main

import (
	"database/sql"

	_ "modernc.org/sqlite"
)

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plants (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  botanical_name TEXT NOT NULL,
  nickname       TEXT NOT NULL DEFAULT '',
  acquired_at    TEXT NOT NULL DEFAULT '',
  public         INTEGER NOT NULL DEFAULT 0,
  copied_from    INTEGER REFERENCES plants(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_plants_user ON plants(user_id);
CREATE INDEX IF NOT EXISTS idx_plants_public ON plants(public);

CREATE TABLE IF NOT EXISTS care_sheets (
  plant_id      INTEGER PRIMARY KEY REFERENCES plants(id) ON DELETE CASCADE,
  origine       TEXT NOT NULL DEFAULT '',
  crescita      TEXT NOT NULL DEFAULT '',
  luce          TEXT NOT NULL DEFAULT '',
  temperatura   TEXT NOT NULL DEFAULT '',
  umidita       TEXT NOT NULL DEFAULT '',
  ventilazione  TEXT NOT NULL DEFAULT '',
  substrato     TEXT NOT NULL DEFAULT '',
  annaffiatura  TEXT NOT NULL DEFAULT '',
  acqua         TEXT NOT NULL DEFAULT '',
  fertilizzazione TEXT NOT NULL DEFAULT '',
  riposo        TEXT NOT NULL DEFAULT '',
  fioritura     TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT ''
);

-- usata nella fase 2 (timeline con foto)
CREATE TABLE IF NOT EXISTS timeline_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id   INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  kind       TEXT NOT NULL DEFAULT 'nota',
  note       TEXT NOT NULL DEFAULT '',
  photo_path TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_timeline_plant ON timeline_entries(plant_id, entry_date);
`

func openDB(file string) (*sql.DB, error) {
	dsn := "file:" + file + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1) // SQLite: una sola scrittura alla volta, semplice e sicuro
	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}
	return db, nil
}
