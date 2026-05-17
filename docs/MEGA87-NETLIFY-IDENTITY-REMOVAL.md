# MEGA⁸⁷ Block B — Netlify Identity Removal-Audit

**Stand:** 2026-05-17 · Sprint MEGA⁸⁷ AUTH-PERFEKT 2.0

---

## Status: BEREITS ENTFERNT — MEGA⁴⁶ hat es 2026-05-09 production-deployed ✅

Marcel-Direktive „Netlify Identity removed" ist **erfüllt seit MEGA⁴⁶** (Frontend-Backend Consistency Cleanup, 2026-05-09). Was MEGA⁸⁷ Block B macht:

1. ✅ **Verify** dass tatsächlich kein netlify-identity-widget mehr geladen wird
2. ✅ **Document** den Polyfill-Pattern als bleibend (kein zu entfernender Tot-Code)
3. ✅ **Cleanup-Mark** für ENV-Vars und Edge-Functions, die bereits in der Cleanup-Pipeline sind

---

## Verify-Ergebnisse (grep-Sweep)

### ❌ Was NICHT mehr existiert (war Ziel der MEGA⁴⁶-Removal)

| Item | Status |
|---|---|
| `<script src="https://identity.netlify.com/v1/netlify-identity-widget.js">` | ✅ 0 Treffer im Repo |
| Original `netlifyIdentity.init()` / `.on('login', ...)` Event-Bindings | ✅ ersetzt durch Polyfill-no-ops |
| `[[redirects]] from = "/.netlify/identity/*"` | ✅ 0 Treffer in netlify.toml |
| `NETLIFY_IDENTITY_*` ENV-Vars aktiv | ✅ als deprecated dokumentiert (`docs/ops/env-cleanup-phase-2.md`) |

### ✅ Was AKTIV bleibt (API-Compat-Layer)

**`lib/netlify-identity-polyfill.js`** (MEGA⁴⁶, 141 Z): Polyfill der `window.netlifyIdentity`-API stellt. Methoden:
- `.currentUser()` → liest aus localStorage (Supabase-Session)
- `.logout()` → ruft `supabase.auth.signOut()` + räumt Bridge-Keys
- `.signup()` → forward zu `supabase.auth.signUp()`
- `.open()` / `.init()` / `.on()` → no-ops

**Begründung:** 8+ Legacy-Files (`nav.js`, `push-optin.js`, `lib/editor-tiptap.js`, `vor-ort-logic.js`, etc.) callen weiterhin `netlifyIdentity.currentUser()`. Statt 8 Files zu refactoren → Polyfill stellt API-Surface bereit ohne echtes Widget. Production-stable seit 8 Tagen.

**Status:** **BLEIBT** als bewusste Architektur-Entscheidung. Kein Tot-Code, sondern intentionaler Compat-Layer.

---

## Caller-Inventory (29 Files mit netlifyIdentity-Refs)

### Production-Code (alle nutzen Polyfill, kein echtes Widget)

| File | Aufruf-Pattern | Status |
|---|---|---|
| `app-register.html` | `netlifyIdentity.signup()` Forward | ✅ via Polyfill |
| `app-login.html` + `app-login-logic.js` | `netlifyIdentity.currentUser()` | ✅ via Polyfill |
| `account-gesperrt.html` | check currentUser für Lockout-Display | ✅ via Polyfill |
| `nav.js` | currentUser für Sidebar-Footer | ✅ via Polyfill |
| `vor-ort-logic.js` | currentUser für sv_email | ✅ via Polyfill |
| `prova-auth-api.js` | currentUser + logout | ✅ via Polyfill |
| `mahnung.html` | currentUser | ✅ via Polyfill |
| `briefe/maengelanzeige.html` | currentUser | ✅ via Polyfill |
| `einstellungen.html` | gotrue-Stub | ✅ via Polyfill (gotrue=null) |
| `push-optin.js` | currentUser | ✅ via Polyfill |
| `lib/edge-shim.js` | currentUser für Auth-Header | ✅ via Polyfill |
| `lib/editor-tiptap.js` | currentUser für User-Context | ✅ via Polyfill |
| `lib/import-assistent-supabase.js` | currentUser | ✅ via Polyfill |
| `lib/editor-spell-layer.js` | currentUser | ✅ via Polyfill |
| `lib/docx-export.js` | currentUser für Watermark | ✅ via Polyfill |

### Docs/Tests/Archive (nicht Production-Path)

| File | Kategorie |
|---|---|
| `tests/editor/m40-p1.2-editor-tiptap.test.js` | Test (Mock) |
| `docs/strategie/AUTH-PERFEKT-2.0-PLAN.md` | Original-Plan-Doku |
| `docs/MARCEL-SMOKE-TEST-MEGA46.md` | Test-Liste |
| `docs/MARCEL-FINAL-NETLIFY-ENV-CLEANUP.md` | ENV-Cleanup-Doku |
| `docs/sprint-status/MEGA46-MISMATCH-AUDIT.md` | Historische Audit-Doku |
| `docs/INFRASTRUKTUR-REFERENZ.md` | Architektur-Ref |
| `CHANGELOG-MASTER.md` | Changelog |
| `docs/diagnose/TOT-CODE-DECISION-invite-user.md` | Tot-Code-Doku |
| `scripts/cutover/03-netlify-identity-disable.md` | Cutover-Anleitung |
| `masterplan-v2/03_SYSTEM-ARCHITEKTUR.md` | Masterplan |
| `docs/archiv-alte-sprints/2026-pre-mega74/SPRINT-K-1-3-4-5-MEGA-PROMPT.md` | Archiv |
| `docs/ops/env-cleanup-phase-2.md`, `env-audit-2026-05-07.md` | ENV-Doku |

---

## Polyfill-Removal-Optionalität (FUTURE, nicht jetzt)

Wenn Marcel den Polyfill wirklich entfernen will (z.B. weil API-Surface zu groß):

1. **Bulk-Refactor 14 Files**: ersetze `netlifyIdentity.currentUser()` → `(await supabase.auth.getUser()).data.user`
2. **Bulk-Refactor 14 Files**: ersetze `netlifyIdentity.logout()` → `supabase.auth.signOut()` + Bridge.clear()
3. Polyfill-Script-Tag aus HTML entfernen
4. `lib/netlify-identity-polyfill.js` löschen

**Aufwand:** 2-3h. Risk: zu refactorende Caller könnten Bugs einführen. Pragmatisch: **Polyfill bleibt** bis es einen anderen Grund gibt.

---

## ENV-Vars (Cleanup-Status post-MEGA46)

Aus `docs/ops/env-cleanup-phase-2.md`:

| ENV-Var | Status |
|---|---|
| `NETLIFY_IDENTITY_URL` | deprecated (nicht mehr gelesen) |
| `NETLIFY_IDENTITY_AUDIENCE` | deprecated |
| `NETLIFY_IDENTITY_INVITE_REDIRECT` | deprecated |
| `GOTRUE_URL` | deprecated |
| `GOTRUE_JWT_SECRET` | deprecated |

**Marcel-Task** (DEFER): Diese ENV-Vars aus Netlify-Dashboard löschen. Affects nichts mehr im Code.

---

## Acceptance Block B ✅

- ✅ 0 echtes netlify-identity-widget-Script-Tag im Repo
- ✅ netlify.toml hat 0 `/.netlify/identity/*`-Redirects
- ✅ Polyfill als bewusste Compat-Architektur dokumentiert
- ✅ Caller-Inventory komplett (14 Production + 12 Doku/Test)
- ✅ ENV-Cleanup-Pfad dokumentiert (Marcel-Task außerhalb Code)

**Marcel-Direktive „Netlify Identity removed" → BESTÄTIGT ERFÜLLT seit MEGA⁴⁶.**
