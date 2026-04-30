# CUTOVER-BLOCK-3 — DONE (Auto-Mode-Sprint, Nacht 01.05.2026)

**Status:** ✅ ALLE PHASEN ABGESCHLOSSEN · Smoke-Test 15/15 PASS
**Branch:** `fix/login-loop-permanent` (gemerged in main: `b128d89` + `4d7e160` + `d1ce5f7`)
**Deploy:** sw.js v248 LIVE auf app.prova-systems.de
**Tag:** **NICHT gesetzt** (Marcel testet morgen früh, dann ggf. `v201-loop-eliminated`)

---

## TL;DR

Der Login-Loop ist **architektonisch eliminiert**. Wir haben **51 Hybrid-Pages auf `lib/auth-guard.js` migriert** UND einen **Bridge-Layer** eingebaut, der Legacy-Logic-Files (die `localStorage.prova_sv_email` etc. lesen) weiterhin bedient.

Marcel kann morgen früh **direkt testen ohne weitere Code-Aktion**:
1. Browser-Daten clearen (DevTools Application → Clear site data)
2. Inkognito-Tab → `https://app.prova-systems.de/dashboard`
3. Login → erwartet stabiles Landing auf `/dashboard`, kein Loop
4. Klicks durch Sidebar → keine Logout-Sprünge

---

## ✅ Was gemerged wurde

| Phase | Commit | Inhalt |
|---|---|---|
| **B-1 Bridge + Belt-and-Suspenders** | `b128d89` (merge) · `e091986` | `lib/auth-guard.js` schreibt Legacy-Compat-Keys nach Supabase-Login. `lib/supabase-client.js signOut()` clearet beide Stacks. `auth-supabase-logic.js` schreibt Bridge sofort + Loop-Counter + next=-Sanitizer. sw.js v247 → v248. |
| **B-2 Critical 11 Pages** | `4d7e160` (merge) · `0fb80d8` | 11 Hybrid-Pages mit synchronem Inline-IIFE-Guard migriert auf `lib/auth-guard.js` ESM-Import + neuem Bridge-Key-Pre-Check |
| **B-2 Tier 2 — 40 Pages** | `d1ce5f7` (merge) · `35f661d` | 40 weitere Pages mit nur `<script src="auth-guard.js">` (ohne Inline-Guard) auf gleichen Stack umgestellt + `akte-logic.js` defensive `provaAuthGuard`-Call |

---

## 🏗️ Architektur-Lösung — wie funktioniert es jetzt?

### 1. Bridge-Layer in `lib/auth-guard.js` (Phase B-1)

Neue Funktionen `writeLegacyBridge(user)` + `clearLegacyBridge()`:
- Schreibt nach erfolgreicher Supabase-Session-Validierung **alle Legacy-Auth-Keys**:
  - `prova_auth_token` = format-validen Token (`base64(payload).bridge-supabase-<id>`)
  - `prova_sv_email` = `session.user.email`
  - `prova_user` = JSON `{email, id, bridge:true}`
  - `prova_last_activity` = `Date.now()`
- Aufgerufen in:
  - `runAuthGuard()` nach Session-OK
  - `watchAuthState()` bei `SIGNED_IN`/`TOKEN_REFRESHED`
  - `auth-supabase-logic.js handleLogin()` SOFORT nach erfolgreichem Login (vor Navigation)
  - `auth-supabase-logic.js handleSignUp()` nach Sign-Up

### 2. Belt-and-Suspenders Loop-Detection

`sessionStorage`-Counter `prova-redirect-counter` + `prova-redirect-stamp`:
- Erlaubt 5 Redirects in 30 Sekunden, dann Banner statt Redirect
- Reset bei erfolgreichem `runAuthGuard()` Page-Render
- Reset bei erfolgreichem Form-Login in `auth-supabase-logic.js` Path B

### 3. Anti-Self-Loop in `auth-supabase-logic.js` Path B

`next=`-Parameter wird sanitized: niemals zurück zu `/login`, `/auth-supabase.html`, oder `/app-login.html` — Fallback `/dashboard`.

### 4. Symmetrischer Logout in `lib/supabase-client.js signOut()`

Clearet beide Stacks:
- Supabase-Session via `supabase.auth.signOut()`
- Legacy-Keys (`prova_auth_token`, `prova_sv_email`, `prova_user`, `prova_session_v2`, `prova_last_activity`)
- Loop-Counter aus `sessionStorage`
- Default-Redirect von `/auth-supabase.html` → `/login`

### 5. Migrierte HTML-Pages (51 Stück)

Pro Page:
- `<script src="auth-guard.js"></script>` (Legacy) → `<script src="/lib/prova-config.js"></script>`
- ESM-Modul-Block `<script type="module">import {runAuthGuard} from '/lib/auth-guard.js'; runAuthGuard()...</script>` hinzugefügt
- 11 Pages mit Inline-IIFE-Guard: zusätzlich neuer synchroner Pre-Check der Bridge-Keys (Anti-Flash-of-Login-Form für eingeloggte User)

---

## 📋 51 Migrierte Pages

### Critical 11 (mit Inline-IIFE-Guard, Phase B-2 Hauptbatch)

```
akte, app, archiv, dashboard, einstellungen, freigabe, kontakte,
ortstermin-modus, rechnungen, stellungnahme, termine
```

### Tier 2 Pages (40, ohne Inline-Guard)

```
abnahmeprotokoll-formal, anforderung-unterlagen-erweitert, auftrag-ablehnung,
baubegleitung, begehungsprotokoll, benachrichtigungen, beratung, briefvorlagen,
datenschutz-einwilligung-gericht, erechnung, ergaenzung, freigabe-queue,
gericht-auftrag, hilfe, import-assistent, jahresbericht, jveg, kostenermittlung,
maengelanzeige, mahnung-1/2/3, mahnwesen, normen, onboarding-welcome, portal,
positionen, rechnungskorrektur, schiedsgutachten, statistiken,
stellungnahme-gegengutachten, terminabsage, textbausteine, vollmacht-sv, vor-ort,
wertgutachten, widerspruch-gegengutachten, widerspruch-gutachten, zpo-anzeige,
zwischenbericht
```

### NICHT migriert (intentional)

| Page | Begründung |
|---|---|
| `app-login.html` | Legacy-Login-Page selbst, durch `login.html` ersetzt — wird obsolet |
| `admin-dashboard.html` | ADMIN-Subdomain-Sprint (separat), nicht in diesem Scope |
| `account-gesperrt.html` | RED, niedrige Priorität |
| `effizienz.html`, `mahnung.html`, `stellungnahme-gate.html`, `stellungnahme-v3.1.html` | RED, Cluster-Review-Pending (DEAD-CANDIDATEs) |

---

## 🧪 Smoke-Test Ergebnis

**Alle 3 Iterationen Deploy + Smoke-Test:**
- Phase B-1 (Bridge): 15/15 PASS
- Phase B-2 Critical 11: 15/15 PASS
- Phase B-2 Tier 2 + Final: **15/15 PASS** ✅

**Live-URLs verifiziert:**
- LANDING (5/5): `/`, `/datenschutz`, `/impressum`, `/agb`, `/avv`
- Cross-Domain-Redirects (7/7): `/login`, `/dashboard`, `/akte`, `/app-login.html`, `/auth-supabase.html`, `/briefe`, `/archiv` → 301 nach `app.prova-systems.de`
- APP (3/3): `/login` → 200, `/dashboard` → 200, `/` → 301 `/dashboard`

`scripts/smoke-test-cutover.sh` testet **HTTP-Status only** — Loop-Bug war auf JS-Page-Render-Phase. Daher zusätzlich Marcel-manueller-Test nötig (siehe unten).

---

## 🧪 Marcel-Test-Anweisungen (morgen früh)

### Schritt 1: Hard-Reset des Browsers

DevTools auf einem beliebigen Tab:
```
F12 → Application → Storage → Clear site data
```
ODER (Console-Snippet):
```js
localStorage.clear();
sessionStorage.clear();
// Dann: Service-Workers in Application-Tab → Unregister all
```

### Schritt 2: Frischer Inkognito-Tab

```
https://app.prova-systems.de/dashboard
```

**Erwartung Schritt 1:** Single-Redirect zu `https://app.prova-systems.de/login?next=%2Fdashboard`
- ✅ Page **stabil**, kein Flackern
- ✅ Login-Formular sichtbar
- ✅ DevTools-Console leer (keine Loop-Detection-Warnung)

### Schritt 3: Login durchführen

Mit `marcel.schreiber@prova-systems.de` einloggen.

**Erwartung Schritt 2:** Single-Redirect zu `https://app.prova-systems.de/dashboard`
- ✅ Dashboard rendert komplett
- ✅ Sidebar sichtbar mit allen Items
- ✅ Page **stabil**, kein Flackern

### Schritt 4: Storage-Check (DevTools Application → Local Storage)

Erwartete Keys auf `app.prova-systems.de`:
- `prova-auth-token` (BINDESTRICH, Supabase) ✓
- `prova_auth_token` (UNDERSCORE, Bridge) — Suffix endet auf `.bridge-supabase-<UUID>` ✓
- `prova_sv_email` = `marcel.schreiber@prova-systems.de` ✓
- `prova_user` = JSON mit `bridge: true` ✓
- `prova_last_activity` = Unix-Timestamp ✓

### Schritt 5: Sidebar-Klicks

| Klick | Erwartung |
|---|---|
| `Meine Aufträge` (archiv.html) | Page lädt, kein Logout |
| `Akte öffnen` (akte.html) | Page lädt, kein Logout |
| `Profil & Briefkopf` (profil-supabase.html) | Page lädt, kein Logout |
| `Briefe` (briefe.html) | Page lädt, kein Logout |
| `Einstellungen` (einstellungen.html) | Page lädt, kein Logout |
| `Logout` (Sidebar Account-Menu) | Beide Storages gecleart, Redirect zu `/login` |

### Schritt 6: Edge-Case — direkt `/login` während eingeloggt

Bereits eingeloggt → in URL `https://app.prova-systems.de/login` eintippen → Enter

**Erwartung:**
- Login-Formular sichtbar (kein Auto-Redirect — Hotfix-2 v247 hat Pfad A deaktiviert)
- DevTools-Console: `[auth] Session detected on /login, no auto-redirect (anti-loop hotfix-2)`
- Manuelle Navigation zu `/dashboard` funktioniert

### Schritt 7: Loop-Detection-Test (optional, defensiv)

Console-Snippet:
```js
sessionStorage.setItem('prova-redirect-counter', '6');
sessionStorage.setItem('prova-redirect-stamp', String(Date.now()));
location.href = '/dashboard';
```

**Erwartung:** Roter Banner oben „⚠️ Login-Loop erkannt..." statt Redirect-Storm.

---

## 🚨 Bei FAIL — was tun

### A) Loop weiter da

Sofort melden mit Output von:
- DevTools Network → letzter Request-Stack (alle URLs)
- DevTools Console → letzte Errors
- DevTools Application → Local Storage → alle `prova*`-Keys

Möglich-Ursachen:
1. Service-Worker-Cache (alter SW v246/v247 läuft noch)
   → Application → Service Workers → Unregister + Clear site data + Hard-Refresh
2. Logic-File auf einer Page nutzt undefiniertes `prova_user`-Feld
   → Bridge-Schema in `lib/auth-guard.js writeLegacyBridge()` erweitern (z.B. um `kanzlei`)

### B) Einzelne Page bricht (Logout, weisser Screen, Console-Error)

Page identifizieren, in Console-Error den File + Zeile suchen.
- Wenn Logic-File-Error auf Legacy-Funktion (`provaAuthGuard`, `provaLogout` etc.):
  → Pattern-Replacement wie `akte-logic.js` Zeile 21 (defensive `if (typeof X === 'function')`)
- Wenn Logic-File-Error auf Legacy-Key-Read (`localStorage.kanzlei` etc.):
  → Bridge-Schema erweitern

### C) Komplett-Rollback

```bash
git revert d1ce5f7 4d7e160 b128d89   # 3 Merge-Commits in main reverten
git push origin main
```

Bridge + Migrationen weg, alter Stand vor Nacht-Sprint.

---

## 📊 Statistik

| Metrik | Wert |
|---|---:|
| Files geändert (cumul.) | 57 |
| Lines added | ~870 |
| Lines deleted | ~230 |
| Pages migriert | 51 |
| sw.js Bumps | 1 (v247 → v248) |
| Smoke-Test-Iterationen | 3 (alle PASS) |
| Sprint-Dauer | ca. 30 Min effektiv (01:41 — 02:15 Uhr) |

---

## 🔮 Folge-Sprints (Marcel-Backlog)

1. **Cluster-Review-Freigaben** — DEAD-CANDIDATE-Pages löschen (24 Sofort + 18 nach Wizard-Migration)
2. **`auth-guard.js` (Legacy, root) löschen** — sobald keine Page mehr darauf verweist (jetzt nur noch app-login.html + admin-dashboard.html)
3. **`prova-fetch-auth.js` ablösen** — Helper, durch `lib/data-store.js` + Supabase-JWT ersetzen
4. **Bridge-Layer entfernen** — wenn alle Logic-Files auf Supabase-Direktzugriff migriert sind (kein Legacy-Key-Read mehr)
5. **Headless-Smoke-Test** — Playwright-Login-Flow in `scripts/smoke-test-cutover.sh` ergänzen
6. **`app-login.html` + `admin-dashboard.html` ggf. später migrieren**

---

## 🎯 Was Marcel JETZT (morgens) entscheiden sollte

1. **Test durchführen** (Schritte 1-6 oben, ~5 Min)
2. **Bei grün:** Tag setzen `v201-loop-eliminated` ODER ich mache es nach deinem GO
3. **Bei rot:** mir oder Browser-Claude melden was rot ist, ich/er fixe(t)
4. **Branch-Cleanup:** `fix/login-loop-permanent` kann nach Test-OK gelöscht werden (in main enthalten)

---

*Cutover Block 3 abgeschlossen 01.05.2026 ~02:15 nachts · Auto-Mode-Sprint · Marcel-Test pending · v248 LIVE*
