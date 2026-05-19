# PDFmonkey-Template-Audit 2026-05-19

> **Status:** PLATZHALTER — Marcel führt `--audit` lokal mit echtem API-Key aus, dann wird diese Datei automatisch überschrieben.

CC hat keinen `PDFMONKEY_API_KEY` in der Sandbox-Umgebung und kann das Tool nicht live ausführen. Sobald Marcel den Audit-Run macht, wird diese Datei mit konkreten Ergebnissen überschrieben.

---

## Run-Anweisung

```powershell
# Windows PowerShell
cd C:\PROVA-Systems\prova-systems\GitHub\prova-systems
$env:PDFMONKEY_API_KEY = "dein_key_aus_pdfmonkey_settings"
node tools/pdfmonkey-bulk-patch.js --audit
```

→ schreibt diese Datei automatisch mit kompletten Stats + Per-Template-Tabelle + Recommended Actions.

---

## Was der Audit liefert (Erwartete Output-Struktur)

### Summary
- Anzahl Templates total + KI-Templates
- Anzahl mit Logo / EU-Box / gpt-4o / Inter-Font / geflaggten Fonts
- Anzahl die Logo-Inject brauchen
- Anzahl KI-Templates die EU-Disclosure-Inject brauchen

### Recommended Actions
Konkrete Run-Befehle, z.B.:
- `Run node tools/pdfmonkey-bulk-patch.js --execute --inject-logo to add logo to 12 Templates`
- `Run node tools/pdfmonkey-bulk-patch.js --execute --inject-eu-disclosure to add EU-Box to 4 KI-Templates`
- `Run node tools/pdfmonkey-bulk-patch.js --execute to fix gpt-4o → gpt-5.5 in N Templates`

### Per-Template Detail-Tabelle
| Template | Type | Logo | EU-Box | gpt-4o | Font | Actions |
|---|---|---|---|---|---|---|
| F-04 | KI | ✗ | ✗ | ❗ 2× | Inter ✓ | inject-logo, inject-eu-disclosure, gpt-4o-update (2×) |
| F-09 | KI | ✓ | (M) | ✓ | Inter ✓ | (Marker→Block) |
| RECHNUNG-MASTER | - | ✓ | — | ✓ | Inter ✓ | ✓ done |
| ... | ... | ... | ... | ... | ... | ... |

Legende:
- ✓ vorhanden / OK
- ✗ fehlt — Inject-Recommended
- (M) Marker vorhanden aber Block nicht expandiert
- — nicht relevant (Non-KI-Template)
- ❗ Patch erforderlich

---

## Nach dem Audit

Wenn die Datei mit echten Daten überschrieben wurde:
1. Recommended-Actions-Liste durchlesen
2. Per Run-Befehl die Patches durchführen
3. Backup-Dir-Pfad notieren (für Rollback bei Problemen)
4. Test-Rendering pro Template in PDFmonkey-Dashboard prüfen
