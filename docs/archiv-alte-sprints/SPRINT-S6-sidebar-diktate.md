# Sprint S6 — Sidebar-Akkordeon + DIKTATE-Tabelle

---

## Voraussetzungen

- ✅ Sprint S5 abgeschlossen
- ✅ Tabelle DIKTATE angelegt in Airtable mit folgenden Feldern:
  - `name` (singleLineText, primary)
  - `fall_az` (singleLineText)
  - `sv_email` (email) — PFLICHT
  - `typ` (singleSelect: Ortstermin, Nachtrag, Korrektur, Recherche-Ergänzung)
  - `text_volltext` (multilineText)
  - `text_revidiert_von` (singleLineText)
  - `aufgenommen_am` (dateTime)
  - `dauer_sekunden` (number)
  - `transkription_modell` (singleLineText)
  - `audio_url` (url)
- ✅ DIKTATE in `airtable.js` Whitelist mit `userField: 'sv_email'`

---

## Teil 1: Sidebar-Umbau in `nav.js`

### Aktuelles Problem

Sidebar hat zu viele Links, teilweise redundant (Ortstermin, Freigabe, Schnellrechnung kommen heute direkt über Akte).

### Neue Struktur (laut BLUEPRINT v1.1)

```
PROVA · Solo
[ + Fall aufmachen ]   ⌘N
🔎 Schnellsuche

── ARBEIT ───
⊞ Zentrale (Dashboard)
📂 Meine Fälle      7 ▾  ← Akkordeon
   ● SCH-2026-031 (aktuell, fett)
   ○ SCH-2026-029
   ○ SCH-2026-027
   ────────────────
   → Alle 7 anzeigen
📅 Kalender

── WERKZEUGE ───
📚 Normen
📝 Textbausteine
🗂 Positionen & Preise
⚖️ JVEG-Rechner

── DOKUMENTE ───
💶 Rechnungen
✉️ Briefe & Vorlagen
📣 Mahnwesen

── BÜRO ───
👥 Kontakte
📥 Daten importieren

⚙️ Einstellungen
❓ Hilfe
🚪 Abmelden
```

**Entfernt:**
- Ortstermin (über Akte)
- Zur Freigabe (über Akte)
- Schnellrechnung (Stub)
- E-Rechnung (Unterfunktion von Rechnungen)
- Bescheinigungen (kommt in K3+)
- Jahresbericht (kommt in K3+)

### `nav.js` Erweiterung

```javascript
// In nav.js: ladeOffeneFaelle() ergänzen
async function ladeOffeneFaelle() {
  var svEmail = localStorage.getItem('prova_sv_email');
  if (!svEmail) return [];
  
  var filter = encodeURIComponent('AND({sv_email}="' + svEmail + '",NOT({Status}="Abgeschlossen"))');
  var url = '/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0?filterByFormula=' + filter 
    + '&maxRecords=5&sort[0][field]=Timestamp&sort[0][direction]=desc';
  
  var res = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ method: 'GET', path: url })
  });
  var data = await res.json();
  return data.records || [];
}

async function renderFaelleAkkordeon() {
  var records = await ladeOffeneFaelle();
  var totalCount = await zaehleAlleOffenen();
  var currentAZ = new URLSearchParams(window.location.search).get('az');
  
  var html = '<div class="nav-akkordeon">' +
    '<button class="akkordeon-header" onclick="toggleAkkordeon()">' +
      '📂 Meine Fälle <span class="badge">' + totalCount + '</span> ▾' +
    '</button>' +
    '<div class="akkordeon-body" id="faelle-liste">';
  
  records.forEach(function(r) {
    var f = r.fields;
    var aktiv = f.Aktenzeichen === currentAZ;
    var phase = f.phase_aktuell || '-';
    html += '<a href="akte.html?az=' + encodeURIComponent(f.Aktenzeichen || '') + '" ' +
      'class="fall-link' + (aktiv ? ' aktiv' : '') + '">' +
      '<span class="dot">' + (aktiv ? '●' : '○') + '</span>' +
      '<span class="az">' + (f.Aktenzeichen || '—') + '</span>' +
      '<span class="meta">' + (f.Schaden_Strasse || '').substring(0, 20) + ' · Phase ' + phase + '</span>' +
      '</a>';
  });
  
  if (totalCount > 5) {
    html += '<a href="archiv.html" class="alle-anzeigen">→ Alle ' + totalCount + ' anzeigen</a>';
  }
  
  html += '</div></div>';
  document.getElementById('nav-arbeit').innerHTML = html;
}
```

---

## Teil 2: DIKTATE-Tabelle integrieren

### Aktueller Stand

Diktate werden als `Sprachnotiz-Transkript` (multilineText) direkt in SCHADENSFAELLE gespeichert. Problem: nur EIN Diktat pro Fall, keine Versionierung, keine Typ-Unterscheidung.

### Migration

Existierende Transkripte aus `Sprachnotiz-Transkript` beim ersten Zugriff in DIKTATE migrieren:

```javascript
// migrate-alte-transkripte.js (einmalige Ausführung)
async function migrateAlteTranskripte() {
  var alleFaelle = await airtableGetAll('SCHADENSFAELLE');
  var migriert = 0;
  
  for (var fall of alleFaelle) {
    var transkript = fall.fields['Sprachnotiz-Transkript'];
    if (!transkript) continue;
    
    // Prüfen ob schon migriert
    var existiert = await airtableGet('DIKTATE', {
      filterByFormula: `AND({fall_az}="${fall.fields.Aktenzeichen}")`
    });
    if (existiert.records.length > 0) continue;
    
    // Neues Diktat anlegen
    await airtableCreate('DIKTATE', {
      fields: {
        name: 'D-' + (fall.fields.Aktenzeichen || 'MIG') + '-1',
        fall_az: fall.fields.Aktenzeichen,
        sv_email: fall.fields.sv_email,
        typ: 'Ortstermin',
        text_volltext: transkript,
        aufgenommen_am: fall.fields.Erstellt_Am || new Date().toISOString(),
        transkription_modell: 'migriert'
      }
    });
    migriert++;
  }
  console.log('Migriert:', migriert);
}
```

### Neues Diktat aufnehmen

In `ortstermin-modus.html` Diktat-Tab: nach Whisper-Transkription Record anlegen:

```javascript
async function speichereDiktat(transkriptText, dauerSek) {
  var az = new URLSearchParams(window.location.search).get('az');
  var svEmail = localStorage.getItem('prova_sv_email');
  
  // Zähle vorhandene Diktate für diesen Fall
  var filter = encodeURIComponent(`AND({fall_az}="${az}",{sv_email}="${svEmail}")`);
  var resVorhanden = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    body: JSON.stringify({
      method: 'GET',
      path: '/v0/appJ7bLlAHZoxENWE/tbl_DIKTATE_ID?filterByFormula=' + filter
    })
  });
  var vorhanden = (await resVorhanden.json()).records || [];
  var neueNr = vorhanden.length + 1;
  
  // Anlegen
  await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    body: JSON.stringify({
      method: 'POST',
      path: '/v0/appJ7bLlAHZoxENWE/tbl_DIKTATE_ID',
      payload: {
        fields: {
          name: 'D-' + az + '-' + neueNr,
          fall_az: az,
          sv_email: svEmail,
          typ: 'Ortstermin',
          text_volltext: transkriptText,
          dauer_sekunden: dauerSek,
          aufgenommen_am: new Date().toISOString(),
          transkription_modell: 'whisper-large-v3'
        }
      }
    })
  });
}
```

### Diktat-Verlauf in `akte.html` anzeigen

```javascript
async function ladeDiktate() {
  var filter = encodeURIComponent(`AND({fall_az}="${az}",{sv_email}="${svEmail}")`);
  var res = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    body: JSON.stringify({
      method: 'GET',
      path: '/v0/appJ7bLlAHZoxENWE/tbl_DIKTATE_ID?filterByFormula=' + filter 
        + '&sort[0][field]=aufgenommen_am&sort[0][direction]=desc'
    })
  });
  var data = await res.json();
  
  if (!data.records || !data.records.length) {
    document.getElementById('diktat-liste').innerHTML = '<p class="empty">Noch keine Diktate.</p>';
    return;
  }
  
  var html = data.records.map(function(d) {
    var f = d.fields;
    return '<div class="diktat-entry">' +
      '<span class="diktat-typ">' + (f.typ || '') + '</span>' +
      '<span class="diktat-name">' + (f.name || '') + '</span>' +
      '<span class="diktat-datum">' + new Date(f.aufgenommen_am).toLocaleString('de-DE') + '</span>' +
      '<details><summary>Volltext anzeigen</summary><pre>' + (f.text_volltext || '') + '</pre></details>' +
      (f.text_revidiert_von ? '<span class="hint">Korrektur von ' + f.text_revidiert_von + '</span>' : '') +
      '</div>';
  }).join('');
  
  document.getElementById('diktat-liste').innerHTML = html;
}
```

---

## Teil 3: Diktat-Typen UI

In Diktat-Tab Dropdown einbauen:

```html
<label>Diktat-Typ:
  <select id="diktat-typ">
    <option value="Ortstermin">Ortstermin</option>
    <option value="Nachtrag">Nachtrag (neue Infos)</option>
    <option value="Korrektur">Korrektur (ersetzt vorheriges)</option>
    <option value="Recherche-Ergänzung">Recherche-Ergänzung</option>
  </select>
</label>
```

Bei Typ "Korrektur": zeige Liste bestehender Diktate, User wählt welches revidiert wird, Feld `text_revidiert_von` wird gesetzt.

---

## Akzeptanzkriterien

- [ ] Sidebar zeigt Akkordeon "Meine Fälle" mit Badge
- [ ] Top 5 zuletzt bearbeitete mit aktueller Fall fett
- [ ] "Alle anzeigen" wenn >5
- [ ] Entfernte Links (Ortstermin/Freigabe/Schnellrechnung/Bescheinigungen/Jahresbericht) sind weg
- [ ] DIKTATE in airtable.js Whitelist
- [ ] Neue Diktate werden in DIKTATE-Tabelle gespeichert (nicht mehr direkt in SCHADENSFAELLE)
- [ ] Diktat-Typen funktionieren: Ortstermin/Nachtrag/Korrektur/Recherche-Ergänzung
- [ ] Bei "Korrektur": text_revidiert_von wird gesetzt
- [ ] Diktat-Verlauf in akte.html zeigt alle Diktate des Falls
- [ ] Migration alter Transkripte läuft einmalig erfolgreich
- [ ] Multi-Tenant-Filter (sv_email) auf DIKTATE
- [ ] sw.js CACHE_VERSION inkrementiert

---

## Test-Checkliste Marcel

1. [ ] Sidebar geöffnet → "Meine Fälle 7 ▾"
2. [ ] Aufklappen → 5 Fälle zeigen
3. [ ] Aktueller Fall fett markiert
4. [ ] Kein "Ortstermin"/"Freigabe"-Link mehr
5. [ ] Neues Diktat aufnehmen → in DIKTATE-Tabelle da
6. [ ] Dropdown "Typ" funktioniert
7. [ ] Diktat-Verlauf in Akte zeigt neues Diktat
8. [ ] Zweites Diktat als "Korrektur" → Auswahl des Originals
9. [ ] Multi-Tenant: zweiter SV sieht Diktate nicht
