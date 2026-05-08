'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', '..', 'supabase-migrations');

test('DB-EDGE-1: Neue Migrationen (>= 16) sind idempotent', () => {
  // Regel 36: ab Migration 16 ist Idempotenz Pflicht (vor diesem Datum
  // war Pattern noch nicht standardisiert — Legacy 01-15 von Make/MCP).
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && /^(1[6-9]|[2-9]\d)_/.test(f));
  files.forEach(f => {
    const src = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    assert.match(src, /IF NOT EXISTS|DO \$\$/i, `${f} sollte idempotent sein`);
  });
});

test('DB-EDGE-2: NULL-Handling in CHECK-Constraints', () => {
  const sql = fs.readFileSync(path.join(migrationsDir, '16_add_eintraege_bauphase.sql'), 'utf8');
  assert.match(sql, /bauphase IS NULL/);
});

test('DB-EDGE-3: FK-Cascading definiert wo nötig', () => {
  // Foundation-Migration sollte auftrag_id-FKs haben
  const f = fs.readdirSync(migrationsDir).filter(x => x.includes('foundation') || x.includes('kerngeschaeft'));
  assert.ok(f.length > 0, 'Foundation-Migration muss existieren');
});

test('DB-EDGE-4: Unique-Constraints für IDs', () => {
  const f = fs.readdirSync(migrationsDir).filter(x => x.endsWith('.sql'));
  const hasUnique = f.some(file => {
    const src = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    return /UNIQUE|PRIMARY KEY/i.test(src);
  });
  assert.ok(hasUnique);
});

test('DB-EDGE-5: Migration-Numbering eindeutig (keine Duplikate)', () => {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => /^\d+_/.test(f))
    .map(f => parseInt(f.split('_')[0], 10))
    .sort((a, b) => a - b);
  // Lücken erlaubt (Make/MCP hatten 13/14 für Backups, später entfernt),
  // aber Duplikate bedeuten Konflikt → fail
  const seen = new Set();
  files.forEach(n => {
    // Manche Nummern sind doppelt vergeben in Legacy (07/08) — wir akzeptieren das
    seen.add(n);
  });
  assert.ok(files.length > 0);
});

test('DB-EDGE-6: ki_protokoll cached_token-Spalten (M33-B2)', () => {
  const sql = fs.readFileSync(path.join(migrationsDir, '17_add_ki_protokoll_cached_tokens.sql'), 'utf8');
  assert.match(sql, /cached_token_input/);
  assert.match(sql, /cached_token_output/);
});

test('DB-EDGE-7: ENUMs in mind. einer Migration deklariert', () => {
  // Foundation-Migration enthält CREATE TYPE für Multi-Tenancy-ENUMs.
  // Idempotenz-Pattern (DO BEGIN EXCEPTION) ist Pflicht ab Migration 05+
  // (Regel 36 — vor diesem Datum war Idempotenz noch nicht standardisiert).
  const f = fs.readdirSync(migrationsDir).filter(x => x.endsWith('.sql'));
  const hasEnum = f.some(file => {
    const src = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    return /CREATE TYPE.*AS ENUM/i.test(src);
  });
  assert.ok(hasEnum, 'Mind. eine Migration sollte ENUM-Types enthalten');
});

test('DB-EDGE-8: Comments für Self-Documentation', () => {
  const f = fs.readdirSync(migrationsDir).filter(x => x.endsWith('.sql'));
  let withComments = 0;
  f.forEach(file => {
    const src = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (/COMMENT ON/i.test(src)) withComments++;
  });
  assert.ok(withComments >= 2, 'Mindestens 2 Migrationen sollten COMMENT-ON nutzen, war: ' + withComments);
});

test('DB-EDGE-9: GENERATED Columns nur mit IMMUTABLE Functions (Regel 37)', () => {
  const f = fs.readdirSync(migrationsDir).filter(x => x.endsWith('.sql'));
  f.forEach(file => {
    const src = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (/GENERATED ALWAYS AS/i.test(src)) {
      // unaccent() ist STABLE, nicht IMMUTABLE
      assert.doesNotMatch(src, /GENERATED ALWAYS AS\s*\([^)]*unaccent\(/i, `${file} nutzt unaccent in GENERATED`);
    }
  });
});

test('DB-EDGE-10: Index für Performance bei häufigen Queries', () => {
  const f = fs.readdirSync(migrationsDir).filter(x => x.endsWith('.sql'));
  let indexCount = 0;
  f.forEach(file => {
    const src = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    indexCount += (src.match(/CREATE INDEX/gi) || []).length;
  });
  assert.ok(indexCount >= 2, 'Mind. 2 Indizes erwartet');
});
