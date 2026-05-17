# MEGA⁸⁶ — Marcel-Checkliste (15-Punkte-Smoke-Test)

**Stand:** 2026-05-17 · Tag-Empfehlung: `v3700-mega86-final-polish`

---

## Pre-Apply

1. **Migration 60 applien** via MCP:
   ```
   mcp_use claude_ai_Supabase apply_migration
     project_id=cngteblrbpwsyypexjrv
     name=mega86_onboarding_tour
     query=<Inhalt von supabase-migrations/60_mega86_onboarding_tour.sql>
   ```

2. **Edge `send-support-reply` deployen** via MCP:
   ```
   mcp_use claude_ai_Supabase deploy_edge_function
     project_id=cngteblrbpwsyypexjrv
     name=send-support-reply
     files=[{ name: 'index.ts', content: <Inhalt> }]
   ```

3. **Browser-Cache leeren** (DevTools → Application → Service Workers → Update)

---

## 15-Punkte-Smoke

| # | Block | Aktion | Erwartung | OK? |
|---|---|---|---|---|
| 1 | A.1 Cross-Domain | Inkognito → `https://prova-systems.de/login` → Login | Redirect auf app.prova-systems.de + Dashboard ohne 2. Login | ☐ |
| 2 | A.1 Cross-Domain | Console-Snippet aus `docs/MEGA86-CROSS-DOMAIN-LOGIN-FIX.md` ausführen | provaCookieKeys enthält prova_auth_token + prova-auth-token | ☐ |
| 3 | A.2 Index-App-Split | `prova-systems.de/akte.html?id=X` → 301 zu app.prova-systems.de | Korrekt | ☐ |
| 4 | A.3 Diktat-Race | `/app.html` Diktat starten → in `#transcriptArea` tippen | Recording stoppt sofort + Mode-Badge wechselt zu ✏ Manuell | ☐ |
| 5 | A.3 Diktat-Race | Audit-Trail in Supabase: `entity_typ=diktat_mode` Eintrag sichtbar | Ja | ☐ |
| 6 | B Audit-Migration | Freigabe-Page Compliance-Häkchen abklicken → audit-log-v1 Call in Network-Tab | Ja | ☐ |
| 7 | C Bibliothek-Drawer | Auf `/akte.html` Cmd+B drücken | Drawer öffnet right-side mit Bibliothek-Embedded | ☐ |
| 8 | C Bibliothek-Drawer | Click auf Norm im Drawer → Insert in Akte | Drawer schließt + Event `prova:bib-insert` gefeuert (Console) | ☐ |
| 9 | D Onboarding-Tour | Neuen Test-User registrieren | Dashboard zeigt 5-Step-Tour automatisch | ☐ |
| 10 | D Onboarding-Tour | Schritt 5 zeigt FOUNDING-99 Coupon | Ja | ☐ |
| 11 | D Onboarding-Tour | Tour skippen → `user_workflow_settings.onboarding_tour_completed=true` in DB | Ja | ☐ |
| 12 | E Support-Inbox | `/admin-kpis.html` öffnen → Section "Support-Inbox" lädt offene Tickets | Liste mit Prio-Badge | ☐ |
| 13 | E Support-Inbox | Click "Antworten" → Modal mit Textarea → Senden | Email kommt beim User an, Ticket-Status=beantwortet | ☐ |
| 14 | F Mobile-Sidebar | Browser-Resize 1200→900 | body.classList enthält `prova-tablet` | ☐ |
| 15 | H Final | Service-Worker zeigt `prova-v3700-mega86-final-polish` | Ja | ☐ |

---

## Bei Fehler

- **A.1 fail (Doppel-Login):** DevTools-Cookies prüfen — Domain muss `.prova-systems.de` sein (mit Punkt!). Browser-Cache komplett clearen. Inkognito testen.
- **A.3 fail (Recording läuft trotz Tippen):** Console-Logs `[ProvaDiktatGuard]` prüfen — Lib geladen? Network-Tab nach `audit-log-v1`-Call schauen.
- **C Drawer öffnet nicht:** `window.ProvaBibliothekDrawer` in Console verfügbar? Iframe-Page lädt (`/bibliothek.html?embedded=1`)?
- **D Tour erscheint nicht:** localStorage `prova_onboarding_pending=1` gesetzt? Migration 60 applied?
- **E Reply-Send schlägt fail mit 403:** Marcel-User-ID stimmt? Edge mit `verifyJwt` checkt `ctx.user.id === MARCEL_USER_ID`.

---

## Nach grünem Test

1. PR mergen auf `main`
2. Tag setzen: **`v3700-mega86-final-polish`**
3. PROVA ist **100% Vision-Komplett** ✅

→ Weiter mit Pilot-Onboarding (IONOS DNS, PDFMonkey-Patches, Stripe-Webhook-Renewal, Outreach BVS/VBD/IfS).
