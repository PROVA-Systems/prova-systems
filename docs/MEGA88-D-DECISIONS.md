# MEGA⁸⁸-D DECISIONS — Coupon-Security + Founding-90d-Trial

**Stand:** 2026-05-18 · Branch: `feat/mega88-d-coupon-security-founding-90d`
**Tag-Empfehlung:** `v3950-mega88-d-coupon-security`

---

## Problem 1 (P0 SECURITY)

`FOUNDING-99` Coupon-Code war in `lib/prova-onboarding-tour.js` Step 5 hartcoded sichtbar für **jeden** Trial-User. Jeder User konnte den Code einlösen → Solo-Tier für 99 €/mo lifetime statt 179 €/mo. Verlust: **80 €/mo pro Missbrauch lifetime**.

### Fix
- Step 5 in Tour ist jetzt ein generischer „Bereit für deinen ersten Fall"-Step ohne Coupon-Code
- Async `_resolveCouponStep()` läuft nach Render und überschreibt Step 5 NUR wenn `workspaces.founding_status` ∈ `{founding_member, pilot_tester}`
- Founding-Step zeigt KEINEN Code-String — nur Hinweis „Coupon wird beim Checkout automatisch angewendet"
- User-spezifischer Coupon liegt in `workspaces.stripe_coupon_assigned` (DB only, NICHT im Frontend hardcoded)

## Problem 2

Marcel-Direktive: Founding-Tester sollen **90 Tage** kostenlos haben (statt 14d Standard-Trial). Bisher gab es keine Trennung im Workspace-Modell.

### Fix
- Migration 63 `workspaces.founding_status` ENUM mit 3 Werten (standard | founding_member | pilot_tester)
- app-register.html ?founding=1 / ?pilot=1 URL-Param → trialDays=90 statt 14
- localStorage `prova_founding_status_pending` für Backend-Hook-Sync
- Email-Webhook-Payload erweitert um `trial_days` + `founding_status`
- trial-banner.js Founding-Variante: 🌟 + "Noch X Tage Founding-Trial — danach 99 €/mo lifetime"

## Problem 3 (Bonus)

Marcel braucht ein Tool um Founding-Tester manuell einzuladen mit 90d-Trial.

### Fix
- workspace-invite.html: Checkbox "Als Founding-Tester einladen" — NUR für SUPER_ADMINS sichtbar (Email-Allow-List)
- send-workspace-invitation Edge: `founding_invite`-Flag → FOUNDING-MARKER in `persoenliche_nachricht` (nutzt existing Spalte, keine Migration nötig für invitations-Tabelle)
- workspace-accept-invitation.html: liest Marker beim Accept und setzt `workspaces.founding_status='founding_member'` + `abo_trial_endet_am=NOW+90d`

---

## Files

| File | Status | Beschreibung |
|---|---|---|
| `lib/prova-onboarding-tour.js` | modified | FOUNDING-99 entfernt, dynamische Step 5 |
| `supabase-migrations/63_mega88d_founding_status.sql` | **NEU** | 3 Spalten + Index + Backfill |
| `app-register.html` | modified | ?founding=1 / ?pilot=1 → 90d Trial |
| `lib/trial-banner.js` | modified | Founding-Variante mit 🌟 |
| `workspace-invite.html` | modified | Founding-Checkbox (Marcel-only) |
| `supabase/functions/send-workspace-invitation/index.ts` | modified | founding_invite-Flag + Marker |
| `workspace-accept-invitation.html` | modified | Marker-Detection + founding_status setzen |
| `sw.js` | modified | v3905 → v3950 |
| `docs/SW-VERSION-HISTORY.md` | modified | MEGA88-D-Eintrag |
| `docs/MEGA88-D-DECISIONS.md` | **NEU** | dieses File |
| `docs/MEGA88-D-MARCEL-STRIPE-CHECKLIST.md` | **NEU** | Marcel-Stripe-Tasks |
| `CLAUDE.md` | modified | Compounding Lesson |

---

## Marcel-Apply

1. **Migration 63 applien** via MCP:
   ```
   mcp_use claude_ai_Supabase apply_migration
     project_id=cngteblrbpwsyypexjrv
     name=mega88d_founding_status
     query=<supabase-migrations/63_mega88d_founding_status.sql>
   ```

2. **Edge `send-workspace-invitation`** re-deployen (founding_invite-Flag)

3. **Stripe-Tasks** siehe `docs/MEGA88-D-MARCEL-STRIPE-CHECKLIST.md`:
   - FOUNDING-99: `max_redemptions=10` + `valid_until=2026-12-31`
   - Pro Founding-Tester einen User-spezifischen Coupon erstellen (z.B. `FND-99-MARCEL01`)
   - `workspaces.stripe_coupon_assigned` für jeden Founding-User füllen

4. **Smoke**:
   - Neuer Test-Trial-User (ohne URL-Param) → sieht generischen Step 5 ohne Code
   - Test-User mit `/register?founding=1` → 90d Trial, sieht Founding-Step
   - Marcel-Account → workspace-invite.html zeigt Founding-Checkbox; Test-Empfänger akzeptiert → 90d Trial assigned

5. **PR merge** + Tag `v3950-mega88-d-coupon-security`
