# MEGA⁸⁷ — Permission-Matrix (verifizierte DB-Wahrheit)

**Stand:** 2026-05-17 · Quelle: `workspace_memberships.rolle` + 4 `can_*`-Flags

---

## Rollen-Hierarchie

```
super_admin (Marcel via users.is_super_admin Flag — NICHT als member_rolle)
    │
    ▼ Workspace-scope:
owner       — Account-Holder, hat alle Rechte im Workspace
    │
    ▼
admin       — Stellvertreter, can_invite + can_billing + can_export + can_delete
    │
    ▼
sv          — Sachverständiger (default neuer User)
    │
    ▼
assistenz   — Team-Mitglied mit reduzierten Rechten
    │
    ▼
readonly    — read-only Share-User
```

---

## Permission-Matrix

| Capability | owner | admin | sv | assistenz | readonly | super_admin |
|---|---|---|---|---|---|---|
| **Auftrag-Read** (eigene Workspace) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Auftrag-Create** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| **Auftrag-Edit eigene** | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| **Auftrag-Edit fremde** | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| **Auftrag-Delete** | ✓ | `can_delete_records=true` | ✗ | ✗ | ✗ | ✓ |
| **Member-Invite** | ✓ | `can_invite_members=true` | ✗ | ✗ | ✗ | ✓ |
| **Billing/Stripe** | ✓ | `can_manage_billing=true` | ✗ | ✗ | ✗ | ✓ |
| **DSGVO-Export** | ✓ | `can_export_data=true` | ✓ (eigene Daten) | ✗ | ✗ | ✓ |
| **Account-Settings ändern** | ✓ | ✓ (eigene) | ✓ (eigene) | ✓ (eigene) | ✓ (eigene) | ✓ |
| **Impersonate andere Workspace** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Audit-Trail Voll-View** | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| **Stripe-Webhook-Logs** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Workspace-Switcher** | ✓ wenn ≥2 Memberships | ✓ wenn ≥2 | ✓ wenn ≥2 | ✓ wenn ≥2 | ✓ wenn ≥2 | ✓ |

---

## RLS-Pattern (existing seit MEGA45-A)

Jede Tabelle hat RLS-Policy:
```sql
CREATE POLICY workspace_rls ON public.<table>
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_memberships
    WHERE user_id = auth.uid() AND is_active = true
  ));
```

Für rolle-Checks (z.B. `can_delete`):
```sql
CREATE POLICY <table>_delete ON public.<table>
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_memberships
      WHERE user_id = auth.uid() AND is_active = true
        AND (rolle IN ('owner','admin') OR can_delete_records = true)
    )
  );
```

---

## Special: `super_admin` für Marcel

Marcel hat **KEINE** spezielle `member_rolle`. Stattdessen:

- `users.is_super_admin = true` (boolean Flag in public.users)
- Allow-List in Auth-Pages mit Marcel-Email (`marcel.schreiber891@gmail.com`, `marcel@prova-systems.de`, etc.)
- `admin-impersonate` Edge checkt diese Liste hart-kodiert

**Empfehlung MEGA87:** ENUM `member_rolle` NICHT erweitern. Allow-List + is_super_admin-Flag-Pattern bleibt. → Migration 62 NICHT nötig.

---

## Front-End Permission-Check Pattern (Block G+E)

```js
async function hasPermission(capability) {
  const mod = await import('/lib/supabase-client.js');
  const sb = mod.supabase;
  const wsId = await mod.getActiveWorkspaceId();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;

  // Super-admin via Email-Allow-List + Flag
  const SUPER_ADMINS = ['marcel.schreiber891@gmail.com','marcel@prova-systems.de'];
  if (SUPER_ADMINS.includes(user.email)) return true;

  const { data: ws } = await sb.from('workspace_memberships')
    .select('rolle, can_invite_members, can_manage_billing, can_export_data, can_delete_records')
    .eq('user_id', user.id).eq('workspace_id', wsId).eq('is_active', true).maybeSingle();
  if (!ws) return false;

  switch (capability) {
    case 'auftrag_create':   return ['owner','admin','sv'].includes(ws.rolle);
    case 'auftrag_delete':   return ws.rolle === 'owner' || ws.can_delete_records;
    case 'member_invite':    return ws.rolle === 'owner' || ws.can_invite_members;
    case 'billing':          return ws.rolle === 'owner' || ws.can_manage_billing;
    case 'export':           return ws.rolle !== 'readonly' && (ws.rolle === 'owner' || ws.can_export_data);
    default:                 return false;
  }
}
```
