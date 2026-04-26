# SPRINT 18 — AUTH-COCKPIT (admin.prova-systems.de) inkl. KI-Kosten-Monitoring

**Tag:** 19  |  **Aufwand:** 7-8h  |  **Phase:** E Admin, UX & Pre-Audit

---

## Ziel
Marcel hat eine Admin-Oberfläche mit Live-Metriken, User-Management, Login-as-User, 2FA-Pflicht und **KI-Kosten-Monitoring pro User** (kritisch nach Sprint 9!).

---

## Sprint-Start-Ritual
1. **Code-Check:** `admin-dashboard.html`, `admin-login.html`, `ADMIN_PASSWORD_BCRYPT` ENV
2. **Datenfluss:** Welche Metriken kommen woher? (KI_STATISTIK, AUDIT_TRAIL, SCHADENSFAELLE aggregiert)
3. **Scope-Fix:** Cockpit-Basis + KI-Kosten. Keine Multi-Admin-Rollen (später).

---

## Scope

### 1. Subdomain admin.prova-systems.de (30 Min)
- Netlify-DNS CNAME
- Separater SW-Scope
- Eigene Cookies (prova_admin_session)
- CSP strikter: `frame-ancestors 'none'`

### 2. Admin-Auth mit 2FA-Pflicht (2h)
- `admin-auth.js` Netlify Function
- Email/Password via bcrypt (ADMIN_PASSWORD_BCRYPT)
- Nach Login: TOTP-Code erforderlich (Authenticator-App)
- Setup-Flow: QR-Code beim ersten Login, Secret in SACHVERSTAENDIGE unter `is_admin`
- `lib/totp.js` RFC 6238 Implementierung
- Audit: jeder Admin-Login in AUDIT_TRAIL mit ip_hash

### 3. Dashboard-Widgets (3-4h)

**Live-Sessions**
Aktive User-Sessions mit letzter Aktivität, IP-Hash, User-Agent. Mit Force-Logout-Action.

**User-Liste**
Alle SVs. Filter + Search. Spalten: Email, Plan (Solo/Team), MRR, Trial-Ende, Letzter Login, Status.

**MRR-Widget**
Monthly Recurring Revenue. Summe aller aktiven Abos, mit 30-Tage-Verlauf.

**Conversion-Funnel**
Formular → Diktat → Entwurf → Freigabe → Versand. Als visuelle Funnel-Grafik.

**Error-Stream**
Letzte 50 WORKFLOW_ERRORS. Neue rot markiert. Klick öffnet Details.

**Support-Inbox**
Ungelesene Kontakt-Formulare mit Zeitstempel.

**⭐ KI-Kosten-Widget (NEU — kritisch!)**

Pro User:
```
┌─── KI-Kosten pro User (April 2026) ──────────────┐
│                                                    │
│ Top-10 User nach KI-Verbrauch:                    │
│                                                    │
│ User                KI-Kosten   Umsatz   Quote    │
│ ─────────────────────────────────────────────     │
│ sv003@example.de     4,23 €    149 €    2,8% ✅  │
│ sv007@example.de     2,15 €    279 €    0,8% ✅  │
│ marcel@example.de    1,36 €    149 €    0,9% ✅  │
│ ...                                                │
│                                                    │
│ ⚠️ Warnung bei > 5% Quote                          │
└────────────────────────────────────────────────────┘
```

Aggregiert:
```
┌─── KI-Kosten Gesamt ──────────────────────────────┐
│                                                     │
│ OpenAI Gesamt April:        13,60 €               │
│ Umsatz Gesamt April:      1.490,00 €              │
│ KI-Quote:                   0,91% ✅              │
│                                                     │
│ Verteilung nach Modell:                           │
│   GPT-4o (Konjunktiv II):     9,20 € (68%)        │
│   GPT-4o (Halluz-Check):      1,80 € (13%)        │
│   GPT-4o-mini (Rest):          2,10 € (15%)       │
│   Whisper:                     0,50 € (4%)        │
│                                                     │
│ Top-Funktionen:                                   │
│   1. Konjunktiv-II-Check     120 Calls            │
│   2. Absätze-Ordnen            85 Calls           │
│   3. Halluzinations-Check      67 Calls           │
│   4. Whisper-Diktat           180 Min              │
│                                                     │
└────────────────────────────────────────────────────┘
```

**Trigger-Logik:**
- Wenn User KI-Quote > 5%: Push-Alert an Marcel + gelb markiert im Dashboard
- Wenn aggregiert > 5%: Sprint-Prompts-Revision erwägen
- Datenbasis: KI_STATISTIK-Tabelle (aus Sprint 9)

### 4. User-Management (1h)
- Pro User Details-View: alle Fälle, Aktivität, Zahlungen, KI-Nutzung
- Actions:
  - Login-as-User (15 Min Token)
  - Force-Logout
  - Plan ändern (via Stripe API)
  - Daten exportieren (dsgvo-auskunft)
  - User löschen (dsgvo-loeschen)
- Jede Action in AUDIT_TRAIL

### 5. Login-as-User (1h)
- `admin-login-as.js` Function
- Temporärer HMAC-Token mit `admin_imposter=true`-Claim
- Redirect zu app.prova-systems.de
- Gelber Banner "Admin-Session als {email} — Logout nach 15 Min"
- Admin-Actions im Kontext beider User geloggt

### 6. Push-Alerts an Marcel (30 Min)
Events:
- Neuer SV registriert
- Stripe-Abo gekauft
- Stripe-Abo gekündigt
- Kritischer Error
- **KI-Quote > 5% bei einem User** (NEU)
- Trial läuft bald ab (< 3 Tage)

Rate-Limit: max 10 Pushes/Tag an Marcel (Burst-Protection).

---

## Prompt für Claude Code

```
PROVA Sprint 18 — AUTH-COCKPIT (Tag 19)

Pflicht-Lektuere: CLAUDE.md, auth-guard.js (HMAC aus Sprint 2),
admin-dashboard.html, KI_STATISTIK-Struktur aus Sprint 9,
Masterplan-v2 03_SYSTEM-ARCHITEKTUR.md

KONTEXT
=======
Founder-Dashboard auf admin.prova-systems.de.
Kritisch: KI-Kosten-Monitoring pro User (Schwelle 5% Umsatz → Alert).
2FA-Pflicht fuer Marcel.

SCOPE
=====

Commit 1: Subdomain + DNS + Netlify-Config
- admin.prova-systems.de CNAME
- Separates Deploy-Target oder Netlify-Context
- Separate Service-Worker-Scopes
- Cookie-Domain strikt: admin.prova-systems.de

Commit 2: Admin-Auth + 2FA
- admin-auth.js mit bcrypt Password-Check
- lib/totp.js RFC 6238 Implementierung
- QR-Code beim ersten Login (Authenticator-App einrichten)
- Cookie prova_admin_session mit kuerzerem Timeout (4h)

Commit 3: admin-dashboard.html Layout
- Sidebar links, Main-Grid rechts
- Widget-Komponenten wiederverwendbar
- Responsive fuer Tablet

Commit 4: Widgets implementieren
a) Live-Sessions
b) User-Liste mit Search+Filter
c) MRR mit 30-Tage-Graph
d) Conversion-Funnel (basiert auf AUDIT_TRAIL-Events)
e) Error-Stream (letzte 50 WORKFLOW_ERRORS)
f) Support-Inbox

Commit 5: KI-Kosten-Widget (PFLICHT!)
- Aggregation aus KI_STATISTIK
- Pro-User-Breakdown mit Quote-Berechnung
- Gesamt-Breakdown nach Modell/Funktion
- Visuelle Alerts bei > 5%

Commit 6: User-Management-Detail-View
- Pro User: alle Faelle, Aktivitaet, KI-Nutzung
- Actions: Login-as, Force-Logout, Plan aendern, Export, Loeschen

Commit 7: admin-login-as.js
- HMAC-Token mit admin_imposter=true, 15 Min TTL
- Zielsystem zeigt Banner
- Audit-Log in beiden Kontexten

Commit 8: Push-Alert-System
- admin-notify.js (oder aus Sprint 14 erweitern)
- Events: neuer User, Abo, Error, KI-Quote>5%, Trial-Ablauf
- push-notify.js mit Marcel-Device-Token
- Rate-Limit 10/Tag

Commit 9: Tests + sw.js bump

QUALITAET
=========
- 2FA ohne SMS-Fallback (nur TOTP)
- Login-as-User: User wird per Email informiert
- Inaktivitaets-Timeout 4h
- Admin-Cookie getrennt von User-Cookie
- Alle Admin-Actions geloggt

TAG: v180-auth-cockpit-done
```

---

## Acceptance
1. `admin.prova-systems.de` erreichbar, Login-Seite
2. Marcel-Login mit Password + TOTP funktioniert
3. Ohne TOTP → 401
4. Dashboard zeigt alle Widgets mit korrekten Daten
5. **KI-Kosten-Widget zeigt pro-User-Breakdown mit korrekten Quoten**
6. **Push-Alert feuert bei Test-User mit simulierter > 5% Quote**
7. Login-as-User → Banner sichtbar in App
8. User-Management funktioniert (Plan ändern, Force-Logout, Export)

## Rollback
`git reset --hard v180-compliance-ii-done`

---

## Abhängigkeiten
- Sprint 2 (Auth-Fundament) für HMAC-Token
- Sprint 9 (KI-Werkzeug) für KI_STATISTIK-Daten
- Sprint 17 (DSGVO) für Export/Löschung-Functions
