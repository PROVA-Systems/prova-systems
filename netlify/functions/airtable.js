/**
 * netlify/functions/airtable.js — TOMBSTONE
 * MEGA⁷⁶ (2026-05-14): Endgültig deaktiviert. Alle 49 Frontend-Caller
 * sind auf Supabase migriert (Sprint F-Batch1 + Batch2 + MEGA76 Teil A–D).
 *
 * Diese Function liefert nur noch 410 Gone — falls ein vergessener Caller
 * doch noch hier landet, bekommt er einen klaren Fehler statt 404.
 *
 * Stub-Plan: erst nach 14 Tagen Stable-Run der MEGA76-Deploy + 0 Hits
 * im Netlify-Function-Log → Function komplett aus dem Repo entfernen.
 */
'use strict';

exports.handler = async () => ({
  statusCode: 410,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({
    error: 'airtable-deprecated',
    message: 'Airtable-Proxy ist abgeschaltet. Migrate auf lib/prova-supabase-adapters.js.',
    deprecated_at: '2026-05-14',
    sprint: 'MEGA76'
  })
});
