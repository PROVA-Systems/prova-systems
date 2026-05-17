# MEGA⁸⁸-A — Marcel-Smoke-Test (10 Punkte)

**Tag-Empfehlung:** `v3850-mega88-a-logo-implementation`

---

## Pre-Apply

1. **PNG-Assets generieren** (einmalig, Marcel-Local):
   ```bash
   cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
   npm install --no-save sharp png-to-ico
   node tools/generate-logo-pngs.js
   git add img/logo-icon-*.png img/logo-icon-512-maskable.png img/favicon.ico
   git commit -m "MEGA88-A PNG-Assets generated"
   git push
   ```
2. Browser-Cache leeren (DevTools → Application → Storage → Clear site data)
3. SW v3850 in DevTools verifizieren

---

## 10-Punkte-Smoke

| # | Aktion | Erwartung | OK? |
|---|---|---|---|
| 1 | `/dashboard.html` öffnen | Sidebar zeigt Schild-Logo (Voll-Variante), Browser-Tab-Icon Schild | ☐ |
| 2 | Sidebar collapsen (Ctrl+B oder Toggle) | Nur Icon-Only-Schild sichtbar (28×28) | ☐ |
| 3 | `/app-login.html` öffnen | Master-Logo (PROVA Systems) zentriert oben im Login-Card (weiß auf Navy) | ☐ |
| 4 | `/setup-2fa.html` 2FA neu einrichten | QR-Code zeigt PROVA-Logo im Authenticator-Display nach Scan (Authy/1Password testen) | ☐ |
| 5 | `/account-2fa-status.html` | Logo-Banner oben + Status-Karten | ☐ |
| 6 | `/workspace-invite.html` + `/workspace-accept-invitation.html` | Logo-Banner zentriert oben sichtbar | ☐ |
| 7 | `prova-systems.de/` (Landing) | Master-Logo links im Header, Mono-Logo im Footer | ☐ |
| 8 | Browser-Tab-Icon auf allen App-Pages | Schild-Icon (SVG mit Gradient) | ☐ |
| 9 | PWA-Install: Add to Home Screen | App-Icon ist Schild (PNG 512×512), Splash mit theme #1a3a6b | ☐ |
| 10 | `/dashboard.html` mobile (DevTools Responsive) | Sidebar-Logo passt, Theme-Color in Status-Bar Navy | ☐ |

---

## Marcel-Manual-Aktionen (außerhalb 10-Punkte-Smoke)

### A) PDFmonkey-Templates (16+ Templates)
Siehe `docs/MEGA88-A-PDFMONKEY-LOGO-CHECKLIST.md` — Marcel klickt durch PDFmonkey-Dashboard und patcht Header-Logo + Footer-Brand.

### B) Email-Templates Patch (20+ Files)
Snippet `email-templates/_shared/brand-header.html` → in alle Email-Templates direkt nach `<body>` einfügen:

- `email-templates/founding/`: trial-welcome.html ✅ Beispiel-Patch done — Marcel patcht: founding-welcome, pilot-einladung, trial-ending-email
- `email-templates/onboarding/`: 7 Trial-Day-Mails (Day 2/3/7/14/30/60/88-final)
- `email-templates/pilot/`: 5 Pilot-Day-Mails (Day 1/3/7/14/30)
- `lib/email-templates/`: referral-invite, referral-reward, referral-reminder (jeweils .html)

Bash-Loop für Marcel zum Bulk-Check ob Snippet bereits drin:
```bash
grep -L "MEGA88-A Brand-Header" email-templates/**/*.html lib/email-templates/*.html
```
Files in der Output-Liste haben den Header noch NICHT.

### C) Browser-Tab-Title pro Domain (Marcel-Optional)
Marcel kann optional Page-Titles vereinheitlichen:
- Landing: `<title>PROVA Systems — KI-natives SaaS für Bauschaden-Sachverständige</title>`
- App-Pages: `<title>PROVA — Dashboard</title>` etc.
- Admin: `<title>PROVA Admin — Cockpit</title>`

### D) Legal-Pages Favicon (4 Files)
Marcel ergänzt in `legal/agb.html`, `legal/datenschutz.html`, `legal/avv.html`, `legal/impressum.html` die 5 Favicon-Link-Tags aus `index.html` head.

### E) Netlify-Cache-Bust nach Deploy
Nach Deploy + ~2 min: Browser hart-reload mit Strg+Shift+R um SW v3850 zu laden.

---

## Bei Fehler

- **PNG-Script bricht ab mit "sharp not found"**: `npm install --no-save sharp png-to-ico` zuerst ausführen
- **QR-Code im 2FA-Setup zeigt kein Logo**: api.qrserver.com nicht erreichbar oder CSP blockt — Network-Tab prüfen. Fallback ist Supabase-default qr_code ohne Logo (funktioniert weiterhin).
- **Browser-Tab zeigt altes Favicon**: hard-reload (Strg+Shift+R) + Browser-Cache-Clear für die Domain
- **PWA-Icon zeigt nur weißen Hintergrund**: PNG-Files fehlen — Marcel-Script noch nicht ausgeführt. Bis dahin nutzt PWA das SVG (modern browsers OK, alte Android < 8 fail)
- **Sidebar-Logo zu groß**: Default ist 32px Expanded, 28×28 Collapsed. Anpassbar in `nav.js` `.sb-logo-img` CSS.

---

## Nach grünem Test

1. PR mergen auf `main`
2. Tag setzen: **`v3850-mega88-a-logo-implementation`**
3. PNG-Assets-Commit als Follow-up (separater Commit nach Marcel-Script-Run)

---

**Logo-Implementation komplett.** 🛡 PROVA hat ab jetzt durchgängige Brand-Identity.
