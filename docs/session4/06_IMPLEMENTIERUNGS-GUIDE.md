# 06 · IMPLEMENTIERUNGS-GUIDE

**Session 3 Co-Founder Patch · Drop-in Installation in PROVA v20**
**Stand:** Mai 2026 · **Zielzeit:** 2-6 Stunden für Pilot-kritische Schritte

---

## 0) TL;DR — Was muss ich tun?

```bash
# 1. Backup
cp -r prova-systems/ prova-systems_backup_$(date +%Y%m%d)/

# 2. Neue Module kopieren
cp patches/new-files/css/*   prova-systems/css/
cp patches/new-files/lib/*   prova-systems/lib/

# 3. Patched Dateien überschreiben (ERSETZT das Original!)
cp patches/patched-files/prova-design.css    prova-systems/
cp patches/patched-files/stellungnahme.css   prova-systems/
cp patches/patched-files/kontakt-detail.html prova-systems/

# 4. In ALLEN HTML-Seiten den folgenden Block im <head> einfügen
#    (direkt NACH <link rel="stylesheet" href="prova-design.css">)
```

```html
<!-- PROVA Session-3 Co-Founder Patch (Mai 2026) -->
<link rel="stylesheet" href="css/prova-a11y-contrast.css">
<link rel="stylesheet" href="lib/prova-detail-sidebar.css">
<link rel="stylesheet" href="lib/prova-bubble-menu.css">
<link rel="stylesheet" href="lib/prova-inline-edit.css">
<link rel="stylesheet" href="lib/prova-filter-chips.css">
<link rel="stylesheet" href="lib/prova-sticky-footer.css">
<link rel="stylesheet" href="lib/prova-skeleton.css">
<link rel="stylesheet" href="lib/prova-command-palette-ext.css">

<!-- Module (ES-fähig, auch als klassisches <script> nutzbar) -->
<script defer src="lib/prova-density-toggle.js"></script>
<script defer src="lib/prova-filter-chips.js"></script>
<script defer src="lib/prova-skeleton.js"></script>
<script defer src="lib/prova-inline-edit.js"></script>
<script defer src="lib/prova-bubble-menu.js"></script>
<script defer src="lib/prova-sticky-footer.js"></script>
<script defer src="lib/prova-detail-sidebar.js"></script>
<script defer src="lib/prova-command-palette-ext.js"></script>
```

> **TIP:** Lege die 8 Zeilen in dein existierendes `nav.js` / Partials-Template, damit du nicht 139 Seiten anfassen musst.

---

## 1) Reihenfolge — Was zuerst?

### 🔴 Pilot-Blocker (Tag 0 — **vor jedem Pilot**)

| # | Schritt | Zeit | Wirkung |
|---|---------|------|---------|
| 1 | `prova-design.css` patchen (Kontrast + Inter) | 15 min | Marcel's "lesbar schwierig" weg, WCAG AA erfüllt |
| 2 | `prova-a11y-contrast.css` zusätzlich einbinden | 5 min | Override-Safety-Net, falls irgendeine Seite alte Tokens noch inline nutzt |
| 3 | `stellungnahme.css` patchen (Kontrast + 60vh) | 5 min | Fachurteil-Editor lesbar + Regel 11 erfüllt |
| 4 | `kontakt-detail.html` ersetzen | 10 min | 9 Tabs → Sidebar-Detail, Marcel's Tabs-Anfrage erledigt |
| 5 | Smoke-Test: 3 Kernseiten durchklicken | 20 min | Sicherstellen, dass nichts kaputt ist |

**Gesamt: ≈55 Minuten**

### 🟠 Pre-Pilot-wichtig (Tag 1)

| # | Schritt | Zeit |
|---|---------|------|
| 6 | `prova-sticky-footer.js` auf Stellungnahme, Kostenermittlung, Freigabe | 30 min |
| 7 | `prova-skeleton.js` auf allen Listen-Seiten einsetzen (`.fetch(...)`) | 60 min |
| 8 | `prova-filter-chips.js` auf `kontakte.html`, `rechnungen.html`, `auftraege.html` | 45 min |
| 9 | `prova-command-palette-ext.js` einbinden + `ProvaPalette.register(...)` für Seiten-Kontext | 30 min |
| 10 | `prova-bubble-menu.js` auf `stellungnahme.html` Editor + data-pbm-attach setzen | 20 min |

### 🔷 Post-Pilot-nice (Woche 2+)

11. `prova-inline-edit.js` auf Detail-Seiten (Kontakt, Auftrag, Akte)
12. `prova-density-toggle.js` in Topbar einbauen
13. Slash-Menü (`ProvaSlashMenu`) im §6-Editor mit Norm-Zitaten/Textbausteinen
14. Empty-States auf allen Listen-Seiten (`ProvaSkeleton.empty(...)`)

---

## 2) Integration pro Pattern

### 2.1 Sidebar-Detail (ersetzt Tabs) — `prova-detail-sidebar`

**Zweck:** Ersetzt mehrspaltige Tab-Detail-Views. Verwendet von `kontakt-detail.html`.

```html
<link rel="stylesheet" href="lib/prova-detail-sidebar.css">
<script defer src="lib/prova-detail-sidebar.js"></script>

<div id="detail-root"></div>

<script>
  renderDetailView('#detail-root', kontaktData, {
    title:  kontaktData.name,
    endpoint: '/.netlify/functions/kontakt-360', // bleibt — Edge-Shim rerouted zu Supabase
    chips: [
      { key: 'alle',       label: 'Alle',        match: () => true },
      { key: 'auftrag',    label: 'Aufträge',    match: i => i.type === 'auftrag' },
      { key: 'rechnung',   label: 'Rechnungen',  match: i => i.type === 'rechnung' },
      /* ... */
    ],
    sidebar: /* Smart-Sidebar HTML */,
    onItemClick: (item) => drilldown(item),
  });
</script>
```

> **Backend:** Die **gleichen** Supabase Edge Functions wie bisher. Der Edge-Shim (`/.netlify/functions/*` → Supabase) wird nicht angefasst.

### 2.2 Bubble-Menu + Slash-Menu — `prova-bubble-menu`

**Zweck:** Editor-Pattern für §6-Fachurteil und Stellungnahmen.

```html
<!-- Editor mit Bubble-Menu und Slash-Menu automatisch: -->
<div contenteditable="true"
     data-pbm-attach
     data-psm-attach
     class="editor"
     data-name="gutachten-text">
</div>

<script>
  // KI-Aktion (Regel 12: NUR wenn KI opt-in und explizit angefragt)
  document.addEventListener('prova:bm-ai', async (e) => {
    const { text, action, commit } = e.detail;
    if (localStorage.getItem('prova.ki.enabled') !== 'true') {
      alert('KI ist deaktiviert. Bitte in Einstellungen aktivieren.');
      return;
    }
    const response = await fetch('/.netlify/functions/ki-suggest', {
      method: 'POST', body: JSON.stringify({ text, action })
    }).then(r => r.json());
    // WICHTIG: Vorschlag NICHT automatisch einsetzen! Nur zur Prüfung:
    commit(response.suggestion, { requireConfirm: true });
  });
</script>
```

> **Regel 12 & IHK-SVO:** Der Modul-Code **zeigt immer** ein Bestätigungs-Modal, bevor KI-Output im Editor landet. SV muss aktiv „Übernehmen" klicken.

### 2.3 Command-Palette — `prova-command-palette-ext`

```html
<script defer src="lib/prova-command-palette-ext.js"></script>

<script>
  // Seiten-spezifische Befehle registrieren (z.B. auf akte.html):
  document.addEventListener('DOMContentLoaded', () => {
    ProvaPalette.register({
      id: 'akte.pdf-export',
      label: 'Aktuelle Akte als PDF exportieren',
      category: 'Aktion',
      icon: '📄',
      shortcut: '⌘⇧P',
      run: () => window.exportAktePdf()
    });
  });
</script>
```

**Globaler Shortcut:** Cmd/Ctrl+K öffnet Palette überall.

### 2.4 Sticky-Footer — `prova-sticky-footer`

```html
<!-- Auto-Attach via data-Attribut -->
<form id="stellungnahme-form"
      data-psf-attach
      data-psf-save-endpoint="/.netlify/functions/stellungnahme-save"
      data-psf-primary-label="Stellungnahme speichern"
      data-psf-id="123">
  <!-- Felder... -->
</form>
```

Oder programmatisch:
```js
new ProvaStickyFooter({
  formSel: '#stellungnahme-form',
  onSave: async (data) => {
    return fetch('/.netlify/functions/stellungnahme-save', {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  primaryLabel: 'Stellungnahme speichern'
});
```

**Features:** Cmd+S Shortcut, Dirty-Tracking, beforeunload-Warnung, Auto-Save-Indicator, Optimistic Toast.

### 2.5 Skeleton + Optimistic-UI — `prova-skeleton`

```js
// Liste laden (mit automatischem Skeleton + Error-Retry):
ProvaSkeleton.fetch('/.netlify/functions/rechnungen-list', {
  containerSel: '#rechnungen-list',
  template:     'list',
  onData:       (rows) => renderRechnungen(rows),
});

// Leer-Zustand:
ProvaSkeleton.empty('#rechnungen-list', {
  icon:  '💶',
  title: 'Noch keine Rechnungen.',
  hint:  'Erstelle deine erste Rechnung aus einem abgeschlossenen Auftrag.',
  action: { label: 'Neue Rechnung', onClick: () => location.href = 'rechnung-neu.html' }
});

// Optimistic-UI (Status sofort ändern, bei Fehler rollback):
ProvaSkeleton.optimistic(
  document.querySelector('[data-rechnung-id="42"]'),
  { textContent: 'bezahlt' },
  () => fetch('/.netlify/functions/rechnung-mark-paid', {
    method: 'POST', body: JSON.stringify({ id: 42 })
  }).then(r => r.ok ? r.json() : Promise.reject(new Error('Fehler')))
);
```

### 2.6 Filter-Chips — `prova-filter-chips`

```html
<div id="filter-chips" class="pfc-chips"></div>
<input type="text" id="filter-search" placeholder='Filter: z.B. "status:offen betrag:>1000"'/>
<ul id="rechnungen-list"></ul>

<script>
  let rechnungen = [];
  new ProvaFilterChips({
    rootSel:   '#filter-chips',
    searchSel: '#filter-search',
    items:     () => rechnungen,
    chips: [
      { key: 'alle',    label: 'Alle',    match: () => true },
      { key: 'offen',   label: 'Offen',   match: r => r.status === 'offen' },
      { key: 'bezahlt', label: 'Bezahlt', match: r => r.status === 'bezahlt' },
      { key: 'mahnung', label: 'Mahnung', match: r => r.status === 'mahnung' },
    ],
    onChange: (filtered) => render(filtered)
  });
</script>
```

**Operator-Filter** (funktioniert automatisch):
- `status:offen` — Gleichheitsvergleich
- `betrag:>1000` — Numerik-Vergleich (`>`, `>=`, `<`, `<=`)
- `kunde:müller` — Substring-Match
- Kombinierbar: `status:offen betrag:>1000 müller`

### 2.7 Inline-Edit — `prova-inline-edit`

```html
<!-- Auto-Attach (einfachster Weg) -->
<span data-pie-auto
      data-pie-endpoint="/.netlify/functions/kontakt-update"
      data-pie-record="42"
      data-pie-key="name">Max Mustermann</span>
```

Oder programmatisch:
```js
ProvaInlineEdit.attach(document.getElementById('kontakt-name'), {
  save: async (newValue) => {
    return fetch('/.netlify/functions/kontakt-update', {
      method: 'POST',
      body: JSON.stringify({ id: 42, name: newValue })
    });
  }
});
```

### 2.8 Density-Toggle — `prova-density-toggle`

```html
<!-- In Topbar oder Einstellungen -->
<button data-pdt-toggle data-pdt-label="auto"></button>
```

**Shortcut:** Shift+D (Linear-Style) toggelt überall.

---

## 3) Beispiel-Einbau: Kontakte-Seite

**Vorher** (grob):
```html
<div class="filter-tabs">
  <button class="active">Alle</button>
  <button>Privat</button>
  <button>Firma</button>
  <button>Behörde</button>
</div>
<ul id="kontakt-list"></ul>
```

**Nachher:**
```html
<div class="kontakte-toolbar">
  <input type="text" id="kontakt-search" class="input"
         placeholder='Suche — z.B. "typ:firma müller"'/>
  <div id="kontakt-chips" class="pfc-chips"></div>
  <button data-pdt-toggle data-pdt-label="auto"
          class="btn btn-ghost" style="margin-left:auto">⇅ Dichte</button>
</div>
<ul id="kontakt-list" class="list"></ul>

<script>
let kontakte = [];
const chips = new ProvaFilterChips({
  rootSel: '#kontakt-chips',
  searchSel: '#kontakt-search',
  items: () => kontakte,
  chips: [
    { key: 'alle',    label: 'Alle',    match: () => true },
    { key: 'privat',  label: 'Privat',  match: k => k.typ === 'privat' },
    { key: 'firma',   label: 'Firma',   match: k => k.typ === 'firma' },
    { key: 'behörde', label: 'Behörde', match: k => k.typ === 'behörde' },
  ],
  onChange: (filtered) => render(filtered)
});

function render(rows) {
  const list = document.getElementById('kontakt-list');
  if (rows.length === 0) {
    return ProvaSkeleton.empty('#kontakt-list', {
      icon: '👤',
      title: 'Keine Kontakte gefunden.',
      hint: 'Versuche einen anderen Filter oder lege einen neuen Kontakt an.',
      action: { label: '＋ Neuer Kontakt', onClick: () => location.href = 'kontakt-neu.html' }
    });
  }
  list.innerHTML = rows.map(k => `
    <li class="list-row">
      <a href="kontakt-detail.html?id=${k.id}">
        <strong>${k.name}</strong>
        <small class="text3">${k.typ} · ${k.ort || '—'}</small>
      </a>
    </li>
  `).join('');
}

// Laden mit Skeleton:
ProvaSkeleton.fetch('/.netlify/functions/kontakte-list', {
  containerSel: '#kontakt-list',
  template: 'list',
  onData: (rows) => { kontakte = rows; chips.refresh(); render(rows); }
});
</script>
```

**Ergebnis:**
- Skeleton-Loading statt Spinner
- Count-Badges zeigen live, wie viele in jeder Kategorie
- Operator-Filter (`typ:firma müller`)
- Density-Toggle (Shift+D)
- Empty-State mit CTA
- Error-Retry eingebaut

---

## 4) Rollback

Falls ein Patch Probleme macht:

```bash
# Original wiederherstellen:
cp backup_*/prova-design.css    prova-systems/
cp backup_*/stellungnahme.css   prova-systems/
cp backup_*/kontakt-detail.html prova-systems/

# Neue Module entfernen:
rm prova-systems/lib/prova-*.js
rm prova-systems/lib/prova-*.css
rm prova-systems/css/prova-a11y-contrast.css
```

> **Alle neuen Module sind additiv und nicht-invasiv.** Sie brechen keine existierende Funktion, außer du bindest sie explizit ein.

---

## 5) Backend-Referenzen (WICHTIG)

Alle Module rufen das **existierende** Backend per `/.netlify/functions/*` an:

| Modul | Endpoint (unverändert) |
|-------|-----------------------|
| `kontakt-detail.html` (Sidebar-Detail) | `/.netlify/functions/kontakt-360` |
| `prova-sticky-footer.js` (Stellungnahme) | `/.netlify/functions/stellungnahme-save` |
| `prova-inline-edit.js` (default) | Pro Feld per `data-pie-endpoint` |
| `prova-skeleton.js`  | Pro Aufruf: `ProvaSkeleton.fetch(endpoint, ...)` |
| Command-Palette KI   | Custom-Event `prova:ki-suggest` → Seite entscheidet |

Der **Edge-Shim** rerouted `/.netlify/functions/*` automatisch zu Supabase Edge Functions. **Es werden KEINE neuen Netlify Functions angelegt.**

---

## 6) Compliance-Checkliste vor Pilot

- [ ] **WCAG 2.2 AA:** `axe-core` oder Lighthouse ≥95 auf 5 Kernseiten (Dashboard, Akte, Stellungnahme, Rechnung, Kontakt-Detail)
- [ ] **Regel 12 (KI Opt-In):** `localStorage['prova.ki.enabled']` ist `null` bei Neu-Installation. KI-Elemente verborgen.
- [ ] **§407a ZPO / IHK-SVO:** Keine KI-Antwort landet ohne explizite SV-Bestätigung im Dokument.
- [ ] **Touch-Targets 44×44:** Per DevTools geprüft auf Mobil-Viewport (375px).
- [ ] **Body-Font ≥ 15px:** `getComputedStyle(document.body).fontSize` ≥ `15px`.
- [ ] **Reduced-Motion:** DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`. Animationen sind aus.
- [ ] **Keyboard-Only:** Tab-Reihenfolge durchklicken, alle Actions erreichbar, Focus-Ring sichtbar.
- [ ] **Print:** `⌘P` → Stellungnahme druckt sauber (schwarzer Text auf weißem BG, keine Sidebar).

---

## 7) Troubleshooting

| Problem | Ursache | Fix |
|---------|---------|-----|
| „Module nicht gefunden" | Pfad falsch | Prüfe relativen Pfad zu `/lib/` — muss zu `/prova-systems/lib/` zeigen |
| Fonts nicht geladen | DM Sans noch referenziert | Grep durch HTML: `grep -rn "DM Sans" *.html` — ersetzen zu `Inter` |
| Command-Palette öffnet sich nicht | Shortcut konflikiert mit Browser | Teste im Inkognito-Modus; prüfe ob ein anderes Skript preventDefault abfängt |
| Kontrast-Fix nicht sichtbar | alte `prova-design.css` gecacht | Hard-Reload `Cmd+Shift+R`; prüfe Response-Headers (`Cache-Control: no-store`) |
| Sticky-Footer überlappt Content | Body hat kein bottom-Padding | Füge `body { padding-bottom: 80px; }` hinzu (oder auf Main) |
| Bubble-Menu flackert | Selection triggert mehrfach | `data-pbm-attach` nur auf Editor-Root setzen, nicht auf Kindern |

---

## 8) Messgrößen nach 7 Tagen Pilot

Tracke in Supabase/Plausible/Custom-Event:

| KPI | Zielwert | Messung |
|-----|----------|---------|
| Zeit bis Stellungnahme-Save (T+1h Pilot-Start) | −20% vs. v20 | `prova:sticky-save` event |
| Klicks bis Kontakt-Info gefunden | −40% (9 Tabs → 1 Liste) | `prova:detail-drilldown` event |
| Command-Palette-Usage | ≥15% der Sessions | `prova:palette-open` event |
| Abbrüche beim §6-Editor | −30% | `prova:dirty-leave` event |
| Beschwerden „zu klein / nicht lesbar" | 0 | Pilot-Umfrage |

---

**Geschätzter Gesamtaufwand bis Pilot:** **2-3 Arbeitstage** für 1 Entwickler.
**Geschätzter Nutzen:** Marcel's 3 Kernanliegen (Kontrast, Tabs, Smart-Patterns) **vollständig** erfüllt + 9 weitere Professional-Features.
