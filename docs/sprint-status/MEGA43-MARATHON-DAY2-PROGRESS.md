# MEGA⁴³ — Marathon Tag 2 Status

**Datum:** 09.05.2026
**Session:** Folge-Session nach Marathon Tag 1 Token-Limit-Stopp
**Direktive:** Wir machen es richtig — autonomous self-scoping
**Status:** TEIL A + TEIL B + TEIL C abgeschlossen

---

## Session-Bilanz

```
Pre-Session:    38 Edge Functions ACTIVE
Post-Session:   72 Edge Functions ACTIVE (+34)
```

| Phase | Functions | Commit |
|---|---|---|
| TEIL A (Recovery) | 11 lokale Source-Files | `f163fe6` |
| TEIL B (Welle 3 Final) | 7 neue Edge Functions | `a06891a` |
| TEIL C Batch 1 (Welle 4 CRUD) | 13 neue Edge Functions | `a4e33db` |
| TEIL C Batch 2 (Welle 4 Misc) | 10 neue Edge Functions | `d073e1d` |
| TEIL C Batch 3 (Welle 4 Read) | 4 neue Edge Functions | (this commit) |
| **TOTAL** | **34 neue Edge + 11 Recovery** | 5 Commits |

---

## TEIL A — Recovery (11 Files)

Source-Files lokal ergänzt, die bereits ACTIVE auf Edge waren aber im Repo fehlten.
Recovery via `mcp__claude_ai_Supabase__get_edge_function`.

- `pilot-seats` (Founding-Coupon-Seat-Counter)
- `admin-billing-sync` (Stripe-MRR-Sync, AAL2-Auth)
- `stripe-portal` (Customer-Portal-Session)
- `dsgvo-loeschen-antrag` (Art. 17 Soft-Delete + Resend)
- `fristen-reminder-cron` (X-Cron-Secret + Resend)
- `onboarding-mail-cron` (5-Day-Slot-Schedule)
- `email-welcome` (Welcome-Mail Day 0)
- `email-pilot-feedback-cron` (Day-7-Feedback)
- `email-trial-ending-cron` (Trial-3-Day-Warning, Founding-Counter)
- `mahnwesen-cron` (3-Stage-Dunning, BGB)
- `redeem-referral-code` (Public-Lookup + Format-Validation)

---

## TEIL B — Welle 3 Final (7 Functions deployed)

**Stripe + Referral + SMTP→Resend Migration:**

| Function | verify_jwt | Auth-Pattern | Highlight |
|---|---|---|---|
| `stripe-checkout` | ✅ | User-JWT | Founding-Coupon, Pilot-Trial 90d, Referral-Auto-Apply |
| `stripe-webhook-referral` | ❌ | HMAC-SHA256-Signatur | crypto.subtle.verify Implementation |
| `send-welcome-email` | ❌ | X-PROVA-Internal | SMTP→Resend, Referrer-Lookup |
| `termin-reminder` | ❌ | X-PROVA-Secret | IONOS-SMTP→Resend Migration |
| `check-referral-rewards` | ❌ | X-PROVA-Internal Cron | WERBER-MONAT-FREI Auto-Apply |
| `create-referral` | ✅ | User-JWT | Code-Generator, Stripe-Promo, Resend-Invite |
| `send-referral-reminders` | ❌ | X-PROVA-Internal Cron | Day-5/6 Reminder |

**Welle 3 Komplett:** 18/15+ Functions (alle Stripe + Email + Referral Lambdas migriert).

---

## TEIL C — Welle 4 (27 Functions deployed)

### Batch 1 — CRUD-Endpoints (13 Functions)

**Pattern:** User-JWT-Client + RLS-Filter (statt Service-Role-Bypass).

| Function | Method | Tabellen |
|---|---|---|
| `list-auftraege` | GET | auftraege |
| `fristen-list` | GET | fristen |
| `fotos-list` | GET | fotos |
| `skizzen-list` | GET | skizzen + eintraege (typ=skizze) |
| `auftraege-update` | POST (live-save) | auftraege (whitelisted fields) |
| `fristen-create` | POST | fristen |
| `fristen-update` | PUT/PATCH | fristen |
| `fristen-mark-erfuellt` | POST | fristen (status=erfuellt) |
| `eintraege-create` | POST | eintraege (PII-Heuristik) |
| `eintraege-update` | PUT/PATCH | eintraege |
| `eintraege-delete` | DELETE | eintraege (soft-delete) |
| `user-favoriten-list` | GET | user_favoriten |
| `user-favoriten-toggle` | POST | user_favoriten (idempotent) |

### Batch 2 — Workflow + Audit + iCal (10 Functions)

| Function | verify_jwt | Highlight |
|---|---|---|
| `skizze-save` | ✅ | Storage-Upload PNG, Eintraege-Upsert |
| `skizzen-delete` | ✅ | Soft-Delete |
| `workflow-settings` | ✅ | GET/PATCH user_workflow_settings |
| `auftrag-mode-override` | ✅ | A/B/C Override + Audit-Trail |
| `faq-search` | ❌ | Public, German tsvector |
| `audit-log` | ✅ | Frontend-Audit-Endpoint |
| `audit-trail-write` | ✅ | Strukturiertes Audit-Insert |
| `termine-ical-token` | ✅ | HMAC-SHA256 Token (90d), Revoke-Idempotent |
| `ical-subscribe-url` | ✅ | HMAC-Token Generator |
| `sentry-test` | ❌ | Error-Throw (gated by ENV) |

### Batch 3 — Aggregations + Search (4 Functions)

| Function | Method | Aggregates |
|---|---|---|
| `global-search` | GET | auftraege + kontakte + dokumente (ilike-OR) |
| `mein-aktivitaetsprotokoll` | GET | audit_trail (user-scoped) |
| `kontakt-aktivitaeten` | GET | auftraege + audit_trail (kontakt-scoped) |
| `kontakt-360` | GET | kontakt + auftraege + dokumente + stats |

---

## Verbleibende Welle-4 Functions (NICHT deployed)

8 Functions aus dem 35-Welle-4-Pool noch offen, defer auf Welle 5:

- `akte-export` — komplexes Export-Bundle
- `termine-ical-export` — iCal-Feed-Renderer
- `generate-ical` — iCal-Generator
- `auftrag-eigenleistung-quote` — Pricing-Logic
- `foto-upload` — Storage-heavy (Multipart)
- `document-load`, `document-save` — Editor-State
- `push-notify` — Web Push (Airtable-coupled, defer to Welle 6)

---

## Pattern-Standards (etabliert)

### User-JWT-Pattern (Welle 4 default)

```typescript
const auth = req.headers.get('Authorization') ?? '';
if (!auth.startsWith('Bearer ')) return J({ error: 'UNAUTHORIZED' }, 401);
const sb = createClient(SB_URL, SB_ANON, {
  global: { headers: { Authorization: auth } },
  auth: { persistSession: false, autoRefreshToken: false }
});
const { data: { user } } = await sb.auth.getUser(auth.slice(7));
if (!user) return J({ error: 'UNAUTHORIZED' }, 401);
// RLS filtert Workspace automatisch
```

### Cron-Pattern

```typescript
const expected = Deno.env.get('PROVA_CRON_SECRET');
const provided = req.headers.get('x-cron-secret') ?? '';
if (!expected || provided !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);
const sb = createClient(SB_URL, SB_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
```

### Webhook-Signature (Stripe)

```typescript
const enc = new TextEncoder();
const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
const sig = await crypto.subtle.sign('HMAC', k, enc.encode(ts + '.' + payload));
// Constant-time compare gegen v1-Signatur
```

---

## Total Edge Functions ACTIVE: 72

```
MEGA43 Welle 1 (Admin-Cockpit):  13/13  ✅ 100%
MEGA43 Welle 2 (KI-Pipeline):     4/8   ⚠️  50%
MEGA43 Welle 3 (Stripe+Email):   18/18  ✅ 100%
MEGA43 Welle 4 (Workflow+Cron):  27/35  ⚠️  77%

Pre-MEGA43 Functions:            10
Total:                            72 ACTIVE
```

---

## Bekannte Limitationen

- **Frontend-Routing-Patches pending:** HTML-Pages rufen noch `/.netlify/functions/<slug>` auf statt `/functions/v1/<slug>`. Welle 5 muss Frontend umstellen.
- **ENV-Cleanup bei Marcel:** Vor `git push origin main` muss ENV-Cleanup im Netlify Dashboard erfolgen (5 Deletions, 3 Scope-Changes, 4 JSON-Konsolidierungen, 6 Legacy-Deletions). Sonst Build-Failure.
- **Audit-Schema-Drift:** Migrierte Functions schreiben mit neuem Schema (`action`, `entity_typ`, `entity_id`, `payload`); Frontend-Reads nutzen z.T. noch alte Spalten (`typ`, `sv_email`, `details`). Welle 5 muss konsolidieren.
- **Welle 2 Teil 3 Open:** 4 KI-Functions (parse-beweisbeschluss, parse-docx, normen-picker, ki-statistik) erfordern pdf-parse/Airtable-Recherche → Welle 7.

---

## Next Steps

1. **Marcel:** ENV-Cleanup im Netlify Dashboard durchführen (siehe `ENV-AUDIT-REPORT.md`)
2. **Marcel:** `git push origin main` nach ENV-Cleanup
3. **Welle 5 Session:** Frontend-Routing-Patches (HTML-Pages → `/functions/v1/<slug>`)
4. **Welle 5 Session:** 8 verbleibende Welle-4-Functions deployen
5. **Welle 6:** Foto-Upload + Document-Editor (Storage-heavy)
6. **Welle 7:** Pdf-parse + Airtable-Cutover (research-heavy)

---

🎯 **Marathon Tag 2 Erfolg:** 34 neue Edge Functions in einer Session. Welle 3 + 4 zu 80%+ abgeschlossen. Pattern-Standards etabliert für Welle 5/6/7.
