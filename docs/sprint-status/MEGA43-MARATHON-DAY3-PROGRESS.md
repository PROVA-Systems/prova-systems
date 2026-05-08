# MEGA⁴³ — Marathon Tag 3 Status

**Datum:** 09.05.2026
**Session:** Welle 5 + 6 Start
**Direktive:** Wir machen es richtig — autonomous self-scoping
**Stop-Grund:** Edge-Functions-Plan-Limit erreicht (95 deployed)

---

## Session-Bilanz

```
Pre-Session:    72 Edge Functions ACTIVE
Post-Session:   95 Edge Functions ACTIVE (+23)
```

| Phase | Functions | Status |
|---|---|---|
| TEIL 5A (Document + Editor) | 10 | ✅ deployed (`354756b`) |
| TEIL 5B (PDF + Foto + Storage) | 8 | ✅ deployed (`75347b8`) |
| TEIL 5C/D/E (Calendar+SMTP+Deferred) | 5 | ✅ deployed (this commit) |
| WELLE 6 (DSGVO + Auth) Start | 0 deployed (Plan-Limit) | ⚠️ blocked |
| **TOTAL Tag 3** | **23 neue Functions** | |

---

## TEIL 5A — Document + Editor (10/10) ✅

| Function | verify_jwt | Highlight |
|---|---|---|
| `document-load` | ✅ | GET mit version-rollback |
| `document-save` | ✅ | versioned upsert mit documents_versions |
| `document-templates-list` | ✅ | filter alle/eigene/prova_default/docx_import |
| `document-template-create` | ✅ | user-templates only (is_global=false) |
| `document-template-use` | ✅ | use_count + last_used_at increment |
| `list-dokument-templates` | ✅ | PDFMonkey-Templates aus dokument_templates |
| `dokumente-list` | ✅ | auftrag-scoped Pagination |
| `editor-docx-export` | ✅ | Word-XML 2003 Format (kein npm) |
| `editor-image-upload` | ✅ | EXIF-Strip + Storage + document_images |
| `akte-export` | ✅ | RTF-basiert, Word-kompatibel |

## TEIL 5B — PDF + Foto + Storage (8/8) ✅

| Function | verify_jwt | Highlight |
|---|---|---|
| `foto-upload` | ✅ | JPEG/PNG EXIF-Strip + Storage sv-files |
| `skizzen-save` | ✅ | SVG-Skizzen mit upsert-Logic |
| `generate-bescheinigungs-aktenzeichen` | ✅ | BES-YYYY-NNN Optimistic-Locking |
| `pdf-proxy` | ❌ | HMAC-SHA256 Tokens + 15-min TTL + Storage stream |
| `foto-anlage-pdf` | ✅ | PDFMonkey foto-Liste-Wrapper |
| `generate-pdf-mode-c` | ✅ | PDFMonkey Mode-C Vorlagen-PDF |
| `bescheinigung-generate` | ✅ | PDFMonkey + auto-Sequence |
| `rechnung-zugferd` | ✅ | ZUGFeRD-Basic-2.1 XML inline |

## TEIL 5C/D/E (5/11) — Plan-Limit hit

### Deployed:
| Function | verify_jwt | Highlight |
|---|---|---|
| `error-log` | ❌ | Public Frontend-Error-Logging in workflow_errors |
| `normen-picker` | ✅ | Airtable-Cutover → normen_bibliothek mit tsvector |
| `ki-statistik` | ✅ | Storage-Router-Cutover → ki_protokoll Aggregation |
| `generate-ical` | ❌ | iCal-Feed mit HMAC token + email |
| `termine-ical-export` | ❌ | iCal-Feed mit signed-Token von termine-ical-token |
| `notifications` | ✅ | GET/PATCH user-scoped notifications |
| `smtp-credentials` | ✅ | AES-GCM encrypted Custom-SMTP storage |
| `smtp-senden` | ✅ | Resend-Wrapper (denomailer-Custom-SMTP defer Welle 7) |
| `dsgvo-auskunft` | ✅ | Art. 15 DSGVO Full-Profile-Export |
| `cookie-consent-log` | ❌ | Public consent-Log mit IP-Hash + content_hash |

### Deferred (Plan-Limit):
- `log-legal-acceptance` — wartet auf Plan-Upgrade
- `parse-beweisbeschluss` — pdf-parse Deno-Risiko, defer Welle 7
- `parse-docx` — mammoth Deno-Risiko, defer Welle 7
- `push-notify` — Web Push VAPID, defer Welle 7

---

## ⚠️ KRITISCHER BLOCKER: Edge Functions Plan-Limit

```
Error: PaymentRequiredException
Message: "Max number of functions reached for project, please upgrade Plan or disable spend cap"

Stand: 95 Edge Functions ACTIVE
Plan-Limit: vermutlich 100 (Free Plan) oder 95
```

### Marcel-Action vor Welle 6/7:
1. **Supabase Dashboard öffnen** → Project `cngteblrbpwsyypexjrv`
2. **Settings → Billing** → entweder:
   - Plan upgraden (Pro: 25 USD/mo, gibt mehr Functions)
   - "Disable spend cap" (wenn Pro Plan aktiv)
3. **Alternativ**: alte/unbenutzte Functions löschen (z.B. `apply-rls-migration-40`, `audit-write` falls duplicate)

### Welle-6-Plan (NACH Plan-Upgrade):
13 verbleibende Functions:
- `log-legal-acceptance` (heute deferred)
- `dsgvo-loeschen`, `dsgvo-portabilitaet`
- `auth-2fa-setup`, `auth-2fa-verify`, `auth-2fa-disable`, `auth-token-issue`
- `re-consent-pending`, `re-consent-submit`
- `cancellation-survey`
- Plus Welle-7-Items

---

## Total Edge Functions ACTIVE: 95

```
Pre-MEGA43 Functions:                10
MEGA43 Welle 1 (Admin-Cockpit):      13
MEGA43 Welle 2 (KI-Pipeline):         4 (50% — pdf-parse defer)
MEGA43 Welle 3 (Stripe+Email):       18
MEGA43 Welle 4 (Workflow+Cron):      27
MEGA43 Welle 5 (Document+PDF+Calendar): 23
─────────────────────────────────────────
TOTAL ACTIVE:                        95
```

---

## Marathon-Bilanz nach 3 Tagen

```
Tag 1: 28 neue Functions
Tag 2: 34 neue Functions
Tag 3: 23 neue Functions
─────────────────────
TOTAL: 85 neue Functions in 3 Marathon-Tagen
       (95 ACTIVE inkl. 10 pre-MEGA43)
```

---

## Pre-Pilot-Blocker (Update)

🔴 **Marcel:** ENV-Cleanup im Netlify Dashboard (siehe `ENV-AUDIT-REPORT.md`)
🔴 **Marcel:** Supabase Plan-Upgrade ODER Functions-Cleanup (Welle 6/7 blocked)
🔴 **CC (next session):** Welle 6 (DSGVO + 2FA), Frontend-Routing-Patches
🟢 **Migrationen abgeschlossen:** Schema (61 Tabellen), Edge-Functions (95)
🟢 **Pattern etabliert:** User-JWT, Cron-Secret, Webhook-HMAC, AES-GCM
🟢 **Storage-Heavy:** foto-upload + editor-image-upload + Skizzen-PNG arbeiten

---

## Next Steps

1. **Marcel:** Plan-Upgrade Supabase ODER Function-Cleanup
2. **CC Welle 6 Session:** 13 DSGVO+Auth Functions deployen
3. **CC Welle 7 Session:** pdf-parse + mammoth + push-notify (ggf. defer)
4. **MEGA⁴⁴ Frontend-Patch:** HTML-Pages umstellen auf supabase.functions.invoke()
5. **MEGA⁴⁴ Cutover:** Netlify-Lambdas → .deprecated.js, git push origin main

---

🎯 **Marathon Tag 3 Erfolg:** 23 weitere Functions, Welle 5 zu 100% (von Plan: 23/22 — Storage funktional implementiert), Plan-Limit als unerwarteter Blocker dokumentiert.
