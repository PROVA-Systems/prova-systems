# Cutover Schritt 04 — Airtable Read-Only setzen

**Sprint:** K-1.5 · **Owner:** Marcel · **Reihenfolge:** Schritt 4/5

---

## Wichtig: NICHT löschen

Airtable bleibt **als Read-Only-Backup** mindestens 4 Wochen nach Cutover.
Begründung:
- Falls Cutover-Bug: Restore aus Airtable möglich
- DSGVO-Audit: alte Daten sind reproduzierbar
- Pilot-SVs könnten Daten in Airtable haben die noch nicht migriert sind

→ **NIE Tabellen löschen, NIE Records löschen.**

---

## Schritte

### 1. Airtable-Snapshot erstellen

1. Airtable → Base `appJ7bLlAHZoxENWE` (PROVA-Base)
2. **Top-Right Menu** → **Manage Base** → **Snapshots**
3. **Create snapshot** → Name: `K-1.5-pre-readonly-YYYY-MM-DD`
4. Snapshot wird ~5-10 min generiert

### 2. Lokales Backup ziehen (optional, extra-Sicherheit)

```bash
# Air-Backup-Tool oder via Airtable-CSV-Export pro Tabelle
# Speichern unter: ~/PROVA-Backups/airtable-snapshot-K-1.5-YYYY-MM-DD/
```

### 3. Permissions auf Read-Only setzen

1. Airtable → Base → **Share**
2. Bestehende Collaborators auf **Read only** umstellen:
   - marcel.schreiber@... → Read only
   - Andere Team-Member → Read only
3. **Owner-Rolle behalten** (für Marcel) — sonst kein Permission-Reset möglich

### 4. Verifikation

- Versuch in Airtable Web-UI eine Zelle zu editieren → blockiert
- Keine API-Writes mehr möglich (Token hat nur read-Scope sowieso)

### 5. AIRTABLE_PAT in ENV-Vars BELASSEN

NICHT entfernen — wird gebraucht für:
- Re-Migration falls Cutover scheitert
- Notfall-Read-Back für DSGVO-Anfragen
- Validation-Skript (`scripts/migrate/validate.js`) bei Audit

---

## Schedule für Endgültig-Löschung

| Zeit nach Cutover | Aktion |
|---|---|
| Tag 0 | Read-Only setzen |
| Woche 1 | Daily Smoke-Test Supabase, Vergleich gegen Airtable |
| Woche 2 | Pilot-User-Anfragen + Bugs sammeln |
| Woche 4 | **Cutover-Final-Confirmation** |
| Monat 3 | Airtable-Base **archivieren** (Soft-Delete in Airtable, ist reversibel ~30 Tage) |
| Monat 6 | Permanent-Delete falls keine Beanstandungen |

---

## Rollback

Read-Only zurücknehmen:
1. Airtable → Share → Collaborators → Edit-Rolle wiederherstellen
2. Migrations-Skripte können wieder schreiben (würden sie aber nicht — wir migrieren ja von Airtable, nicht zu)

Bei kritischem Bug nach Cutover:
1. Snapshot zurückspielen (Airtable → Manage Base → Snapshots → Restore)
2. Frontend zurück auf `/.netlify/functions/airtable.js` (in Netlify-ENV ggf. Cache-Toggle)
3. Edge-Function-Pages zurück auf alte Logic
