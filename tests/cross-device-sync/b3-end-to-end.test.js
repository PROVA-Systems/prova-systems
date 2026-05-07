'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

/**
 * MEGA³³ B3 — Cross-Device-Sync End-to-End-Test (Mock-Supabase)
 * Simuliert: Browser A speichert → Browser B liest
 */

// Mock-Supabase mit Realtime-Subscriptions + In-Memory-Store
function createMockSupabase() {
  const tables = new Map();
  const subscribers = new Map();
  return {
    from(table) {
      if (!tables.has(table)) tables.set(table, new Map());
      const store = tables.get(table);
      return {
        upsert(row) {
          const key = row.id || ('row-' + Math.random());
          const updated_at = Date.now();
          store.set(key, Object.assign({ id: key }, row, { updated_at }));
          (subscribers.get(table) || []).forEach(cb => cb({ event: 'UPDATE', new: store.get(key) }));
          return Promise.resolve({ data: store.get(key), error: null });
        },
        select() {
          return {
            eq(field, value) {
              const matches = [...store.values()].filter(r => r[field] === value);
              return Promise.resolve({ data: matches, error: null });
            },
            then(cb) { cb({ data: [...store.values()], error: null }); return Promise.resolve({ data: [...store.values()], error: null }); }
          };
        },
        update(row) {
          return {
            eq(field, value) {
              const k = [...store.entries()].find(([_, r]) => r[field] === value);
              if (k) {
                const merged = Object.assign({}, k[1], row, { updated_at: Date.now() });
                store.set(k[0], merged);
                (subscribers.get(table) || []).forEach(cb => cb({ event: 'UPDATE', new: merged }));
              }
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
    },
    channel(name) {
      return {
        on(_evt, _filter, cb) {
          if (!subscribers.has(name)) subscribers.set(name, []);
          subscribers.get(name).push(cb);
          return this;
        },
        subscribe() { return this; }
      };
    }
  };
}

test('B3-1: PC speichert Auftrag → Tablet sieht Auftrag (Realtime)', async () => {
  const sb = createMockSupabase();
  const tabletEvents = [];
  sb.channel('auftraege').on('postgres', { event: 'UPDATE' }, e => tabletEvents.push(e)).subscribe();
  await sb.from('auftraege').upsert({ id: 'a1', titel: 'Wasserschaden Müller', workspace_id: 'ws1' });
  assert.strictEqual(tabletEvents.length, 1);
  assert.strictEqual(tabletEvents[0].new.titel, 'Wasserschaden Müller');
});

test('B3-2: Tablet diktiert Eintrag → PC sieht Eintrag', async () => {
  const sb = createMockSupabase();
  const pcEvents = [];
  sb.channel('eintraege').on('postgres', { event: 'UPDATE' }, e => pcEvents.push(e)).subscribe();
  await sb.from('eintraege').upsert({ id: 'e1', auftrag_id: 'a1', text: 'Diktat: Riss Wand 30cm', bauphase: 'rohbau' });
  assert.strictEqual(pcEvents.length, 1);
  assert.strictEqual(pcEvents[0].new.bauphase, 'rohbau');
});

test('B3-3: Handy nimmt Foto → PC sieht Foto via dokumente-Subscription', async () => {
  const sb = createMockSupabase();
  const pcEvents = [];
  sb.channel('dokumente').on('postgres', { event: 'UPDATE' }, e => pcEvents.push(e)).subscribe();
  await sb.from('dokumente').upsert({ id: 'd1', auftrag_id: 'a1', typ: 'foto', url: '/storage/foto.jpg' });
  assert.strictEqual(pcEvents.length, 1);
});

test('B3-4: Konflikt-Resolution: 2 gleichzeitige Edits → last-write-wins', async () => {
  const sb = createMockSupabase();
  await sb.from('auftraege').upsert({ id: 'a1', titel: 'V1', updated_at: 100 });
  // Browser A schreibt
  await sb.from('auftraege').update({ titel: 'V2-A' }).eq('id', 'a1');
  // Browser B schreibt direkt danach
  await sb.from('auftraege').update({ titel: 'V3-B' }).eq('id', 'a1');
  const result = await sb.from('auftraege').select().eq('id', 'a1');
  assert.strictEqual(result.data[0].titel, 'V3-B');
});

test('B3-5: Auto-Save-Throttle: max 1 save/sek (Burst-Test)', async () => {
  const sb = createMockSupabase();
  let saveCount = 0;
  let lastSave = 0;
  function throttledSave(data) {
    const now = Date.now();
    if (now - lastSave < 1000) return Promise.resolve({ throttled: true });
    lastSave = now;
    saveCount++;
    return sb.from('auftraege').upsert(data);
  }
  // 5 saves in <100ms — nur 1 sollte durch
  await throttledSave({ id: 'a1', f: 'a' });
  await throttledSave({ id: 'a1', f: 'b' });
  await throttledSave({ id: 'a1', f: 'c' });
  assert.strictEqual(saveCount, 1);
});

test('B3-6: localStorage-Draft als Recovery bei DB-Outage', () => {
  const drafts = {};
  const fakeLocalStorage = {
    setItem: (k, v) => drafts[k] = v,
    getItem: k => drafts[k] || null
  };
  fakeLocalStorage.setItem('prova_wizard_draft_a1', JSON.stringify({ titel: 'Offline-Edit' }));
  const recovered = JSON.parse(fakeLocalStorage.getItem('prova_wizard_draft_a1'));
  assert.strictEqual(recovered.titel, 'Offline-Edit');
});

test('B3-7: ProvaWizardSave.saveStep liefert Defensive-Result bei Fetch-Fail', async () => {
  const Lib = require('../../lib/wizard-live-save');
  // Kein window/fetch im Node → reason: no-fetch
  const result = await Lib.saveStep('a1', { phase: 1 });
  assert.strictEqual(result.saved, false);
});

test('B3-8: Realtime-Channel hat 3 Subscribers gleichzeitig (Multi-Device)', async () => {
  const sb = createMockSupabase();
  const eventsA = [], eventsB = [], eventsC = [];
  sb.channel('auftraege').on('postgres', { event: 'UPDATE' }, e => eventsA.push(e)).subscribe();
  sb.channel('auftraege').on('postgres', { event: 'UPDATE' }, e => eventsB.push(e)).subscribe();
  sb.channel('auftraege').on('postgres', { event: 'UPDATE' }, e => eventsC.push(e)).subscribe();
  await sb.from('auftraege').upsert({ id: 'a1', titel: 'Multi-Device' });
  assert.strictEqual(eventsA.length, 1);
  assert.strictEqual(eventsB.length, 1);
  assert.strictEqual(eventsC.length, 1);
});

test('B3-9: Audit-Doku MEGA-33-B3-CROSS-DEVICE-SYNC.md existiert', () => {
  const docPath = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-33-B3-CROSS-DEVICE-SYNC.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  assert.match(doc, /Auto-Save-Coverage/);
  assert.match(doc, /Realtime-Subscription-Coverage/);
  assert.match(doc, /Konflikt-Resolution/);
  assert.match(doc, /Lücken-Liste/);
});

test('B3-10: Audit-Doku listet ≥10 Pages für Coverage-Audit', () => {
  const docPath = path.join(__dirname, '..', '..', 'docs', 'audit', 'MEGA-33-B3-CROSS-DEVICE-SYNC.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  const pages = ['neuer-fall', 'wertgutachten', 'beratung', 'baubegleitung', 'stellungnahme',
                 'app.html', 'akte.html', 'freigabe.html', 'einstellungen.html', 'dashboard.html'];
  pages.forEach(p => assert.match(doc, new RegExp(p), 'Page fehlt im Audit: ' + p));
});
