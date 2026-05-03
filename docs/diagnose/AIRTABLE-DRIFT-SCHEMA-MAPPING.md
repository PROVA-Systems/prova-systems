# AIRTABLE-DRIFT — Schema-Mapping (Bundle A Pre-Migration)

**Erstellt:** 04.05.2026 nacht (MEGA⁴-EXT Q3)
**Verwendung:** Pflicht-Lektuere fuer pro Function-Migration
**Pattern:** Storage-Router (`netlify/functions/lib/storage-router.js`)

---

## Mapping-Tabelle

| Airtable-Tabelle | Airtable-ID | Supabase-Pendant | Migration-Status |
|---|---|---|---|
| SCHADENSFAELLE | `tblSxV8bsXwd1pwa0` | `auftraege` | Schema vorhanden, Daten Sprint K-2 |
| SV | `tbladqEQT3tmx4DIB` | `users` + `workspace_memberships` | Auth-Migration K-1.0 done; SV-Profile pending |
| TERMINE | `tblyMTTdtfGQjjmc2` | `termine` | Schema vorhanden |
| RECHNUNGEN | `tblF6MS7uiFAJDjiT` | `dokumente` (typ='rechnung') | Schema vorhanden |
| BRIEFE | `tblSzxvnkRE6B0thx` | `dokumente` (typ='brief') | Schema vorhanden |
| KONTAKTE | `tblMKmPLjRelr6Hal` | `kontakte` | Schema vorhanden |
| AUDIT_TRAIL | `tblqQmMwJKxltXXXl` | `audit_trail` | LIVE — neue Eintraege nur Supabase |
| NORMEN | `tblFVcMxntQhusY2i` | `textbausteine` (kategorie='norm') | Schema vorhanden |

---

## Spalten-Mapping (kritisch fuer Bundle A)

### SV → users + workspace_memberships
| Airtable | Supabase | Hinweis |
|---|---|---|
| `Email` | `users.email` | lowercase enforced |
| `Status` | `users.is_active` (boolean) | + `users.gesperrt` |
| `Paket` | `workspace_memberships.role` | 'solo' | 'team_owner' | 'team_member' |
| `trial_end` | `workspaces.abo_trial_endet_am` | wsp-level statt user-level |
| `subscription_status` | `workspaces.abo_status` | enum: trial/aktiv/ueberfaellig/gekuendigt |
| `Stripe_Customer_ID` | `workspaces.stripe_customer_id` | wsp-level |
| `created_at` | `users.created_at` | |

### SCHADENSFAELLE → auftraege
| Airtable | Supabase | Hinweis |
|---|---|---|
| `Aktenzeichen` | `auftraege.aktenzeichen` | UNIQUE per workspace |
| `Schadensart` | `auftraege.schadensart` | enum |
| `Flow` | `auftraege.flow` | A/B/C/D |
| `Status` | `auftraege.status` | Lifecycle |
| `Fachurteil_Text` | `auftraege.fachurteil_text` | KI-frei (§6 IHK-SVO) |
| `PDF_URL` | `auftraege.pdf_url` | Storage-Bucket |
| `Workspace_Email` | `auftraege.workspace_id` | UUID statt Email |

### RECHNUNGEN → dokumente (typ='rechnung')
| Airtable | Supabase | Hinweis |
|---|---|---|
| `Rechnungsnummer` | `dokumente.dokument_nummer` | |
| `empfaenger_name` | `dokumente.empfaenger_name` | |
| `brutto_betrag_eur` | `dokumente.betrag_brutto_eur` | NUMERIC |
| `status` | `dokumente.zahlungsstatus` | offen/bezahlt/storniert/mahnung1-3 |
| `mahnstufe` | `dokumente.mahnstufe` | INT |
| `bezahlt_am` | `dokumente.bezahlt_am` | DATE |

### BRIEFE → dokumente (typ='brief')
Gleicher Pattern wie Rechnungen. Felder: `betreff` → `dokumente.titel`, `inhalt` → `dokumente.inhalt_text`.

### NORMEN → textbausteine (kategorie='norm')
| Airtable | Supabase | Hinweis |
|---|---|---|
| `DIN_Nummer` | `textbausteine.titel` | z.B. "DIN 18195-4" |
| `Titel` | `textbausteine.kurzbeschreibung` | |
| `Volltext` | `textbausteine.inhalt` | |
| `Aktiv` | `textbausteine.is_active` | |

---

## Beispiel-Migration: Read-Pattern

**VORHER (nur Airtable):**
```js
// netlify/functions/normen.js
const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NORMEN}?filterByFormula=...`;
const res = await fetch(url, { headers: { Authorization: 'Bearer ' + pat } });
const data = await res.json();
return data.records;
```

**NACHHER (Storage-Router mit Backward-Compat):**
```js
const { readDual, getSupabase } = require('./lib/storage-router');

async function fromAirtable() {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NORMEN}?filterByFormula=...`;
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + process.env.AIRTABLE_PAT } });
  const data = await res.json();
  return data.records;
}

async function fromSupabase() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('textbausteine')
    .select('*')
    .eq('kategorie', 'norm')
    .eq('is_active', true);
  return (data || []).map(t => ({
    fields: { DIN_Nummer: t.titel, Titel: t.kurzbeschreibung, Volltext: t.inhalt }
  }));
}

const records = await readDual({
  functionName: 'normen',
  airtable: fromAirtable,
  supabase: fromSupabase
});
```

---

## Beispiel-Migration: Write-Pattern (Dual-Write)

**VORHER:**
```js
// netlify/functions/audit-log.js
await fetch(url, { method: 'POST', headers: {...}, body: JSON.stringify({ fields: {...} }) });
```

**NACHHER:**
```js
const { writeDual, getSupabase } = require('./lib/storage-router');

await writeDual({
  functionName: 'audit-log',
  airtable: async () => fetch(airtableUrl, { method: 'POST', headers, body }),
  supabase: async () => {
    const sb = getSupabase();
    return sb.from('audit_trail').insert({...});
  }
});
```

Bei `PROVA_MIGRATION_PATH=dual` wird in BEIDEN geschrieben (Marcel kann selbst pruefen ob Daten konsistent ankommen).

---

## Marcel-Decision-Punkte (pro Function)

1. **Read-only Functions (kein Schreiben):** sicherer Start. Z.B. `normen.js`, `health.js`, `ki-statistik.js`.
2. **Write-Functions:** `dual` als Default — schreibt in beide, kein Daten-Verlust.
3. **Auth-Functions:** `auth-token-issue.js` — Vorsicht, da Login-kritisch. Letzter Migration-Schritt.
4. **DSGVO-Functions:** `dsgvo-loeschen.js` — muss in BEIDEN loeschen (Compliance).

---

## Feature-Flag-Schedule (Marcel-Vorschlag)

| Phase | PROVA_MIGRATION_PATH | Wer? |
|---|---|---|
| Sprint K-2 Start | `airtable` (default, Status-Quo) | Marcel testet zuerst lokal |
| K-2 Tag 3 | `dual` selektiv pro Function via opts.path | gradueller Rollout |
| K-2 Tag 7 | `dual` global | alle Functions |
| K-2 Tag 14 | `supabase` global | Read-Pfad nur Supabase |
| K-2 Tag 21 | Airtable-Code entfernt | Migration done |

---

*Sprint MEGA⁴-EXT Q3 (Bundle A Pre-Migration) — 04.05.2026 nacht.*
