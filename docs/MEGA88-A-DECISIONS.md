# MEGA⁸⁸-A DECISIONS — Logo-Implementation

**Stand:** 2026-05-17 · Branch: `feat/mega88-a-logo-implementation`
**Tag-Empfehlung:** `v3850-mega88-a-logo-implementation`

---

## Branding-System

### Wortmarke nach Context

| Context | Wortmarke | Begründung |
|---|---|---|
| Marketing / Landing / Rechtlich | **PROVA Systems** | Vollständig, formal |
| PDFs / Emails / Rechnungen | **PROVA Systems** | Marken-Identität in Output-Artefakten |
| App / Mobile / Sidebar | **PROVA** (kompakt) | Platz-Effizienz, User kennt den Context |
| Favicon / Icon / 2FA-Authenticator | **(nur Icon)** Schild + Checkmark | Pixel-knapp, Icon-Erkennung |

### Logo-Asset-Hierarchie

| Datei | Größe | Verwendung |
|---|---|---|
| `img/logo-prova-systems.svg` | 320×80 | Master — Landing-Header, Auth-Pages, PDF-Header, Email-Header |
| `img/logo-prova.svg` | 200×60 | App-Sidebar (Expanded), Mobile-Header |
| `img/logo-icon-only.svg` | 48×48 | Favicon, Sidebar-Collapsed, 2FA-Authenticator-Display, PWA |
| `img/logo-icon-mono.svg` | 48×48 | Footer-Wasserzeichen, Stempel, Mono-Druck |
| `img/logo-icon-{32,192,512}.png` | div. | PNG-Fallback (PWA, Email-Compat) — entsteht via Marcel-Script |
| `img/logo-icon-512-maskable.png` | 512×512 | PWA maskable-Purpose (mit Navy-Padding) |
| `img/favicon.ico` | multi | Legacy-Browser-Favicon |

### Farb-System

- **Navy Primary**: `#1a3a6b` — Shield-Top-Gradient, Wortmarke "PROVA"
- **Navy Dark**: `#0D2644` — Shield-Bottom-Gradient
- **Accent Blue**: `#3b82f6` — Shield-Border, "SYSTEMS"-Subtitle
- **White**: `#ffffff` — Checkmark, Backgrounds
- **NICHT zulässig**: Montserrat, andere Farben außerhalb dieser Palette

### Typo

- **Inter** für Logo-Wortmarke (System-Fallback: `system-ui, sans-serif`)
- Body-Font bleibt page-spezifisch (Landing: DM Sans; App: DM Sans; PDF: Inter)

---

## PNG-Generation (Marcel-Task)

```bash
# Einmalig:
cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
npm install --no-save sharp png-to-ico
node tools/generate-logo-pngs.js
```

Erzeugt:
- `img/logo-icon-32.png`, `img/logo-icon-192.png`, `img/logo-icon-512.png`
- `img/logo-icon-512-maskable.png` (PWA mit Navy-Padding)
- `img/favicon.ico` (16+32+48 multi-size)

Danach: `git add img/ && git commit -m "MEGA88-A PNG-Assets" && git push`.

---

## Technische Entscheidungen

### Filter-Brightness-Invert für Dark-BG-Auth-Cards
Master-Logo (#1a3a6b Navy) auf dunklen Card-Backgrounds (#0b0d11, Gradient-Navy) wäre unsichtbar. Lösung: `filter: brightness(0) invert(1);` macht das Logo komplett weiß. Wird in `app-login.html`, `index.html` nav, footer-mono verwendet.

### TOTP-URI mit image-Param (Block D)
Supabase MFA enroll() liefert default `data.totp.qr_code` als data-URI ohne image-Param. Workaround: wir nehmen `data.totp.uri`, appenden `image=https://...png`, re-rendern via `api.qrserver.com`. Authy + 1Password lesen den image-Param und zeigen das Logo im Authenticator-Eintrag. CSP `img-src https:` erlaubt qrserver.com.

### Polyfill-Pattern für sidebar-logo-Markup-Compat
Alte `.sb-logo-mark` und `.sb-logo-text` Selectors via `display:none;` neutralisiert (statt aus CSS entfernen) — falls externes Code (Tests, Skript) noch darauf referenziert.

### Manifest-Background-Color: weiß statt navy
PWA-`background_color` ist die Splash-Screen-Hintergrundfarbe. Marcel-Direktive war `#1a3a6b` für `theme_color` (Browser-UI), aber `background_color` bleibt `#ffffff` (Splash-Screen lesbar mit dunklem Logo).

---

## Was NICHT Teil von MEGA⁸⁸-A

- Email-Templates jenseits `trial-welcome.html` → Marcel-Smoke-Liste (siehe Checklist)
- PDFmonkey-Patches → Marcel-Task in PDFmonkey-Dashboard (siehe `MEGA88-A-PDFMONKEY-LOGO-CHECKLIST.md`)
- Legacy-Pages mit altem Logo-Markup (mahnung, briefe etc.) → Folge-Sprint oder Manuell
- Page-Title-Format Refactor pro Domain → Marcel-Manual oder Folge-Sprint

---

## Files in MEGA⁸⁸-A

| File | Status |
|---|---|
| `img/logo-prova-systems.svg` | **NEU** Master |
| `img/logo-prova.svg` | **NEU** Compact |
| `img/logo-icon-only.svg` | **NEU** Icon-Schild |
| `img/logo-icon-mono.svg` | **NEU** Mono Navy |
| `tools/generate-logo-pngs.js` | **NEU** PNG-Gen-Script |
| `nav.js` | modified (Sidebar-Logo via img) |
| `manifest.json` | modified (theme #1a3a6b + 4 Icon-Refs) |
| `index.html` | modified (Header + Footer + Favicon-Refs) |
| `app-login.html`, `app-register.html`, `admin-login.html`, `setup-2fa.html`, `account-2fa-status.html`, `workspace-invite.html`, `workspace-accept-invitation.html` | modified (Logo-Banner + Favicon-Refs) |
| `email-templates/_shared/brand-header.html` | **NEU** Snippet |
| `email-templates/founding/trial-welcome.html` | modified (Beispiel-Patch) |
| `sw.js` | v3800 → v3850 |
| `docs/SW-VERSION-HISTORY.md` | erweitert |
| `docs/MEGA88-A-DECISIONS.md` | **NEU** (dieses File) |
| `docs/MEGA88-A-PDFMONKEY-LOGO-CHECKLIST.md` | **NEU** |
| `docs/MEGA88-A-MARCEL-SMOKE.md` | **NEU** |
| `CLAUDE.md` | erweitert (Compounding Lesson Logo-Asset-Hierarchie) |
