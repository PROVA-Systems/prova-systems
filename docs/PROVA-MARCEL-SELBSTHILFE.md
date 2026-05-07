# 🎯 PROVA — Marcel's Master-Selbsthilfe-Datei

**Datum:** 30.04.2026
**Zweck:** Komplette Anleitung für ALLE Tools, Pfade, Befehle, Logins
**Stand:** PROVA Hybrid-Mode → APP-LANDING-SPLIT → Pilot-Ready

---

## 📋 INHALTSVERZEICHNIS

1. Wichtige Pfade + Verzeichnisse
2. PowerShell — Befehlsreferenz
3. Claude Code — Starten + Bedienen
4. Git-Workflow (Branches mergen, pushen, etc.)
5. Supabase Dashboard
6. Edge Functions deployen
7. PDFMonkey — Templates erstellen + bearbeiten
8. Make.com — Scenarios verwalten
9. Stripe — Produkte + Webhooks
10. Netlify — Hosting + Deploy
11. IONOS — Domain + DNS
12. GitHub Desktop
13. Browser-Test-Workflow
14. Notfall-Recovery
15. Tag-Plan-Template

---

## 1. WICHTIGE PFADE

### Repo-Pfad (echter Produktiv-Pfad)

```
C:\PROVA-Systems\prova-systems\GitHub\prova-systems
```

### Wichtige Unterordner

```
docs/sprint-status/    → Alle Sprint-Status-Files (HIER lesen)
docs/workflow-research/ → Recherche-Files für Auftragstypen
lib/                   → Zentrale JS-Module
supabase/functions/    → Edge Function Code
supabase/migrations/   → SQL-Migrations
masterplan-v2/         → Original Sprint-Plan
scripts/               → Shell-Scripts (z.B. smoke-test)
```

---

## 2. POWERSHELL BEFEHLE

### Standard-Start

```powershell
cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
git status
```

### Übersichts-Befehle

```powershell
git branch --show-current
git branch -a
git log --oneline -10
git diff main..<branch-name>
```

### File-Operationen

```powershell
notepad <pfad>
type <pfad>
code <pfad>
```

---

## 3. CLAUDE CODE

### Claude Code starten

```powershell
cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
claude
```

### Wenn Claude Code Müll macht

```
STOPP. Letzten Schritt rueckgaengig machen.
git reset --hard HEAD~1
```

---

## 4. GIT-WORKFLOW

### Standard-Workflow

```powershell
git checkout main
git pull
git checkout -b feature/mein-task
git add <files>
git commit -m "kurzer Beschreibungstext"
git push origin feature/mein-task

# Wenn Test grün:
git checkout main
git merge feature/mein-task
git push origin main
```

### Vim-Editor verlassen (Merge-Commits)

```
ESC → :wq → ENTER         # Speichern + schließen
ESC → :q! → ENTER         # Abbrechen ohne speichern
```

### Tipp: Notepad statt vim

```powershell
git config --global core.editor notepad
```

---

## 5. SUPABASE DASHBOARD

### URL + Login

**URL:** https://supabase.com/dashboard
**Project-Ref:** `cngteblrbpwsyypexjrv`

### Wichtige Bereiche

| Bereich | URL-Pfad |
|---|---|
| Table Editor | `/editor` |
| SQL Editor | `/sql/new` |
| Edge Functions | `/functions` |
| Database | `/database/tables` |
| Storage | `/storage/buckets` |
| Authentication | `/auth/users` |
| Logs | `/logs/explorer` |

---

## 6. EDGE FUNCTIONS DEPLOYEN

### Methode A — Supabase CLI

```powershell
supabase --version
supabase login
supabase functions deploy pdf-generate --project-ref cngteblrbpwsyypexjrv
```

### Edge Function Versions (Stand 30.04.2026)

```
brief-generate v3 (X3 deployed)
pdf-generate   v3 (X4 deployed)
```

**Docker-Warning ist OK** — Deploy funktioniert trotzdem.

---

## 7. PDFMONKEY

### Login

**URL:** https://app.pdfmonkey.io

### UUIDs der wichtigsten Templates

| Identifier | UUID |
|---|---|
| K-01 auftragsbestaetigung | `5255119d-583f-4a3f-938e-dee4fcdce895` |
| K-02 termin-ag | `7b2ebb1d-55c0-4f02-833d-2abc087d9851` |
| K-03 termin-mehrparteien | `972685a4-70ed-46de-927d-810e3bb1c26e` |
| K-04 anforderung-unterlagen | `c6fe446e-4694-47e0-aadd-b3a276ec9469` |
| K-05 uebergabe-gutachten | `5c4ee8dc-3f27-4fbc-b016-c606cc8b7d9c` |
| K-06A mahnung-1 | `db80bdb9-f3f2-46cd-b258-7e4742cd9de6` |
| K-06B mahnung-2 | `13ec8528-666e-4f0a-aeba-bc9d2fc3d960` |
| K-06C mahnung-3 | `34c89070-c1ac-41c7-b670-1f4c33111e47` |
| K-07 akteneinsicht | `06d23ad9-35ef-478b-9501-8c16c23bca08` |
| K-08 befangenheit | `4faf6204-d3bf-481a-9f5b-43920eab430e` |
| K-09 auftragsablehnung | `1a58e6fd-47f5-4206-aa0b-7dfd13766f63` |
| F-09 Beweissicherung | `BA076019` |
| F-10 Ergaenzungsgutachten | `6fe656d3-9807-4f59-9305-1338d5d1ad9a` |
| F-15 Gerichtsgutachten | `36E140DC` |
| F-19 Wertgutachten | `29064D98` |
| PROVA-BRIEF | `bad1170b-c2bc-4ee7-acbb-ccbd158892c7` |

---

## 8. MAKE.COM

**URL:** https://eu1.make.com
**Team-ID:** `1089536`
**Gmail Connection ID:** `5630924` (NIEMALS SMTP!)

### Aktive Scenarios

| ID | Name | Hook |
|---|---|---|
| 4867125 | G1 Gutachten | 2665405 |
| 4790180 | G3 Gutachten PDF | 2656922 |
| 4920914 | K2 Komm | 2564049 |
| 5038113 | L3 Lifecycle | 2560890 |
| 5147509 | L8 Lifecycle | 2784758 |
| 5158552 | L10 Lifecycle | 2789382 |
| 5147393 | A5 Admin | 2784687 |

---

## 9. STRIPE

**URL:** https://dashboard.stripe.com
**Webhook:** `https://prova-systems.de/.netlify/functions/stripe-webhook`

### Tarife (BINDEND)

| Tier | Preis | Limit |
|---|---|---|
| Solo | 149 EUR/Monat | 30 Auftraege |
| Team | 279 EUR/Monat | unbegrenzt + 5 User |

**KEINE anderen Tiers!** (Niemals "Starter", "Pro", "Enterprise")

---

## 10. NETLIFY

**URL:** https://app.netlify.com
**Site-ID:** `79cd5c61-e8e8-451e-9bf1-e2d17f971386`

### Auto-Deploy

`git push origin main` triggert Deploy automatisch.

### Custom Domain hinzufügen

Dashboard → Domain Management → **"Add domain alias"**

### SSL Cert renewen

Dashboard → Domain Management → Domain → **Options** → **"Renew certificate"**

---

## 11. IONOS — Domain + DNS

### Login

**URL:** https://mein.ionos.de
**Domain:** prova-systems.de

### DNS-Verwaltung

1. Login → Menue → **Domains & SSL**
2. `prova-systems.de` auswaehlen
3. Tab **"DNS"**

### CNAME für Subdomain anlegen

```
Typ:           CNAME
Host:          app
Verweist auf:  prova-systems.netlify.app
TTL:           5 Min (Setup) / 1 Std (Production)
```

### ⚠️ HÄUFIGER FEHLER (Marcel-Lessons-Learned 30.04.2026)

```
CNAME app → prova-systems.de         ❌ FALSCH (Zirkelbezug!)
CNAME app → prova-systems.netlify.app ✅ RICHTIG
```

→ CNAME muss IMMER auf die Netlify-Subdomain zeigen, nicht auf die eigene Hauptdomain!

### TTL-Werte

| Wert | Wann |
|---|---|
| 5 Min | Setup-Phase |
| 30 Min | Standard |
| 1 Std | Production |

### DNS-Check extern

https://dnschecker.org → CNAME → eigene Subdomain eingeben

---

## 12. GITHUB DESKTOP

### Wann nutzen?

- Wenn PowerShell-Git Probleme macht
- Visuelle Diff-Reviews
- Schnell-Commits

### Standard-Workflow

1. GitHub Desktop oeffnen
2. Repository auswaehlen
3. Branch waehlen
4. Changes-Tab → Files anhaken
5. Summary + Description
6. **"Commit to <branch>"**
7. **"Push origin"**

---

## 13. BROWSER-TEST-WORKFLOW

### Standard-Test (Inkognito)

1. Inkognito-Modus (Strg+Shift+N)
2. F12 → DevTools
3. Application → Service Workers → Unregister
4. Strg+Shift+R (Hard-Reload)

### Auth-Tests

```
https://app.prova-systems.de/login        → Neue Login-Page (nach Cutover)
https://prova-systems.de/auth-supabase.html → Alt (Supabase, vor Cutover)
https://prova-systems.de/app-login.html    → DEAD (Netlify Identity)
```

### Cache komplett löschen

1. F12 → Application → Storage → **"Clear site data"**
2. Application → Service Workers → **"Unregister"**
3. Tab schliessen + neu oeffnen
4. Strg+Shift+R

---

## 14. NOTFALL-RECOVERY

### Falscher Branch + Aenderungen weg

```powershell
git branch -a
git reflog -20
git checkout <commit-hash>
git checkout -b recovery-branch
```

### Edge Function bricht in Production

1. Dashboard → Functions → Function-Name → Tab "Deployments"
2. Vorherige Version → "Re-deploy"

### Service Worker zeigt alten Code

1. F12 → Application → Service Workers → Unregister
2. Application → Storage → Clear site data
3. Tab schliessen + neu oeffnen

### DNS-Problem bei neuer Subdomain

1. IONOS DNS → CNAME-Eintrag pruefen
2. **Verweist auf:** muss `prova-systems.netlify.app` sein (NICHT `prova-systems.de`)
3. dnschecker.org → CNAME-Propagation pruefen
4. Netlify Dashboard → Domain → "Renew certificate"

### PROVA-Code "verloren"

```powershell
# Aus GitHub neu klonen
cd C:\
git clone https://github.com/PROVA-Systems/prova-systems.git
```

---

## 15. TAG-PLAN-TEMPLATE

### Morgen-Routine (5 Min)

```
☐ 1. PowerShell oeffnen
☐ 2. cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
☐ 3. git pull
☐ 4. notepad docs\sprint-status\MORGEN-BRIEFING-<datum>.md
```

### Nach jedem Sprint (3 Min)

```
☐ 1. git status — committet?
☐ 2. git push origin <branch>
☐ 3. Browser-Test (Inkognito + Hard-Reload)
☐ 4. Bei gruen: in main mergen + push
```

---

## 🚨 ABSOLUTE REGELN (NIEMALS BRECHEN)

1. NIEMALS Cutover-Branch ohne Marcel-Test mergen
2. NIEMALS Edge Functions deployen ohne lokalen Test
3. NIEMALS sw.js CACHE_VERSION vergessen zu bumpen
4. NIEMALS Service-Role-Key im Frontend nutzen
5. NIEMALS Tier-Namen ausser "Solo" und "Team"
6. NIEMALS KI-Modell-Namen im UI (GPT, OpenAI, Whisper)
7. NIEMALS hardcoded Credentials in Git
8. NIEMALS Schema-Migration ohne Backup applizieren
9. NIEMALS CNAME auf eigene Hauptdomain zeigen lassen (Zirkelbezug!)
10. NIEMALS Working-Tree antasten ohne OK:
   - CLAUDE.md
   - masterplan-v2/
   - docs/PROVA-*-MASTER.md

---

## 🎯 AKTUELLER STAND 30.04.2026

**Live deployed:**
- Supabase Auth (auth-supabase.html)
- Edge Functions: brief-generate v3 + pdf-generate v3
- APP-LANDING-SPLIT Phase 3 vorbereitet (Branch, nicht gemerged)

**In Vorbereitung:**
- app.prova-systems.de DNS-Fix
- Phase 4: Page-Tests + Cutover
- Schema-Migration 06b

**Vor Pilot:**
- DSGVO-Final-Audit
- IHK-Final-Audit
- Pilot-Onboarding-Setup

---

🚀 **Top-1%-SaaS — und kein Weg führt an PROVA vorbei.**

*Letztes Update: 30.04.2026*
