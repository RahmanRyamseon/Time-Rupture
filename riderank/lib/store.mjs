// Tiny JSON-file store. Everything lives in memory and is flushed to disk
// (atomically: write temp file, then rename) shortly after each change.
// Good enough for a single-process prototype; swap for Postgres/SQLite at scale.
import fs from 'node:fs';
import path from 'node:path';

const EMPTY = () => ({ cars: {}, votes: {}, media: {}, bookings: {}, reports: {} });

export function createStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let data = EMPTY();
  if (fs.existsSync(file)) {
    data = { ...EMPTY(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  }
  let timer = null;
  let version = 1;

  function flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, file);
  }

  return {
    data,
    get version() { return version; },
    /** Mark data as changed and schedule a write. */
    save() {
      version++;
      if (!timer) timer = setTimeout(flush, 250);
    },
    flush,
  };
}
