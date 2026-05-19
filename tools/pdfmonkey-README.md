# PDFmonkey Bulk-Patch v2.5c — Marcel-Workflow

## CHANGELOG

- **2.5c (19.05. 17:44):** Hotfix Idempotenz-Bug
  - `LOGO_HEADER_HTML` enthält keinen Marker mehr → Re-Runs erzeugen keine Duplikate
  - Detection-Reihenfolge fix: `hasLogo`-Check ZUERST (idempotent-skip), dann Marker, dann Auto-Inject
  - KI-Template-Detection via **Token-IN-Name** statt Prefix — erkennt "PROVA – F-09 – KURZGUTACHTEN" jetzt korrekt als KI-Template
  - Neue Flags: `--dedupe-logos` / `--dedupe-eu` / `--dedupe-all` reinigen bestehende Multi-Block-Templates aus Phase-2.5-Bug
  - `data-prova-component="logo-header"` / `="eu-ai-act"` als zusätzliches Detection-Attribute (Self-Recognition)
- **2.5b (19.05. 17:00):** Auto-Inject ohne Marker-Pflicht + `--audit`-Mode + Font-Audit
- **2.5 (19.05. ~17:00):** Erste Tool-Version mit Marker-Pflicht (durch 2.5c ersetzt)

---

## Marcel-Sofort-Empfehlung (nach Idempotenz-Incident)

Falls bei Marcels Runs 2-3 Logos pro Template entstanden sind:
```powershell
node tools/pdfmonkey-bulk-patch.js --execute --dedupe-all
# → Cleant alle Multi-Logo / Multi-EU-Box Templates auf je 1 Block, Rest entfernt
```
Idempotent: zweiter Dedupe-Run findet nichts mehr.

---

REST-API-Tool für PROVA-PDFmonkey-Templates mit **intelligenter Detection** (kein Marker-Pflicht mehr) + Audit-Mode.

---

## Voraussetzung (einmalig)

**Node.js 18+** + **PDFMONKEY_API_KEY**:

```powershell
# Windows PowerShell
$env:PDFMONKEY_API_KEY = "dein_pdfmonkey_api_key"
```
```bash
# Bash/zsh
export PDFMONKEY_API_KEY="dein_pdfmonkey_api_key"
```

Key holst du aus PDFmonkey-Dashboard → Settings → API Keys.

---

## Empfohlener Workflow

### Schritt 1: AUDIT — kein Schreiben, nur Bericht
```bash
node tools/pdfmonkey-bulk-patch.js --audit
```
- Listet pro Template: Logo-Status, EU-Box-Status, gpt-4o-Count, Font-Audit, Recommended Actions
- Schreibt `docs/PDFMONKEY-TEMPLATE-AUDIT-<YYYY-MM-DD>.md` mit kompletter Tabelle + Summary
- Output: „X Templates brauchen Logo-Inject, Y brauchen EU-Box, Z gpt-4o-Updates"
- **Mit konkreten Run-Befehlen am Ende.**

### Schritt 2: DRY-RUN — Preview was Patches ändern würden
```bash
node tools/pdfmonkey-bulk-patch.js --dry-run --inject-logo --inject-eu-disclosure
```
Zeigt Tabelle mit `status=preview` und Skip-Reasons.

### Schritt 3: EXECUTE — echte Patches mit Backup
```bash
# Nur gpt-4o-Fixes + Marker-Patches (keine Auto-Injects)
node tools/pdfmonkey-bulk-patch.js --execute

# Plus Logo-Auto-Inject (für Templates ohne Logo und ohne Marker)
node tools/pdfmonkey-bulk-patch.js --execute --inject-logo

# Plus EU-Box-Auto-Inject (für KI-Templates ohne EU-Erwähnung)
node tools/pdfmonkey-bulk-patch.js --execute --inject-eu-disclosure

# Alle Injects auf einmal
node tools/pdfmonkey-bulk-patch.js --execute --inject-all

# Filter auf ein Template
node tools/pdfmonkey-bulk-patch.js --execute --inject-all --only=F-09
```

### Schritt 4: ROLLBACK falls nötig
```bash
node tools/pdfmonkey-bulk-patch.js --rollback=tools/pdfmonkey-backups/2026-05-19T19-29-00-000Z
```

---

## Intelligente Detection-Heuristiken

### Logo-Detection
- **Hat Logo?** Regex `<img src="…logo-prova|prova-systems.de/img/logo|logo[_-]?prova"`
- Mit `--inject-logo`: wenn weder Logo noch Marker → injiziert Logo-Block nach `<body>` (oder prepend bei Fragment-Templates ohne body-Tag)

### EU-AI-Act-Detection (nur KI-Templates F-04/F-09/F-15/F-19/KI-*)
- **Hat EU-Box?** Regex matched `EU AI Act|EU-AI-Act|Art. 50|EU AI-Verordnung`
- Mit `--inject-eu-disclosure`: wenn weder vorhanden noch Marker → injiziert Box vor `</body>` (oder append bei Fragment-Templates)

### gpt-4o-Detection
- `\bgpt-4o(?!-mini|-realtime)\b` → ersetzt durch `gpt-5.5`
- `\bgpt-4o-mini\b` → ersetzt durch `gpt-5.5-instant`
- **gpt-4o-mini wird ZUERST gepatcht** (Reihenfolge wichtig — sonst greift gpt-4o auch in gpt-4o-mini)

### Font-Audit (CSS scss_style/style)
- **OK:** Inter, JetBrains Mono (Design-System v1.0 konform)
- **Flagged:** Source Serif 4, Helvetica, Arial, Montserrat — Marcel-Manual-Review empfohlen

---

## Sicherheits-Garantien

- **Backup vor jedem `--execute`** in `tools/pdfmonkey-backups/<ISO-timestamp>/` + `_index.json`
- **Rollback** über `--rollback=<dir>` getestet
- **Idempotent:** zweiter `--execute`-Run findet nichts mehr zu tun (Logo erkannt, gpt-5.5 schon da)
- **`--dry-run` ist Default** — ohne expliziten Mode-Flag läuft nichts

---

## CLI-Reference

| Flag | Wirkung |
|---|---|
| `--audit` | Nur Bericht + `PDFMONKEY-TEMPLATE-AUDIT-<date>.md` schreiben |
| `--dry-run` | Preview was gepatcht würde, kein Schreiben |
| `--execute` | Echte Patches mit Backup |
| `--inject-logo` | Auto-Inject Logo nach `<body>` auch ohne Marker |
| `--inject-eu-disclosure` | Auto-Inject EU-Box vor `</body>` auch ohne Marker (KI-Templates) |
| `--inject-all` | Shortcut: beide Auto-Injects |
| `--only=<id>` | Filter auf 1 Template (z.B. `--only=F-09`) |
| `--rollback=<dir>` | Restore aus Backup-Dir |

---

## Acceptance (MEGA-Marathon Phase 2.5b)

- [x] `--audit` Mode ohne API-Calls testen lokal
- [x] Auto-Inject-Logic für Logo (nach `<body>`)
- [x] Auto-Inject-Logic für EU-AI-Act (vor `</body>`, nur KI-Templates)
- [x] Detection-Heuristiken für „schon vorhanden" Skip
- [x] gpt-4o-mini-Fix vor gpt-4o-Fix (Reihenfolge-Bug verhindert)
- [x] CSS-Font-Audit (Inter/JetBrains OK, Source Serif/Helvetica/Arial/Montserrat geflagged)
- [x] Markdown-Audit-Report-Generierung
- [x] Verbesserter Output mit Skip-Reasons + Concrete-Recommendations
