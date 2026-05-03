# NACHT-PAUSE MEGA-SKALIERUNG — auth-token-issue.js ist NICHT Tot-Code (Live-Login!)

**Datum:** 03.05.2026 nachmittag
**Sprint:** MEGA-SKALIERUNG M1 (Tot-Code-Cleanup)
**Erstellt von:** Claude Code (autonome Mega-Skalierungs-Session)
**Marcel-Decision-Pflicht:** ja, blockiert Sprint M1

---

## Was gefunden

Die Marcel-Direktive sagt: „Tot-Code: Alle 3 Functions löschen (foto-upload, invite-user, auth-token-issue)".

**Befund von Claude Code beim Repo-Scan:**

| Function | Status | Live-Refs |
|---|---|---|
| `foto-upload.js` | ✅ wirklich tot | nur `foto-archiv.js` (selbst nicht in HTML/APP_SHELL eingebunden) |
| `invite-user.js` | ✅ wirklich tot | 0 Caller |
| **`auth-token-issue.js`** | 🚨 **LIVE** | `app-login.html` + `app-login-logic.js` (im sw.js **APP_SHELL**) |

### Beweise für „auth-token-issue.js ist live"

1. **`sw.js` APP_SHELL enthält:**
   - `'/app-login.html'` (Zeile 14)
   - `'/app-login-logic.js'` (Zeile 53)
   → Diese Dateien werden Service-Worker-cached + offline ausgeliefert.

2. **`app-login-logic.js:100` macht:**
   ```js
   var res = await provaFetch('/.netlify/functions/auth-token-issue', {...});
   ```
   → Das ist der **einzige Login-Pfad** für `app-login.html`.

3. **Die gesamte App redirected bei not-logged-in zu `app-login.html`:**
   - `auth-guard.js` (default redirect)
   - `app.html` (3 Stellen)
   - `akte-logic.js`, `app-logic.js`, `archiv-logic.js`, `briefvorlagen-logic.js`,
     `freigabe-logic.js`, `beratung-logic.js`, `baubegleitung-logic.js`,
     `einstellungen.html`, `account-gesperrt.html`, `app-register.html`, `404.html`
   → 30+ Frontend-Files erwarten dass `app-login.html` funktioniert.

4. **`auth-supabase-logic.js:137`** behandelt `app-login.html` als bekannten Pfad
   → Indiz, dass die Migration nur **teilweise** stattgefunden hat
   (`login.html` + `auth-supabase.html` nutzen Supabase, `app-login.html` noch Legacy).

### Widersprüchliche Quelle: NACHT-PAUSE-S6-NACHT-rate-limit-auth-token-issue.md

Die NACHT-PAUSE-Doc behauptet (Zeile 36-38):
> Browser-Login geht via `auth-supabase-logic.js` direkt zu Supabase Auth
> `auth-token-issue.js` … keine modernen Browser-Calls zu dieser Function entdeckt

→ **Diese Aussage stimmt nur für `login.html` + `auth-supabase.html`**, NICHT für `app-login.html`. Die App hat zwei parallele Login-Pages, und der sw.js cached die Legacy-Variante als App-Shell-Komponente.

---

## Risiko-Analyse: was passiert wenn ich `auth-token-issue.js` jetzt lösche

1. Service-Worker cached `/app-login.html` → User sieht weiterhin alte Login-UI
2. User gibt Email + Password ein
3. `app-login-logic.js` POST → `/.netlify/functions/auth-token-issue` → **404**
4. Login-Fehler-Message → User kann sich nicht mehr einloggen
5. Bei `auth-guard.js` redirect → Endlos-Schleife auf 404-Login

**→ Pre-Pilot-System bricht für ALLE bestehenden User.**

Selbst wenn keine echten Pilot-User existieren: Marcel selbst und alle Tester nutzen `app-login.html` — eigene Smoke-Tests würden scheitern.

---

## Optionen

### Option A — Nur 2 von 3 Functions löschen (sofort umsetzbar, 5 Min)

**Was:**
- ✅ `foto-upload.js` löschen
- ✅ `foto-archiv.js` löschen (mitlöschen, einziger Caller, Tot-Code)
- ✅ `invite-user.js` löschen
- ⏸ `auth-token-issue.js` **NICHT** löschen — bleibt aktiv bis komplett-Migration

**Pros:**
- Login bleibt funktional (sofort sicher)
- 2/3 der Tot-Code-Dividende sofort eingelöst
- BACKLOG H-21 (invite-user) + H-17 (foto-upload) + H-23 (foto-upload) auflösbar
- Konsistent mit den TOT-CODE-DECISION-Docs (foto-upload + invite-user beide eindeutig dead)

**Cons:**
- BACKLOG H-18 (invite-user) + H-23 (foto) bleibt resolved aber RL-01 (auth-token-issue Brute-Force) bleibt CRITICAL
- → Brute-Force-Schwachstelle bleibt; muss separat gefixt werden (Option B oder C)

### Option B — Alle 3 löschen + `app-login.html` auf Supabase migrieren (1-2h)

**Was:**
- Refactor `app-login-logic.js` → POST direkt an Supabase Auth (analog `auth-supabase-logic.js`)
- ENV-Vars updaten (Supabase URL + anon key)
- Inline-script in `app-login.html` ggf. als ES-Module umstellen
- Smoke-Test: Login → Token in localStorage → App-Zugriff
- Dann erst Functions löschen

**Pros:**
- Volle Marcel-Direktive umgesetzt
- App-Shell konsolidiert auf Supabase
- BACKLOG-Findings vollständig aufgelöst (H-17/H-18/H-21/H-23 + RL-01)

**Cons:**
- 1-2h zusätzlicher Aufwand vs der geplanten 15-20 Min für M1
- Migrations-Risiko: Login-Flow ist kritischer Pfad
- Sw.js APP_SHELL-Bump nötig (Cache-Refresh für alle existing User)
- Eventuell hat `app-login-logic.js` Feature-Parität zu `auth-supabase-logic.js`, die Marcel kennen sollte (z.B. Airtable-Lookup für SV-Stammdaten beim Login)

### Option C — Rate-Limit auf `auth-token-issue.js` ergänzen (30 Min)

**Was:**
- In-Memory-Bucket-Rate-Limit nach NACHT-PAUSE-S6-NACHT-Empfehlung
- 5 Versuche / 15 Min / IP, danach 429
- Function bleibt deployed
- Audit-Log bei Rate-Limit-Hit ergänzen

**Pros:**
- Brute-Force-Schwachstelle (RL-01) gefixt
- Login bleibt funktional
- Klein-Schritt-Move, kein Migrations-Risiko
- Marcel kann später entscheiden wann Komplett-Migration kommt

**Cons:**
- Function bleibt 1 zusätzliche Function im Deployment
- Tot-Code-Cleanup nicht vollständig (Marcel-Direktive nur teilweise erfüllt)
- Folge-Sprint nötig

### Option D — Unklarheit zurückspielen, alle Decisions stoppen

**Was:**
- Sprint M1 als „blockiert" markieren
- Marcel persönlich klären lassen ob `app-login.html` weiter Legacy bleibt oder migriert wird

**Pros:**
- Maximale Sicherheit
- Decision auf richtige Verantwortungs-Ebene

**Cons:**
- Sprint M1 läuft nicht weiter
- Folgesprints (M2-M7) ggf. blockiert wenn auf M1 abhängen

---

## Meine Empfehlung

**Option A — sofort 2/3 löschen, `auth-token-issue.js` separat behandeln.**

**Begründung:**
1. `foto-upload.js` und `invite-user.js` sind eindeutig dead (TOT-CODE-DECISION-Docs sind valide)
2. Sprint kann teilweise weiterlaufen (M1 → M2-M7), Wert wird geliefert
3. `auth-token-issue.js` ist ein separates Problem (Migration vs. Rate-Limit) das eine bewusste Marcel-Decision verdient
4. Risiko-Profil: Option A ist risikoärmster vorwärts-Move

**Folge-Sprint M3.5 oder Catch-Up:**
- Marcel-Decision: B (volle Migration) oder C (Rate-Limit ergänzen)?
- Empfehlung: **C** als Brücke vor Pilot-Launch (30 Min, kein Login-Risiko), **B** als Nach-Pilot-Sprint

---

## Marcel-Decision-Slot

- [ ] **A) Nur 2/3 löschen — auth-token-issue bleibt aktiv** (empfohlen, 5 Min)
- [ ] **B) Alle 3 löschen + app-login.html migrieren** (1-2h)
- [ ] **C) Nur 2/3 löschen + Rate-Limit auf auth-token-issue ergänzen** (35 Min)
- [ ] **D) Sprint M1 stoppen — Marcel klärt zuerst** (0 Min Code)

**Marcel:** bitte 1 Buchstabe antworten. Ich setze sofort um.

---

*NACHT-PAUSE MEGA-SKALIERUNG 03.05.2026 nachmittag · Marcel-Decision blockiert Sprint M1*
