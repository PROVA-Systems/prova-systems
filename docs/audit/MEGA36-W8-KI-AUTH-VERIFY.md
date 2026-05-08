# MEGA³⁶ W8 — KI-Garantie + AUTH-COCKPIT + 2FA Verify

**Datum:** 2026-05-08
**Sprint:** MEGA³⁶ Welle 8 (W8.1–W8.4)
**Branch:** `mega34-final-100-percent`
**Status:** ✅ Welle 8 ist im Wesentlichen schon implementiert — Verify-Sprint.

---

## W8.1 — KI-Funktions-Garantie 5-Tests

**Status:** ✅ VERIFIED, 19 Tests grün.

**Datei:** `tests/ki-funktions-garantie.test.js` (270 Zeilen)
**Run:** `node --test tests/ki-funktions-garantie.test.js`

**Test-Suite-Inhalt:**

1. **Konjunktiv-II-Erkennung** (CLAUDE.md Regel 9 + 14)
   - Akzeptiert: „Es dürfte sich um Schimmel handeln, da die Feuchtigkeit erhöht wäre."
   - Lehnt ab: „Das ist eindeutig Schimmel." (indikativ-Absolutismus)

2. **Halluzinations-Check** (CLAUDE.md Regel 10)
   - Pseudonymisierungs-Verify: Klar-Daten → Platzhalter
   - Erfundene Fakten-Erkennung

3. **§407a-Check**
   - Tatsachen-/Bewertung-Trennung
   - Unzulässige Auftragsweitergabe

4. **GPT-4o vs Mini-Routing** (CLAUDE.md Regel 14)
   - Konjunktiv-II nur via GPT-4o (Mini scheitert reproduzierbar)
   - Cost-Optimization für nicht-grammatikalische Aufgaben

5. **Token-Logging** (CLAUDE.md Regel 16)
   - Jeder KI-Call → ki_protokoll-Eintrag
   - workspace_id + tokens_in + tokens_out + kosten_eur

**HALLUZINATIONSVERBOT-Verify** ist Teil von Test 2: jede KI-Aussage
muss aus Diktat/Stamm-Daten ableitbar sein, sonst flagging-fail.

---

## W8.2 — AUTH-COCKPIT 12-Sektionen

**Status:** ✅ VERIFIED via M³⁶ W3.4 (commit 3c5ad4e).

`admin-dashboard.html` hat jetzt 12 Daten-Tabs:
overview / kunden / finanzen / ki-stats / tickets / health /
audit / push / sessions / timing / pipeline / settings.

Mapping zur Sprint-Plan-Liste:
| Sprint-Plan | M³⁶-Tab |
|---|---|
| KPIs | overview |
| Users | kunden |
| Usage | ki-stats |
| Health | health |
| Support | tickets |
| Billing | finanzen |
| Audit | audit ✓ NEU |
| Push | push ✓ NEU |
| Sessions | sessions ✓ NEU |
| Timing | timing ✓ NEU |
| Heatmap | (subview in pipeline) |
| Funnel | pipeline |

**16 Tests grün** (`tests/admin/admin-dashboard-w34-12tabs.test.js`).

---

## W8.3 — 2FA für Marcel = Super-Admin

**Status:** ✅ VERIFIED, vollständige Implementierung vorhanden.

**Files-Inventar:**

| Datei | Zweck |
|---|---|
| `lib/auth-2fa-login-step.js` | Login-Flow-Erweiterung mit TOTP-Step |
| `lib/auth-2fa-ui.js` | Setup-Modal + QR-Code-Generierung |
| `setup-2fa.html` | Standalone-Page für Initial-Setup |
| `netlify/functions/auth-2fa-setup.js` | Generiert TOTP-Secret + QR |
| `netlify/functions/auth-2fa-verify.js` | Validiert TOTP-Code |
| `netlify/functions/auth-2fa-disable.js` | Disable-Path mit Recovery-Code |
| `netlify/functions/lib/totp-helper.js` | TOTP-Algorithmus (RFC 6238) |
| `supabase/migrations/2026_05_11_w12_2fa_complete.sql` | Schema für totp_secrets + recovery_codes |

**Tests:** `tests/admin-2fa/force-admin-2fa.test.js` — 10/10 grün.

**Marcel-Action:**
1. setup-2fa.html aufrufen
2. QR-Code mit Authenticator-App scannen (Google Authenticator,
   1Password, Authy)
3. 6-stelligen Code zur Bestätigung eingeben
4. 10 Recovery-Codes ausdrucken/sicher speichern
5. Bei nächstem Login: 6-stelliger TOTP-Code zusätzlich zu Passwort

Force-Admin-2FA: Admin-Login (`admin-auth.js`) verlangt nach Marcel's
Setup zwingend einen TOTP-Code. Wer das Passwort kennt, kommt OHNE
TOTP nicht in Cockpit. Recovery-Code-Pfad ist als Notfall-Fallback
implementiert (10 einmal-verwendbare Codes).

---

## W8.4 — Schiedsgutachten-Template

**Status:** ❌ ENTFÄLLT (W4.1-Recherche).

**Begründung:**
W4.1-Recherche-Ergebnis (siehe `docs/research/BESCHEINIGUNGEN-RECHERCHE-2026-05-07.md`)
hat ergeben: Schiedsgutachten ist ein normales Privatgutachten mit
besonderem Auftrags-Kontext. Es ist KEINE „Bescheinigung" und braucht
KEIN eigenes Template — die existierenden F-09 (Kurzgutachten) und
F-10 (Beweissicherung) decken den Strukturbedarf ab. `auftrag_typ='schied'`
in der SKIP_MAP nutzt die Standard-Workflow-Logik.

Wenn Marcel später feststellt, dass ein eigener Header/Footer für
Schiedsgutachten gewünscht ist (z. B. „Schiedsgutachten gemäß §1029 ZPO"),
kann das mit einem zusätzlichen `dokument_templates`-Eintrag (aktiv=TRUE,
typ='schiedsgutachten_pdf') in einer eigenen Mini-Migration ergänzt
werden — keine Architektur-Änderung nötig.

---

## Zusammenfassung W8

| Item | Status | Tests |
|------|--------|-------|
| W8.1 KI-Funktions-Garantie | ✅ Verified | 19/19 grün |
| W8.2 AUTH-COCKPIT 12 Sektionen | ✅ Done in W3.4 | 16/16 grün |
| W8.3 2FA Super-Admin | ✅ Verified | 10/10 grün |
| W8.4 Schiedsgutachten | ❌ Entfällt (W4.1-Decision) | n/a |

**Gesamt: 45 Tests in W8-Scope grün.**

*M³⁶ W8 Verify — Co-Authored-By Claude Opus 4.7 (1M context) — 2026-05-08*
