# Sprint S5 — KI-Analyse & Ortstermin mit Skizze

> Diese Seiten sind Kernarbeitsfläche: hier diktiert der SV, strukturiert die KI vor, und hier schreibt der SV sein §6 Fachurteil.

---

## Voraussetzungen

- ✅ Sprint S4 abgeschlossen (akte.html mit Phasen)
- ✅ Tabelle DIKTATE in Airtable existiert + in Whitelist
- ✅ Field `laenge` in TEXTBAUSTEINE_CUSTOM existiert (für /floskel-Slash)

---

## Teil 1: `ki-analyse.html` (NEU)

Zweck: Phase 3 — KI strukturiert Diktate nach §1-§5, SV schreibt §6 Fachurteil persönlich.

### Layout

Siehe Wireframe in `BLUEPRINT-v1.1.md` Kapitel "ki-analyse.html".

Kern-Komponenten:
1. **Datengrundlage-Box** — zeigt verfügbare Fotos/Diktate/Messungen aus Airtable
2. **Button "Diktat strukturieren & prüfen"** — löst KI-Call aus
3. **Strukturhilfe §1-§5** — editierbare Textareas mit KI-Vorschlag
4. **§6 Fachurteil** — LEER initial, SV schreibt selbst, mit Hilfsmittel-Toolbar
5. **Audit-Trail-Klick** — "Geprüft & als Eigenleistung übernommen"

### Kritische Regel: §6 ist KI-frei

```html
<section id="paragraph-6">
  <h2>§6 Fachurteil (SV-eigenhändig)</h2>
  <textarea 
    id="p6-text" 
    onblur="saveField('sv_stellungnahme_final', this.value); pruefeZeichen()"
    oninput="pruefeZeichen()"
    placeholder="Ihr persönliches Fachurteil. KI macht hier keine Vorschläge — nur Sie als SV können das Fachurteil formulieren. §10 IHK-SVO / §407a ZPO."
  ></textarea>
  <div id="zeichen-counter">0 / 500 Zeichen</div>
  
  <div class="hilfsmittel-toolbar">
    <button onclick="oeffneBibliothek('norm')">📚 Norm einfügen</button>
    <button onclick="oeffneBibliothek('baustein')">📝 Baustein</button>
    <button onclick="oeffneBibliothek('floskel')">💬 Floskel</button>
    <button onclick="pruefeKonjunktiv2()">🔍 Konjunktiv-II prüfen</button>
    <button onclick="oeffneBibliothek('recht')">⚖️ Recht</button>
  </div>
  
  <aside id="normen-sidebar">
    <h3>💡 Passt vermutlich:</h3>
    <div id="normen-vorschlaege"></div>
  </aside>
  
  <button 
    id="btn-eigenleistung" 
    disabled 
    onclick="bestaetigeEigenleistung()"
    class="btn-primary"
  >
    ✓ Geprüft & als Eigenleistung übernehmen →
  </button>
</section>
```

### Bestätigungs-Logik (Audit-Trail)

```javascript
async function bestaetigeEigenleistung() {
  var text = document.getElementById('p6-text').value;
  var kiVorschlag = currentKIVorschlagFuerParagraph6 || '';
  var aenderungsquote = calcAenderungsquote(kiVorschlag, text);
  
  // Audit-Trail schreiben (WICHTIG!)
  await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      method: 'POST',
      path: '/v0/' + AIRTABLE_BASE + '/tblqQmMwJKxltXXXl',
      payload: {
        fields: {
          aktenzeichen: az,
          sv_email: svEmail,
          aktion: 'paragraph_6_eigenleistung_bestaetigt',
          timestamp: new Date().toISOString(),
          sv_validiert: true,
          output_laenge: text.length,
          aenderungsquote: aenderungsquote,
          offenlegungstext: 'SV hat §6 Fachurteil persönlich geschrieben und als Eigenleistung übernommen.'
        }
      }
    })
  });
  
  // Phase 3 als abgeschlossen markieren
  await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    body: JSON.stringify({
      method: 'PATCH',
      path: '/v0/' + AIRTABLE_BASE + '/tblSxV8bsXwd1pwa0/' + recordId,
      payload: { fields: { 
        phase_aktuell: 4,
        phase_3_completed_at: new Date().toISOString(),
        stellungnahme_407a_ts: new Date().toISOString()
      }}
    })
  });
  
  alert('✅ Eigenleistung bestätigt. Weiterleitung zur Freigabe.');
  window.location.href = 'freigabe.html?az=' + encodeURIComponent(az);
}

function calcAenderungsquote(original, final) {
  if (!original || !final) return final ? 1.0 : 0;
  // Einfache Levenshtein-Distanz-Approximation
  var longer = Math.max(original.length, final.length);
  var shorter = Math.min(original.length, final.length);
  return 1 - (shorter / longer);
}

function pruefeZeichen() {
  var len = document.getElementById('p6-text').value.length;
  document.getElementById('zeichen-counter').textContent = len + ' / 500 Zeichen';
  document.getElementById('btn-eigenleistung').disabled = len < 500;
  document.getElementById('zeichen-counter').style.color = len < 500 ? 'red' : 'green';
}
```

### Anti-Copy-Paste-Schutz für §6

```javascript
document.getElementById('p6-text').addEventListener('paste', function(e) {
  var pasted = (e.clipboardData || window.clipboardData).getData('text');
  // Wenn der eingefügte Text 80%+ mit dem KI-Vorschlag übereinstimmt: warnen
  if (currentKIVorschlagFuerParagraph6 && 
      aenlichkeit(pasted, currentKIVorschlagFuerParagraph6) > 0.8) {
    e.preventDefault();
    alert('⚠️ Sie können keinen KI-Vorschlag 1:1 als §6 einfügen. Bitte formulieren Sie eigenständig. Das IHK-Recht verlangt persönliche Erstattung.');
  }
});
```

---

## Teil 2: `ortstermin-modus.html` — Skizze-Tab

### signature_pad einbinden

`ortstermin-modus.html` HEAD:
```html
<script src="https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js"></script>
```

### Tab-Struktur erweitern

Existierende Tabs: 📷 Fotos · 🎤 Diktat · 📏 Messung · 📝 Notizen

**NEU:** ✏️ Skizze

### Skizze-Tab HTML

```html
<section id="tab-skizze" class="tab-content">
  <div class="skizze-toolbar">
    <select id="skizze-auswahl">
      <option value="neu">+ Neue Skizze</option>
    </select>
    <input type="text" id="skizze-titel" placeholder="z.B. Wohnzimmer">
  </div>
  
  <div class="werkzeug-leiste">
    <button data-tool="pen" class="active" title="Stift">✏️</button>
    <button data-tool="line" title="Linie">📐</button>
    <button data-tool="circle" title="Kreis">⭕</button>
    <button data-tool="rect" title="Rechteck">▭</button>
    <button data-tool="marker" title="Pin-Marker">📍</button>
    <button data-tool="text" title="Text">T</button>
    <div class="separator"></div>
    <button id="undo" title="Rückgängig">↶</button>
    <button id="redo" title="Wiederholen">↷</button>
    <button id="clear" title="Leeren">🗑</button>
    <div class="separator"></div>
    <input type="color" id="farbe" value="#000000">
    <label>Strichstärke:
      <input type="range" id="strich" min="1" max="10" value="2">
    </label>
  </div>
  
  <div class="hintergrund-optionen">
    <label><input type="radio" name="bg" value="leer" checked> Leer</label>
    <label><input type="radio" name="bg" value="foto"> Foto als Hintergrund</label>
    <label><input type="radio" name="bg" value="grundriss"> Grundriss-Vorlage</label>
    <input type="file" id="bg-upload" accept="image/*" style="display:none">
  </div>
  
  <canvas id="skizze-canvas" width="800" height="600"></canvas>
  
  <div id="marker-liste">
    <h3>Marker-Beschriftungen</h3>
    <!-- Dynamisch generiert: ●1: [Textfeld] -->
  </div>
  
  <div class="skizze-actions">
    <button onclick="speichereSkizze()" class="btn-primary">💾 Skizze speichern</button>
    <button onclick="exportiereSkizze()">📥 Als PNG exportieren</button>
  </div>
</section>
```

### Skizze-Logic (Kern)

```javascript
// skizze-logic.js
(function() {
  var canvas = document.getElementById('skizze-canvas');
  var ctx = canvas.getContext('2d');
  var currentTool = 'pen';
  var isDrawing = false;
  var markers = []; // {x, y, nr, text}
  var history = []; // für Undo
  var historyIndex = -1;
  
  // Werkzeug-Wechsel
  document.querySelectorAll('[data-tool]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });
  
  // Zeichnen
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', handleTouch);
  canvas.addEventListener('touchmove', handleTouch);
  
  function startDraw(e) {
    isDrawing = true;
    var pos = getPos(e);
    
    if (currentTool === 'marker') {
      markers.push({
        x: pos.x, y: pos.y, nr: markers.length + 1, text: ''
      });
      renderMarkers();
      addMarkerInput(markers.length);
      isDrawing = false;
      saveState();
    } else {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }
  
  function draw(e) {
    if (!isDrawing) return;
    var pos = getPos(e);
    ctx.strokeStyle = document.getElementById('farbe').value;
    ctx.lineWidth = document.getElementById('strich').value;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }
  
  function endDraw() {
    if (isDrawing) {
      isDrawing = false;
      saveState();
    }
  }
  
  function renderMarkers() {
    markers.forEach(function(m) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.nr, m.x, m.y);
    });
  }
  
  function addMarkerInput(nr) {
    var div = document.createElement('div');
    div.innerHTML = '●' + nr + ': <input type="text" onblur="updateMarkerText(' + nr + ', this.value)">';
    document.getElementById('marker-liste').appendChild(div);
  }
  
  window.updateMarkerText = function(nr, text) {
    var m = markers.find(x => x.nr === nr);
    if (m) m.text = text;
  };
  
  // Undo/Redo
  function saveState() {
    historyIndex++;
    history = history.slice(0, historyIndex);
    history.push(canvas.toDataURL());
  }
  
  document.getElementById('undo').addEventListener('click', function() {
    if (historyIndex > 0) {
      historyIndex--;
      restoreState();
    }
  });
  
  document.getElementById('redo').addEventListener('click', function() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      restoreState();
    }
  });
  
  function restoreState() {
    var img = new Image();
    img.src = history[historyIndex];
    img.onload = function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }
  
  // Speichern
  window.speichereSkizze = async function() {
    var az = new URLSearchParams(window.location.search).get('az');
    var titel = document.getElementById('skizze-titel').value || 'Skizze';
    var svEmail = localStorage.getItem('prova_sv_email');
    
    // Canvas → PNG (base64)
    var dataURL = canvas.toDataURL('image/png');
    
    // Upload zu Airtable als Attachment (via Function)
    var res = await fetch('/.netlify/functions/foto-upload', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        az: az,
        sv_email: svEmail,
        filename: 'skizze_' + Date.now() + '.png',
        data: dataURL,
        typ: 'skizze',
        metadata: {
          titel: titel,
          marker: markers
        }
      })
    });
    
    if (res.ok) {
      alert('✅ Skizze gespeichert');
    } else {
      alert('❌ Fehler beim Speichern');
    }
  };
  
  // Init
  saveState();
})();
```

---

## Teil 3: Foto-Captioning-Frontend-Integration

`foto-captioning.js` (Netlify-Function) existiert bereits. Jetzt im Frontend einbauen:

In `ortstermin-modus.html` Foto-Tab nach Upload:

```javascript
async function handleFotoUpload(file) {
  // 1. Foto hochladen (existierende Logik)
  var uploadResult = await uploadFoto(file);
  
  // 2. Auto-Caption generieren wenn aktiviert
  if (localStorage.getItem('prova_autocaption') !== 'false') {
    showCaptionLoader(uploadResult.id);
    
    var captionRes = await fetch('/.netlify/functions/foto-captioning', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        image_url: uploadResult.url,
        fall_kontext: await getFallKontext()
      })
    });
    var captionData = await captionRes.json();
    
    // In UI einfügen, sofort editierbar
    document.getElementById('caption-' + uploadResult.id).value = captionData.caption;
    document.getElementById('caption-' + uploadResult.id).focus();
  }
}
```

**Globale Einstellung** in `einstellungen.html`:
```html
<label>
  <input type="checkbox" id="autocaption-toggle" 
         onchange="localStorage.setItem('prova_autocaption', this.checked)">
  Foto-Beschreibung automatisch per KI generieren
</label>
```

---

## Akzeptanzkriterien

- [ ] `ki-analyse.html` lädt Fall-Daten via `?az=`
- [ ] "Diktat strukturieren" ruft KI mit Pseudonymisierung auf
- [ ] §1-§5 Vorschläge erscheinen, editierbar
- [ ] §6 Feld startet LEER
- [ ] Button "Eigenleistung übernehmen" erst ab 500 Zeichen aktiv
- [ ] Copy-Paste-Schutz: Einfügen von KI-Vorschlägen wird erkannt und abgelehnt
- [ ] Bestätigung schreibt in AUDIT_TRAIL mit timestamp + sv_email + aenderungsquote
- [ ] Phase wird auf 4 gesetzt, `phase_3_completed_at` gesetzt
- [ ] `ortstermin-modus.html` hat Skizze-Tab
- [ ] Alle Werkzeuge (Stift/Linie/Kreis/Rechteck/Marker/Text) funktionieren
- [ ] Undo/Redo funktioniert
- [ ] Marker werden nummeriert und mit Beschriftung gespeichert
- [ ] Mehrere Skizzen pro Fall möglich
- [ ] Skizze wird als PNG in Airtable gespeichert
- [ ] Foto-Caption wird automatisch generiert (wenn aktiviert)
- [ ] sw.js CACHE_VERSION inkrementiert

---

## Test-Checkliste Marcel

1. [ ] Fall öffnen → Phase 2 fertig (Diktat existiert) → "KI-Analyse starten"
2. [ ] ki-analyse.html lädt, Datengrundlage korrekt
3. [ ] "Diktat strukturieren" → 5 Vorschläge erscheinen für §1-§5
4. [ ] §6 ist LEER
5. [ ] KI-Vorschlag kopieren und in §6 einfügen → Fehlermeldung
6. [ ] Eigenständig 500+ Zeichen schreiben
7. [ ] "Eigenleistung übernehmen" → geht nur ab 500 Zeichen
8. [ ] In Airtable AUDIT_TRAIL: Eintrag mit sv_validiert=true
9. [ ] Zur Ortstermin → Tab "Skizze" → zeichnen
10. [ ] Marker setzen, beschriften
11. [ ] Speichern → Skizze in Airtable-Attachments
