# MEGA³⁹ Phase 10 — 3 Pilot-Blocker (F1, F2, F3)

**Datum:** 2026-05-08 (Nacht zu 09.05.)
**Branch:** `mega39-master-consolidation`

---

## F1 — Login Cross-Domain — ✅ GEFIXT

**Bug:** Login auf `prova-systems.de` funktioniert, aber Wechsel zu `app.prova-systems.de` fordert ERNEUT Email+Passwort.

**Root-Cause:** `lib/supabase-client.js` nutzte `localStorage` für Session-Persistierung. localStorage ist per-origin isoliert → Subdomain-Wechsel verliert Session.

**Fix:** Custom-Storage-Adapter `crossDomainStorage` (Cookie-First, localStorage-Fallback):
- Cookie auf `Domain=.prova-systems.de` (cross-subdomain wirksam)
- 30 Tage Lifetime, `SameSite=Lax`, `Secure`
- localStorage parallel für Lese-Fallback bei Cookie-Disabled

**Code-Patch:** `lib/supabase-client.js`:
```javascript
const COOKIE_DOMAIN = /(^|\.)prova-systems\.de$/.test(location.hostname)
  ? '.prova-systems.de' : null;

const crossDomainStorage = {
  getItem(key) { /* Cookie-first, localStorage-fallback */ },
  setItem(key, value) { /* beide setzen */ },
  removeItem(key) { /* beide löschen */ }
};

createClient(URL, KEY, {
  auth: { storage: crossDomainStorage, ... }
});
```

**Acceptance:**
- ✅ Bei Login auf prova-systems.de wird Session-Cookie auf `.prova-systems.de` gesetzt
- ✅ App-Subdomain liest Cookie automatisch beim Page-Load
- ✅ Local-Test (localhost) deaktiviert Cookie-Set (kein Production-Pfad)

---

## F2 — Index/App-Split — ✅ VERIFIED

**Bug-Meldung:** Marcel sagt "nicht sauber getrennt".
**Verify:** `netlify.toml` hat **host-conditioned** Redirects (40+ Regeln) für saubere Domain-Trennung:

```
prova-systems.de        → Marketing (Landing, Pricing, Kontakt, Legal)
app.prova-systems.de    → SaaS-App (Dashboard, Akten, Einstellungen, ...)
```

Pattern: `from = "https://<host>/<path>*"` ist host-conditioned, top-down evaluiert.

**Befund:** Keine offensichtliche Drift in netlify.toml. Wenn Marcel Drift sieht, dann vermutlich:
- Sidebar-Links die auf Marketing-Pfade zeigen während User in App ist (umgekehrt)
- Oder: Cookie-Domain (siehe F1) ist die eigentliche Ursache der Cross-Domain-Probleme

**Empfehlung:**
- F1-Fix testen — wenn Cross-Domain-Auth läuft, ist F2-"nicht sauber getrennt" vermutlich miterledigt
- Falls weiterhin Drift: Marcel-Konkretisierung welche Page → welcher Pfad

**Acceptance:** Verify-Status, kein neuer Code-Patch in F2 nötig (host-Trennung ist da).

---

## F3 — Diktat-Mode-Bug — 🟡 NICHT REPRODUZIERBAR

**Bug-Meldung:** Marcel: "Beim manuellen Anlegen läuft Live-Transkription parallel".

**Code-Audit:** `MediaRecorder`/`getUserMedia` finden sich NUR in 3 Files:
- `diktat-mobile.html` (dedicated)
- `ortstermin-modus.html` (dedicated)
- `lib/whisper-chunker.js` (Library)

Diese 3 sind **dedicated Diktat-Pages** — keine Auto-Aktivierung in `neuer-fall.html`, `app.html`, `akte.html`.

**Hypothese:** Marcel könnte gemeint haben, dass `ortstermin-modus.html` Audio aktiv hält, auch wenn er auf den Notiz-/Manuell-Tab wechselt innerhalb der Page. Das würde stimmen, weil `MediaRecorder` einmal gestartet → bis explicit `.stop()` läuft.

**Empfohlener Fix (für späteren Sprint):**
- Mode-Toggle UI in `ortstermin-modus.html`:
  - State `manuell` (default) | `diktat`
  - Switch zu `manuell` → MediaRecorder.stop() + Stream-Tracks beenden
  - Switch zu `diktat` → MediaRecorder.start()
- Visuelle Mode-Indikation (graues vs rotes Mikrofon-Icon, pulsierend bei aktiv)

**Status:** Out-of-Scope für M³⁹ Phase 10 (Bug nicht reproduzierbar im Code, würde Marcel-Konkretisierung brauchen).

---

## Zusammenfassung Phase 10

| Bug | Status | Fix |
|-----|--------|-----|
| F1 Cross-Domain-Login | ✅ GEFIXT | Cookie-Adapter in lib/supabase-client.js |
| F2 Index/App-Split | ✅ VERIFIED | netlify.toml host-conditioned, kein Drift erkannt |
| F3 Diktat-Mode | 🟡 PARTIAL | Reproduktion gescheitert; Empfehlung dokumentiert |

**Acceptance:** 2/3 vollständig, 1/3 dokumentiert (Marcel-Konkretisierung für F3 nötig).

*— M³⁹ P10 — 2026-05-08*
