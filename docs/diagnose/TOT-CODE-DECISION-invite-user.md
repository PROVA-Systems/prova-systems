# Tot-Code-Decision: invite-user.js

**Datum:** 03.05.2026 (Sprint Catch-Up C3)
**Status:** Marcel-Decision pending
**HIGH-Findings die warten:** H-18 (Rate-Limit), H-21 (Email + paket Whitelist)

---

## TL;DR (Marcel-2-Min-Read)

**Empfehlung: LÖSCHEN.**

Begründung: invite-user.js ist 100% Tot-Code post-K-1.5 Voll-Supabase-Refactor:
- Nutzt **Netlify Identity API** (`grant_type=password`, in K-1.5 ersetzt durch Supabase Auth)
- **null Caller** im gesamten Repo (außer Tests/Docs)
- Team-Plan-Workspace-Invitations werden in Sprint AUTH-PERFEKT 2.0 mit Supabase Auth Magic-Links neu gebaut

Aufwand zum Löschen: 2 Min. Aufwand zum Fixen + neu integrieren: 4-6h.

---

## Code-Analyse

### Was die Function tut
`netlify/functions/invite-user.js`:
1. Empfängt `{ email, name, paket }` von Admin-User
2. Auth-Check via Netlify Identity JWT (deprecated)
3. POST an Netlify Identity API `/.netlify/identity/admin/users/invite`
4. Gibt 200 oder Identity-Fehler zurück

### Code-Pfad-Analyse
```
invite-user.js
  → event.clientContext.user (Netlify Identity, in K-1.5 deprecated)
  → process.env.NETLIFY_SITE_ID + NETLIFY_ACCESS_TOKEN
  → Netlify Identity API (deprecated)
```

**Fehler-Verhalten aktuell:**
- Auth-Check failed (kein clientContext.user mehr seit Voll-Supabase-Auth)
- Function gibt 401 UNAUTHORIZED zurück, ohne irgendwas zu tun
- D.h. selbst wenn jemand ihn aufruft: blockiert

---

## Caller-Analyse

```bash
$ grep -r "invite-user" --include="*.js" --include="*.html" .
(keine Treffer außer der Function selbst, Tests, und Docs)
```

**0 aktive Caller** im Repo.

### Wo wird Team-Plan-Invitation erwartet?
- `workspace_invitations`-Tabelle in Supabase **existiert** (Sprint K-1.0 Schema)
- RLS-Policy `inv_insert` erlaubt nur Workspace-Admins
- **Aber:** kein Frontend-Code der die Tabelle nutzt
- Geplant: Sprint AUTH-PERFEKT 2.0 (post-Pilot)

### Aktuelle Pilot-Phase
- Solo-Plan-only (149€) — kein Team-Plan in Pilot-Phase
- → invite-user wird in Pilot-Phase **nicht gebraucht**
- Team-Plan kommt nach erstem 10-SV-Pilot, wenn überhaupt

---

## Was passiert wenn wir LÖSCHEN

### Code-Änderungen
1. `netlify/functions/invite-user.js` löschen
2. ENV-Vars NICHT löschen (Marcel-Decision):
   - `NETLIFY_SITE_ID`, `NETLIFY_ACCESS_TOKEN` werden anderswo genutzt? (grep ergibt: nur invite-user)
   - → können auch raus

### Auswirkung
- ✅ 1 weniger Function
- ✅ HIGH-Findings H-18 + H-21 aufgehoben
- ✅ Konsistent mit Voll-Cleanup-Sprint-Doktrin
- ✅ Sprint AUTH-PERFEKT 2.0 baut Workspace-Invitations frisch mit Supabase Auth Magic-Links

### Risiko
- ⚠️ keiner — Function wird nicht aufgerufen

### Marcel-Action wenn LÖSCHEN
```bash
# 1. Function löschen
git rm netlify/functions/invite-user.js

# 2. Optional: ungenutzte ENV-Vars in Netlify-UI löschen
# - NETLIFY_SITE_ID (NUR wenn wirklich nirgends genutzt — grep verifiziert)
# - NETLIFY_ACCESS_TOKEN

# 3. Smoke-Test
bash scripts/smoke-test-cutover.sh

# 4. Commit
git commit -m "chore(cleanup): invite-user geloescht (Tot-Code post-K-1.5, AUTH-PERFEKT 2.0 Pflicht-Replacement)"

# 5. Push + Deploy
git push origin main
```

---

## Was passiert wenn wir BEHALTEN + FIXEN

### Aufwand
**~4-6h Fix-Sprint:**

1. **Migration auf Supabase Auth Magic-Links** statt Netlify Identity:
   - `supabase.auth.admin.inviteUserByEmail()` aus Service-Role-Client
   - Neuer Auth-Check via Supabase JWT statt Netlify Identity clientContext
   - Workspace-Membership-Insert in `workspace_memberships`-Tabelle
   - RLS-Policy bestätigt has_role(workspace_id, 'admin')

2. **HIGH-Fixes:**
   - H-18: Rate-Limit (10 Invites / Stunde / User)
   - H-21: Email-Format + paket-Whitelist (Solo, Team, Founding)

3. **Frontend-Integration:**
   - Team-Workspace-Settings-Page mit "Member einladen"-Button
   - Email-Template für Invitation
   - Onboarding-Flow für eingeladene User

4. **Tests:**
   - Cross-Tenant-Isolation: Workspace-A-Admin kann nicht User in Workspace-B einladen
   - Rate-Limit-Test
   - Email-Validation-Test

### Wann Behalten Sinn macht
- ❓ Falls Pilot-Phase **schon Team-Plan-SVs** akzeptiert
- ❓ Falls ein konkreter Pilot-SV ein Team-Büro hat und vor Sprint AUTH-PERFEKT 2.0 einsteigen will

**Aktuell: keiner dieser Fälle.** Founding-Programm ist Solo-only.

---

## Empfehlung

**Option: LÖSCHEN.**

**Wann:** vor Pilot-Launch (heute/morgen).

**Begründung:**
1. 0 aktive Caller — keine Frontend-Auswirkung
2. Tot-Code-Cleanup-Doktrin
3. Aufwand-Verhältnis: 2 Min löschen vs 4-6h fixen + integrieren
4. Sprint AUTH-PERFEKT 2.0 baut Workspace-Invitations sauber mit Supabase Auth Magic-Links neu (geplant post-Pilot)
5. Founding-Pilot ist Solo-only — kein Team-Plan-Bedarf in den nächsten 4-6 Wochen

**Wenn Marcel BEHALTEN möchte:**
- Marcel hat konkreten Team-Pilot-SV in Sicht?
- → Sprint AUTH-PERFEKT 2.0 vorziehen statt diesen Tot-Code reanimieren

---

## Marcel-Decision-Slot

- [ ] **A) LÖSCHEN** (empfohlen, 2 Min) — Marcel: ich setze um, push + deploy
- [ ] **B) BEHALTEN + FIXEN** (~4-6h) — Marcel: ich starte AUTH-PERFEKT 2.0 vorgezogen
- [ ] **C) STATUS QUO** (Tot-Code stehen lassen) — Marcel: BACKLOG-Marker

---

## Bonus: Auch `auth-token-issue.js` analog?

Aus Mega-Nacht-Sprint S6:
- `auth-token-issue.js` — auch Tot-Code post-K-1.5
- NACHT-PAUSE-File: `docs/diagnose/NACHT-PAUSE-S6-NACHT-rate-limit-auth-token-issue.md`
- CRITICAL-Finding: kein Rate-Limit auf Login-Endpoint

**Empfehlung:** alle 3 Tot-Code-Functions in **einem** Cleanup-Commit löschen:
- `auth-token-issue.js` (Login-Tot-Code)
- `invite-user.js` (dieser File)
- `foto-upload.js` (separater Decision-File)

---

*Tot-Code-Decision invite-user 03.05.2026 · Marcel-Review pending*
