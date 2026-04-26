
/* ── Safe localStorage — QuotaExceededError abfangen ── */
(function() {
  var _orig_set = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    try {
      _orig_set.call(this, key, value);
    } catch(e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        // Cache-Einträge zuerst löschen
        var toDelete = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && (k.includes('_cache') || k.includes('_archiv') || k.includes('_termine'))) {
            toDelete.push(k);
          }
        }
        toDelete.forEach(function(k){ try { localStorage.removeItem(k); } catch(e2){} });
        // Nochmal versuchen
        try { _orig_set.call(this, key, value); } catch(e3) {
          console.warn('[PROVA] localStorage voll, Speicherung von "' + key + '" fehlgeschlagen');
        }
      } else {
        throw e;
      }
    }
  };
})();

/* ============================================================
   PROVA — Zentrale Navigation (nav.js) v2.0
   Einbinden in JEDE Seite:  <script src="nav.js"></script>
   
   v2.0 Änderungen:
   - Fix: Kein Layout-Shift mehr (font-weight bleibt konstant)
   - Fix: Alle Items haben fixe min-height (36px)
   - Fix: Icons haben fixe Breite (kein Emoji-Shift)
   - Neu: Gruppierung Arbeit / Werkzeuge / Verwaltung
   - Neu: Einstellungen fixiert im Footer
   - Neu: Mobile Overlay-Support
   - Neu: Einheitlicher Link zu gutachten.html (statt 3 separate Apps)
   - Neu: Baubegleitung in Nav aufgenommen
   ============================================================ */
(function () {
  /* ── Aktive Seite erkennen ── */
  var page = window.location.pathname.split('/').pop() || 'dashboard.html';
  // Auch app-starter/pro/enterprise als gutachten.html matchen
  if (page === 'app-starter.html' || page === 'app-pro.html' || page === 'app-enterprise.html' || page === 'gutachten.html') {
    page = 'gutachten';
  }

  /* ── Paket aus localStorage (Solo/Team) ── */
  var rawPaket = localStorage.getItem('prova_paket') || 'Solo';
  // Backward-Kompatibilität: alte Werte mappen
  var paketMap = { Starter: 'Solo', Pro: 'Solo', Enterprise: 'Team' };
  var paket = paketMap[rawPaket] || rawPaket;
  // Korrektur: Alten Paketnamen überschreiben damit alle Seiten den richtigen lesen
  if (paketMap[rawPaket]) localStorage.setItem('prova_paket', paket);
  var paketColors = { Solo: '#4f8ef7', Team: '#a78bfa' };
  var pc = paketColors[paket] || paketColors.Solo;

  // Session 30: Einheitliche App-URL — Legacy-Dateien (app-starter/pro/enterprise) sind
  // jetzt Redirects auf app.html, daher keine Paket-Verzweigung mehr.
  var appUrl = 'app.html';

  /* ── Nav-Items: SV-Workflow-orientierte Gruppierung (Session 30 — final) ──
     Nach 4-Flow-Architektur-Entscheidung sind Flow-/Arten-Links nicht mehr
     in der Sidebar — sie werden über "+ Neuer Fall" (auftragstyp.js) erreicht.
     Reihenfolge folgt dem Tagesablauf:
     1. ARBEIT    - "wo stehe ich?" (daily landing + Workflow-Status)
     2. WERKZEUGE - Nachschlagewerke waehrend der Arbeit
     3. DOKUMENTE - was erstellt & versendet wird (Rechnungen, Briefe, E-Rechnung)
     4. BUERO     - seltene Verwaltung (Kontakte, Import, Jahresbericht)
     Footer (immer sichtbar): Einstellungen + Hilfe + Abmelden
  */
  /* ════════════════════════════════════════════════════════════════════
     P5b.A1 (Sprint 04b, 26.04.2026): Sidebar-Re-Architektur
     ════════════════════════════════════════════════════════════════════
     4 Sektionen statt vorher 4 (Arbeit/Werkzeuge/Dokumente/Buero).
     Neue Reihenfolge richtet sich nach Marcels finaler Vision:
       COCKPIT   - taegliche Landung (was steht an)
       BUERO     - Dokumente + Geschaefts-Verwaltung
       WERKZEUGE - Nachschlagewerke
       SYSTEM    - Einstellungen + Hilfe (war frueher im Footer)

     Items entfernt:
       Ortstermin (Desktop) -> bleibt in Mobile-Bottom-Nav + akte.html-Tab
       Zur Freigabe         -> ueber Notification-Glocke + Dashboard-Inbox
       Schnellrechnung      -> ueber Split-Button "Neuer Auftrag"
       Mahnwesen            -> Tab in Rechnungen (Sprint 04d)
       E-Rechnung           -> Format-Tab in Rechnungen (Sprint 04d)
       Daten importieren    -> Einstellungen -> Integrationen (Sprint 04d)

     Items umbenannt:
       Meine Faelle -> Meine Auftraege (durchgehend)

     Items mit Live-Counts (siehe loadSidebarCounts unten):
       Meine Auftraege -> phase_aktuell != 5 + sv_email match
       Kalender        -> termin_datum heute + sv_email match
       Rechnungen      -> status='offen' + faellig_am > 14 Tage + ueberfaellig
       Kontakte        -> KONTAKTE-Records mit sv_email match
  ═══════════════════════════════════════════════════════════════════ */
  var COCKPIT = [
    { href: 'dashboard.html',        icon: '🏠',  label: 'Zentrale' },
    { href: 'archiv.html',           icon: '📋',  label: 'Meine Aufträge', countKey: 'auftraege' },
    { href: 'termine.html',          icon: '📅',  label: 'Kalender',       countKey: 'kalender_heute' },
  ];
  var BUERO = [
    { href: 'rechnungen.html',     icon: '💸', label: 'Rechnungen',         countKey: 'rechnungen_ueberfaellig', warn: true },
    { href: 'briefvorlagen.html',  icon: '✉️',  label: 'Briefe & Vorlagen' },
    { href: 'kontakte.html',       icon: '👥', label: 'Kontakte',           countKey: 'kontakte' },
    { href: 'jahresbericht.html',  icon: '📊', label: 'Jahresbericht' },
  ];
  var WERKZEUGE = [
    { href: 'normen.html',         icon: '📚',  label: 'Normen' },
    { href: 'textbausteine.html',  icon: '💬',  label: 'Textbausteine' },
    { href: 'jveg.html',           icon: '🧮',  label: 'JVEG-Rechner' },
    { href: 'positionen.html',     icon: '💰',  label: 'Positionen & Preise' },
  ];
  var SYSTEM = [
    { href: 'einstellungen.html',  icon: '⚙️',  label: 'Einstellungen' },
    { href: 'hilfe.html',          icon: '🎓',  label: 'Hilfe & Support' },
  ];

  // Backward-Compat — DOKUMENTE/ARBEIT/VERWALTUNG werden noch von keinem
  // anderen Code referenziert; Stubs zur Sicherheit.
  var ARBEIT = []; var DOKUMENTE = []; var VERWALTUNG = [];


  function aktiverFallBlock() {
    // Aktiven Fall aus localStorage laden
    var az    = localStorage.getItem('prova_aktiver_fall') || localStorage.getItem('prova_letztes_az') || '';
    var sa    = localStorage.getItem('prova_schadenart') || '';
    var adr   = localStorage.getItem('prova_adresse') || '';
    var phase = parseInt(localStorage.getItem('prova_aktuelle_phase') || '0');

    if (!az) return ''; // Kein aktiver Fall

    // Phase-Label und CTA
    var phaseTxt, ctaHref, ctaLabel, ctaColor;
    if (phase <= 2 || !phase) {
      phaseTxt = 'Phase 2: Ortstermin';
      ctaLabel = 'Diktat aufnehmen';
      ctaHref  = 'app.html';
      ctaColor = '#4f8ef7';
    } else if (phase === 3) {
      phaseTxt = 'Phase 3: Gutachten';
      ctaLabel = '§6 schreiben';
      ctaHref  = 'stellungnahme.html?az=' + encodeURIComponent(az);
      ctaColor = '#f59e0b';
    } else if (phase === 4) {
      phaseTxt = 'Phase 4: Freigabe';
      ctaLabel = 'Freigeben & PDF';
      ctaHref  = 'freigabe.html?az=' + encodeURIComponent(az);
      ctaColor = '#10b981';
    } else {
      phaseTxt = 'Phase 5: Abschluss';
      ctaLabel = 'Rechnung erstellen';
      ctaHref  = 'rechnungen.html?az=' + encodeURIComponent(az);
      ctaColor = '#a78bfa';
    }

    var locShort = adr ? adr.split(',')[0] : '';
    var saShort  = sa ? sa.replace('schaden','').replace('befall','') : '';

    return '<div class="sb-active-fall" onclick="window.location.href=\'akte.html?az=' + encodeURIComponent(az) + '\'" '
      + 'style="margin:4px 8px 8px;padding:9px 11px;background:rgba(79,142,247,.07);border:0.5px solid rgba(79,142,247,.2);'
      + 'border-radius:9px;cursor:pointer;transition:background .12s;" '
      + 'onmouseover="this.style.background=\'rgba(79,142,247,.12)\'" '
      + 'onmouseout="this.style.background=\'rgba(79,142,247,.07)\'">'
      + '<div style="font-size:11px;font-weight:700;color:var(--accent,#4f8ef7);font-family:var(--font-mono,monospace);letter-spacing:.02em;">' + az + '</div>'
      + (sa ? '<div style="font-size:10px;color:var(--text3,#4d5568);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + sa + (locShort ? ' · ' + locShort : '') + '</div>' : '')
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">'
      + '<span style="font-size:9px;font-weight:600;color:var(--text3,#4d5568);text-transform:uppercase;letter-spacing:.05em;">' + phaseTxt + '</span>'
      + '<a href="' + ctaHref + '" onclick="event.stopPropagation()" '
      + 'style="font-size:10px;font-weight:700;color:' + ctaColor + ';text-decoration:none;white-space:nowrap;'
      + 'padding:2px 8px;border-radius:5px;background:' + ctaColor.replace('#','rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, function(m,r,g,b){return parseInt(r,16)+','+parseInt(g,16)+','+parseInt(b,16)}) + ',.12)">'
      + ctaLabel + ' →</a>'
      + '</div>'
      + '</div>';
  }

  function makeItem(item) {
    var isActive = (page === item.href) || (page === 'gutachten' && item.href === appUrl);
    // P5b.A4: archiv.html behaelt seinen Active-State auch wenn label
    // "Meine Auftraege" lautet (URL bleibt gleich).
    var cls = 'sb-item' + (isActive ? ' active' : '');
    var lbl = String(item.label).replace(/"/g, '&quot;');
    var badge = '';
    if (item.countKey) {
      var bClass = 'sb-count' + (item.warn ? ' sb-count-warn' : '');
      // data-count-key triggert dynamisches Update via loadSidebarCounts()
      badge = '<span class="' + bClass + '" data-count-key="' + item.countKey + '" style="display:none;"></span>';
    }
    return '<a href="' + item.href + '" class="' + cls + '" data-tooltip="' + lbl + '" aria-label="' + lbl + '">'
      + '<span class="sb-icon" aria-hidden="true">' + item.icon + '</span>'
      + '<span class="sb-label">' + item.label + '</span>'
      + badge
      + '</a>';
  }

  function makeGroup(label, items) {
    return '<div class="sb-section-label">' + label + '</div>'
      + items.map(makeItem).join('');
  }

  /* ── CSS injizieren (einmalig) ── */
  if (!document.getElementById('prova-nav-css')) {
    var style = document.createElement('style');
    style.id = 'prova-nav-css';
    style.textContent = ''
      /* Root vars */
      + ':root{--sb-w:228px;--sb-w-col:56px;}'

      /* ─── SIDEBAR SHELL ─── */
      /* UI-FIX2.2: Transition auf 250ms angehoben (Marcel-Spec) */
      + '.sidebar{'
      +   'position:fixed;left:0;top:0;bottom:0;width:var(--sb-w);min-width:var(--sb-w);'
      +   'background:var(--bg2,#111318);border-right:1px solid var(--border,rgba(255,255,255,.07));'
      +   'display:flex;flex-direction:column;z-index:200;'
      +   'transition:width .25s cubic-bezier(.4,0,.2,1),min-width .25s cubic-bezier(.4,0,.2,1);'
      +   'overflow:hidden;font-family:var(--font-ui,"DM Sans",system-ui,sans-serif);'
      + '}'
      + '.sidebar.collapsed{width:var(--sb-w-col);min-width:var(--sb-w-col);}'

      /* ─── LOGO + HEADER-TOGGLE (UI-FIX2.2) ─── */
      + '.sb-logo{'
      +   'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 14px;'
      +   'border-bottom:1px solid var(--border,rgba(255,255,255,.07));'
      +   'min-height:52px;overflow:hidden;flex-shrink:0;'
      + '}'
      + '.sb-logo-link{'
      +   'display:flex;align-items:center;gap:10px;text-decoration:none;cursor:pointer;'
      +   'min-width:0;overflow:hidden;flex:1 1 auto;'
      + '}'
      + '.sb-logo-link:hover .sb-logo-text{opacity:.8;}'
      + '.sb-toggle-btn{'
      +   'display:flex;align-items:center;justify-content:center;width:32px;height:32px;'
      +   'border-radius:8px;border:none;background:transparent;color:var(--text3,#4d5568);'
      +   'cursor:pointer;font-family:inherit;flex-shrink:0;'
      +   'transition:background .15s,color .15s;'
      + '}'
      + '.sb-toggle-btn:hover{background:rgba(255,255,255,.06);color:var(--text2,#8b93ab);}'
      + '.sb-toggle-btn:focus-visible{outline:2px solid var(--accent,#4f8ef7);outline-offset:1px;}'
      + '.sb-toggle-icon-hdr{'
      +   'font-size:16px;line-height:1;display:inline-flex;'
      +   'transition:transform .25s cubic-bezier(.4,0,.2,1);'
      + '}'
      + '.sidebar.collapsed .sb-toggle-icon-hdr{transform:rotate(180deg);}'
      + '.sidebar.collapsed .sb-logo-link{display:none;}'
      + '.sidebar.collapsed .sb-logo{justify-content:center;padding:14px 8px;}'
      + '.sb-logo-mark{'
      +   'width:30px;height:30px;background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;'
      +   'font-size:13px;font-weight:800;color:#fff;box-shadow:0 2px 8px rgba(79,142,247,.3);'
      + '}'
      + '.sb-logo-text{'
      +   'font-size:16px;font-weight:800;letter-spacing:-.02em;color:var(--text,#eaecf4);'
      +   'white-space:nowrap;overflow:hidden;transition:opacity .18s;'
      + '}'
      + '.sb-logo-text span{color:var(--accent,#4f8ef7);}'
      + '.sidebar.collapsed .sb-logo-text{opacity:0;width:0;}'

      /* P5b.B1-4: Split-Button "Neuer Auftrag" mit Dropdown */
      + '.sb-new-wrap{position:relative;margin:12px 12px 6px;}'
      + '.sb-new-btn-main,.sb-new-btn-arrow{'
      +   'background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'border:none;color:#fff;font-size:13px;font-weight:700;'
      +   'cursor:pointer;font-family:inherit;transition:all .18s;'
      +   'box-shadow:0 2px 12px rgba(79,142,247,.3);'
      + '}'
      /* P5b.X1.3: Variante C — 2-Zeilen-Button */
      + '.sb-new-btn-main{'
      +   'display:flex;align-items:center;gap:10px;padding:9px 14px;'
      +   'border-radius:10px 0 0 10px;flex:1;min-width:0;text-align:left;'
      +   'border-right:1px solid rgba(255,255,255,.18);'
      + '}'
      + '.sb-new-btn-arrow{'
      +   'display:flex;align-items:center;justify-content:center;'
      +   'width:32px;padding:0;border-radius:0 10px 10px 0;flex-shrink:0;'
      + '}'
      + '.sb-new-wrap{display:flex;}'
      + '.sb-new-btn-main:hover,.sb-new-btn-arrow:hover{opacity:.92;}'
      + '.sb-new-icon{font-size:16px;flex-shrink:0;line-height:1;}'
      + '.sb-new-text{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2;}'
      + '.sb-new-line1{font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '.sb-new-line2{font-size:11px;font-weight:500;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}'
      + '.sb-new-arrow{font-size:11px;display:inline-block;transition:transform .18s;}'
      + '.sidebar.collapsed .sb-new-text{opacity:0;width:0;}'
      + '.sidebar.collapsed .sb-new-btn-main{justify-content:center;padding:10px;border-radius:10px;border-right:none;flex:0 0 auto;}'
      + '.sidebar.collapsed .sb-new-btn-arrow{display:none;}'
      // Dropdown
      + '.sb-new-dropdown{'
      +   'display:none;position:absolute;top:calc(100% + 6px);left:0;right:0;'
      +   'background:var(--bg2,#13161d);border:1px solid var(--border2,rgba(255,255,255,.12));'
      +   'border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.55);'
      +   'max-height:60vh;overflow-y:auto;z-index:600;padding:6px 0;'
      + '}'
      + '.sb-new-group{padding:4px 0;}'
      + '.sb-new-group:not(:last-child){border-bottom:1px solid var(--border,rgba(255,255,255,.05));}'
      + '.sb-new-group-label{'
      +   'padding:6px 14px 4px;font-size:9px;font-weight:700;text-transform:uppercase;'
      +   'letter-spacing:.1em;color:var(--text3,#6b7280);'
      + '}'
      + '.sb-new-item{'
      +   'display:flex;align-items:center;gap:10px;width:100%;padding:8px 14px;'
      +   'background:none;border:none;color:var(--text2,#aab4cb);font-size:12.5px;'
      +   'cursor:pointer;font-family:inherit;text-align:left;transition:all .12s;'
      + '}'
      + '.sb-new-item:hover:not(.disabled){background:rgba(79,142,247,.08);color:var(--text,#e8eaf0);}'
      + '.sb-new-item-icon{flex-shrink:0;font-size:14px;width:20px;display:inline-flex;justify-content:center;}'
      + '.sb-new-item-label{flex:1;}'
      + '.sb-new-item-tag{font-size:9px;color:var(--text3);background:rgba(255,255,255,.06);padding:1px 6px;border-radius:6px;}'
      + '.sb-new-item.disabled{opacity:.4;cursor:not-allowed;}'

      /* ─── NAV SCROLL AREA ─── */
      + '.sb-nav{'
      +   'flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 10px;'
      +   'display:flex;flex-direction:column;gap:0;'
      + '}'
      + '.sb-nav::-webkit-scrollbar{width:3px;}'
      + '.sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px;}'

      /* ─── SECTION LABEL ─── */
      + '.sb-section-label{'
      +   'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;'
      +   'color:rgba(255,255,255,0.55) !important;padding:6px 10px 4px;margin-top:16px;'
      +   'white-space:nowrap;overflow:visible;'
      +   'transition:opacity .18s,height .18s,padding .18s;'
      +   'user-select:none;line-height:1.2;'
      + '}'
      + '.sb-section-label:first-child{margin-top:4px;}'
      // Session 28: trennende Linie vor Footer (meta-sektion)
      + '.sb-footer-divider{height:1px;background:var(--border,rgba(255,255,255,.08));margin:8px 12px 6px;transition:opacity .18s;}'
      + '.sidebar.collapsed .sb-footer-divider{margin:8px 8px 6px;}'
      // Session 28 Fix #2: Suchfeld darf Text nicht ueberlaufen (das "S" vom "Suchen")
      + '.sidebar.collapsed .sb-search-input,.sidebar.collapsed .sb-search{overflow:hidden !important;}'
      + '.sidebar.collapsed .sb-search-input{padding-left:0 !important;padding-right:0 !important;text-indent:-9999px !important;}'
      + '.sidebar.collapsed .sb-section-label{opacity:0;height:0;padding:0;margin:0;overflow:hidden;}'

      /* ─── NAV ITEMS — NO LAYOUT SHIFT ─── */
      + '.sb-item{'
      +   'display:flex;align-items:center;gap:10px;'
      +   'padding:0 10px;'  /* horizontal padding only, height via min-height */
      +   'min-height:36px;'  /* FIXED HEIGHT — prevents shifting */
      +   'border-radius:8px;'
      +   'color:var(--text3,#4d5568);font-size:13px;'
      +   'font-weight:500;'  /* NEVER changes — key fix */
      +   'cursor:pointer;transition:color .12s,background .12s;'
      +   'text-decoration:none;position:relative;'
      +   'border-left:none;'  /* removed — was causing shift */
      + '}'
      + '.sb-item:hover{color:var(--text2,#8b93ab);background:rgba(255,255,255,.04);}'
      
      /* P5b.C1-3: Active-Dot statt Hintergrund.
         Color-Highlight nur auf Text/Icon, kein Background, kein
         border-left mehr. Active-Dot rechts: 6px Punkt mit
         200ms scale-in. */
      + '.sb-item.active{'
      +   'color:var(--accent,#4f8ef7);'
      +   'font-weight:500;'  /* SAME as default — no shift */
      + '}'
      + '.sb-item.active::after{'
      +   'content:"";position:absolute;right:12px;top:50%;'
      +   'transform:translateY(-50%) scale(0);'
      +   'width:6px;height:6px;border-radius:50%;'
      +   'background:var(--accent,#4f8ef7);'
      +   'animation:provaSbDotIn 200ms cubic-bezier(.34,1.56,.64,1) forwards;'
      + '}'
      + '@keyframes provaSbDotIn{'
      +   'to{transform:translateY(-50%) scale(1);}'
      + '}'
      /* Counts (Live-Numbers) rechts neben dem Label */
      + '.sb-count{'
      +   'margin-left:auto;font-size:11px;font-weight:600;'
      +   'color:var(--text3,#6b7280);'
      +   'background:rgba(255,255,255,.04);'
      +   'border-radius:8px;padding:1px 6px;line-height:1.5;'
      +   'transition:opacity .15s;'
      + '}'
      + '.sb-count-warn{'
      +   'background:rgba(239,68,68,.12);color:#f87171;'
      + '}'
      + '.sb-item.active .sb-count{color:var(--accent,#4f8ef7);background:rgba(79,142,247,.12);}'
      + '.sidebar.collapsed .sb-count{display:none !important;}'
      /* Wenn aktive Seite Count hat, Active-Dot WEGLASSEN damit Badge sichtbar bleibt */
      + '.sb-item.active:has(.sb-count[style*="display: none"])::after,'
      + '.sb-item.active:not(:has(.sb-count))::after{display:block;}'
      + '.sb-item.active:has(.sb-count:not([style*="display: none"]))::after{display:none;}'
      
      /* Icon — fixed width container prevents emoji width variations */
      + '.sb-icon{'
      +   'width:22px;height:22px;'
      +   'display:inline-flex;align-items:center;justify-content:center;'
      +   'font-size:15px;flex-shrink:0;line-height:1;'
      + '}'
      
      /* Label */
      + '.sb-label{white-space:nowrap;overflow:hidden;transition:opacity .18s;}'
      + '.sidebar.collapsed .sb-label{opacity:0;width:0;}'
      + '.sidebar.collapsed .sb-item{justify-content:center;padding:0;min-height:40px;}'

      /* Tooltip on collapsed
         UI-FIX2.3: [data-tooltip] statt [title], damit kein doppelter
         Browser-Tooltip + Fade-In-Animation. */
      + '@keyframes prova-sb-tooltip-fade-in{'
      +   'from{opacity:0;transform:translate(-4px,-50%);}'
      +   'to{opacity:1;transform:translate(0,-50%);}'
      + '}'
      + '.sidebar.collapsed .sb-item[data-tooltip]:hover::after,'
      + '.sidebar.collapsed .sb-settings[data-tooltip]:hover::after{'
      +   'content:attr(data-tooltip);position:absolute;'
      +   'left:calc(var(--sb-w-col) + 8px);top:50%;'
      +   'background:var(--bg2,#111318);border:1px solid var(--border2,rgba(255,255,255,.13));'
      +   'color:var(--text,#eaecf4);font-size:12px;font-weight:500;padding:5px 12px;'
      +   'border-radius:7px;white-space:nowrap;z-index:500;pointer-events:none;'
      +   'box-shadow:0 4px 12px rgba(0,0,0,.3);'
      +   'opacity:0;animation:prova-sb-tooltip-fade-in 150ms ease-out forwards;'
      + '}'

      /* P5b.F1-3: Account-Footer mit Avatar + Tier + Usage + Dropdown */
      + '.sb-account-footer{'
      +   'margin-top:auto;flex-shrink:0;'
      +   'border-top:1px solid var(--border,rgba(255,255,255,.07));'
      +   'padding:10px;cursor:pointer;position:relative;transition:background .15s;'
      + '}'
      + '.sb-account-footer:hover{background:rgba(255,255,255,.03);}'
      + '.sb-account-row{display:flex;align-items:center;gap:10px;}'
      + '.sb-account-avatar{'
      +   'width:32px;height:32px;border-radius:50%;flex-shrink:0;'
      +   'background:linear-gradient(135deg,var(--accent,#4f8ef7),var(--accent2,#3a7be0));'
      +   'color:#fff;font-size:11px;font-weight:800;letter-spacing:.02em;'
      +   'display:flex;align-items:center;justify-content:center;'
      +   'box-shadow:0 1px 4px rgba(79,142,247,.3);'
      + '}'
      + '.sb-account-info{flex:1;min-width:0;overflow:hidden;transition:opacity .18s;}'
      + '.sb-account-name{'
      +   'font-size:12.5px;font-weight:700;color:var(--text,#e8eaf0);'
      +   'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;'
      + '}'
      + '.sb-account-meta{'
      +   'font-size:10.5px;color:var(--text3,#6b7280);'
      +   'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;'
      + '}'
      + '.sb-account-tier{font-weight:700;}'
      + '.sb-account-arrow{'
      +   'font-size:10px;color:var(--text3);flex-shrink:0;transition:transform .15s;'
      + '}'
      + '.sb-account-footer:hover .sb-account-arrow{transform:rotate(180deg);}'
      + '.sidebar.collapsed .sb-account-info,.sidebar.collapsed .sb-account-arrow{opacity:0;width:0;height:0;}'
      + '.sidebar.collapsed .sb-account-footer{padding:10px 6px;}'
      + '.sidebar.collapsed .sb-account-row{justify-content:center;}'
      // Account-Dropdown
      + '.sb-account-menu{'
      +   'display:none;position:absolute;bottom:calc(100% + 6px);left:8px;right:8px;'
      +   'background:var(--bg2,#13161d);border:1px solid var(--border2,rgba(255,255,255,.12));'
      +   'border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.55);'
      +   'padding:6px 0;z-index:600;'
      + '}'
      + '.sb-account-menu-item{'
      +   'display:flex;align-items:center;gap:10px;width:100%;padding:8px 14px;'
      +   'background:none;border:none;color:var(--text2,#aab4cb);font-size:12.5px;'
      +   'cursor:pointer;font-family:inherit;text-align:left;text-decoration:none;'
      +   'transition:background .12s;'
      + '}'
      + '.sb-account-menu-item:hover{background:rgba(79,142,247,.08);color:var(--text,#e8eaf0);}'
      + '.sb-account-menu-item.sb-account-menu-logout:hover{background:rgba(239,68,68,.1);color:#f87171;}'
      + '.sb-account-menu-sep{height:1px;background:var(--border,rgba(255,255,255,.05));margin:4px 8px;}'

      /* ─── MAIN CONTENT OFFSET ─── */
      + '.main-wrap{margin-left:var(--sb-w);transition:margin-left .25s cubic-bezier(.4,0,.2,1);background:var(--bg,#0b0d11);min-height:100vh;}'
      + '.sidebar.collapsed ~ .main-wrap{margin-left:var(--sb-w-col);}'
      + '.main{margin-left:var(--sb-w);transition:margin-left .25s cubic-bezier(.4,0,.2,1);}'
      + '.sidebar.collapsed ~ .main{margin-left:var(--sb-w-col);}'

      /* ─── MOBILE ─── */
      + '.sb-overlay{'
      +   'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:199;'
      +   'backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);'
      +   'opacity:0;transition:opacity .25s;'
      + '}'
      + '.sb-overlay.open{display:block;opacity:1;}'
      + '@media(max-width:768px){'
      +   '.sidebar{transform:translateX(-100%);transition:transform .25s cubic-bezier(.4,0,.2,1);}'
      +   '.sidebar.mobile-open{transform:translateX(0);width:var(--sb-w);min-width:var(--sb-w);}'
      +   '.sidebar.mobile-open .sb-label,.sidebar.mobile-open .sb-logo-text,'
      +   '.sidebar.mobile-open .sb-section-label,.sidebar.mobile-open .paket-name,'
      +   '.sidebar.mobile-open .btn-label,.sidebar.mobile-open .sb-collapse-label{opacity:1;width:auto;}'
      +   '.sidebar.mobile-open .sb-new-btn{justify-content:flex-start;padding:10px 14px;}'
      +   '.sidebar.mobile-open .sb-item{justify-content:flex-start;padding:0 10px;}'
      +   '.main-wrap,.main{margin-left:0!important;}'
      + '}'
    ;
    document.head.appendChild(style);
  }

  /* ── HTML aufbauen ── */
  var settingsActive = (page === 'einstellungen.html') ? ' active' : '';
  

  /* ── NEUER FALL: kompletter Fall-Reset ── */
  window.provaResetFall = function() {
  // Flag setzen: app.html soll keinen Entwurf laden
  sessionStorage.setItem('prova_neuer_fall', '1');
    var FALL_KEYS = [
      'prova_transkript','prova_aktiver_fall','prova_schadenart','prova_baujahr',
      'prova_adresse','prova_messwerte','prova_messwerte_strukturiert',
      'prova_stellungnahme_text','prova_stellungnahme_done','prova_stellungnahme_ts',
      'prova_stellungnahme_weg','prova_stellungnahme_kj2_ok','prova_stellungnahme_version',
      'prova_stellungnahme_audit','prova_ki_stellungnahme_vorschlag',
      'prova_entwurf_text','prova_entwurf_edits','prova_entwurf_edit_ts',
      'prova_offenlegungstext','prova_gutachten_typ',
      'prova_diktat_ts','prova_diktat_start_ts','prova_diktat_ende_ts','prova_diktat_dauer_sek',
      'prova_ki_ts','prova_ki_modell','prova_407a_ts',
      'prova_qi_done','prova_qi_ts',
      'prova_auftraggeber_name','prova_auftraggeber_email',
      'prova_audit_log','prova_stellungnahme_return'
    ];
    FALL_KEYS.forEach(function(k){ localStorage.removeItem(k); });
    // Foto-Metadaten (prova_foto_metadata_* Keys)
    var toRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('prova_foto_metadata_')) toRemove.push(key);
    }
    toRemove.forEach(function(k){ localStorage.removeItem(k); });
  };

  /* ════════════════════════════════════════════════════════════════════
     P5b.B1-4: Split-Button "Neuer Auftrag" mit 4-Flow-Dropdown
  ═══════════════════════════════════════════════════════════════════ */
  var AUFTRAGSTYPEN = [
    { group: 'A · Schaden/Mangel', items: [
      { id: 'schadensgutachten', icon: '📋', label: 'Schadensgutachten',          url: 'app.html?typ=schaden' },
      { id: 'beweissicherung',   icon: '🔍', label: 'Beweissicherung',            url: 'app.html?typ=beweis' },
      { id: 'ergaenzung',        icon: '📄', label: 'Ergänzungsgutachten (§411 ZPO)', url: 'ergaenzung.html' },
      { id: 'gegengutachten',    icon: '🔄', label: 'Gegengutachten / Erwiderung', url: 'widerspruch-gutachten.html' },
      { id: 'stellungnahme',     icon: '✍️',  label: 'Technische Stellungnahme',   url: 'stellungnahme.html' }
    ]},
    { group: 'B · Bewertung', items: [
      { id: 'wertgutachten', icon: '🏠', label: 'Wertgutachten', url: 'wertgutachten.html' }
    ]},
    { group: 'C · Beratung', items: [
      { id: 'telefonberatung', icon: '📞', label: 'Telefonberatung', url: 'beratung.html?typ=telefon' },
      { id: 'beratung',        icon: '💼', label: 'Beratungsleistung', url: 'beratung.html' }
    ]},
    { group: 'D · Baubegleitung', items: [
      { id: 'baubegleitung', icon: '🏗️', label: 'Baubegleitung', url: 'baubegleitung.html' }
    ]},
    { group: 'Bescheinigungen', items: [
      { id: 'bescheinigung_placeholder', icon: '📜', label: 'Bescheinigung', url: '#', disabled: true, tooltip: 'Kommt in Kürze (Sprint 04d)' }
    ]},
    { group: 'Sonderfälle', items: [
      { id: 'schiedsgutachten', icon: '⚖️', label: 'Schiedsgutachten', url: 'schiedsgutachten.html' }
    ]},
    { group: 'Standalone', items: [
      { id: 'schnelle_rechnung', icon: '💸', label: 'Schnellrechnung (ohne Fall)', url: 'schnelle-rechnung.html' },
      { id: 'brief_standalone',  icon: '✉️',  label: 'Brief (ohne Fall)',           url: 'briefvorlagen.html' }
    ]}
  ];

  function findAuftragsTyp(id) {
    for (var i = 0; i < AUFTRAGSTYPEN.length; i++) {
      var items = AUFTRAGSTYPEN[i].items;
      for (var j = 0; j < items.length; j++) {
        if (items[j].id === id && !items[j].disabled) return items[j];
      }
    }
    return null;
  }

  function getDefaultAuftrag() {
    var last = localStorage.getItem('prova_letzter_auftragstyp');
    return findAuftragsTyp(last) || findAuftragsTyp('schadensgutachten');
  }

  window.provaSelectAuftragstyp = function (id) {
    var t = findAuftragsTyp(id);
    if (!t) return;
    try { localStorage.setItem('prova_letzter_auftragstyp', id); } catch(e) {}
    // Live-Update der Smart-Default-Unterzeile (falls Navigation kurz klemmt)
    var lbl = document.getElementById('sb-new-default-label');
    if (lbl) lbl.textContent = t.label;
    provaResetFall();
    window.location.href = t.url;
  };

  window.provaToggleAuftragDropdown = function () {
    var dd = document.getElementById('sb-new-dropdown');
    if (!dd) return;
    var open = dd.style.display !== 'block';
    dd.style.display = open ? 'block' : 'none';
    var arrow = document.querySelector('.sb-new-arrow');
    if (arrow) arrow.style.transform = open ? 'rotate(180deg)' : '';
  };

  // Dropdown schliessen bei Klick ausserhalb
  document.addEventListener('click', function (e) {
    var dd = document.getElementById('sb-new-dropdown');
    if (!dd || dd.style.display !== 'block') return;
    if (e.target.closest && e.target.closest('.sb-new-wrap')) return;
    dd.style.display = 'none';
    var arrow = document.querySelector('.sb-new-arrow');
    if (arrow) arrow.style.transform = '';
  });

  function buildSplitButton() {
    var def = getDefaultAuftrag();
    var dropdownHtml = AUFTRAGSTYPEN.map(function (g) {
      var items = g.items.map(function (it) {
        var disabled = it.disabled ? ' disabled' : '';
        var onclick = it.disabled
          ? 'event.preventDefault();return false;'
          : "provaSelectAuftragstyp('" + it.id + "');";
        var tooltip = it.tooltip ? ' title="' + it.tooltip + '"' : '';
        return '<button type="button" class="sb-new-item' + disabled + '" onclick="' + onclick + '"' + tooltip + '>'
             + '<span class="sb-new-item-icon">' + it.icon + '</span>'
             + '<span class="sb-new-item-label">' + it.label + '</span>'
             + (it.disabled ? '<span class="sb-new-item-tag">Bald</span>' : '')
             + '</button>';
      }).join('');
      return '<div class="sb-new-group">'
           + '<div class="sb-new-group-label">' + g.group + '</div>'
           + items
           + '</div>';
    }).join('');

    /* P5b.X1.3: Variante C — 2-Zeilen-Button.
       Hauptzeile gross + prominent ("Neuer Auftrag"), Unterzeile
       klein + gedaempft (Smart-Default-Label).
       Der Pfeil-Button bleibt rechts; im collapsed-Mode nur das ✨-Icon. */
    var defLabel = (def && def.label) || 'Schadensgutachten';
    var defId    = (def && def.id) || 'schadensgutachten';
    return '<div class="sb-new-wrap">'
         +   '<button type="button" class="sb-new-btn-main" id="sb-new-btn" onclick="provaSelectAuftragstyp(\'' + defId + '\')" '
         +     'title="Direkt anlegen: ' + escAttr(defLabel) + '">'
         +     '<span class="sb-new-icon">✨</span>'
         +     '<div class="sb-new-text">'
         +       '<div class="sb-new-line1">Neuer Auftrag</div>'
         +       '<div class="sb-new-line2" id="sb-new-default-label">' + escAttr(defLabel) + '</div>'
         +     '</div>'
         +   '</button>'
         +   '<button type="button" class="sb-new-btn-arrow" onclick="provaToggleAuftragDropdown()" aria-label="Auftragstyp auswählen">'
         +     '<span class="sb-new-arrow">▾</span>'
         +   '</button>'
         +   '<div class="sb-new-dropdown" id="sb-new-dropdown">' + dropdownHtml + '</div>'
         + '</div>';
  }

  /* ════════════════════════════════════════════════════════════════════
     P5b.F1-3: Account-Footer mit Avatar + Tier-Badge + Usage + Dropdown
  ═══════════════════════════════════════════════════════════════════ */
  function getInitials(name) {
    if (!name) return '??';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getUserName() {
    try {
      var u = JSON.parse(localStorage.getItem('prova_user') || '{}');
      return u.name || u.email || 'PROVA-Nutzer';
    } catch (e) { return 'PROVA-Nutzer'; }
  }

  function getUsageText(paket) {
    var n = parseInt(localStorage.getItem('prova_auftraege_count') || '0', 10) || 0;
    if (paket === 'Solo')  return n + '/30 Aufträge';
    if (paket === 'Team')  return n + ' Aufträge';
    return n + ' Aufträge';
  }

  window.provaToggleAccountMenu = function () {
    var m = document.getElementById('sb-account-menu');
    if (!m) return;
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
  };
  document.addEventListener('click', function (e) {
    var m = document.getElementById('sb-account-menu');
    if (!m || m.style.display !== 'block') return;
    if (e.target.closest && e.target.closest('.sb-account-footer')) return;
    m.style.display = 'none';
  });
  window.provaToggleTheme = function () {
    if (window.PROVA_THEME && typeof window.PROVA_THEME.toggle === 'function') {
      window.PROVA_THEME.toggle();
    } else {
      var cur = localStorage.getItem('prova_theme') || 'dark';
      var next = cur === 'dark' ? 'light' : 'dark';
      localStorage.setItem('prova_theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
  };

  function buildAccountFooter() {
    var name     = getUserName();
    var initials = getInitials(name);
    var usage    = getUsageText(paket);
    return ''
      + '<div class="sb-account-footer" onclick="provaToggleAccountMenu()" role="button" tabindex="0">'
      +   '<div class="sb-account-row">'
      +     '<div class="sb-account-avatar">' + initials + '</div>'
      +     '<div class="sb-account-info">'
      +       '<div class="sb-account-name">' + escAttr(name) + '</div>'
      +       '<div class="sb-account-meta">'
      +         '<span class="sb-account-tier" style="color:' + pc + ';">' + paket + '</span>'
      +         '<span class="sb-account-meta-sep"> · </span>'
      +         '<span class="sb-account-usage">' + usage + '</span>'
      +       '</div>'
      +     '</div>'
      +     '<span class="sb-account-arrow">▾</span>'
      +   '</div>'
      +   '<div class="sb-account-menu" id="sb-account-menu">'
      +     '<button type="button" onclick="event.stopPropagation();provaToggleTheme()" class="sb-account-menu-item">'
      +       '<span>🌓</span><span>Theme wechseln</span>'
      +     '</button>'
      +     '<div class="sb-account-menu-sep"></div>'
      +     '<a href="einstellungen.html" class="sb-account-menu-item">'
      +       '<span>⚙️</span><span>Konto-Einstellungen</span>'
      +     '</a>'
      +     '<a href="einstellungen.html#paket" class="sb-account-menu-item">'
      +       '<span>🔄</span><span>Plan upgraden</span>'
      +     '</a>'
      +     '<div class="sb-account-menu-sep"></div>'
      +     '<button type="button" onclick="event.stopPropagation();provaSbLogout()" class="sb-account-menu-item sb-account-menu-logout">'
      +       '<span>🚪</span><span>Abmelden</span>'
      +     '</button>'
      +   '</div>'
      + '</div>';
  }

  function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ════════════════════════════════════════════════════════════════════
     P5b.D1-4: Live-Counts in Sidebar
     Lazy-Loading: erste 3-5 Sekunden zeigen Sidebar ohne Counts, dann
     async-Update via provaFetch. Cache 5 Min in localStorage.
  ═══════════════════════════════════════════════════════════════════ */
  var COUNT_CACHE_KEY = 'prova_sidebar_counts_v1';
  var COUNT_TTL_MS = 5 * 60 * 1000; // 5 Minuten

  function readCountCache() {
    try {
      var raw = localStorage.getItem(COUNT_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || (Date.now() - (obj.ts || 0)) > COUNT_TTL_MS) return null;
      return obj.counts || null;
    } catch (e) { return null; }
  }

  function writeCountCache(counts) {
    try {
      localStorage.setItem(COUNT_CACHE_KEY, JSON.stringify({ ts: Date.now(), counts: counts }));
    } catch (e) {}
  }

  function applyCountsToBadges(counts) {
    if (!counts) return;
    Object.keys(counts).forEach(function (key) {
      var n = counts[key];
      document.querySelectorAll('[data-count-key="' + key + '"]').forEach(function (el) {
        if (n > 0) {
          // Format: ueberfaellig zeigt "X ⚠", andere nur Zahl
          var html = el.classList.contains('sb-count-warn') ? n + ' ⚠' : String(n);
          el.textContent = html;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    });
    // Auch Account-Footer-Usage updaten falls Aufträge-Count da
    if (typeof counts.auftraege === 'number') {
      try { localStorage.setItem('prova_auftraege_count', String(counts.auftraege)); } catch(e){}
      var u = document.querySelector('.sb-account-usage');
      if (u) u.textContent = getUsageText(paket);
    }
  }

  async function fetchAirtableCount(path) {
    if (typeof window.provaFetch !== 'function') return 0;
    try {
      var res = await window.provaFetch('/.netlify/functions/airtable', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ method: 'GET', path: path })
      });
      if (!res.ok) return 0;
      var data = await res.json();
      return (data.records || []).length;
    } catch (e) { return 0; }
  }

  async function loadSidebarCounts() {
    if (typeof window.provaFetch !== 'function') return;
    var svEmail = (localStorage.getItem('prova_sv_email') || '').toLowerCase();
    if (!svEmail) return;

    var BASE = 'appJ7bLlAHZoxENWE';
    var TBL_FAELLE     = 'tblSxV8bsXwd1pwa0';
    var TBL_TERMINE    = 'tblyMTTdtfGQjjmc2';
    var TBL_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
    var TBL_KONTAKTE   = 'tblMKmPLjRelr6Hal';

    // ISO-Datum heute (YYYY-MM-DD), Datum vor 14 Tagen
    var today = new Date();
    var todayStr = today.toISOString().slice(0, 10);
    var grenzVor14 = new Date(today.getTime() - 14 * 86400000).toISOString().slice(0, 10);

    // 1. SCHADENSFAELLE wo phase_aktuell != 5 + sv_email match
    //    Schema: phase_aktuell (number), sv_email (singleLineText)
    var auftraegeFormel = "AND({sv_email}='" + svEmail + "', OR({phase_aktuell}=BLANK(), {phase_aktuell}!=5))";
    var auftraegePath = '/v0/' + BASE + '/' + TBL_FAELLE + '?filterByFormula=' + encodeURIComponent(auftraegeFormel) + '&fields[]=Aktenzeichen';

    // 2. TERMINE heute + sv_email match
    //    Schema: termin_datum (dateTime), sv_email (email)
    var kalenderFormel = "AND({sv_email}='" + svEmail + "', DATETIME_FORMAT({termin_datum},'YYYY-MM-DD')='" + todayStr + "')";
    var kalenderPath = '/v0/' + BASE + '/' + TBL_TERMINE + '?filterByFormula=' + encodeURIComponent(kalenderFormel) + '&fields[]=termin_datum';

    // 3. RECHNUNGEN ueberfaellig: status='offen' + faellig_am < heute - 14
    //    Schema: status (singleSelect, lowercase), faellig_am (date), sv_email (singleLineText)
    var rechnungenFormel = "AND({sv_email}='" + svEmail + "', LOWER({status})='offen', IS_BEFORE({faellig_am}, '" + grenzVor14 + "'))";
    var rechnungenPath = '/v0/' + BASE + '/' + TBL_RECHNUNGEN + '?filterByFormula=' + encodeURIComponent(rechnungenFormel) + '&fields[]=status';

    // 4. KONTAKTE Anzahl (sv_email match)
    var kontakteFormel = "{sv_email}='" + svEmail + "'";
    var kontaktePath = '/v0/' + BASE + '/' + TBL_KONTAKTE + '?filterByFormula=' + encodeURIComponent(kontakteFormel) + '&fields[]=Name';

    // Parallele Loads
    var results = await Promise.all([
      fetchAirtableCount(auftraegePath),
      fetchAirtableCount(kalenderPath),
      fetchAirtableCount(rechnungenPath),
      fetchAirtableCount(kontaktePath)
    ]);

    var counts = {
      auftraege:                  results[0],
      kalender_heute:             results[1],
      rechnungen_ueberfaellig:    results[2],
      kontakte:                   results[3]
    };
    writeCountCache(counts);
    applyCountsToBadges(counts);
  }

  // Public API
  window.provaSidebarRefresh = loadSidebarCounts;

  var html = ''
    + '<div class="sb-logo">'
    +   '<a class="sb-logo-link" href="dashboard.html" title="Zur Zentrale">'
    +     '<div class="sb-logo-mark">P</div>'
    +     '<div class="sb-logo-text">PR<span>O</span>VA</div>'
    +   '</a>'
    +   '<button type="button" class="sb-toggle-btn" id="sb-toggle-header" '
    +     'aria-label="Sidebar einklappen" aria-expanded="true" '
    +     'title="Sidebar einklappen">'
    +     '<span class="sb-toggle-icon-hdr" aria-hidden="true">⇤</span>'
    +   '</button>'
    + '</div>'

    + buildSplitButton()

    + aktiverFallBlock()

    + '<button id="sb-search-btn" onclick="window.PROVASearch&&PROVASearch.toggle()" '
    + 'style="display:flex;align-items:center;gap:8px;margin:0 8px 6px;padding:7px 12px;'
    + 'background:rgba(255,255,255,.04);border:1px solid var(--border,rgba(255,255,255,.07));'
    + 'border-radius:8px;color:var(--text3,#6b7280);font-size:12px;cursor:pointer;'
    + 'width:calc(100% - 16px);text-align:left;font-family:inherit;transition:border-color .15s;" '
    + 'onmouseover="this.style.borderColor=\'rgba(255,255,255,.15)\'" '
    + 'onmouseout="this.style.borderColor=\'var(--border,rgba(255,255,255,.07))\'">'
    + '<span style="font-size:13px;">🔍</span>'
    + '<span style="flex:1;">Suchen…</span>'
    + '<kbd style="font-size:9px;padding:1px 5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:4px;font-family:monospace;flex-shrink:0;">⌘K</kbd>'
    + '</button>'

    + '<div class="sb-nav">'
    +   makeGroup('Cockpit',    COCKPIT)
    +   makeGroup('Büro',       BUERO)
    +   makeGroup('Werkzeuge',  WERKZEUGE)
    +   makeGroup('System',     SYSTEM)
    + '</div>'

    /* P5b.F1-3: Account-Footer mit Avatar + Tier + Usage + Dropdown.
       Ersetzt den alten Settings/Hilfe/Logout-Footer. */
    + buildAccountFooter()
  ;

  /* ── In DOM einfügen ── */
  function injectNav() {
    var existing = document.getElementById('sidebar');
    if (!existing) return;
    existing.innerHTML = html;
    existing.className = 'sidebar';

    // Overlay für Mobile erstellen (falls nicht vorhanden)
    if (!document.getElementById('sb-overlay')) {
      var overlay = document.createElement('div');
      overlay.className = 'sb-overlay';
      overlay.id = 'sb-overlay';
      overlay.onclick = function() { closeMobileSidebar(); };
      existing.parentNode.insertBefore(overlay, existing.nextSibling);
    }

    // Collapse-State aus localStorage wiederherstellen
    // Session 28 Fix #1: Auto-Collapse bei schmalen Fenstern wenn der User
    // noch keine eigene Entscheidung getroffen hat.
    // S-SICHER UI-FIX1.5 (24.04.2026): Threshold von 1100 auf 900 gesenkt,
    // damit User auf Standard-Notebooks (13-14") die volle Sidebar sehen.
    // Zusätzlich Resize-Listener: Flip zwischen collapsed/full ohne Reload,
    // solange der User NIE den Einklappen-Button geklickt hat.
    var savedCollapse = localStorage.getItem('prova_sb_collapsed');
    var collapsed;
    if (savedCollapse === '1' || savedCollapse === '0') {
      // User hat eigene Wahl getroffen - respektieren
      collapsed = savedCollapse === '1';
    } else {
      // P5b.X1.4: Auto-Collapse-Breakpoint deaktiviert fuer Range 768-1024.
      // Marcel-Spec: Sidebar bleibt voll sichtbar bei halbiertem Desktop-Fenster.
      // Unter 768px greift sowieso der Mobile-Mode (@media (max-width:768px)).
      collapsed = false;
    }
    if (collapsed) existing.classList.add('collapsed');

    // Resize-Listener: keine Auto-Collapse-Aenderungen mehr im 768-1024-Range.
    // User-explizite Toggle-Wahl bleibt persistent. Mobile-Mode haengt rein
    // an CSS-Media-Queries.
    window.addEventListener('resize', function () {
      if (localStorage.getItem('prova_sb_collapsed') !== null) return;
      // Kein Auto-Collapse mehr — Sidebar bleibt voll sichtbar bis Mobile.
    });

    // ── Scroll-Position der Sidebar wiederherstellen ──
    var nav = existing.querySelector('.sb-nav');
    if (nav) {
      var savedScroll = parseInt(localStorage.getItem('prova_sb_scroll') || '0', 10);
      // Kurz warten bis DOM gerendert, dann Position setzen
      requestAnimationFrame(function() {
        nav.scrollTop = savedScroll;
        // Aktives Element in View bringen (nur wenn außerhalb des sichtbaren Bereichs)
        var active = nav.querySelector('.sb-item.active, .sb-item-active, a.active');
        if (active) {
          var navRect = nav.getBoundingClientRect();
          var itemRect = active.getBoundingClientRect();
          var isAbove = itemRect.top < navRect.top;
          var isBelow = itemRect.bottom > navRect.bottom;
          if (isAbove || isBelow) {
            active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }
        }
      });
      // Scroll-Position beim Verlassen speichern
      window.addEventListener('beforeunload', function() {
        localStorage.setItem('prova_sb_scroll', nav.scrollTop);
      });
      // Auch bei normalen Link-Klicks speichern (beforeunload feuert nicht immer)
      nav.addEventListener('click', function(e) {
        var link = e.target.closest('a[href]');
        if (link && !link.getAttribute('href').startsWith('#')) {
          localStorage.setItem('prova_sb_scroll', nav.scrollTop);
        }
      }, true);
    }

    // UI-FIX2.2: Zentrale Toggle-Funktion + Header-Button-Handler.
    // Globale Funktion, damit auch Keyboard-Shortcut (UI-FIX2.4) darauf zugreift.
    function updateToggleUi(isCol) {
      var b = document.getElementById('sb-toggle-header');
      if (!b) return;
      b.setAttribute('aria-expanded', isCol ? 'false' : 'true');
      b.setAttribute('aria-label', isCol ? 'Sidebar ausklappen' : 'Sidebar einklappen');
      b.setAttribute('title', (isCol ? 'Sidebar ausklappen' : 'Sidebar einklappen') + ' (Ctrl+B)');
    }
    window.provaSidebarToggle = function () {
      existing.classList.toggle('collapsed');
      var isCol = existing.classList.contains('collapsed');
      try { localStorage.setItem('prova_sb_collapsed', isCol ? '1' : '0'); } catch (e) {}
      updateToggleUi(isCol);
      try {
        document.dispatchEvent(new CustomEvent('prova-sidebar-toggle', {
          detail: { collapsed: isCol }
        }));
      } catch (e) {}
    };
    // Initial-State-Sync (falls Auto-Collapse bereits .collapsed gesetzt hat)
    updateToggleUi(existing.classList.contains('collapsed'));

    var headerToggle = document.getElementById('sb-toggle-header');
    if (headerToggle) {
      headerToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        window.provaSidebarToggle();
      });
    }

    // UI-FIX2.4: Keyboard-Shortcut Ctrl+B (Mac: Cmd+B) togglet Sidebar.
    // - nicht in Eingabefeldern (INPUT, TEXTAREA, contentEditable) triggern,
    //   damit Browser-Bold in Rich-Text-Editoren erhalten bleibt
    // - kleines 'b' verlangen → Shift+B löst NICHT aus (Marcel-Spec)
    // - alt-Modifier ebenfalls ausschließen
    document.addEventListener('keydown', function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.shiftKey || e.altKey) return;
      if (e.key !== 'b') return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      if (typeof window.provaSidebarToggle === 'function') window.provaSidebarToggle();
    });
  }

  /* ── Mobile Sidebar Funktionen (global) ── */
  window.openMobileSidebar = function() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sb-overlay');
    if (sb) sb.classList.add('mobile-open');
    if (ov) ov.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeMobileSidebar = function() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sb-overlay');
    if (sb) sb.classList.remove('mobile-open');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  };
  // ESC schließt Mobile-Sidebar
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileSidebar();
  });

  function bootstrapSidebar() {
    injectNav();
    // P5b.D: Sofort cache anwenden (falls vorhanden), dann fresh load.
    var cached = readCountCache();
    if (cached) applyCountsToBadges(cached);
    // Lazy: 800ms warten, damit Login-Logic + auth-guard durch sind.
    setTimeout(function () { loadSidebarCounts(); }, 800);
    // Refresh on focus (max alle 30s, sonst nur cache)
    var lastRefresh = 0;
    window.addEventListener('focus', function () {
      var now = Date.now();
      if (now - lastRefresh < 30000) return;
      lastRefresh = now;
      loadSidebarCounts();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapSidebar);
  } else {
    bootstrapSidebar();
  }
})();

/* ============================================================
   PROVA Design System — Globale Helfer-Funktionen
   Wird von nav.js exportiert und allen Seiten zur Verfügung gestellt
   ============================================================ */

/* ── Toast (einheitlich, alle Seiten) ── */
window.showToast = window.zeigToast = function(msg, type, duration) {
  var old = document.getElementById('prova-toast');
  if (old) old.remove();
  var t = document.createElement('div');
  t.id = 'prova-toast';
  var colors = {
    success: { bg: '#0f2518', border: '#10b981', text: '#10b981' },
    error:   { bg: '#1f0a0a', border: '#ef4444', text: '#ef4444' },
    warning: { bg: '#1f1508', border: '#f59e0b', text: '#f59e0b' },
    info:    { bg: '#0a1220', border: '#4f8ef7', text: '#4f8ef7' },
  };
  var c = colors[type] || colors.info;
  t.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:99999',
    'background:' + c.bg, 'border:1.5px solid ' + c.border,
    'color:' + c.text, 'border-radius:10px', 'padding:12px 18px',
    'font-size:13px', 'font-weight:600', 'font-family:var(--font-ui,sans-serif)',
    'box-shadow:0 4px 20px rgba(0,0,0,.5)', 'max-width:380px',
    'opacity:0', 'transform:translateY(8px)', 'transition:all .2s ease',
    'display:flex', 'align-items:center', 'gap:10px'
  ].join(';');
  t.innerHTML = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() {
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
  });
  setTimeout(function() {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    setTimeout(function() { if (t.parentNode) t.remove(); }, 200);
  }, duration || 3000);
};

/* ── Banner (inline, opak, wichtig) ── */
window.showBanner = function(msg, color, href, btnLabel, duration) {
  var id = 'prova-banner-' + Date.now();
  var old = document.querySelector('.prova-banner');
  if (old) old.remove();
  var b = document.createElement('div');
  b.className = 'prova-banner';
  var col = color === 'green' ? '#10b981' : color === 'warning' ? '#f59e0b' : '#4f8ef7';
  var bg  = color === 'green' ? '#0a1f14' : color === 'warning' ? '#1f1508' : '#0a1220';
  b.style.cssText = [
    'position:fixed', 'top:64px', 'left:50%', 'transform:translateX(-50%)',
    'z-index:99998', 'background:' + bg, 'border:1.5px solid ' + col,
    'border-radius:12px', 'padding:12px 20px', 'display:flex',
    'align-items:center', 'gap:12px', 'box-shadow:0 8px 32px rgba(0,0,0,.7)',
    'max-width:90vw', 'min-width:280px', 'font-family:var(--font-ui,sans-serif)'
  ].join(';');
  b.innerHTML = '<div style="flex:1;font-size:13px;font-weight:600;color:' + col + ';">' + msg + '</div>'
    + (href ? '<a href="' + href + '" style="padding:6px 14px;border-radius:8px;background:' + col + ';color:#fff;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;">' + (btnLabel || '→') + '</a>' : '')
    + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,.4);font-size:18px;cursor:pointer;padding:0;line-height:1;">×</button>';
  document.body.appendChild(b);
  if (duration !== 0) setTimeout(function() { if (b.parentNode) b.remove(); }, duration || 5000);
  return b;
};

/* ── Skeleton Loading ── */
window.skeleton = function(n, height) {
  var h = height || 44;
  return Array(n || 3).fill(0).map(function() {
    return '<div style="height:' + h + 'px;border-radius:8px;background:var(--surface);animation:shimmer 1.5s infinite;background-size:200% 100%;background-image:linear-gradient(90deg,var(--surface) 25%,var(--surface2,#232a3a) 50%,var(--surface) 75%);margin-bottom:8px;"></div>';
  }).join('');
};

/* ── Empty State ── */
window.emptyState = function(icon, title, sub, btnLabel, btnHref, btnAction) {
  return '<div style="text-align:center;padding:48px 20px;">'
    + '<div style="font-size:36px;margin-bottom:12px;opacity:.5;">' + icon + '</div>'
    + '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">' + title + '</div>'
    + (sub ? '<div style="font-size:13px;color:var(--text3);margin-bottom:20px;">' + sub + '</div>' : '')
    + (btnLabel ? '<button onclick="' + (btnAction || 'window.location.href=\'' + (btnHref || '#') + '\'') + '" style="padding:10px 22px;border-radius:8px;background:var(--accent,#4f8ef7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);">' + btnLabel + '</button>' : '')
    + '</div>';
};

/* ── Confirm Dialog ── */
window.provaConfirm = function(msg, onYes) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px);';
  overlay.innerHTML = '<div style="background:var(--surface,#1c2130);border:1px solid var(--border2);border-radius:16px;padding:24px;max-width:380px;width:100%;font-family:var(--font-ui,sans-serif);">'
    + '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px;">Bestätigen</div>'
    + '<div style="font-size:13px;color:var(--text2);margin-bottom:20px;">' + msg + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;">'
    + '<button onclick="this.closest(\'div[style]\').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border2);background:transparent;color:var(--text2);font-size:13px;cursor:pointer;font-family:inherit;">Abbrechen</button>'
    + '<button id="_confirm_yes" style="padding:8px 16px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">Bestätigen</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#_confirm_yes').onclick = function() {
    overlay.remove();
    if (onYes) onYes();
  };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
};


/* ══════════════════════════════════════════════════════
   ⌘K COMMAND PALETTE — Global in allen PROVA-Seiten
   ══════════════════════════════════════════════════════ */
(function() {
  var overlay, input, results, visible = false;

  var AKTIONEN = [
    { label: '+ Neuer Fall', desc: 'Neues Gutachten anlegen', href: 'app.html', icon: '📋' },
    { label: 'Schnellrechnung', desc: 'Rechnung ohne Fall erstellen', href: 'schnelle-rechnung.html', icon: '⚡' },
    { label: '§407a ZPO Anzeige', desc: 'KI-Anzeige an Gericht (Pflicht vor Gerichtsgutachten)', href: 'zpo-anzeige.html', icon: '⚖️' },
    { label: 'Fälle / Archiv', desc: 'Alle Fälle anzeigen', href: 'archiv.html', icon: '📂' },
    { label: 'Zentrale / Dashboard', desc: 'Was steht heute an?', href: 'dashboard.html', icon: '⊞' },
    { label: 'Kalender', desc: 'Termine und Fristen', href: 'termine.html', icon: '📅' },
    { label: 'Normen-Datenbank', desc: 'DIN, VOB, WTA, ZPO', href: 'normen.html', icon: '📚' },
    { label: 'Textbausteine', desc: 'Wiederkehrende Formulierungen', href: 'textbausteine.html', icon: '📝' },
    { label: 'Positionen & Kosten', desc: 'BKI-Einheitspreise', href: 'positionen.html', icon: '🗂️' },
    { label: 'Rechnungen', desc: 'Honorarrechnungen', href: 'rechnungen.html', icon: '💶' },
    { label: 'JVEG-Rechner', desc: 'Honorar berechnen §7–§9 JVEG', href: 'jveg.html', icon: '⚖️' },
    { label: 'Kontakte', desc: 'Auftraggeber, Beteiligte', href: 'kontakte.html', icon: '👥' },
    { label: 'Briefvorlagen', desc: 'Korrespondenz erstellen', href: 'briefvorlagen.html', icon: '✉️' },
    { label: 'Baubegleitung', desc: 'Projekte, Begehungen, Mängel', href: 'baubegleitung.html', icon: '🏗️' },
    { label: 'Jahresbericht', desc: 'Statistiken und Auswertung', href: 'jahresbericht.html', icon: '📊' },
    { label: 'Einstellungen', desc: 'SV-Profil, Konto, Paket', href: 'einstellungen.html', icon: '⚙️' },
  ];

  function buildOverlay() {
    if (document.getElementById('prova-cmd')) return;
    var el = document.createElement('div');
    el.id = 'prova-cmd';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:none;align-items:flex-start;justify-content:center;padding-top:80px;backdrop-filter:blur(3px);';
    el.innerHTML = '<div style="background:var(--surface,#1c2130);border:1px solid var(--border2,rgba(255,255,255,.12));border-radius:14px;width:100%;max-width:560px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);font-family:var(--font-ui,sans-serif);">'
      + '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));">'
      + '<span style="font-size:16px;color:var(--text3);">🔍</span>'
      + '<input id="prova-cmd-input" type="text" placeholder="Navigation, Fälle, Normen suchen…" autocomplete="off" '
      + 'style="flex:1;background:transparent;border:none;outline:none;font-size:15px;color:var(--text,#eaecf4);font-family:inherit;">'
      + '<kbd style="font-size:10px;padding:2px 6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:5px;color:var(--text3);font-family:monospace;">ESC</kbd>'
      + '</div>'
      + '<div id="prova-cmd-results" style="max-height:340px;overflow-y:auto;padding:6px;"></div>'
      + '<div style="padding:8px 14px;border-top:1px solid var(--border,rgba(255,255,255,.07));display:flex;gap:12px;font-size:10px;color:var(--text3);">'
      + '<span>↑↓ navigieren</span><span>↵ öffnen</span><span>ESC schließen</span>'
      + '</div>'
      + '</div>';
    document.body.appendChild(el);
    overlay = el;
    input = document.getElementById('prova-cmd-input');
    results = document.getElementById('prova-cmd-results');
    el.addEventListener('click', function(e) { if(e.target === el) closePalette(); });
    input.addEventListener('input', function() { renderResults(input.value); });
    input.addEventListener('keydown', handleKey);
  }

  // Normen-Datenbank (inline für Nav-Suche — Top 120 Normen)
  var NORMEN_NAV = [
    {num:'DIN 4108-2',titel:'Wärmeschutz – Mindestwerte',bereich:'Feuchte'},
    {num:'DIN 4108-3',titel:'Klimabedingter Feuchteschutz',bereich:'Feuchte'},
    {num:'DIN 4108-7',titel:'Luftdichtheit von Gebäuden',bereich:'Feuchte'},
    {num:'DIN 18195',titel:'Bauwerksabdichtungen',bereich:'Abdichtung'},
    {num:'DIN 18533',titel:'Abdichtung erdberührender Bauteile',bereich:'Abdichtung'},
    {num:'DIN 18534',titel:'Abdichtung von Innenräumen',bereich:'Abdichtung'},
    {num:'DIN 68800-1',titel:'Holzschutz – Allgemeines',bereich:'Holz'},
    {num:'DIN 68800-2',titel:'Holzschutz – vorbeugende bauliche Maßnahmen',bereich:'Holz'},
    {num:'DIN 68800-3',titel:'Holzschutz – vorbeugend chemische Maßnahmen',bereich:'Holz'},
    {num:'DIN 68800-4',titel:'Holzschutz – bekämpfende Maßnahmen',bereich:'Holz'},
    {num:'DIN EN ISO 13788',titel:'Raumseitige Oberflächentemperatur / Tauwasser',bereich:'Feuchte'},
    {num:'WTA 6-1-01/D',titel:'Leitfaden für hygrothermische Simulationen',bereich:'Feuchte'},
    {num:'WTA 4-11-02/D',titel:'Messung der Feuchte in Baustoffen',bereich:'Feuchte'},
    {num:'DIN 52460',titel:'Fugen- und Rahmenabdichtungen',bereich:'Abdichtung'},
    {num:'VOB/B §13',titel:'Mängelansprüche',bereich:'VOB-Recht'},
    {num:'VOB/B §17',titel:'Sicherheitsleistungen',bereich:'VOB-Recht'},
    {num:'ZPO §404',titel:'Sachverständigenauswahl',bereich:'VOB-Recht'},
    {num:'ZPO §407',titel:'Pflicht zur Erstattung',bereich:'VOB-Recht'},
    {num:'ZPO §407a',titel:'Weitere Pflichten des Sachverständigen',bereich:'VOB-Recht'},
    {num:'ZPO §411',titel:'Schriftliches Gutachten',bereich:'VOB-Recht'},
    {num:'DIN EN 1995',titel:'Eurocode 5 – Bemessung Holzbauten',bereich:'Statik'},
    {num:'DIN EN 1992',titel:'Eurocode 2 – Bemessung Betonbauten',bereich:'Statik'},
    {num:'DIN EN 1990',titel:'Eurocode 0 – Grundlagen Tragwerksplanung',bereich:'Statik'},
    {num:'DIN 18560',titel:'Estriche im Bauwesen',bereich:'Estrich'},
    {num:'DIN 18157',titel:'Ausführung keramischer Bekleidungen',bereich:'Fliesen'},
    {num:'DIN 18202',titel:'Toleranzen im Hochbau',bereich:'Baumängel'},
    {num:'DIN 18203',titel:'Toleranzen – Vorgefertigte Teile',bereich:'Baumängel'},
    {num:'DIN 1045',titel:'Tragwerke aus Beton',bereich:'Statik'},
    {num:'DIN EN ISO 9972',titel:'Gebäudeluftdichtheit – Prüfverfahren Blower Door',bereich:'Feuchte'},
    {num:'DIN ISO 16000-1',titel:'Innenraumluft – Probenahmestrategie',bereich:'Feuchte'},
    {num:'VdS 3151',titel:'Wasserschadentrocknung',bereich:'Wasserschaden'},
    {num:'VdS 2298',titel:'Leitfaden Brandschutz',bereich:'Brand'},
    {num:'DIN 4102-4',titel:'Brandverhalten – Klassifizierung',bereich:'Brand'},
    {num:'DIN 18230',titel:'Baulicher Brandschutz im Industriebau',bereich:'Brand'},
    {num:'DIN EN 13501',titel:'Klassifizierung Brandverhalten Bauprodukte',bereich:'Brand'},
  ];

  function renderResults(q) {
    if (!results) return;
    q = (q||'').toLowerCase().trim();

    // Fälle aus Cache
    var faelle = [];
    try {
      var cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2')||'{}');
      faelle = (cache.data||[]).filter(function(r) {
        var f = r.fields||{};
        var text = [(f.Aktenzeichen||''),(f.Schadenart||''),(f.Auftraggeber_Name||''),(f.Adresse||'')].join(' ').toLowerCase();
        return !q || text.includes(q);
      }).slice(0, 5).map(function(r) {
        var f = r.fields||{};
        return { label: f.Aktenzeichen||'—', desc: (f.Schadenart||'')+(f.Adresse?' · '+f.Adresse:''), href: 'akte.html?id='+r.id, icon: '📂', type: 'fall' };
      });
    } catch(e) {}

    // Normen durchsuchen (wenn q vorhanden)
    var normenTreffer = [];
    if (q && q.length >= 2) {
      normenTreffer = NORMEN_NAV.filter(function(n) {
        return (n.num+' '+n.titel+' '+n.bereich).toLowerCase().includes(q);
      }).slice(0, 4).map(function(n) {
        return { label: n.num, desc: n.titel, href: 'normen.html?q='+encodeURIComponent(n.num), icon: '📚', type: 'norm' };
      });
    }

    // Kontakte durchsuchen (aus localStorage)
    var kontakteTreffer = [];
    if (q && q.length >= 2) {
      try {
        var kData = JSON.parse(localStorage.getItem('prova_kontakte') || '[]');
        kontakteTreffer = kData.filter(function(k) {
          var hay = [k.name||'', k.firma||'', k.email||'', k.ort||'', k.typ||'', k.ansprechpartner||''].join(' ').toLowerCase();
          return hay.includes(q);
        }).slice(0, 3).map(function(k) {
          var label = [k.name, k.firma].filter(Boolean).join(' · ') || k.email || '—';
          var desc = [k.typ, k.ort].filter(Boolean).join(' · ');
          return { label: label, desc: desc, href: 'kontakte.html?id='+(k.id||k.at_id||''), icon: '👤', type: 'kontakt' };
        });
      } catch(e) {}
    }

    // Aktionen filtern
    var aktionen = q ? AKTIONEN.filter(function(a) {
      return (a.label+' '+a.desc).toLowerCase().includes(q);
    }) : AKTIONEN;

    var all = [];
    if (faelle.length) {
      all.push({ type: 'header', label: 'Fälle' });
      all = all.concat(faelle);
    }
    if (normenTreffer.length) {
      all.push({ type: 'header', label: 'Normen' });
      all = all.concat(normenTreffer);
    }
    if (kontakteTreffer.length) {
      all.push({ type: 'header', label: 'Kontakte' });
      all = all.concat(kontakteTreffer);
    }
    if (aktionen.length) {
      all.push({ type: 'header', label: q ? 'Aktionen' : 'Navigation' });
      all = all.concat(aktionen);
    }
    if (!all.length) {
      results.innerHTML = '<div style="text-align:center;padding:24px;font-size:13px;color:var(--text3);">Keine Ergebnisse für "'+q+'"</div>';
      return;
    }

    var selected = 0;
    results.innerHTML = all.map(function(item, i) {
      if (item.type === 'header') {
        return '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text3);padding:8px 10px 4px;">' + item.label + '</div>';
      }
      var isFirst = (i === 0 || all[0].type === 'header') && i <= 1;
      var bgDefault = isFirst ? 'rgba(79,142,247,.1)' : 'transparent';
      return '<a href="'+item.href+'" data-cmd-item="'+i+'" '
        + 'style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;text-decoration:none;transition:background .1s;'
        + (isFirst ? 'background:rgba(79,142,247,.1);' : '')
        + '" onmouseover="this.style.background=\'rgba(255,255,255,.08)\'" '
        + 'onmouseout="this.style.background=\''+bgDefault+'\';" >'
        + '<span style="font-size:16px;width:22px;text-align:center;flex-shrink:0;">' + item.icon + '</span>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:13px;font-weight:600;color:var(--text,#eaecf4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.label + '</div>'
        + (item.desc ? '<div style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + item.desc + '</div>' : '')
        + '</div>'
        + (item.type === 'fall' ? '<span style="font-size:10px;color:var(--accent,#4f8ef7);font-weight:600;">Fall →</span>' : '')
        + '</a>';
    }).join('');
  }

  function handleKey(e) {
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'Enter') {
      var first = results.querySelector('a[data-cmd-item]');
      if (first) first.click();
    }
  }

  function openPalette() {
    if (!overlay) buildOverlay();
    overlay.style.display = 'flex';
    input.value = '';
    input.focus();
    renderResults('');
    visible = true;
  }

  function closePalette() {
    if (overlay) overlay.style.display = 'none';
    visible = false;
  }

  // Tastenkürzel: ⌘K oder Ctrl+K
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (visible) closePalette(); else openPalette();
    }
  });

  // Global verfügbar
  window.provaOpenCmdPalette = openPalette;
  window.provaCloseCmdPalette = closePalette;

  // Nach DOM-Bereit aufbauen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildOverlay);
  } else {
    buildOverlay();
  }
})();
/* ── END COMMAND PALETTE ── */

/* ══════════════════════════════════════════════════
   OFFLINE-MODUS INDIKATOR — erscheint wenn kein Netz
   ══════════════════════════════════════════════════ */
(function() {
  function updateOffline(offline) {
    var existing = document.getElementById('prova-offline-banner');
    if (offline) {
      if (existing) return;
      var b = document.createElement('div');
      b.id = 'prova-offline-banner';
      b.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99990;'
        + 'background:#1f1508;border:1.5px solid #f59e0b;border-radius:10px;padding:8px 16px;'
        + 'display:flex;align-items:center;gap:8px;font-family:var(--font-ui,sans-serif);'
        + 'box-shadow:0 4px 20px rgba(0,0,0,.5);white-space:nowrap;';
      b.innerHTML = '<span style="font-size:14px;">📵</span>'
        + '<span style="font-size:12px;font-weight:600;color:#f59e0b;">Offline — Änderungen werden lokal gespeichert</span>';
      document.body.appendChild(b);
    } else {
      if (existing) {
        existing.style.opacity = '0';
        existing.style.transition = 'opacity .4s';
        setTimeout(function() { if (existing.parentNode) existing.remove(); }, 400);
        // Kurze "Wieder online"-Meldung
        if (typeof showToast === 'function') showToast('✅ Wieder online', 'success', 2500);
      }
    }
  }

  window.addEventListener('online',  function() { updateOffline(false); });
  window.addEventListener('offline', function() { updateOffline(true); });

  // Sofort beim Laden prüfen
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    document.addEventListener('DOMContentLoaded', function() { updateOffline(true); });
  }
})();

/* ── SIDEBAR LOGOUT ── */
window.provaSbLogout = function() {
  if (!confirm('Wirklich abmelden?')) return;
  // Netlify Identity
  try {
    if (window.netlifyIdentity && netlifyIdentity.currentUser()) {
      netlifyIdentity.logout();
      return;
    }
  } catch(e) {}
  // Fallback: localStorage leeren + zu Login
  var keysToKeep = ['prova_theme','prova_sb_collapsed'];
  var keep = {};
  keysToKeep.forEach(function(k) {
    var v = localStorage.getItem(k);
    if (v !== null) keep[k] = v;
  });
  localStorage.clear();
  sessionStorage.clear();
  keysToKeep.forEach(function(k) {
    if (keep[k] !== undefined) localStorage.setItem(k, keep[k]);
  });
  window.location.href = 'app-login.html';
};

/* ── END OFFLINE INDIKATOR ── */

/* ═══════════════════════════════════════════════════════
   PROVA First-Visit Hints (Notion-Style)
   Zeigt kontextuelle Tipps beim ersten Besuch einer Seite.
   Wird nie mehr als 1x pro Seite angezeigt.
   ═══════════════════════════════════════════════════════ */
(function() {
  var HINTS = {
    'archiv.html': {
      target: '#suche',
      text: '💡 Tipp: Suche nach AZ, Auftraggeber oder Adresse. <kbd>⌘K</kbd> für alles.',
      pos: 'bottom', delay: 1500
    },
    'akte.html': {
      target: '#cockpit-cta',
      text: '💡 Dieser Button zeigt immer Ihren nächsten Schritt im Gutachten-Workflow.',
      pos: 'bottom', delay: 2000
    },
    'stellungnahme.html': {
      target: '#svTextA',
      text: '💡 Tippen Sie <kbd>/</kbd> für schnelle Einfügungen: Normen, Textbausteine, Phrasen.',
      pos: 'top', delay: 1800
    },
    'normen.html': {
      target: '#searchInput',
      text: '💡 Norm suchen → Klick auf "↙ In §6 einfügen" öffnet Stellungnahme direkt.',
      pos: 'bottom', delay: 1500
    },
    'jveg.html': {
      target: '#btn-jveg-weiter',
      text: '💡 Nach der Berechnung: "→ Rechnung erstellen" überträgt alle Werte automatisch.',
      pos: 'top', delay: 2000
    }
  };

  var page = window.location.pathname.split('/').pop() || 'dashboard.html';
  var hint = HINTS[page];
  if (!hint) return;

  var seenKey = 'prova_hint_seen_' + page;
  if (localStorage.getItem(seenKey)) return; // Bereits gesehen

  setTimeout(function() {
    var target = document.querySelector(hint.target);
    if (!target) return;

    var bubble = document.createElement('div');
    bubble.id = 'prova-hint-bubble';
    bubble.innerHTML = hint.text
      + '<button onclick="this.parentNode.remove();localStorage.setItem(\''+seenKey+'\',\'1\')" '
      + 'style="display:block;margin-top:8px;padding:4px 12px;border-radius:6px;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:11px;cursor:pointer;font-family:inherit;width:100%;">Verstanden ✓</button>';

    var rect = target.getBoundingClientRect();
    var top = hint.pos === 'top'
      ? (rect.top + window.scrollY - 100)
      : (rect.bottom + window.scrollY + 12);

    bubble.style.cssText = [
      'position:absolute',
      'left:' + Math.max(12, Math.min(rect.left, window.innerWidth - 280)) + 'px',
      'top:' + top + 'px',
      'z-index:88888',
      'background:linear-gradient(135deg,#1e3a5f,#1a2744)',
      'border:1px solid rgba(79,142,247,.4)',
      'border-radius:10px',
      'padding:12px 14px',
      'font-size:12px',
      'color:#e2e8f0',
      'line-height:1.5',
      'max-width:260px',
      'box-shadow:0 8px 24px rgba(0,0,0,.4)',
      'animation:fadeInUp .3s ease'
    ].join(';');

    document.body.appendChild(bubble);

    // Schließen nach 8 Sekunden
    setTimeout(function() {
      if (bubble.parentNode) {
        localStorage.setItem(seenKey, '1');
        bubble.style.opacity = '0';
        bubble.style.transition = 'opacity .5s';
        setTimeout(function(){ bubble.remove(); }, 500);
      }
    }, 8000);

  }, hint.delay);
})();
/* ── END FIRST-VISIT HINTS ── */

/* ═════════════════════════════════════════════════════
   PROVA Contextual Tooltips (Stripe-Style)
   Usage: <span class="prova-help" data-tip="Erklärung…">?</span>
   ═════════════════════════════════════════════════════ */
(function() {
  var tip = null;

  function showTip(text, el) {
    if (tip) tip.remove();
    tip = document.createElement('div');
    tip.id = 'prova-tooltip';
    tip.textContent = text;
    tip.style.cssText = 'position:fixed;z-index:99999;background:#1e293b;color:#e2e8f0;font-size:12px;line-height:1.5;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.1);max-width:240px;box-shadow:0 4px 16px rgba(0,0,0,.4);pointer-events:none;transition:opacity .15s;';
    document.body.appendChild(tip);
    var rect = el.getBoundingClientRect();
    var top = rect.bottom + 8;
    var left = Math.min(rect.left, window.innerWidth - 256);
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }

  function hideTip() {
    if (tip) { tip.remove(); tip = null; }
  }

  document.addEventListener('mouseover', function(e) {
    var el = e.target.closest('[data-tip]');
    if (el) showTip(el.dataset.tip, el);
  });
  document.addEventListener('mouseout', function(e) {
    if (e.target.closest('[data-tip]')) hideTip();
  });

  // Inject CSS für Help-Icon
  var style = document.createElement('style');
  style.textContent = '.prova-help{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:var(--text3);font-size:9px;font-weight:700;cursor:help;margin-left:5px;vertical-align:middle;flex-shrink:0;transition:all .15s;}.prova-help:hover{background:rgba(79,142,247,.2);border-color:rgba(79,142,247,.4);color:var(--accent,#4f8ef7);}@keyframes fadeInUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(style);
})();
/* ── END TOOLTIPS ── */

(function(){
  var _s = document.createElement('style');
  _s.textContent = [
    '.prova-status{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;}',
    '.prova-status::before{content:"";width:6px;height:6px;border-radius:50%;flex-shrink:0;}',
    '.prova-status.danger{background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);}',
    '.prova-status.danger::before{background:#ef4444;}',
    '.prova-status.warning{background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.2);}',
    '.prova-status.warning::before{background:#f59e0b;}',
    '.prova-status.success{background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.2);}',
    '.prova-status.success::before{background:#10b981;}',
    '.prova-status.info{background:rgba(79,142,247,.1);color:#4f8ef7;border:1px solid rgba(79,142,247,.2);}',
    '.prova-status.info::before{background:#4f8ef7;}',
    '.prova-status.neutral{background:rgba(255,255,255,.05);color:var(--text3);border:1px solid var(--border);}',
    '.prova-status.neutral::before{background:var(--text3);}',
    '.st-bearb{background:rgba(79,142,247,.1);color:#4f8ef7;}',
    '.st-entwurf{background:rgba(245,158,11,.1);color:#f59e0b;}',
    '.st-freig{background:rgba(16,185,129,.1);color:#10b981;}',
    '.st-export{background:rgba(16,185,129,.15);color:#059669;}',
    '.st-archiv{background:rgba(255,255,255,.05);color:var(--text3);}',
  ].join('');
  document.head.appendChild(_s);
})();

(function() {
  'use strict';

  /* ─── DEVICE DETECTION ─── */
  var isMobile  = window.matchMedia('(max-width: 768px)').matches;
  var isTablet  = window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches;
  var isIOS     = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  var isAndroid = /Android/.test(navigator.userAgent);

  // Globale Flags
  window.PROVA_DEVICE = { isMobile: isMobile, isTablet: isTablet, isIOS: isIOS, isAndroid: isAndroid };

  /* ─── iOS SAFE AREA ─── */
  if (isIOS) {
    document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 16px)');
  }

  /* ─── BOTTOM-NAV AUFBAUEN ─── */
  function buildBottomNav() {
    if (!isMobile) return;
    var page = window.location.pathname.split('/').pop() || 'dashboard.html';

    var navItems = [
      { icon: '⊞', label: 'Zentrale', href: 'dashboard.html' },
      { icon: '📂', label: 'Fälle',   href: 'archiv.html'   },
      { icon: '➕', label: 'Neu',     href: 'app.html', highlight: true },
      { icon: '📅', label: 'Termine', href: 'termine.html'  },
      { icon: '☰',  label: 'Menü',   href: '#menu'          },
    ];

    var nav = document.createElement('nav');
    nav.className = 'prova-bottom-nav';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', 'Hauptnavigation');

    var items = document.createElement('div');
    items.className = 'prova-bottom-nav-items';

    navItems.forEach(function(item) {
      var el = document.createElement(item.href === '#menu' ? 'button' : 'a');
      el.className = 'prova-bottom-nav-item' + (page === item.href ? ' active' : '');
      if (item.highlight) {
        el.style.cssText = 'background:var(--accent,#4f8ef7);color:#fff;border-radius:12px;padding:8px 16px;';
      }
      if (item.href !== '#menu') {
        el.href = item.href;
      } else {
        el.onclick = toggleMobileSidebar;
      }
      el.innerHTML = '<span>' + item.icon + '</span><span>' + item.label + '</span>';
      items.appendChild(el);
    });

    nav.appendChild(items);
    document.body.appendChild(nav);

    // S-SICHER UI-FIX1.3: Kein eigenes mobile-sidebar-overlay mehr anlegen.
    // Nutzt das bestehende #sb-overlay aus der ersten nav.js-IIFE (Zeile
    // 466-473). Damit nur eine einzige Overlay-Mechanik im DOM.
  }

  /* ─── SIDEBAR TOGGLE AUF MOBILE ─── */
  // S-SICHER UI-FIX1.3: toggle delegiert an die globalen Funktionen
  // window.openMobileSidebar / window.closeMobileSidebar aus der ersten
  // IIFE. Kein Duplikat-Overlay mehr.
  function toggleMobileSidebar() {
    var sb = document.getElementById('sidebar');
    if (!sb) return;
    if (sb.classList.contains('mobile-open')) {
      if (typeof window.closeMobileSidebar === 'function') window.closeMobileSidebar();
    } else {
      if (typeof window.openMobileSidebar === 'function') window.openMobileSidebar();
    }
  }
  window.toggleMobileSidebar = toggleMobileSidebar;

  /* ─── MOBILE OPTIMIERUNGEN ─── */
  function applyMobileOptimizations() {
    if (!isMobile) return;

    // Viewport-Height Fix für iOS (Safari 100vh Bug)
    function setVh() {
      var vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    setVh();
    window.addEventListener('resize', setVh);

    // Doppeltes Tap-Delay entfernen (iOS < 13)
    var lastTap = 0;
    document.addEventListener('touchend', function(e) {
      var now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    }, { passive: false });

    // Input-Zoom auf iOS verhindern
    document.querySelectorAll('input, select, textarea').forEach(function(el) {
      if (parseFloat(window.getComputedStyle(el).fontSize) < 16) {
        el.style.fontSize = '16px';
      }
    });
  }

  /* ─── PERFORMANCE: Passive Event Listeners ─── */
  function addPassiveListeners() {
    // Touch-Events als passive für schnelleres Scrolling
    window.addEventListener('touchstart', function(){}, { passive: true });
    window.addEventListener('touchmove', function(){}, { passive: true });
    window.addEventListener('wheel', function(){}, { passive: true });
  }

  /* ─── INIT ─── */
  document.addEventListener('DOMContentLoaded', function() {
    buildBottomNav();
    applyMobileOptimizations();
    addPassiveListeners();

    // Hamburger-Button in Topbar auf Mobile sichtbar machen
    var hamburger = document.getElementById('mobile-menu-btn');
    if (hamburger && isMobile) {
      hamburger.style.display = 'flex';
      hamburger.onclick = toggleMobileSidebar;
    }
  });

})();
/* ── END PROVA MOBILE SYSTEM ── */

/* ════════════════════════════════════════════════════════════
   PROVA Global Aliases — Namens-Mismatches reparieren
   nav.js wird auf jeder Seite geladen — idealer Ort für Aliases
════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  // einstellungen.html ruft wechsleSektion auf, Logic hat showSec
  if (!window.wechsleSektion && window.showSec) window.wechsleSektion = window.showSec;
  
  // Support-Modal: openSupportModal → toggleChat (support-chat.js)
  if (!window.openSupportModal) {
    window.openSupportModal = function() {
      var fab = document.getElementById('sup-fab');
      if (fab) fab.click();
      else {
        var modal = document.getElementById('support-modal');
        if (modal) modal.classList.add('open');
      }
    };
  }
});


/* ════════════════════════════════════════════════════════════════════════
   PROVA FAB-Loader — Sprint K1 (20.04.2026)
   Lädt fab.js dynamisch auf allen ARBEITSSEITEN
   NICHT auf: Ortstermin-Modus, Druck-Vorschauen, Login-Seiten, PDF-Templates
   ════════════════════════════════════════════════════════════════════════ */
(function() {
  var page = (window.location.pathname.split('/').pop() || '').toLowerCase();

  var skip = [
    'ortstermin-modus.html',
    'zpo-anzeige.html',
    'freigabe.html',
    'app-login.html',
    'app-register.html',
    'admin-login.html',
    'onboarding.html',
    'onboarding-welcome.html',
    'onboarding-schnellstart.html',
    '404.html',
    ''
  ];

  if (skip.indexOf(page) !== -1) return;
  if (page.indexOf('pdfmonkey-') === 0) return;
  if (page.indexOf('vorlage-') === 0) return;
  if (page.indexOf('checkliste-') === 0) return;

  if (!document.getElementById('prova-fab-script')) {
    var s = document.createElement('script');
    s.id  = 'prova-fab-script';
    s.src = 'fab.js';
    s.defer = true;
    document.head.appendChild(s);
  }
})();

/* ════════════════════════════════════════════════════════════════════════
   PROVA Widerrufs-Flow-Loader — Sprint K1 Fix (20.04.2026)
   Lädt widerrufs-flow.js dynamisch auf Arbeitsseiten wo Fälle angelegt
   werden können. Horcht auf Event 'prova:fall-erstellt'.
   Rechtsgrundlage: §312g BGB + §356 Abs. 3 BGB
   ════════════════════════════════════════════════════════════════════════ */
(function() {
  var page = (window.location.pathname.split('/').pop() || '').toLowerCase();

  // Nur auf Seiten wo Fälle angelegt/bearbeitet werden
  var allow = [
    'app.html',
    'akte.html',
    'dashboard.html',
    'archiv.html'
  ];

  if (allow.indexOf(page) === -1) return;

  if (!document.getElementById('prova-widerruf-script')) {
    var s = document.createElement('script');
    s.id  = 'prova-widerruf-script';
    s.src = 'widerrufs-flow.js';
    s.defer = true;
    document.head.appendChild(s);
  }
})();
