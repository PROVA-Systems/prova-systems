# PROVA Systems — CHANGELOG

## 2026-05-12 · MEGA⁶⁸-FINAL Phase B (Pilot-Blocker-Fixes)

### B.3 Diktat-Mode-Bug — FIXED
**Symptom:** SV nimmt Diktat auf → tippt manuell in Befund-Notizen/Transkript-Edit → Mikrofon läuft weiter.
**Ursache:** `ortstermin-modus.html` hatte keinen Auto-Stop-Trigger bei Focus-Wechsel auf manuelle Eingabe.
**Fix:** `onfocus="autoStopDiktatBeiTextEingabe()"` auf `#notiz-textarea` und `#diktat-text` (contenteditable Transkript).
Bei aktivem Recording wird `stoppeDiktat()` ausgelöst + Toast-Hint angezeigt.

### B.1 Cross-Domain-Auth — VERIFIED (kein neuer Fix)
**Status:** Cookie-Domain-Storage-Adapter in `lib/supabase-client.js` aktiv (`COOKIE_DOMAIN='.prova-systems.de'`).
**Implementiert seit:** MEGA³⁹ Phase 10 (2026-05-08). Memory bestätigt "Complete".
**Marcel-Verifikation:** Browser-Test prova-systems.de → app.prova-systems.de Login-Flow.

### B.2 Index/App-Split — VERIFIED (kein neuer Fix)
**Status:** `netlify.toml` v6.0 hat Block A (Login-Konsolidierung) + Block B (Cross-Domain LANDING → APP) + Block C (APP-Path-Rewrites).
**Implementiert seit:** MEGA⁵⁰ + MEGA³¹ C1 (Sprint-Block hardening). Memory bestätigt aktiv.
**Marcel-Verifikation:** Browser-Test prova-systems.de zeigt Marketing, app.* zeigt Login + Dashboard.

---

## File-Liste Phase B

### GEÄNDERT
- `ortstermin-modus.html` — `autoStopDiktatBeiTextEingabe()` + onfocus-Hooks auf 2 manuelle Eingaben

### UNVERÄNDERT (verified)
- `lib/supabase-client.js` — Cross-Domain-Cookie-Adapter aktiv
- `netlify.toml` — Cross-Domain-Redirects aktiv

---
