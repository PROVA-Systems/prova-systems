# Sprint S4 — Akte als Nervensystem (Komplettüberarbeitung)

> Nach S3 ist `neuer-fall.html` fertig und führt nach `akte.html?az=...`.
> Jetzt wird `akte.html` zur Phasen-getriebenen Zentrale jedes Falls.

---

## Ziel

`akte.html` wird zum **Nervensystem** für jeden konkreten Fall — mit Phasen-Leiste, Kontext-Werkzeugen und Live-Status.

---

## Voraussetzungen

- ✅ Sprint S3 abgeschlossen
- ✅ Airtable: `phase_aktuell` und `phase_X_completed_at` Felder existieren

---

## Aufgabe 1: Migration-Skript für Bestandsfälle

Schreibe `migrate-phase-aktuell.js` (Node-Skript, einmalig ausgeführt):

```javascript
// migrate-phase-aktuell.js
// Mappt aus altem Status-Feld auf neues phase_aktuell

const Airtable = require('airtable');
const base = new Airtable({apiKey: process.env.AIRTABLE_PAT}).base('appJ7bLlAHZoxENWE');

const STATUS_TO_PHASE = {
  'Neuer Auftrag': 1,
  'In Bearbeitung': 2,  // Default, wird je nach Diktat-Anzahl überschrieben
  'Entwurf fertig': 4,
  'Abgeschlossen': 5,
  'Exportiert': 5
};

(async function() {
  var records = await base('SCHADENSFAELLE').select({pageSize: 100}).all();
  var updates = [];
  
  for (var r of records) {
    var f = r.fields;
    if (f.phase_aktuell) continue; // schon migriert
    
    var phase = STATUS_TO_PHASE[f.Status] || 2;
    
    // Verfeinerung: wenn In Bearbeitung + Diktate vorhanden → Phase 3
    if (f.Status === 'In Bearbeitung' && f.Audio_Dateien > 0) {
      phase = 3;
    }
    
    updates.push({
      id: r.id,
      fields: { phase_aktuell: phase }
    });
    
    if (updates.length === 10) {
      await base('SCHADENSFAELLE').update(updates);
      console.log('Updated batch of 10');
      updates = [];
    }
  }
  
  if (updates.length) {
    await base('SCHADENSFAELLE').update(updates);
  }
  
  console.log('Migration done.');
})();
```

**Marcel führt einmalig aus:** `node migrate-phase-aktuell.js` (mit AIRTABLE_PAT in env).

---

## Aufgabe 2: `akte.html` neu strukturieren

### Komponenten (von oben nach unten)

```
┌─ Header ────────────────────────────────┐
│ ← Zurück | Akte SCH-2026-031            │
│ <h1>Schimmelbefall · Adresse</h1>       │
│ Auftraggeber-Info + AZ + Geschädigter   │
└──────────────────────────────────────────┘

┌─ Phasen-Fortschritt ────────────────────┐
│ Status-Symbol pro Phase + CTA-Button    │
│ + Frist-Anzeigen wo relevant             │
└──────────────────────────────────────────┘

┌─ Werkzeuge im Kontext ──────────────────┐
│ Kontextabhängige Action-Buttons          │
└──────────────────────────────────────────┘

┌─ Diktat-Verlauf ────────────────────────┐
│ Liste aller Diktate (S6 Volldarstellung) │
└──────────────────────────────────────────┘

┌─ Anhänge ───────────────────────────────┐
│ Fotos + Skizzen + Dokumente              │
└──────────────────────────────────────────┘
```

### HTML-Skelett

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Akte · PROVA</title>
  <link rel="stylesheet" href="prova-design.css">
  <link rel="stylesheet" href="mobile.css">
</head>
<body>
  <div id="app">
    <main>
      <header id="akte-header">
        <a href="fall-aufmachen.html" class="back">← Zurück</a>
        <h1 id="akte-titel">Lade...</h1>
        <div id="akte-meta"></div>
      </header>
      
      <section id="phasen-fortschritt">
        <h2>Phasen-Fortschritt</h2>
        <div id="phasen-liste"></div>
      </section>
      
      <section id="werkzeuge">
        <h2>Werkzeuge im Kontext</h2>
        <div id="werkzeug-buttons"></div>
      </section>
      
      <section id="diktate">
        <h2>Diktat-Verlauf</h2>
        <div id="diktat-liste"></div>
      </section>
      
      <section id="anhaenge">
        <h2>Anhänge</h2>
        <div id="anhang-liste"></div>
      </section>
    </main>
  </div>
  
  <script src="auth-guard.js"></script>
  <script src="nav.js"></script>
  <script src="airtable.js"></script>
  <script src="akte-logic.js"></script>
  <script src="sw-register.js"></script>
</body>
</html>
```

### `akte-logic.js` neu schreiben

**Kern-Logik:**

```javascript
(function() {
  var az = new URLSearchParams(window.location.search).get('az');
  var svEmail = localStorage.getItem('prova_sv_email');
  var fall = null;
  
  if (!az) {
    window.location.href = 'fall-aufmachen.html';
    return;
  }
  
  async function ladeFall() {
    var filter = encodeURIComponent('AND({sv_email}="' + svEmail + '",{Aktenzeichen}="' + az + '")');
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        method: 'GET',
        path: '/v0/' + AIRTABLE_BASE + '/tblSxV8bsXwd1pwa0?filterByFormula=' + filter
      })
    });
    var data = await res.json();
    fall = (data.records && data.records[0]) ? data.records[0] : null;
    
    if (!fall) {
      document.querySelector('main').innerHTML = '<p class="error">Akte nicht gefunden oder kein Zugriff.</p>';
      return;
    }
    
    renderHeader();
    renderPhasen();
    renderWerkzeuge();
    ladeDiktate();
    ladeAnhaenge();
  }
  
  function renderHeader() {
    var f = fall.fields;
    document.getElementById('akte-titel').textContent = (f.Schadensart || '—') + ' · ' + (f.Schaden_Strasse || '');
    document.getElementById('akte-meta').innerHTML = 
      '<div>Auftraggeber: ' + (f.Auftraggeber_Name || '—') + ' · AZ: ' + (f.auftraggeber_az || '—') + '</div>' +
      '<div>Geschädigter: ' + (f.Geschaedigter || '—') + '</div>' +
      '<div>Angelegt: ' + (f.Erstellt_Am || '—') + ' · Status: ' + (f.Status || '—') + '</div>';
  }
  
  function renderPhasen() {
    var f = fall.fields;
    var aktuell = f.phase_aktuell || ableitPhase(f);
    
    var phasen = [
      { nr: 1, name: 'Auftrag erfasst', completed_at: f.Erstellt_Am, cta: null },
      { nr: 2, name: 'Ortstermin & Erfassung', completed_at: f.phase_2_completed_at, 
        cta: { text: 'Ortstermin starten →', url: 'ortstermin-modus.html?az=' + encodeURIComponent(az), 
               sub: '📷 ' + (f.Fotos_Anzahl||0) + ' Fotos · 🎤 ' + (f.Audio_Dateien||0) + ' Diktate · ✏️ 0 Skizzen' }},
      { nr: 3, name: 'KI-Strukturhilfe & §6 Fachurteil', completed_at: f.phase_3_completed_at,
        cta: { text: 'KI-Analyse starten →', url: 'ki-analyse.html?az=' + encodeURIComponent(az) }},
      { nr: 4, name: 'Freigabe & PDF', completed_at: f.phase_4_completed_at,
        cta: { text: 'Zur Freigabe →', url: 'freigabe.html?az=' + encodeURIComponent(az) },
        warning: f.Abgabefrist ? '⚠️ §411-Abgabefrist: ' + formatDate(f.Abgabefrist) + ' (' + tageBis(f.Abgabefrist) + ')' : null },
      { nr: 5, name: 'Rechnung & Abschluss', completed_at: f.phase_5_completed_at,
        cta: { text: 'Rechnung erstellen →', url: 'rechnungen.html?az=' + encodeURIComponent(az) }}
    ];
    
    var html = phasen.map(function(p) {
      var icon = p.completed_at ? '✅' : (p.nr === aktuell ? '⏳' : '⭕');
      var locked = p.nr > aktuell;
      var html = '<div class="phase ' + (locked ? 'locked' : '') + '">' +
        '<div class="phase-header">' +
          '<span class="icon">' + icon + '</span>' +
          '<span class="nr">' + p.nr + '</span>' +
          '<span class="name">' + p.name + '</span>' +
          '<span class="time">' + (p.completed_at ? formatDate(p.completed_at) : '') + '</span>' +
        '</div>';
      
      if (!locked && p.cta && p.nr === aktuell) {
        html += '<div class="phase-cta"><a href="' + p.cta.url + '" class="btn-primary">' + p.cta.text + '</a></div>';
        if (p.cta.sub) html += '<div class="phase-sub">' + p.cta.sub + '</div>';
      }
      if (p.warning) html += '<div class="phase-warning">' + p.warning + '</div>';
      if (locked) html += '<div class="phase-locked-hint">(gesperrt — Phase ' + (aktuell) + ' zuerst)</div>';
      
      html += '</div>';
      return html;
    }).join('');
    
    document.getElementById('phasen-liste').innerHTML = html;
  }
  
  function ableitPhase(f) {
    // Fallback wenn phase_aktuell leer
    if (f.Status === 'Abgeschlossen' || f.Status === 'Exportiert') return 5;
    if (f.Status === 'Entwurf fertig') return 4;
    if (f.Audio_Dateien > 0) return 3;
    return 2;
  }
  
  function renderWerkzeuge() {
    var f = fall.fields;
    var ist_gericht = f.Auftraggeber_Typ === 'gerichtsgutachten' || f.Auftraggeber_Typ === 'Gericht';
    var ist_407a_offen = ist_gericht && !f.zpo_anzeige_gesendet;
    
    var html = [];
    
    // §407a-Pflicht-Banner WENN noch offen
    if (ist_407a_offen) {
      html.push('<div class="alert alert-critical">⚠️ §407a-Anzeige fehlt! SOFORT erforderlich. <a href="zpo-anzeige.html?az=' + encodeURIComponent(az) + '" class="btn-primary">§407a-Anzeige erstellen →</a></div>');
    }
    
    html.push('<a href="ortstermin-modus.html?az=' + encodeURIComponent(az) + '#tab=diktat" class="btn">+ Diktat anhängen</a>');
    html.push('<a href="ortstermin-modus.html?az=' + encodeURIComponent(az) + '#tab=foto" class="btn">+ Foto hochladen</a>');
    html.push('<a href="ortstermin-modus.html?az=' + encodeURIComponent(az) + '#tab=skizze" class="btn">+ Skizze anlegen</a>');
    html.push('<a href="briefvorlagen.html?az=' + encodeURIComponent(az) + '" class="btn">+ Brief schreiben</a>');
    html.push('<button onclick="oeffneStammdatenModal()" class="btn">Stammdaten bearbeiten</button>');
    
    document.getElementById('werkzeug-buttons').innerHTML = html.join(' ');
  }
  
  async function ladeDiktate() {
    // S6: aus DIKTATE-Tabelle
    // Bis dahin: Hinweis "Diktate sichtbar nach S6"
    document.getElementById('diktat-liste').innerHTML = '<p class="empty">Diktat-Verlauf wird in Sprint S6 implementiert (DIKTATE-Tabelle)</p>';
  }
  
  async function ladeAnhaenge() {
    var f = fall.fields;
    document.getElementById('anhang-liste').innerHTML = 
      '<div>📷 Fotos (' + (f.Fotos_Anzahl||0) + ') · ' +
      '✏️ Skizzen (0) · ' +
      '📄 Dokumente (0)</div>';
  }
  
  // Helpers
  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('de-DE');
  }
  
  function tageBis(iso) {
    var ms = new Date(iso) - Date.now();
    var tage = Math.floor(ms / (1000 * 60 * 60 * 24));
    return tage === 0 ? 'heute' : (tage > 0 ? 'in ' + tage + ' Tagen' : 'vor ' + Math.abs(tage) + ' Tagen — überfällig!');
  }
  
  // Stammdaten-Modal
  window.oeffneStammdatenModal = function() {
    // Modal mit denselben Feldern wie neuer-fall.html, atomares Speichern
    // Code analog zu neuer-fall-logic.js
  };
  
  // Init
  document.addEventListener('DOMContentLoaded', ladeFall);
})();
```

---

## CSS-Klassen für Phasen-Leiste

In `prova-design.css` ergänzen:

```css
/* Phasen-Fortschritt */
.phase {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 12px;
}
.phase.locked {
  opacity: 0.5;
}
.phase-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}
.phase-header .icon { font-size: 20px; }
.phase-header .nr { font-weight: bold; }
.phase-header .name { flex: 1; }
.phase-header .time { color: var(--text2); font-size: 13px; }
.phase-cta { margin-top: 12px; }
.phase-sub { color: var(--text2); font-size: 13px; margin-top: 4px; }
.phase-warning {
  background: var(--warning-bg);
  color: var(--warning);
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}
.phase-locked-hint { color: var(--text3); font-size: 12px; margin-top: 4px; }

.alert-critical {
  background: var(--red-bg);
  color: var(--red);
  border: 1px solid var(--red);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}
```

---

## Akzeptanzkriterien

- [ ] Migration-Skript für Bestandsfälle existiert und ist getestet
- [ ] `akte.html` lädt Fall via `?az=` Parameter
- [ ] Multi-Tenant-Filter wird angewendet (sv_email)
- [ ] Header zeigt Schadensart, Adresse, Auftraggeber, AZ, Status
- [ ] Phasen-Leiste zeigt 5 Phasen mit Status-Symbolen
- [ ] CTA-Button erscheint nur bei aktueller Phase, andere ausgegraut
- [ ] §407a-Banner erscheint bei Gerichtsgutachten ohne `zpo_anzeige_gesendet`
- [ ] Frist-Warnung erscheint bei Phase 4 wenn `Abgabefrist` gesetzt
- [ ] Werkzeug-Buttons leiten korrekt weiter (mit `?az=` Param)
- [ ] "Stammdaten bearbeiten" öffnet Modal mit denselben Feldern
- [ ] sw.js CACHE_VERSION inkrementiert
- [ ] `node --check akte-logic.js` läuft sauber

---

## Test-Checkliste für Marcel

1. [ ] Fall aus Liste öffnen → korrekte Akte lädt
2. [ ] Phasen-Leiste sichtbar mit 5 Phasen
3. [ ] Aktuelle Phase hat ⏳ und CTA-Button
4. [ ] Andere Phasen sind ausgegraut
5. [ ] Bei Gerichtsgutachten ohne §407a: rotes Banner
6. [ ] Klick "Ortstermin starten" → führt zu `ortstermin-modus.html?az=...`
7. [ ] Klick "Stammdaten bearbeiten" → Modal öffnet sich
8. [ ] In Modal Feld ändern → Status-Indikator zeigt Speicherung
9. [ ] Nach Modal-Schließen: Akte zeigt aktualisierte Daten
10. [ ] Versuche `akte.html?az=NICHT-EXISTIERENDER-AZ` → "Akte nicht gefunden"
11. [ ] Mit anderem SV-Account: dieser Fall NICHT öffenbar (Multi-Tenant)
