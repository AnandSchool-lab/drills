-- Daily Drills - database schema
-- Paste this whole file into the D1 console and run it once.
-- Safe to run again: every statement is IF NOT EXISTS.

-- One row per child, per day, per block, once they press Check.
CREATE TABLE IF NOT EXISTS results (
  kid    TEXT NOT NULL,
  date   TEXT NOT NULL,          -- YYYY-MM-DD
  block  TEXT NOT NULL,          -- recap | math | think | eng | weekly | monthly
  got    INTEGER NOT NULL,
  total  INTEGER NOT NULL,
  secs   INTEGER NOT NULL,
  at     TEXT NOT NULL,          -- ISO timestamp the server received it
  PRIMARY KEY (kid, date, block)
);

-- Every question they got wrong. This is what the Recap and the
-- monthly test are built from, so it is kept in full.
CREATE TABLE IF NOT EXISTS misses (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  kid   TEXT NOT NULL,
  date  TEXT NOT NULL,
  block TEXT NOT NULL,
  q     TEXT NOT NULL,
  gave  TEXT,
  want  TEXT,
  kind  TEXT                     -- num | word
);
CREATE INDEX IF NOT EXISTS misses_kid_date ON misses (kid, date);

-- Exactly one row per child per block, overwritten by every ping.
-- This table never grows: two children times five blocks.
CREATE TABLE IF NOT EXISTS live (
  kid      TEXT NOT NULL,
  block    TEXT NOT NULL,
  date     TEXT NOT NULL,
  answered INTEGER NOT NULL,
  total    INTEGER NOT NULL,
  mins     INTEGER NOT NULL,
  stuck    TEXT,                 -- JSON: which questions are sitting blank or churning
  seen_at  TEXT NOT NULL,        -- so the dashboard can say "last seen 3 minutes ago"
  PRIMARY KEY (kid, block)
);

-- Their writing, kept as text when typed. Pencil pages live in R2.
CREATE TABLE IF NOT EXISTS writing (
  kid    TEXT NOT NULL,
  date   TEXT NOT NULL,
  prompt TEXT,
  text   TEXT,
  at     TEXT NOT NULL,
  PRIMARY KEY (kid, date)
);

-- A parent asking for a day to be done again.
CREATE TABLE IF NOT EXISTS retake (
  kid   TEXT NOT NULL,
  date  TEXT NOT NULL,
  asked TEXT NOT NULL,
  done  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kid, date)
);

-- An index of what pencil work is in R2, so the nightly export and the
-- dashboard can find it without listing the whole bucket.
CREATE TABLE IF NOT EXISTS ink (
  kid    TEXT NOT NULL,
  date   TEXT NOT NULL,
  block  TEXT NOT NULL,
  pad    TEXT NOT NULL,          -- which problem on the sheet
  okey   TEXT NOT NULL,          -- the R2 object key
  bytes  INTEGER NOT NULL,
  mode   TEXT NOT NULL,          -- ink | type
  at     TEXT NOT NULL,
  PRIMARY KEY (kid, date, block, pad)
);
CREATE INDEX IF NOT EXISTS ink_kid_date ON ink (kid, date);
