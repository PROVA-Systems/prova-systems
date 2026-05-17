# MEGA⁸⁷ — Marcel-Checkliste (20-Punkte-Smoke)

**Stand:** 2026-05-17 · Tag: `v3800-mega87-auth-perfekt-2-0`

---

## Pre-Apply

1. **Migration 61** applien:
   ```
   mcp_use claude_ai_Supabase apply_migration
     project_id=cngteblrbpwsyypexjrv
     name=mega87_totp_recovery_codes_meta
     query=<supabase-migrations/61_mega87_totp_recovery_codes_meta.sql>
   ```

2. **3 neue Edges deployen** via MCP:
   - `verify-mfa-recovery-code`
   - `generate-mfa-recovery-codes`
   - `send-workspace-invitation`

3. Browser-Cache leeren + SW v3800 prüfen

---

## 20-Punkte-Smoke

### Block A+B (Audit-Verify)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 1 | `docs/MEGA87-AUTH-INVENTORY.md` öffnen | 29 Files-Inventory + ENUM-Wahrheit dokumentiert | ☐ |
| 2 | grep `netlify-identity-widget.js` im Repo | 0 Treffer (außer Doku) | ☐ |

### Block C (Migration)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 3 | SQL: `\d public.users` zeigt 7 totp_*-Spalten inkl. _generated_at + _used_count | ja | ☐ |

### Block D (2FA-Recovery)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 4 | `/setup-2fa.html` öffnen, 2FA einrichten | 10 Recovery-Codes angezeigt im XXXX-XXXX-Format | ☐ |
| 5 | Codes in `users.totp_recovery_codes` als sha256-Hashes gespeichert (NICHT klartext) | ja | ☐ |
| 6 | `/account-2fa-status.html` zeigt "10/10 verfügbar" + "Aktiviert seit" + "Letzte Nutzung" | ja | ☐ |
| 7 | `/app-login.html` → falsches TOTP → "Recovery-Code statt 2FA-Code" Link sichtbar | ja | ☐ |
| 8 | Recovery-Code-Eingabe → Login klappt, used_count++ in DB | ja | ☐ |
| 9 | "Neue Codes generieren" auf 2FA-Status-Page → 10 frische Codes + TXT-Download + alte invalidiert | ja | ☐ |

### Block E (Workspace-Switcher)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 10 | Bei nur 1 Workspace-Membership: kein Switcher sichtbar | korrekt | ☐ |
| 11 | Test-User mit 2 Memberships → Switcher in Sidebar-Footer/Topbar | sichtbar | ☐ |
| 12 | Switch zu anderem Workspace → Page-Reload, neuer Context | ja | ☐ |
| 13 | audit_trail-Eintrag `entity_typ=workspace, action=update` mit reason "workspace_switch" | ja | ☐ |

### Block F (Invitations)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 14 | `/workspace-invite.html` → Email + Rolle=sv + Senden | Toast "Einladung gesendet (7 Tage gültig)" | ☐ |
| 15 | Empfänger bekommt Email mit Accept-Link `https://app.prova-systems.de/workspace-accept-invitation.html?token=...` | ja | ☐ |
| 16 | Accept-Link öffnen → Workspace-Name + Rolle + Persönliche Msg sichtbar | korrekt | ☐ |
| 17 | "Annehmen" → workspace_memberships-INSERT + Redirect zu /dashboard | ja | ☐ |

### Block G (Account-Settings)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 18 | `/einstellungen.html` zeigt "Alle Sessions ausloggen" + "2FA-Status öffnen" + "Mitglied einladen"-Links | ja | ☐ |

### Block H (Auth-Cockpit)
| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 19 | `/admin-kpis.html` zeigt "Live Sessions (15min)"-Section mit aktiver Marcel-Session | ja | ☐ |
| 20 | Click auf "Failed Logins" KPI-Card → Modal mit Top-10 Email/IP | ja | ☐ |

---

## Bei Fehler

- **Migration 61 fails**: Spalten existierten bereits? Migration ist idempotent (IF NOT EXISTS) — sollte nicht fehlschlagen.
- **Recovery-Code accept fails 401**: Edge nicht deployed? Marcel-Email-Allow-Liste? Pre-Auth-Password korrekt?
- **Workspace-Switcher unsichtbar**: User hat nur 1 Membership → bewusst kein Switcher. Test mit Marcel-Workspace + Test-Workspace.
- **Invite-Email kommt nicht an**: send-email Edge prüfen (RESEND_API_KEY gesetzt?). Spam-Folder.
- **Failed-Login-Drilldown leer**: in 24h keine Failed-Logins? Versuche mit falschem Passwort einloggen → sollte audit_trail-Eintrag erstellen.

---

## Nach grünem Test

1. PR mergen — Reihenfolge: MEGA86 → MEGA86-HOTFIX → MEGA87
2. Tag setzen: **`v3800-mega87-auth-perfekt-2-0`**
3. PROVA AUTH-PERFEKT 2.0 ✅ — Pilot-Ready
4. `docs/PROVA-100-PROZENT-VISION-COMPLETE.md` updaten mit AUTH-PERFEKT-2.0-Haken
