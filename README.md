# PROVA Systems

**Status:** ✅ Vision 100% Komplett · **Tag:** v950 · **Stand:** 07.05.2026

KI-natives B2B-SaaS für **öffentlich bestellte und vereidigte Bausachverständige** in Deutschland.

## Quick-Stats

- **5 MEGA-Wellen:** ³⁰ → ³⁴
- **~57 Items, ~660 neue Tests** (in M30-M34)
- **4-Flow-Architektur:** Schadensgutachten / Wertgutachten / Beratung / Baubegleitung
- **Compliance:** IHK-SVO 4-Teile + § 407a ZPO + EU AI Act + DSGVO

## Tech-Stack

| Bereich | Technologie |
|---|---|
| Frontend | Vanilla JavaScript (kein Framework) |
| Datenbank | Supabase Postgres (Frankfurt eu-central-1) |
| Auth | Supabase Auth + JWT + 2FA für Admin |
| Storage | Supabase Storage |
| Backend | Netlify Functions (Lambdas) |
| Workflow | pg_cron + Lambdas |
| PDFs | PDFMonkey |
| Email | Resend (EU) |
| Zahlung | Stripe |
| KI | OpenAI GPT-5.5/5.4 + Anthropic Claude (Backup) |
| Hosting | Netlify |
| Domain | prova-systems.de · app.prova-systems.de · admin.prova-systems.de |

## Repo-Struktur

```
prova-systems/
├── CLAUDE.md                    Arbeits-Richtlinien für Claude Code
├── docs/master/                 VISION + SPRINTS + CHAT-TRANSPORT
├── docs/templates-goldstandard/ PDFMonkey-Templates (12 Gutachten + 6 Bescheinigungen + 3 Briefe + 5 Mails)
├── docs/audit/                  Pro Sprint Audit-Berichte
├── docs/sprint-status/          Pro Sprint FINAL-Reports
├── docs/legal/                  AVV-Master + Anwalt-Paket
├── lib/                         Frontend-Libs (UMD-Pattern)
├── netlify/functions/           Lambdas (Deno + Node)
├── supabase-migrations/         SQL-Migrationen (versioniert)
├── tests/                       Node:test (~1000+ Tests)
└── *.html *.js                  Production-Pages + Page-Logic
```

## Pricing (fix)

- **Solo:** 179€/mo (bis 30 Aufträge, 5 GB)
- **Team:** 379€/mo (unlimitiert, bis 5 User, 50 GB)
- **Founding:** 99€/mo lifetime (erste 10 Pilot-Kunden)

## Tests

```bash
npm test                  # Node:test Suite (~1000+ Tests)
npm run test:e2e          # Playwright E2E (M34 C2)
npm run test:ki-live      # KI-Live-Verify mit echten API-Calls (M34 C1, opt-in)
```

## Pilot-Live Manual-Steps (Marcel)

Siehe `docs/ops/PILOT-LIVE-SETUP-MARCEL.md` — 8 Steps:
1. Branch-Merge mega30→31→32→33→34→main
2. AVV-Anwalt-Review (`docs/legal/AVV-PAKET-FUER-ANWALT.md`)
3. Stripe Live-Webhook + STRIPE_WEBHOOK_SECRET
4. PDFMonkey-Upload 8 Templates + UUIDs in Netlify-ENVs
5. Resend-Domain SPF/DKIM/DMARC
6. versicherungs_partner Top-10 partnerschaft_status='aktiv'
7. OG-Image (1200×630)
8. Memory-Update (Marcel-Privat)

## Lizenz

Proprietär · © 2026 Marcel Schreiber · PROVA Systems

---

*Powered by Vanilla-JS, Supabase, Netlify · Marathon-Closure 07.05.2026*
