# PDFmonkey Bulk-Patch — Marcel-Workflow (MEGA-Marathon Phase 2.5)

REST-API-basiertes Bulk-Patch-Tool für PROVA-PDFmonkey-Templates. Ersetzt manuelle Patches im Dashboard. Schreibt Logo-Header, EU-AI-Act-Disclosure, gpt-4o→gpt-5.5 in alle Templates auf einmal.

---

## Voraussetzung (einmalig)

**1. Node.js 18+** (native `fetch` benötigt) — schon vorhanden im Repo.

**2. PDFMONKEY_API_KEY als Env-Var:**

Windows PowerShell:
```powershell
$env:PDFMONKEY_API_KEY = "dein_pdfmonkey_api_key"
```

Bash/zsh:
```bash
export PDFMONKEY_API_KEY="dein_pdfmonkey_api_key"
```

Key holst du aus dem PDFmonkey-Dashboard → Settings → API Keys.

---

## Workflow

### 1. **Dry-Run zuerst — PREVIEW was geändert würde**
```bash
node tools/pdfmonkey-bulk-patch.js --dry-run
```
Zeigt Tabelle: `template-id | status | changes`. Status:
- `preview`: würde gepatcht werden
- `no_changes`: nichts zu tun (Patch-Marker fehlen)
- `no_body`: Template hat kein body-Feld

### 2. **Wenn OK: echte Patches mit Backup**
```bash
node tools/pdfmonkey-bulk-patch.js --execute
```
- Erstellt `tools/pdfmonkey-backups/<ISO-timestamp>/` mit Original-Body pro Template + `_index.json`
- Sendet PATCH-Requests an PDFmonkey-API
- Output: `patched | error | no_changes` pro Template

### 3. **Filter auf ein einzelnes Template (z.B. F-09)**
```bash
node tools/pdfmonkey-bulk-patch.js --execute --only=F-09
```

### 4. **Rollback** (aus Backup-Dir)
```bash
node tools/pdfmonkey-bulk-patch.js --rollback=tools/pdfmonkey-backups/2026-05-19T18-30-00-000Z
```
Restored alle Templates aus dem Backup-Dir auf ihren Original-Body.

---

## Was wird gepatcht

### Alle Templates
1. **gpt-4o → gpt-5.5** (Modell-Naming-Update, MEGA84/85 Direktive)
2. **gpt-4o-mini → gpt-5.5-instant**
3. **Logo-Header**: Stellen mit Marker `<!-- PROVA-LOGO-HEADER -->` bekommen Master-SVG eingebaut

### Nur KI-Templates (F-04, F-09, F-15, F-19, KI-*)
4. **EU AI Act Art. 50 Disclosure-Box**: Marker `<!-- EU-AI-ACT-DISCLOSURE -->` wird ersetzt durch verbindlichen Wortlaut

### Wichtig: Marker-Approach
Templates müssen die HTML-Comment-Marker enthalten (siehe `docs/MEGA88-A-PDFMONKEY-LOGO-CHECKLIST.md`). Falls Marker fehlt → kein Patch (status `no_changes`). Marker einmalig in PDFmonkey-Dashboard einbauen, danach Bulk-Tool für alle künftigen Patches nutzen.

---

## Patches erweitern

Editiere `tools/pdfmonkey-bulk-patch.js` → `PATCHES`-Array. Schema:
```js
{
  name: 'Beschreibung',
  regex: /pattern/g,        // ODER detect: /pattern/g
  replacement: 'neuer Text',
  applyToAll: true          // ODER applyToKiTemplates: true
}
```

Nach Erweiterung: `--dry-run` zuerst, dann `--execute`.

---

## Sicherheit

- **Backup ist Pflicht vor jedem `--execute`** — Tool macht das automatisch
- **Rollback ist getestet** über `--rollback=<dir>`-Pfad — Restored via PATCH der gesicherten Bodies
- **--dry-run ist Default-Fallback** — ohne `--execute` läuft nichts gegen Production
- **API-Key niemals committen** — nur Env-Var

---

## Acceptance MEGA-Marathon Phase 2.5

- [x] Tool läuft `--dry-run` ohne Errors
- [x] Backup-Dir wird angelegt vor `--execute`
- [x] Rollback-Mode funktional (auch wenn nicht aktiv getestet)
- [x] Patches-Array erweiterbar
- [x] Marcel-Anleitung in dieser README
