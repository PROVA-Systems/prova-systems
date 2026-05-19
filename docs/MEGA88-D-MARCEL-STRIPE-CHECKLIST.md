# MEGA⁸⁸-D — Marcel-Stripe-Checklist

**Stand:** 2026-05-18 · Marcel-Task im Stripe-Dashboard (CC kann Stripe-Live nicht patchen)

---

## A) FOUNDING-99 absichern

Aktuell: `FOUNDING-99` ist (vermutlich) unlimited einlösbar. Nach MEGA88-D-Frontend-Fix ist Code im Frontend NICHT mehr sichtbar — aber bestehende User die ihn bereits gesehen haben könnten ihn einlösen.

**Stripe-Dashboard → Coupons → FOUNDING-99:**
- [ ] `max_redemptions` auf **10** setzen (statt unlimited)
- [ ] `valid_until` auf **2026-12-31** setzen
- [ ] Prüfen ob Coupon im Customer-Portal sichtbar → ggf. via API `applies_to.products` einschränken
- [ ] Aktuelle Redemptions-Liste exportieren (CSV) → prüfen ob ungeplante User dabei sind

---

## B) Pro Founding-Tester einen User-spezifischen Coupon erstellen

Statt eines globalen FOUNDING-99 für alle Founding-User: **pro User einen eigenen Code**.

Pattern: `FND-99-<USERNAME-OR-WS-SHORT>`
- z.B. `FND-99-MARCEL01`, `FND-99-MUELLER02`

**Pro Founding-User (~10 erwartet):**
- [ ] Stripe-Coupon erstellen: 99 € off Solo-Tier `price_1TSjMZRXumrtL2n5fgToRwyr` (oder `amount_off=8000` cents)
- [ ] `max_redemptions=1` (nur 1× pro Tester)
- [ ] `duration=forever` (lifetime)
- [ ] In DB: `UPDATE workspaces SET stripe_coupon_assigned='FND-99-XYZ' WHERE id='<ws-uuid>'`

---

## C) Stripe-Checkout-Session: Coupon auto-applien

In `stripe-checkout` Netlify-Function: lese `workspaces.stripe_coupon_assigned` und übergebe an Checkout-Session als `discounts: [{ coupon: <code> }]`.

CC-Skizze (Marcel implementiert in stripe-checkout-Function):
```js
const { data: ws } = await sb.from('workspaces')
  .select('stripe_coupon_assigned, founding_status')
  .eq('id', workspaceId).single();

const sessionPayload = {
  // ... existing fields
};
if (ws?.stripe_coupon_assigned) {
  sessionPayload.discounts = [{ coupon: ws.stripe_coupon_assigned }];
}
```

---

## D) URL-Param-Signup für Founding-Tester

Marcel sendet personalisierte Links:
- `https://app.prova-systems.de/app-register.html?founding=1` → 90d Trial + founding_member-Status
- `https://app.prova-systems.de/app-register.html?pilot=1` → 90d Trial + pilot_tester-Status

Frontend setzt `localStorage.prova_founding_status_pending`. Backend-Trigger (siehe E) liest das beim ersten Workspace-Create.

---

## E) Backend-Sync prova_founding_status_pending → workspaces

CC hat den localStorage-Marker gesetzt — Marcel muss den Sync-Punkt im Workspace-Create-Flow ergänzen. Vermutlich: `lib/supabase-client.js getActiveWorkspaceId()` ist der Trigger, oder ein dedizierter "create-workspace"-Edge.

Pattern (im Backend-Code wo Workspace erstmals erstellt wird):
```js
const foundingStatus = localStorage.getItem('prova_founding_status_pending') || 'standard';
const trialDays = foundingStatus === 'standard' ? 14 : 90;

await sb.from('workspaces').insert({
  // ... existing fields
  founding_status: foundingStatus,
  founding_assigned_at: foundingStatus !== 'standard' ? new Date().toISOString() : null,
  abo_trial_endet_am: new Date(Date.now() + trialDays * 86400000).toISOString()
});
```

→ DEFER an Marcel oder Folge-Sprint, weil CC im aktuellen MEGA88-D-Scope nur Frontend + Edges patcht.

---

## F) Audit-Trail-Check

Nach Coupon-Anwendung: Audit-Log-Eintrag in `audit_trail` mit:
- task: 'admin_action' (wenn von Marcel-Founding-Invite kommt)
- kategorie: 'BILLING'
- payload: { coupon: '<code>', founding_status: 'founding_member', workspace_id }

CC's send-workspace-invitation Edge logt das beim Senden. Beim Stripe-Checkout sollte das stripe-checkout-Edge analog tun.

---

## Acceptance

- [ ] FOUNDING-99 auf max 10 Redemptions limited
- [ ] Mindestens 1 User-spezifischer Coupon erstellt (Marcel-Test)
- [ ] Migration 63 applied (siehe MEGA88-D-DECISIONS.md)
- [ ] Test-User mit `?founding=1` → 90d Trial + Founding-Step in Tour
- [ ] Test-User ohne Param → 14d Trial + generischer Tour-Step OHNE Code
- [ ] Stripe-Checkout für Founding-User wendet Coupon auto an (Marcel-Implementation)
