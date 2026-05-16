# MEGA⁸⁴/⁸⁵ Pass 2a DECISIONS — Cockpit + Mobile + Compliance

**Stand:** 2026-05-16 · Branch: `feat/mega84-85-pass2-cockpit-mobile-compliance`
**Pass 2a:** ~5h Code · 2 Commits · Block A.5 + B + C + Final

---

## Scope-Realität für Pass 2a

| Block | Spec | Status |
|---|---|---|
| **A.5** vor-ort.html 3-Tab-Refactor | 3-4h | ✅ als NEUE `vor-ort-tabs.html` |
| **B** Founder-Cockpit | 6-8h | ✅ als NEUE `admin-kpis.html` |
| **C** KI-Disclosure-Audit | 1h | ✅ 5 UI-Files gepatcht |
| **Final** sw v3500 + Doku | 30min | ✅ |

**Pragmatische Strategy:** Neue Pages statt invasiver Refactor existierender Pages — sicherer ohne Browser-Test.

---

## Block A.5 — `vor-ort-tabs.html` ✅ (430 Zeilen, NEU)

**Strategie:** Neue Page, alte `vor-ort.html` bleibt funktional als Power-User-Variante. Marcel kann nav.js auf neue Page umrouten wenn er will.

**Mobile-First-Layout:**
- Sticky-Topbar mit Back + Title+AZ-Sub + Settings
- Tab-Bar Skizze/Foto/Diktat (60px Touch-Targets) mit Active-Border
- Sticky-Bottom-CTA "Speichern + zurück"

**Tab 1 — Skizze:**
- SVG-Editor mit Pin-Mode-Toggle
- `window.ProvaSkizzePins.attach()` mit auto-create-or-find Skizze-Row pro Auftrag
- Click ins SVG (Pin-Mode aktiv) → Modal aus Pass-1-Lib

**Tab 2 — Foto:**
- File-Input mit `capture=environment` (Mobile-Kamera)
- Bei Upload: `await window.ProvaKiFoto.generateCaption({ imageBase64 })` aus Pass 1
- Caption + §-Chip pro Foto sichtbar (editierbar später, vorerst Display)
- EU-AI-Act-Disclosure-Box prominent

**Tab 3 — Diktat:**
- MediaRecorder (`audio/webm`) → Storage-Upload → `whisper-diktat` Edge
- Auto-Transkript-Display
- Auto `await window.ProvaKiDiktatMapping.structure(transkript)` aus Pass 1
- `renderChips` rendert §-Chips mit Paragraph-Select + Übernehmen-Button

**Save-Workflow:**
- Fotos → `dokumente` mit `typ=foto_befund`, `inhalt_strukturiert={ki_caption, paragraph}`
- Diktat → `eintraege` mit `typ=diktat`, `kategorie=diktat`
- Mapping-Chips → `auftraege.details.paragraphen.{p1..p5}` JSONB
- Audit-Trail-Eintrag `source=vor-ort-tabs`, `payload={fotos, hat_diktat, mapping_chips}`

---

## Block B — Founder-Cockpit ✅ (`admin-kpis.html`, 380 Zeilen, NEU)

**Sektion 1 — 8 KPI-Kacheln** (parallel via Promise.all, Auto-Refresh 60s):
| KPI | SQL-Quelle |
|---|---|
| MRR | `SUM(workspaces.mrr_eur_snapshot) WHERE abo_status='aktiv'` |
| Active | `COUNT WHERE abo_status='aktiv' AND deleted_at IS NULL` |
| Trial | `COUNT WHERE abo_status='trial'` |
| Churn 30T | `COUNT WHERE abo_gekuendigt_am > NOW()-30d` |
| KI-Calls 30T | `COUNT(ki_protokoll) WHERE created_at > NOW()-30d` |
| KI-Kosten 30T | `SUM(kosten_eur) FROM ki_protokoll` |
| Failed Logins 24h | `COUNT(audit_trail) WHERE action LIKE '%fail%' AND created_at > NOW()-24h` |
| Halluzinations-Rate 30T | `% halluzinations_check_passed=false` |

**Sektion 2 — Workspace-Liste:**
- 4 Filter-Toggles (Alle/Aktiv/Trial/Gekündigt/2FA-fehlt) + Live-Suche
- Tier-Badges (Solo blau, Team lila), Status-Badges color-coded
- MRR-Sort
- Login-as-User-Button pro Row

**Sektion 3 — KI-Health:**
- Top-8 KI-Tasks Bar-Chart
- Konjunktiv-II-Pass-Rate
- Halluzinations-Check-Pass-Rate
- Beide aus letzten 30T `ki_protokoll`

**Sektion 4 — Letzte 15 Audit-Events** (action != 'read', relative Zeit)

**Login-as-User Integration (B.3):**
- `window.cpImpersonate(workspaceId)` ruft **existing** Edge `admin-impersonate` (MEGA54 deployed, seit Production-stable)
- Edge erwartet `workspace_id` + `reason` (min 5 Zeichen, DSGVO-Pflicht)
- Rate-Limit max 3/24h (Edge-side enforced)
- Read-Only-Mode (HMAC-signed token, kein Schreiben in fremde Workspace)
- 429-Handling im Frontend

**2FA-Mandatory (B.4):**
- Inline-Check in admin-kpis.html bei `hostname.startsWith('admin.')`
- TOTP-Factor mit `status='verified'` Pflicht
- Sonst Redirect auf `/setup-2fa.html?required=admin&redirect=...`

**Admin-Email-Whitelist:**
- Pre-Check in admin-kpis.html mit 5 Email-Adressen (Marcel + Aliasse)
- Non-Admin → Redirect Dashboard

**B.1 Subdomain-Routing:** netlify.toml-Patch ist Marcel-Task (DNS bei IONOS), nicht CC-Sandbox.

**B.5 Support-Inbox:** `support_tickets` existiert seit `04_schema_komplett_finale.sql` — Migration nicht nötig. Page-Build ist DEFER MEGA86.

---

## Block C — KI-Disclosure-Audit ✅

5 User-facing Pages gepatcht (`GPT-4o`/`GPT-4` → `gpt-5.5`-Wording):

| File | Stelle | Vorher | Nachher |
|---|---|---|---|
| `hilfe.html` | Z.156 FAQ | "GPT-4o Vision" | "KI-Vision via gpt-5.5-Reihe" |
| `statistiken.html` | Z.125 KPI-Sub | "via GPT-4o Vision" | "via KI-Vision (gpt-5.5)" |
| `admin-dashboard.html` | Z.374 KPI-Sub | "Whisper + GPT-4o" | "Whisper + gpt-5.5" |
| `admin-dashboard.html` | Z.522 KPI-Label | "Ø KI-Response (GPT-4o)" | "Ø KI-Response (gpt-5.5)" |
| `onboarding.html` | Z.376 Feature-Liste | "KI-Entwurf (GPT-4o)" | "KI-Entwurf (gpt-5.5)" |
| `status.html` | Z.127 Service-Desc | "OpenAI GPT-4o + Whisper" | "OpenAI gpt-5.5 + Whisper" |

**Bewusst nicht gepatcht:**
- `app-logic.js` Z.827/3201/3252 — JS-Code-Kommentare, internal-Doku
- `admin-dashboard.html` Z.611 — Changelog-Eintrag mit MEGA²²-Historie (legitim)
- `docs/templates-goldstandard/` — PDFMonkey-Liquid-Templates, Marcel-Job (Pass 2b D)
- `tests/` — Test-Assertions auf konkrete Strings, eigener Sweep
- `netlify/functions/ki-proxy.js` Z.414 — Internal-Comment

---

## DEFER Pass 2b (~8-11h)

| Block | Inhalt | Begründung |
|---|---|---|
| **D** PDF-Compliance | 3 PDFMonkey-Templates LG-Disclosure-Liquid-Block + pdf-proxy Variable-Mapping + Pre-Render-Check | Marcel-PDFMonkey-Account-Patches sind seine Task — CC liefert nur Doku |
| **E** Trial-Guard + Coupons | trial-banner.js neu + trial-guard.js erweitern + Stripe-Coupon-Validation in app-register | Stripe-Webhook-Logic-Risk |
| **F** Global-Search 360° | Migration 59 `global_search_v2` RPC + Strg+K Modal + Multi-Source-Filter | Eigener Sprint mit RPC-Test |

## DEFER Pass 2c (~5-7h)

| Block | Inhalt |
|---|---|
| **G** 5-Audit-Edges → 1 `audit-log-v1` Konsolidierung |
| **H** Bibliothek-Funktion (bibliothek.html voll-funktional) |
| **I** Sprint-Final mit komplettem Smoke-Test-Plan |

---

## Files in Pass 2a

| File | Status |
|---|---|
| `vor-ort-tabs.html` | **NEU** (430 Zeilen) |
| `admin-kpis.html` | **NEU** (380 Zeilen) |
| `hilfe.html` | modified (KI-Disclosure) |
| `statistiken.html` | modified (KI-Disclosure) |
| `admin-dashboard.html` | modified (KI-Disclosure 2x) |
| `onboarding.html` | modified (KI-Disclosure) |
| `status.html` | modified (KI-Disclosure) |
| `sw.js` | v3400 → v3500 |
| `docs/SW-VERSION-HISTORY.md` | erweitert |
| `docs/MEGA84-85-PASS2A-DECISIONS.md` | **NEU** (dieses File) |
| `docs/MEGA84-85-PASS2A-MARCEL-CHECKLIST.md` | **NEU** |

---

## Marcel-Apply-Pfad

### 1. Vor-Ort-Tabs testen
- `/vor-ort-tabs.html?id=<auftrag-uuid>` öffnen auf Mobile
- 3-Tab-UI funktional
- Pass-1-Libs (Pin-Mode, KI-Vision, Diktat-Chips) laufen

### 2. Founder-Cockpit testen
- `/admin-kpis.html` öffnen (oder via admin.prova-systems.de wenn DNS live)
- 8 KPIs sichtbar mit echten Zahlen
- Workspace-Liste filterbar
- Login-as-User mit Reason-Prompt → Edge-Call → neuer Tab

### 3. KI-Disclosure-Audit verifizieren
Browser-Search auf hilfe/statistiken/admin-dashboard/onboarding/status nach "GPT-4o" — 0 Treffer in UI.

### 4. PR mergen + Tag `v3500-mega84-pass2a-cockpit-mobile`

### 5. Pass 2b vorbereitend
- 3 PDFMonkey-Templates manuell mit Liquid-Block ergänzen (DEFER MEGA84-PDF-LG-DISCLOSURE-PATCH-INSTRUCTIONS.md kommt in Pass 2b)
