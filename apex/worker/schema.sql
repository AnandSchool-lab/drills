-- APEX Expert Drills - database "apex" (separate from the girls' "drills").
-- Paste this whole file into the D1 console for the "apex" database and run it.
-- Safe to run again: every statement is IF NOT EXISTS.

-- Latest copy of each saved item.
--   kind: answers | days | quiz
--   id:   e.g. d1-t1-e1 (an exercise), d3 (a day), w1-4 (a quiz question)
--   data: the JSON the page saved, e.g. {"text":"...","at":1794360016000}
--   at:   the page's own timestamp (ms); a save only replaces a newer-or-equal one
CREATE TABLE IF NOT EXISTS apex_work (
  kind  TEXT    NOT NULL,
  id    TEXT    NOT NULL,
  data  TEXT    NOT NULL,
  at    INTEGER NOT NULL,
  saved TEXT    NOT NULL,          -- ISO time the server received it
  PRIMARY KEY (kind, id)
);

-- Every accepted save, append-only, so no edit erases the one before it.
CREATE TABLE IF NOT EXISTS apex_history (
  n     INTEGER PRIMARY KEY AUTOINCREMENT,
  kind  TEXT    NOT NULL,
  id    TEXT    NOT NULL,
  data  TEXT    NOT NULL,
  at    INTEGER NOT NULL,
  saved TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS apex_history_item ON apex_history (kind, id, n);

-- Handy queries
--   Everything you have written, newest first:
--     SELECT id, json_extract(data,'$.text') AS answer, saved FROM apex_work WHERE kind='answers' ORDER BY at DESC;
--   Every version of one exercise:
--     SELECT n, json_extract(data,'$.text') AS answer, saved FROM apex_history WHERE kind='answers' AND id='d1-t1-e1' ORDER BY n;
--   Days marked complete:
--     SELECT id, saved FROM apex_work WHERE kind='days' AND json_extract(data,'$.done') = 1;
