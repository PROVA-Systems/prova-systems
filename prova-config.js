/* ============================================================
   PROVA Systems — Zentrale Frontend-Konfiguration (Legacy: AIRTABLE_BASE)
   S-SICHER 1.7 + Hotfix MEGA¹⁶.5 (2026-05-08)

   Zweck: BASE_ID zentralisieren. Wird in K-1.5 entfernt (Cutover).

   WICHTIG (Hotfix MEGA¹⁶.5): MERGE statt OVERWRITE.
   /lib/prova-config.js setzt SUPABASE_URL/SUPABASE_ANON_KEY auf
   window.PROVA_CONFIG. Wenn diese Datei (root) DANACH lädt (siehe
   dashboard.html Z.22 + Z.52), wuerde ein direktes Re-Assign die
   Supabase-Werte loeschen → "PROVA_CONFIG.SUPABASE_URL fehlt"-Error
   beim ESM-Import von supabase-client.js.

   Loesung: bestehende Properties bewahren, nur AIRTABLE_BASE setzen.
============================================================ */
window.PROVA_CONFIG = window.PROVA_CONFIG || {};
window.PROVA_CONFIG.AIRTABLE_BASE = "appJ7bLlAHZoxENWE";
