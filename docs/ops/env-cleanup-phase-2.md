# ENV-Variablen Cleanup-Phase 2 (MEGA²⁴ Block 10)

**Stand:** 2026-05-09 nach MEGA²⁴
**Vorgaenger:** docs/ops/env-audit-2026-05-07.md (Phase 1)

## Status-Liste (Stand MEGA²⁴)

### ACTIVE — Production-Pflicht
| Variable | Zweck | Set in | Notes |
|---|---|---|---|
| `SUPABASE_URL` | Supabase-Project-URL | Netlify ENV | Public OK |
| `SUPABASE_ANON_KEY` | Public-Anon-Key | Netlify ENV | Public OK |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Netlify ENV | Server-only Pflicht |
| `STRIPE_SECRET_KEY` | Stripe API | Netlify ENV | Server-only Pflicht |
| `STRIPE_WEBHOOK_SECRET` | Webhook-Verify | Netlify ENV | Server-only |
| `OPENAI_API_KEY` | GPT-4o + Whisper | Netlify ENV | Server-only |
| `ANTHROPIC_API_KEY` | Claude Sonnet 4.6 | Netlify ENV | Server-only (NEU MEGA²²) |
| `KI_VISION_PROVIDER` | =anthropic\|openai | Netlify ENV | NEU MEGA²² |
| `KI_TEXT_PROVIDER` | =openai (Konjunktiv-II Pflicht) | Netlify ENV | NEU MEGA²² |
| `KI_FALLBACK_MODEL` | =gpt-4o-mini | Netlify ENV | NEU MEGA²² |
| `AUTH_HMAC_SECRET` | Token-Signing (32+ Zeichen) | Netlify ENV | Server-only |
| `PDFMONKEY_API_KEY` | PDF-Generation | Netlify ENV | Server-only |
| `PDFMONKEY_MODE_C_TEMPLATE_ID` | PDFMonkey-Template | Netlify ENV | — |
| `SENTRY_DSN_FUNCTIONS` | Lambda-Error-Tracking | Netlify ENV | M3-Sprint |
| `PROVA_SENTRY_TEST_SECRET` | /sentry-test Endpoint | Netlify ENV | M3-Sprint |
| `IMPERSONATION_NOTIFY` | =on (DSGVO-Email) | Netlify ENV | NEU MEGA²³ |
| `SMTP_HOST` | Email-Relay | Netlify ENV | NEU MEGA²³ |
| `SMTP_USER` | SMTP-Auth | Netlify ENV | NEU MEGA²³ |
| `SMTP_PASS` | SMTP-Auth | Netlify ENV | NEU MEGA²³ |
| `SMTP_FROM` | Email-From-Address | Netlify ENV | NEU MEGA²³ |
| `SMTP_PORT` | Default 587 | Netlify ENV | Optional |

**Neue ENV-Vars für MEGA²⁰-²⁴:** 9 (KI-Routing 4 + Impersonation 5)

### LEGACY — Phase-Out bei K-1.5 Cutover
| Variable | Zweck | Phase-Out |
|---|---|---|
| `AIRTABLE_BASE_ID` | Airtable-Proxy | K-1.5 |
| `AIRTABLE_API_KEY` | Airtable-Auth | K-1.5 |
| `MAKE_WEBHOOK_S6` | Make.com-Scenario | K-1.5 |
| `NETLIFY_IDENTITY_*` | Identity-Auth | K-1.5 |
| `CLOUDINARY_*` | Foto-Storage | K-1.5 |

### TBD — Kandidaten für Cleanup
| Variable | Frage |
|---|---|
| `MAKE_WEBHOOK_*` | Welche Make-Scenarios noch aktiv? |
| `RESEND_API_KEY` | Existing oder noch nicht? (CLAUDE.md erwähnt Resend) |
| Diverse Stripe-Test-Keys | Welche Test-Mode-Keys aktuell genutzt? |

## Cleanup-Strategie

### Phase 2A (vor Pilot, optional)
- Set + Verifizieren der 9 neuen MEGA²³+²⁴-Vars
- Test-Run via /sentry-test + /admin-impersonate (mit Email-Empfang)

### Phase 2B (während Pilot)
- Monitor welche LEGACY-Vars noch in Logs auftauchen
- Pro auftauchende Var: Code-Path zurückverfolgen + Migration zu Supabase planen

### Phase 2C (post K-1.5 Cutover)
- LEGACY-Vars aus Netlify entfernen (NICHT vor Cutover!)
- Final-Audit + Documentation-Update

## Marcel-Pflicht vor Pilot

**Set in Netlify Dashboard:**
1. KI_VISION_PROVIDER=anthropic
2. KI_TEXT_PROVIDER=openai
3. KI_FALLBACK_MODEL=gpt-4o-mini
4. ANTHROPIC_API_KEY=<key>
5. IMPERSONATION_NOTIFY=on
6. SMTP_HOST + SMTP_USER + SMTP_PASS + SMTP_FROM (für DSGVO-Email)

**Verify via:**
- /sentry-test → 200 OK
- /admin-impersonate (mit Test-Workspace) → Email an billing_email
- Settings-Tab in Admin-Cockpit → ENV-Status grün

---

*ENV-Cleanup Phase 2, MEGA²⁴ Block 10*
