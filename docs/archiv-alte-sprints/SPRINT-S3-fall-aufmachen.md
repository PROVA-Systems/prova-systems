# Sprint S3 — Neuer Einstiegspunkt + Stammdaten-Formular

> Erster Architektur-Heilungs-Sprint nach Sicherheits-Sprints.

---

## Ziel

Zwei neue Seiten bauen, die zusammen den **einzigen Einstiegspunkt** für die Fall-Anlage bilden:

1. `fall-aufmachen.html` — Übersicht (Heute / Offene Fälle / Neuer Fall)
2. `neuer-fall.html` — 3-Stufen-Formular für Stammdaten

---

## Voraussetzungen

- ✅ Sprint S-AUDIT abgeschlossen, kritische Findings gefixt
- ✅ Sprint IMPORT-FIX abgeschlossen
- ✅ Airtable: Tabelle DIKTATE existiert, Phase-Felder + AZ-Felder + Frist-Felder existieren
- ✅ Airtable: KONTAKTE und TEXTBAUSTEINE_CUSTOM in `airtable.js` Whitelist

---

## Aufgabe 1: `fall-aufmachen.html`

### Wireframe (siehe BLUEPRINT-v1.1.md)

3 Zonen:
- **Heute anstehend** — Termine aus `TERMINE` filter heute, sv_email
- **Offene Fälle** — `SCHADENSFAELLE` filter Status != Abgeschlossen, sv_email, max 5 + "Alle anzeigen"
- **Neuer Fall** — großer Button → `neuer-fall.html`

### HTML-Struktur

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Fall aufmachen · PROVA</title>
  <link rel="stylesheet" href="prova-design.css">
  <link rel="stylesheet" href="mobile.css">
  <link rel="manifest" href="manifest.json">
  <script src="theme.js"></script>
</head>
<body>
  <div id="app">
    <!-- nav.js injectet die Sidebar -->
    
    <main>
      <h1>Fall aufmachen</h1>
      
      <section id="heute-zone">
        <h2>📅 Heute anstehend</h2>
        <div id="heute-liste">
          <!-- gefüllt durch fall-aufmachen-logic.js -->
        </div>
      </section>
      
      <section id="offene-zone">
        <h2>📂 Offene Fälle</h2>
        <input type="text" id="suche" placeholder="🔎 Fall suchen...">
        <div id="offene-liste">
          <!-- gefüllt durch fall-aufmachen-logic.js -->
        </div>
        <a href="archiv.html">→ Alle anzeigen</a>
      </section>
      
      <section id="neuer-zone">
        <h2>+ Neuer Fall</h2>
        <a href="neuer-fall.html" class="btn-primary-large">
          + Neuen Fall komplett anlegen
        </a>
        <p class="hint">Auftragstyp, Adresse, Schadensart · ca. 2 Minuten</p>
      </section>
    </main>
  </div>
  
  <script src="auth-guard.js"></script>
  <script src="nav.js"></script>
  <script src="airtable.js"></script>
  <script src="fall-aufmachen-logic.js"></script>
  <script src="sw-register.js"></script>
</body>
</html>
```

### JavaScript: `fall-aufmachen-logic.js`

```javascript
// fall-aufmachen-logic.js
(function() {
  var svEmail = localStorage.getItem('prova_sv_email') || '';
  if (!svEmail) {
    window.location.href = 'app-login.html';
    return;
  }
  
  // Heute
  async function ladeHeute() {
    var heute = new Date().toISOString().split('T')[0];
    var filter = encodeURIComponent('AND({sv_email}="' + svEmail + '",DATESTR({termin_datum})="' + heute + '")');
    
    try {
      var res = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          method: 'GET',
          path: '/v0/' + AIRTABLE_BASE + '/tblyMTTdtfGQjjmc2?filterByFormula=' + filter + '&maxRecords=20'
        })
      });
      var data = await res.json();
      renderHeute(data.records || []);
    } catch (e) {
      console.error('ladeHeute', e);
      document.getElementById('heute-liste').innerHTML = '<p class="error">Termine konnten nicht geladen werden</p>';
    }
  }
  
  function renderHeute(records) {
    var container = document.getElementById('heute-liste');
    if (!records.length) {
      container.innerHTML = '<p class="empty">Keine Termine heute</p>';
      return;
    }
    container.innerHTML = records.map(function(r) {
      var f = r.fields;
      var zeit = f.termin_datum ? new Date(f.termin_datum).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'}) : '';
      return '<div class="termin-card">' +
        '<div class="zeit">📅 ' + zeit + '</div>' +
        '<div class="az">' + (f.aktenzeichen || '—') + '</div>' +
        '<div class="adresse">' + (f.objekt_adresse || '') + '</div>' +
        '<a href="akte.html?az=' + encodeURIComponent(f.aktenzeichen || '') + '" class="btn-open">Öffnen →</a>' +
        '</div>';
    }).join('');
  }
  
  // Offene Fälle
  async function ladeOffene() {
    var filter = encodeURIComponent('AND({sv_email}="' + svEmail + '",NOT({Status}="Abgeschlossen"))');
    
    try {
      var res = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          method: 'GET',
          path: '/v0/' + AIRTABLE_BASE + '/tblSxV8bsXwd1pwa0?filterByFormula=' + filter + '&maxRecords=5&sort[0][field]=Timestamp&sort[0][direction]=desc'
        })
      });
      var data = await res.json();
      renderOffene(data.records || []);
    } catch (e) {
      console.error('ladeOffene', e);
    }
  }
  
  function renderOffene(records) {
    // Analoge Render-Logik
    // ...
  }
  
  // Init
  document.addEventListener('DOMContentLoaded', function() {
    ladeHeute();
    ladeOffene();
  });
})();
```

---

## Aufgabe 2: `neuer-fall.html`

### 3-Stufen-Layout

**Wichtig:** Stufen sind **kein Wizard** mit erzwungener Reihenfolge. SV kann zurück springen, Felder ergänzen. Atomares Speichern macht das risikofrei.

### Stufe 1 — Auftragstyp-Karten-Grid

6 Karten zur Auswahl:
1. ⚖️ Gerichtsgutachten
2. 🏢 Versicherungsgutachten
3. 👤 Privatgutachten
4. 📐 Beweissicherung
5. ⏱️ Beratung/Stellungnahme
6. 🏗 Baubegleitung

**Bei Klick:** Sofortige Anlage in Airtable mit:
- `prova_aktenzeichen`: auto-generiert (Format `SCH-YYYY-NNN`, Counter ist max(existierender_NNN)+1)
- `Auftraggeber_Typ`: aus Auswahl
- `sv_email`: aktueller User
- `Status`: "Neuer Auftrag"
- `phase_aktuell`: 1
- `Timestamp`: jetzt

Dann Weiterleitung zu Stufe 2.

### Stufe 2 — Optionaler PDF-Upload (in K3 vollständig, in S3 nur Stub)

In S3 nur: Upload-Button platzieren, "Coming Soon" anzeigen, Schritt überspringbar. Echte KI-Extraktion in Sprint K3.

### Stufe 3a — Gemeinsame Stammdaten

Atomares Speichern: jedes Feld hat `onblur="saveField('FELDNAME', this.value)"`.

Pflichtfelder: Auftraggeber-Name, Schadensort, Schadensart.

**Status-Indikator** oben rechts:
```html
<div id="save-indicator">
  <span class="dot"></span>
  <span class="text">Gespeichert vor 3 Sek.</span>
</div>
```

JavaScript:
```javascript
async function saveField(fieldName, value) {
  document.getElementById('save-indicator').className = 'saving';
  document.querySelector('#save-indicator .text').textContent = 'Speichere...';
  
  var res = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      method: 'PATCH',
      path: '/v0/' + AIRTABLE_BASE + '/tblSxV8bsXwd1pwa0/' + currentRecordId,
      payload: {
        fields: { [fieldName]: value }
      }
    })
  });
  
  if (res.ok) {
    document.getElementById('save-indicator').className = 'saved';
    document.querySelector('#save-indicator .text').textContent = 'Gespeichert vor 0 Sek.';
    startElapsedCounter();
  } else {
    document.getElementById('save-indicator').className = 'error';
    document.querySelector('#save-indicator .text').textContent = 'Speicher-Fehler!';
  }
}

// Counter "vor X Sek."
var lastSaveTime = Date.now();
function startElapsedCounter() {
  lastSaveTime = Date.now();
}
setInterval(function() {
  if (document.getElementById('save-indicator').className === 'saved') {
    var sec = Math.floor((Date.now() - lastSaveTime) / 1000);
    document.querySelector('#save-indicator .text').textContent = 'Gespeichert vor ' + sec + ' Sek.';
  }
}, 5000);
```

### Stufe 3b — Typ-spezifische Felder (conditional)

JavaScript prüft `Auftraggeber_Typ` und rendert entsprechende Sektion.

**Code-Skelett:**
```javascript
function renderTypSpezifisch(typ) {
  var container = document.getElementById('typ-spezifisch');
  
  switch(typ) {
    case 'gerichtsgutachten':
      container.innerHTML = `
        <h3>Gerichtsgutachten-Details</h3>
        <label>Gericht *<input type="text" id="f-gericht" onblur="saveField('Auftraggeber_Name', this.value)"></label>
        <label>AZ Gericht *<input type="text" id="f-az-gericht" onblur="saveField('auftraggeber_az', this.value)"></label>
        <label>Beweisbeschluss-Datum *<input type="date" id="f-bb-datum" onblur="saveField('Schadensdatum', this.value); berechneFrist(this.value);"></label>
        <label>Beweisfragen<textarea id="f-beweisfragen" onblur="saveField('beweisfragen', this.value)"></textarea></label>
        <label>§411-Frist (auto)<input type="date" id="f-frist" readonly></label>
        <div class="warning">⚠️ §407a-Anzeige sofort erforderlich</div>
      `;
      break;
    
    case 'versicherungsgutachten':
      container.innerHTML = `
        <h3>Versicherungs-Details</h3>
        <label>Versicherung *<input type="text" id="f-vers" onblur="saveField('Versicherung', this.value)"></label>
        <label>Schadensnummer *<input type="text" id="f-schaden-nr" onblur="saveField('auftraggeber_az', this.value)"></label>
        <label>Policennummer<input type="text" id="f-police" onblur="saveField('policennummer', this.value)"></label>
        <label>Sachbearbeiter<input type="text" id="f-sb" onblur="saveField('Ansprechpartner', this.value)"></label>
      `;
      break;
    
    case 'privatgutachten':
      container.innerHTML = `
        <h3>Privatgutachten-Details</h3>
        <label><input type="checkbox" id="f-verbraucher" onchange="saveField('ist_verbraucher', this.checked)"> Auftraggeber ist Verbraucher (§312g BGB)</label>
        <p class="hint" id="hinweis-widerruf" style="display:none">→ Widerrufsbelehrung erforderlich</p>
      `;
      break;
    
    // ... weitere Typen
  }
}

function berechneFrist(beweisbeschlussDatum) {
  if (!beweisbeschlussDatum) return;
  var bb = new Date(beweisbeschlussDatum);
  var frist = new Date(bb.getTime() + 8 * 7 * 24 * 60 * 60 * 1000); // 8 Wochen
  document.getElementById('f-frist').value = frist.toISOString().split('T')[0];
  saveField('Abgabefrist', frist.toISOString().split('T')[0]);
  saveField('frist_quelle', 'Auto-berechnet: Beweisbeschluss ' + beweisbeschlussDatum + ' + 8 Wochen');
}
```

### Action-Button "Fall anlegen + zur Akte"

Validiert Pflichtfelder, dann:
```javascript
async function fallAnlegen() {
  // Phase auf 2 setzen
  await saveField('phase_aktuell', 2);
  // Status auf "In Bearbeitung"
  await saveField('Status', 'In Bearbeitung');
  // Audit-Trail
  await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      method: 'POST',
      path: '/v0/' + AIRTABLE_BASE + '/tblqQmMwJKxltXXXl',
      payload: {
        fields: {
          aktenzeichen: currentAZ,
          sv_email: svEmail,
          aktion: 'fall_angelegt',
          timestamp: new Date().toISOString()
        }
      }
    })
  });
  // Weiterleitung
  window.location.href = 'akte.html?az=' + encodeURIComponent(currentAZ);
}
```

---

## Routing

In `nav.js`: "Fall aufmachen" Button verlinkt jetzt auf `fall-aufmachen.html` statt `app.html`.

In `_redirects` (Netlify): 
```
/app.html  /fall-aufmachen.html  301
```

---

## Akzeptanzkriterien

- [ ] `fall-aufmachen.html` zeigt 3 Zonen
- [ ] Heute-Zone lädt aus TERMINE mit sv_email-Filter
- [ ] Offene-Zone lädt aus SCHADENSFAELLE mit sv_email-Filter
- [ ] Klick auf Termin/Fall führt zu `akte.html?az=...`
- [ ] Klick auf "+ Neuer Fall" führt zu `neuer-fall.html`
- [ ] `neuer-fall.html` Stufe 1: 6 Auftragstyp-Karten
- [ ] Bei Karten-Klick: Record in Airtable mit prova_aktenzeichen erstellt
- [ ] Stufe 2: PDF-Upload-Stub (Coming Soon)
- [ ] Stufe 3a: gemeinsame Stammdaten mit atomarem Speichern
- [ ] Stufe 3b: typ-spezifische Felder rendern dynamisch
- [ ] Status-Indikator oben rechts funktioniert
- [ ] "Fall anlegen + zur Akte"-Button leitet weiter
- [ ] AUDIT_TRAIL-Eintrag bei Fall-Anlage
- [ ] sw.js CACHE_VERSION inkrementiert
- [ ] `nav.js` aktualisiert (Sidebar-Link)
- [ ] `_redirects` aktualisiert
- [ ] `node --check` für alle JS-Files läuft sauber

---

## Test-Checkliste für Marcel

1. [ ] `/fall-aufmachen.html` öffnen → 3 Zonen sichtbar
2. [ ] Heute-Zone: passt es zum heutigen Termin in Airtable?
3. [ ] Offene-Zone: zeigt 5 zuletzt bearbeitete?
4. [ ] Klick auf "+ Neuer Fall" → `neuer-fall.html`
5. [ ] Karte "Versicherungsgutachten" klicken → Record in Airtable da?
6. [ ] AZ wurde generiert? (`SCH-2026-NNN`)
7. [ ] Auftraggeber-Name eintippen → on-blur → "Gespeichert vor 0 Sek." erscheint
8. [ ] In Airtable refresh → Name da?
9. [ ] Schadensart auswählen → in Airtable da?
10. [ ] "Fall anlegen + zur Akte" → führt nach `akte.html?az=SCH-2026-NNN`
11. [ ] AUDIT_TRAIL: Eintrag mit aktion='fall_angelegt' da?
12. [ ] In Inkognito-Tab als anderer SV einloggen → der Fall ist NICHT sichtbar (Multi-Tenant)

---

## Bekannte Limitierungen (gehen in späteren Sprints)

- PDF-Upload + KI-Extraktion: nur Stub, voll in K3
- Skizze-Funktion: kommt in S5
- Frist-Pipeline (Push, Sidebar): kommt in S5/S6
- §407a-Anzeige-Generator: existiert schon (`zpo-anzeige.html`)

---

## Commit-Messages

- `Sprint S3.1: fall-aufmachen.html mit 3 Zonen + Multi-Tenant-Filter`
- `Sprint S3.2: neuer-fall.html Stufe 1 - Auftragstyp-Karten + Auto-AZ`
- `Sprint S3.3: neuer-fall.html Stufe 3a - Stammdaten mit atomarem Speichern`
- `Sprint S3.4: neuer-fall.html Stufe 3b - typ-spezifische Felder + Frist-Auto`
- `Sprint S3.5: nav.js + _redirects auf neuen Einstiegspunkt`
