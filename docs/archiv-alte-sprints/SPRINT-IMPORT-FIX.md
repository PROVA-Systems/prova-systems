# Sprint IMPORT-FIX — Kritischer Bug-Fix

> **PRIORITÄT 2 — direkt nach S-AUDIT.**
> Pflicht vor Pilotkunden.

---

## Problem-Beschreibung

Der Daten-Import (`import-assistent.html` + `import-assistent-logic.js`) schreibt importierte Kontakte/Bausteine/Fälle **ausschließlich in localStorage**, NICHT in Airtable.

**Konsequenzen:**
- Anderer Browser → Daten weg
- Browser-Cache geleert → Daten weg
- Anderes Gerät (Tablet im Ortstermin) → Daten nicht da
- Multi-Tenant-Logik unmöglich
- Kein Backup möglich

**Konkrete Stelle:**
```javascript
// import-assistent-logic.js Zeile ~405
localStorage.setItem('prova_kontakte', JSON.stringify(vorhandene));
```

---

## Ziel

Import schreibt primär in **Airtable**, localStorage nur als Cache.

---

## Aufgaben

### 1. Code-Analyse
Lies `import-assistent-logic.js` vollständig. Identifiziere alle Stellen wo `localStorage.setItem` für Geschäftsdaten genutzt wird:
- Kontakte → soll nach `KONTAKTE` (`tblMKmPLjRelr6Hal`)
- Fälle → soll nach `SCHADENSFAELLE` (`tblSxV8bsXwd1pwa0`)
- Rechnungen → soll nach `RECHNUNGEN` (`tblF6MS7uiFAJDjiT`)
- Textbausteine → soll nach `TEXTBAUSTEINE_CUSTOM` (`tblDS8NQxzceGedJO`)

### 2. Whitelist-Check
Prüfe in `airtable.js` ob alle vier Tabellen in `ALLOWED_TABLES` stehen.

**Aktueller Stand:**
- ✅ SCHADENSFAELLE
- ✅ RECHNUNGEN
- ❌ KONTAKTE — fehlt! Muss ergänzt werden mit `userField: 'sv_email'`
- ❌ TEXTBAUSTEINE_CUSTOM — fehlt! Muss ergänzt werden mit `userField: 'sv_email'`

**Ergänzung in `airtable.js`:**
```javascript
const ALLOWED_TABLES = {
  // ... existierende Einträge ...
  tblMKmPLjRelr6Hal: { name: 'KONTAKTE', userField: 'sv_email', readOnly: false },
  tblDS8NQxzceGedJO: { name: 'TEXTBAUSTEINE_CUSTOM', userField: 'sv_email', readOnly: false },
};
```

### 3. Import-Logik umschreiben

Für jede Kategorie in `importAlles()`:

**Vorher (kaputt):**
```javascript
function importAlles() {
  var kontakteImport = _parsed.kontakte.filter(function(r){return r._sel;});
  var vorhandene = JSON.parse(localStorage.getItem('prova_kontakte')||'[]');
  // ... Duplikat-Check ...
  vorhandene.unshift(Object.assign({...}, r));
  localStorage.setItem('prova_kontakte', JSON.stringify(vorhandene));
}
```

**Nachher (richtig):**
```javascript
async function importAlles() {
  var svEmail = localStorage.getItem('prova_sv_email');
  var kontakteImport = _parsed.kontakte.filter(function(r){return r._sel;});
  
  // Existierende Kontakte aus Airtable laden für Duplikat-Check
  var resGet = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      method: 'GET',
      path: '/v0/' + AIRTABLE_BASE + '/' + 'tblMKmPLjRelr6Hal' + '?pageSize=200'
    })
  });
  var existingData = await resGet.json();
  var vorhandene = (existingData.records || []).map(function(r){return r.fields||{};});
  
  // Filter: nur neue Kontakte
  var neueKontakte = kontakteImport.filter(function(neu) {
    return !vorhandene.find(function(alt) {
      return alt.Name && alt.Name.toLowerCase() === (neu.name||'').toLowerCase()
        && (!neu.email || alt.Email === neu.email);
    });
  });
  
  // Batch-Create in Airtable (max 10 pro Request)
  var neuK = 0;
  for (var i = 0; i < neueKontakte.length; i += 10) {
    var batch = neueKontakte.slice(i, i+10);
    var records = batch.map(function(k) {
      return {
        fields: {
          Name: k.name,
          Vorname: k.vorname || '',
          Email: k.email || '',
          Telefon: k.telefon || '',
          Typ: k.typ || 'Sonstiges',
          Strasse: k.strasse || '',
          PLZ: k.plz || '',
          Ort: k.ort || '',
          sv_email: svEmail  // PFLICHT für Multi-Tenant
        }
      };
    });
    
    var res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        method: 'POST',
        path: '/v0/' + AIRTABLE_BASE + '/' + 'tblMKmPLjRelr6Hal',
        payload: { records: records }   // ← payload, nicht body!
      })
    });
    if (res.ok) neuK += batch.length;
  }
  
  _result.kontakte = neuK;
  
  // localStorage als Cache aktualisieren (optional, für Performance)
  // ...
}
```

**Analoges Pattern für:**
- Fälle (Tabelle SCHADENSFAELLE)
- Rechnungen (Tabelle RECHNUNGEN)
- Textbausteine (Tabelle TEXTBAUSTEINE_CUSTOM)

### 4. Fehlerbehandlung

- Bei Netzwerk-Fehler: User-freundliche Meldung "Import fehlgeschlagen, bitte erneut versuchen"
- Bei Teil-Erfolg (z.B. 8/10 Records): zeige genau "8 von 10 Kontakten importiert, 2 Fehler"
- Logge Fehler in `prova-error-handler.js`

### 5. UI-Updates

- "Importiere..." mit Spinner während des Vorgangs
- Erfolgs-Toast: "<N> Kontakte importiert"
- Fehler-Toast bei Problemen

---

## Akzeptanzkriterien

- [ ] `airtable.js` enthält KONTAKTE und TEXTBAUSTEINE_CUSTOM in Whitelist
- [ ] `import-assistent-logic.js` schreibt alle 4 Kategorien in Airtable
- [ ] sv_email wird bei jedem Record gesetzt
- [ ] Duplikat-Check funktioniert (lädt existierende aus Airtable)
- [ ] Batch-Logik: max 10 Records pro Airtable-Call
- [ ] Fehlerbehandlung mit User-Feedback
- [ ] localStorage wird NICHT mehr als primärer Speicher genutzt
- [ ] `node --check import-assistent-logic.js` läuft ohne Fehler
- [ ] sw.js CACHE_VERSION inkrementiert

---

## Test-Checkliste für Marcel

Nach Push und Deploy:

1. [ ] `import-assistent.html` öffnen
2. [ ] Test-CSV mit 3 Kontakten hochladen (`Name,Email,Telefon`)
3. [ ] Vorschau prüfen: 3 Kontakte erkannt
4. [ ] "Import starten" klicken
5. [ ] Erfolgs-Meldung: "3 Kontakte importiert"
6. [ ] Airtable öffnen → KONTAKTE-Tabelle → 3 neue Records mit sv_email da?
7. [ ] localStorage löschen (DevTools → Application → Clear)
8. [ ] `kontakte.html` öffnen → 3 Kontakte trotzdem da? (lädt aus Airtable)
9. [ ] Mit zweitem SV-Account einloggen → die 3 Kontakte NICHT sichtbar (Multi-Tenant!)

---

## Bekannte Limitierungen

- VCF-Import (vCard) bleibt komplexer und wird in K3+ verbessert
- XLSX-Import funktioniert nur mit erster Worksheet
- Sehr große CSVs (>1000 Zeilen) brauchen länger weil Batch-Calls

---

## Commit-Message

`Sprint IMPORT-FIX: Daten-Import schreibt jetzt in Airtable statt localStorage (kritischer Bug behoben)`
