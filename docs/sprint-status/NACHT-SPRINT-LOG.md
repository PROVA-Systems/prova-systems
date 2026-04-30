# NACHT-SPRINT-LOG — 01.05.2026

**Sprint:** Cutover Block 3 — Login-Loop endgültig fixen (Option B + Bridge-Layer-Hybrid)
**Zeitraum:** 01:41 — ~02:15 (~35 Min effektiv)
**Mode:** Auto (autonomous)

---

## Timeline

| Zeit | Phase | Aktion |
|---|---|---|
| **01:41** | Start | START-CHECK · git pull origin main · `aa34570` |
| 01:42 | Phase A | Inventar: 53 YELLOW · 6 RED · 5 GREEN-Logic-Files identifiziert |
| 01:44 | Phase A | `docs/sprint-status/CUTOVER-BLOCK-3-INVENTORY.md` erstellt |
| 01:46 | Phase B-1 | Bridge-Layer in `lib/auth-guard.js` implementiert (`writeLegacyBridge`, `clearLegacyBridge`, Loop-Counter `_trackRedirect`, `watchAuthState` SIGN_IN/TOKEN_REFRESHED) |
| 01:48 | Phase B-1 | `lib/supabase-client.js signOut()` clearet beide Stacks · Default-Redirect `/auth-supabase.html` → `/login` |
| 01:50 | Phase B-1 | `auth-supabase-logic.js` Bridge in handleLogin/handleSignUp · next=-Sanitizer · Loop-Counter-Reset |
| 01:51 | Phase B-1 | sw.js v247 → v248 |
| 01:52 | Phase B-1 | `node --check` alle 4 Files OK · Commit `e091986` · Push origin fix/login-loop-permanent |
| 01:53 | Phase B-1 | Smoke-Test 15/15 PASS · Merge `b128d89` in main · Push |
| 01:54 | Phase B-2 | Pattern-Analyse: 11 Pages mit Inline-IIFE-Guard identisch, 40 weitere mit nur Script-Tag |
| 01:56 | Phase B-2 | Pilot `dashboard.html` migriert (`<script src="auth-guard.js">` → `/lib/prova-config.js` + ESM-Module) |
| 01:57 | Phase B-2 | `akte.html` als zweites manuell migriert (Read-then-Edit Workflow für Sicherheit) |
| 01:58 | Phase B-2 | Node-Migration-Script für 9 verbleibende kritische Pages erstellt + ausgeführt: 9/9 OK |
| 01:59 | Phase B-2 | Verifikation: 11 Pages haben `runAuthGuard`, 0 Pages haben mehr `provaAuthGuard` Inline-Call |
| 02:00 | Phase B-2 | Smoke-Test 15/15 PASS · Commit `0fb80d8` · Merge `4d7e160` in main · Push |
| 02:02 | Phase B-2 | `akte-logic.js` Zeile 21 defensive: `if (typeof provaAuthGuard === 'function') { provaAuthGuard(); }` |
| 02:03 | Phase B-2 | Tier-2 Migration-Script für 40 weitere Pages erstellt + ausgeführt: 40/40 OK |
| 02:05 | Phase B-2 | Verifikation: 51 Pages haben `runAuthGuard`, nur 2 haben noch Legacy `auth-guard.js` (`app-login.html` + `admin-dashboard.html`, beide intentional) |
| 02:06 | Phase B-2 | Smoke-Test 15/15 PASS · Commit `35f661d` · Merge `d1ce5f7` in main · Push |
| 02:08 | Phase D/E | Deploy-Polling auf v248 LIVE · Final Smoke-Test 15/15 PASS |
| 02:12 | Phase E | `docs/sprint-status/CUTOVER-BLOCK-3-DONE.md` erstellt mit Marcel-Test-Anweisungen |
| 02:15 | Phase F | `docs/sprint-status/NACHT-SPRINT-LOG.md` (diese Datei) |

---

## Probleme aufgetreten

### 1. Python nicht verfügbar auf Windows

**Symptom:** `python3 /tmp/migrate_inline_guard.py` schlug fehl mit „Python wurde nicht gefunden".
**Ursache:** Windows-Standardumgebung hat Python-Aliase, die zum Microsoft Store leiten.
**Lösung:** Migration-Script in Node.js (cjs) umgeschrieben — Node ist via Claude Code Standard-Setup verfügbar.

### 2. Heredoc-Escape-Issue im ersten Node-Script

**Symptom:** `cat > /tmp/file.cjs <<'JSEOF' ... JSEOF` → Bash hat Backslashes in Regex-Replace-Pattern verschluckt → SyntaxError.
**Ursache:** Bash-Heredoc mit Single-Quote sollte literal sein, aber irgendwo gab's Konflikt mit Regex-Pattern `[.*+?^${}()|[\]\\]/g`.
**Lösung:** Statt RegExp + escape → simple `String.indexOf` Loop für Substring-Count. Plus Script via `Write`-Tool direkt nach `C:\Users\selin\AppData\Local\Temp\claude\` schreiben (umgeht Heredoc-Probleme).

### 3. Logic-Files nutzen `provaAuthGuard()` global

**Symptom:** `grep 'provaAuthGuard' *.js` → 4 Treffer (auth-guard.js, akte-logic.js, einstellungen-logic.js, prova-context.js).
**Risiko:** Nach Migration ist `auth-guard.js` (Legacy) nicht mehr auf migrierten Pages geladen → `ReferenceError: provaAuthGuard is not defined` würde Page brechen.
**Lösung:**
- `akte-logic.js` Zeile 21: defensive `if (typeof provaAuthGuard === 'function') { provaAuthGuard(); }` (war bisher unkonditioniert)
- `einstellungen-logic.js`: schon defensive (Zeile 19 `if(typeof provaAuthGuard==='function')`) — kein Eingriff nötig
- `prova-context.js`: schon defensive (`typeof window.provaAuthGuard === 'function'`) — kein Eingriff nötig

---

## Was BEWUSST nicht gemacht wurde

1. **`auth-guard.js` (Legacy, root) NICHT gelöscht** — `app-login.html` + `admin-dashboard.html` referenzieren es noch. Erst nach Cutover dieser beiden Pages kann das File ganz weg.
2. **`prova-fetch-auth.js` NICHT entfernt** — wird von vielen Pages referenziert, ist Helper (kein Auth-Guard direkt). Folge-Sprint: durch `lib/data-store.js` + Supabase-JWT ersetzen.
3. **Logic-Files NICHT umgebaut** — sie lesen weiterhin Legacy-LocalStorage-Keys (`prova_sv_email`, `prova_user`). Bridge-Layer füllt diese. Folge-Sprint: durch `import { getCurrentUser } from '/lib/supabase-client.js'` ersetzen.
4. **Headless-Login-Test NICHT in Smoke-Test integriert** — wäre Playwright-Setup nötig (zu invasiv für Nacht-Sprint, eigener Folge-Sprint).
5. **KEIN Tag gesetzt** — Marcel testet zuerst (Auftrag).

---

## Konflikt-Protokoll-Aktivierung

**Keine** Konflikte aufgetreten:
- Smoke-Test war bei jedem Merge grün (3/3)
- Keine Page hatte unerwartetes Pattern (alle 11 Inline-Guards EXAKT identisch — gleich der dashboard.html-Vorlage)
- Keine Build-Fehler / Deploy-Crashes
- Keine Pages wegen Sondercase übersprungen außer den intentionalen Skips (`app-login.html`, `admin-dashboard.html`)

`docs/sprint-status/NACHT-PAUSE-LOOP-FIX.md` wurde **NICHT** erstellt — nicht nötig.

---

## Erwartetes Ergebnis morgens für Marcel

✅ `git log --oneline -8` zeigt 6 Sprint-Commits (3 Code + 3 Merges)
✅ `docs/sprint-status/CUTOVER-BLOCK-3-INVENTORY.md`
✅ `docs/sprint-status/CUTOVER-BLOCK-3-DONE.md`
✅ `docs/sprint-status/NACHT-SPRINT-LOG.md` (diese Datei)
✅ `docs/diagnose/LOGIN-LOOP-SOLUTION.md` (vom Vortag)
✅ App auf `https://app.prova-systems.de/dashboard` funktioniert nach Login
❌ KEIN Tag (Marcel setzt nach Test)

---

## Wenn Marcel morgens „funktioniert" sagt

```bash
# Tag setzen
git tag -a v201-loop-eliminated -m "Login-Loop architektonisch eliminiert nach Cutover Block 3"
git push origin v201-loop-eliminated

# Branch löschen (lokal + remote)
git branch -D fix/login-loop-permanent
git push origin --delete fix/login-loop-permanent
```

## Wenn Marcel morgens „funktioniert NICHT" sagt

Siehe `docs/sprint-status/CUTOVER-BLOCK-3-DONE.md` Sektion „🚨 Bei FAIL — was tun".

---

*Sprint-Log abgeschlossen 01.05.2026 ~02:15 · Auto-Mode-Sprint · Bridge-Layer + 51 Pages migriert · Marcel-Test pending*
