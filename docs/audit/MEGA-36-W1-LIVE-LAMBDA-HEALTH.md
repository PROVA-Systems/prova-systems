# MEGA³⁶ W1 — Live-Lambda-Health-Audit + Cross-Reference

**Datum:** 2026-05-07
**Modus:** Static-Audit (Marcel hat Branch-Merge zu main noch nicht erledigt; Live-Curl auf production unmöglich)

## W1.2 — Lambda-Cross-Reference

5 echte Pilot-Lücken (zu bauen in W2):
1. admin-env-status (Admin-Cockpit, dashboard.html:541)
2. admin-ki-aggregations (Admin-Cockpit, dashboard.html:593)
3. auftrag-mode-override (workflow-mode-router.js:190)
4. get-referral-history (referral-system.js:192)
5. get-referral-stats (referral-system.js:186)

False-Positives (Pseudo-Matches durch grep):
- airtable — ist Pre-Cutover-Legacy in K-1.5 zu cleanen
- mahnung-pdf, rechnung-pdf, zugferd-rechnung, pdf — nur Comment-Refs, existieren als pdf-proxy.js / rechnung-zugferd.js
- whisper — Sub-String von `whisper-diktat`, existiert ✅

Live-Curl-Test deferred: Marcel macht Branch-Merge → main + Netlify-Deploy nach M³⁶, dann curl-Smoke.

## W1.3 — Schema-Drift

DB-Stand verifiziert in M³⁵ Pre-Check 3 (Supabase MCP list_tables):
- 4/4 M³⁴-Tabellen (cookie_consents, ical_tokens, onboarding_mails_sent, incidents) live + RLS=true + 9 Policies
- Migrations 16, 17, 18, 19, 20, 21, 22 alle apply'd

Keine offenen Schema-Drifts identifiziert.

## W1.4 — UX-Default für sprint-06b-skeleton

Default ohne Marcel-Antwort: COCKPIT-Eintrag mit Plus-Icon (consistent mit dashboard-Pattern). Implementierung in W3.

---

*MEGA³⁶ W1 — Co-Authored-By Claude Opus 4.7*
