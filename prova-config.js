/* ============================================================
   PROVA Systems — Zentrale Frontend-Konfiguration
   S-SICHER 1.7 (Sprint S-SICHER Paket 1)

   Zweck: BASE_ID zentralisieren statt in 40+ Files hartcodieren.
   Schritt 1 von N — nur 5 Hot-Files umgestellt (nav, dashboard-core,
   app-logic, akte-logic, freigabe-logic).

   Einbindung: VOR allen *-logic.js Scripts, NACH auth-guard.js.
   Aktuell eingebunden in: app.html, dashboard.html, akte.html.

   WICHTIG: Keine Airtable-Calls direkt aus dieser Datei. Nur Constants.
============================================================ */
window.PROVA_CONFIG = { AIRTABLE_BASE: "appJ7bLlAHZoxENWE" };
