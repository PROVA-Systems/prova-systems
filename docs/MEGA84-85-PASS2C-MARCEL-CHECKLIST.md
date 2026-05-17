# MEGA⁸⁴/⁸⁵ Pass 2c — Marcel-Checkliste

**Stand:** 2026-05-17 · Branch: `feat/mega84-85-pass2c-audit-bibliothek`

---

## A — Pre-Apply

### A.1 audit-log-v1 deployen via MCP
```
mcp_use claude_ai_Supabase deploy_edge_function
  project_id=cngteblrbpwsyypexjrv
  name=audit-log-v1
  files=[{name:"index.ts", content:<Inhalt von supabase/functions/audit-log-v1/index.ts>}]
```

Erwartung: 200 OK, function endpoint live unter
`https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/audit-log-v1`

### A.2 Smoke-Test mit curl (Test-User-JWT)
```bash
curl -X POST 'https://cngteblrbpwsyypexjrv.supabase.co/functions/v1/audit-log-v1' \
  -H 'Authorization: Bearer <TEST_JWT>' \
  -H 'apikey: <ANON_KEY>' \
  -H 'content-type: application/json' \
  -d '{"task":"ki_request","action":"ki_request","payload":{"modell":"gpt-5.5","tokens_in":100,"tokens_out":50},"ki_model":"gpt-5.5"}'
```

Erwartung: `{"ok":true,"audit_id":"...","integrity_hash":"...","prev_hash":"...","chain_intact":true,"task":"ki_request"}`

### A.3 Hash-Kette verifizieren
SQL-Editor:
```sql
SELECT id, created_at, action, kategorie,
       LEFT(prev_hash, 12) AS prev,
       LEFT(integrity_hash, 12) AS this
  FROM public.audit_trail
 WHERE workspace_id = '65b25a13-17b7-45c0-b567-6edee235dd98'::uuid
 ORDER BY created_at DESC LIMIT 5;
```
Erwartung: ältere Zeile `integrity_hash` == nächster `prev_hash` (chronologisch).

---

## B — Frontend-Smoke (`app.prova-systems.de`)

### B.1 SW-Update
DevTools → Application → Service Workers → aktive Version **`prova-v3600-mega84-85-complete`**.

### B.2 Bibliothek — neue Tabs
1. `/bibliothek.html` öffnen
2. Tab **📨 Brief-Vorlagen** anklicken → lädt Einträge aus `user_vorlagen` (oder Empty-State, wenn keine angelegt)
3. Tab **📋 Bescheinigungen** → 12 hardcoded-Cards sichtbar (Identität/Termin/Auftrag/Zustand/Beweissicherung/Schaden/Statik/VOB)
4. Klick auf Bescheinigungs-Card → Modal mit Beschreibung + "Bescheinigung erstellen"-Button → leitet zu `/bescheinigungen.html?typ=bescheinigung_termin`
5. Tab **🔎 360°-Suche** → Empty-State mit Hint
6. Suchen "rohrbruch" → Treffer aus mehreren Sources mit Icons (📂📄👥📝📐)
7. Klick auf Treffer → öffnet `/akte.html?id=...`

### B.3 Context-aware-Insert
1. `/bibliothek.html?aktion=insert&auftrag_id=<beliebige_uuid_aus_eigenen_auftraegen>` öffnen
2. Banner oben sichtbar: "Einfügen-Modus: Treffer-CTAs übernehmen den Eintrag direkt in Akte XY-2024-001"
3. Auf Tab Normen → Klick auf Norm-Card → Detail-Modal
4. CTA unten: **"📂 In Akte XY-2024-001 einfügen"** (statt "✏ In Editor verwenden")
5. Klick → navigiert zu `/akte.html?id=<uuid>&bib_insert=1` (und localStorage `prova_bibliothek_pending_insert` ist gesetzt)
6. Akte-Page öffnet → wenn Akte-Page den localStorage-Flag liest, sollte Norm eingefügt werden

### B.4 360°-Suche bei fehlender Migration
Wenn Migration 59 (`global_search_v2`) noch nicht applied (siehe Pass 2b A.1):
- Tab 360°-Suche zeigt User-friendly Fehler mit Hinweis auf Pass-2b-Checklist
- Andere Tabs unbeeinflusst

---

## C — Quick-Check Pass

| Punkt | Erwartung | OK? |
|---|---|---|
| **C.1** SW v3600 aktiv | ja | ☐ |
| **C.2** audit-log-v1 endpoint erreichbar | 200 OK | ☐ |
| **C.3** Hash-Kette intakt nach 3 Einträgen | prev[i] == this[i+1] | ☐ |
| **C.4** Bibliothek hat 5 Tabs | Normen + Textb. + Briefe + Besch. + 360°-Suche | ☐ |
| **C.5** Brief-Vorlagen-Tab lädt user_vorlagen | ja | ☐ |
| **C.6** Bescheinigungen-Tab zeigt 12 Templates | ja | ☐ |
| **C.7** 360°-Suche liefert Multi-Source-Treffer | ja (mit Migration 59 applied) | ☐ |
| **C.8** ?aktion=insert&auftrag_id= zeigt Banner | ja | ☐ |
| **C.9** CTA-Label kontextabhängig | "In Akte XY einfügen" | ☐ |
| **C.10** Klick auf CTA navigiert zur Akte | ja | ☐ |

---

## D — Bei Fehler

- **audit-log-v1 wirft 401**: JWT ungültig → neu einloggen, JWT prüfen
- **audit-log-v1 wirft "action not in audit_action ENUM"**: action-Wert prüfen, muss aus 18-ENUM sein
- **Hash-Kette bricht**: Race-Condition möglich bei parallelen Inserts pro workspace → akzeptierbar für Audit-Trail, keine kritische Daten-Konsistenz
- **Briefe-Tab leer**: User hat keine user_vorlagen angelegt — Empty-State zeigt Hinweis
- **Bibliothek hängt**: Console prüfen (DevTools) — Module-Import-Fehler? supabase-client.js Pfad korrekt?
- **Context-Banner zeigt "Akte" statt "Akte XY-2024-001"**: AZ-Hydration läuft async, Banner erscheint erst nach DB-Roundtrip. Bei sehr alter `auftraege.id` ohne `az` → "Akte" bleibt

---

## E — Nach grünem Test

1. PR mergen auf `main` (3 PRs in Folge mergen: Pass 2a + 2b + 2c — oder direkt 2c als finalem Merge)
2. Tag setzen: **`v3600-mega84-85-complete`**
3. Mega-Sprint MEGA⁸⁴/⁸⁵ abgeschlossen ✅
4. Pass 3 wird neu spezifiziert (Backlog: alte Audit-Edges deprecaten, Bibliothek-UI auf Side-Pane refactoren, etc.)

---

**Pass 2c komplett — MEGA⁸⁴/⁸⁵ Sprint-Final** ✅
