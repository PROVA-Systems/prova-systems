/**
 * PROVA Systems — dashboard-kpis.js
 * ══════════════════════════════════════════════════════════════════════
 * Category 3 Performance Fix — Dashboard KPI + Feed Modul (2/4)
 * Abhängigkeit: dashboard-core.js muss vorher geladen sein.
 * ══════════════════════════════════════════════════════════════════════
 */
'use strict';

/* ══ Lokale Shortcuts ════════════════════════════════════════════════ */
var DASH = window.DASH = window.DASH || {};

/* ══ HTML Escape ════════════════════════════════════════════════════ */
function escHtml(s) { return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>'); }
// Rückwärtskompatibilität
window.escHtml = escHtml;

/* ══ KPI-Karten rendern ═════════════════════════════════════════════ */
DASH.renderKPIs = function(faelle, termine, rechnungen) {
  var heute     = new Date().toDateString();
  var thisMonth = new Date().toISOString().slice(0,7);
  var paket     = DASH.paket;
  var maxK      = DASH.maxKontingent;

  /* Aktive Fälle */
  var aktiv = faelle.filter(function(r) {
    var s = r.fields.Status || '';
    return s === 'In Bearbeitung' || s === 'Entwurf' || s === 'Korrektur_angefordert';
  }).length;
  var kpiA = document.getElementById('kpi-aktiv');
  if (kpiA) {
    kpiA.textContent = String(aktiv || 0);
    if (aktiv >= 5) kpiA.classList.add('warn');
    if (aktiv > 0) { var bd = document.getElementById('sb-badge-faelle'); if (bd) { bd.style.display = 'inline-block'; bd.textContent = aktiv; } }
  }
  var kpiASub = document.getElementById('kpi-aktiv-sub');
  if (kpiASub) kpiASub.textContent = aktiv === 1 ? '1 Fall in Bearbeitung' : aktiv + ' Fälle in Bearbeitung';

  /* Heute fällig */
  var heuteAnz = termine.filter(function(r) {
    var d = r.fields.termin_datum; if (!d) return false;
    try { return new Date(d).toDateString() === heute; } catch(e) { return false; }
  }).length;
  var kpiH = document.getElementById('kpi-heute');
  if (kpiH) {
    kpiH.textContent = String(heuteAnz || 0);
    if (heuteAnz > 0) { kpiH.classList.add('warn'); var bd2 = document.getElementById('sb-badge-termine'); if (bd2) { bd2.style.display = 'inline-block'; bd2.textContent = heuteAnz; } }
  }

  /* Offene Rechnungen */
  var offene = rechnungen.filter(function(r) {
    var s = r.fields.Status || r.fields.status || '';
    return s === 'Offen' || s === 'Überfällig';
  });
  var offenBetrag = offene.reduce(function(s, r) { return s + (parseFloat(r.fields.betrag_brutto || r.fields.Betrag || 0) || 0); }, 0);
  var hatUeber    = offene.some(function(r) { return (r.fields.Status || r.fields.status || '') === 'Überfällig'; });
  var kpiR        = document.getElementById('kpi-rechnungen');
  if (kpiR) {
    if (offenBetrag > 0) {
      kpiR.textContent = offenBetrag.toLocaleString('de-DE', {style:'currency', currency:'EUR', maximumFractionDigits: 0});
      if (hatUeber) kpiR.classList.add('danger');
      var bd3 = document.getElementById('sb-badge-rechnungen'); if (bd3) { bd3.style.display = 'inline-block'; bd3.textContent = offene.length; }
    } else { kpiR.textContent = '0 €'; }
  }
  var kpiRSub = document.getElementById('kpi-rechnungen-sub');
  if (kpiRSub) kpiRSub.textContent = offene.length > 0 ? offene.length + ' Rechnung' + (offene.length !== 1 ? 'en' : '') + ' offen' : 'Alles beglichen';

  /* Kontingent */
  var diesesMonat = faelle.filter(function(r) {
    var ts = r.fields.Timestamp || r.createdTime || '';
    return ts.startsWith(thisMonth);
  }).length;
  var kpiK = document.getElementById('kpi-kontingent');
  if (kpiK) kpiK.textContent = paket === 'Team' ? '∞' : diesesMonat + ' / ' + maxK;
  var prog = document.getElementById('kpi-progress');
  if (prog && paket !== 'Team') {
    var pct = maxK > 0 ? Math.min(100, Math.round(diesesMonat / maxK * 100)) : 0;
    setTimeout(function() { prog.style.width = pct + '%'; }, 100);
    if (pct >= 90) prog.style.background = 'var(--danger)';
    else if (pct >= 70) prog.style.background = 'var(--warning)';
    var kpiKSub = kpiK.nextElementSibling;
    if (kpiKSub) kpiKSub.textContent = pct + '% des Monatskontingents genutzt';
  }

  /* Greeting-Sub: Kontext-Satz */
  var greetSub = document.getElementById('greeting-sub');
  if (greetSub) {
    var parts = [];
    if (aktiv > 0)       parts.push(aktiv + ' Fall' + (aktiv !== 1 ? 'fälle' : '') + ' aktiv');
    if (heuteAnz > 0)    parts.push(heuteAnz + ' Termin' + (heuteAnz !== 1 ? 'e' : '') + ' heute');
    if (offene.length > 0) parts.push(offene.length + ' Rechnung' + (offene.length !== 1 ? 'en' : '') + ' offen');
    greetSub.textContent = parts.length > 0 ? parts.join(' · ') : 'Alles im grünen Bereich ✓';
  }

  /* KPI-Trends (Vorwochenvergleich) */
  try {
    var today   = new Date().toISOString().split('T')[0];
    var hist    = JSON.parse(localStorage.getItem('prova_kpi_history') || '{}');
    hist[today] = {aktiv: aktiv, diesesMonat: diesesMonat};
    var keys = Object.keys(hist).sort();
    if (keys.length > 30) delete hist[keys[0]];
    localStorage.setItem('prova_kpi_history', JSON.stringify(hist));
    var vwDate = new Date(); vwDate.setDate(vwDate.getDate() - 7);
    var vwData = hist[vwDate.toISOString().split('T')[0]];
    if (vwData) {
      var delta = aktiv - (vwData.aktiv || 0);
      var kpiASub2 = document.getElementById('kpi-aktiv-sub');
      if (kpiASub2 && delta !== 0) {
        var arrow = delta > 0 ? '↑' : '↓';
        var col   = delta > 0 ? '#f59e0b' : '#10b981';
        kpiASub2.innerHTML = kpiASub2.textContent + ' <span style="color:' + col + ';font-size:10px;">' + arrow + ' ' + Math.abs(delta) + ' vs. Vorwoche</span>';
      }
    }
  } catch(e) {}

  return {aktiv: aktiv, heuteAnz: heuteAnz, offene: offene, hatUeber: hatUeber, diesesMonat: diesesMonat};
};

/* ══ Feed rendern ═══════════════════════════════════════════════════ */
DASH.renderFeed = function(faelle, termine, rechnungen, stats) {
  var feed = document.getElementById('aufgaben-feed');
  if (!feed) return;
  var actions = [];

  /* 1. Kritische Fristen heute */
  termine.forEach(function(r) {
    var f = r.fields;
    var d = f.termin_datum; if (!d) return;
    var typ = f.termin_typ || 'Termin';
    var istKritisch = typ === 'Frist' || typ === 'Gerichtstermin' || typ === 'Abgabe';
    try {
      var dt   = new Date(d);
      var diff = Math.floor((dt - new Date()) / (1000*60*60*24));
      if (diff <= 1 && diff >= -1) {
        actions.push({
          prio: 'red', sort: 0,
          title: (istKritisch ? '⚠️ ' : '') + typ + ': ' + (f.titel || f.aktenzeichen || 'Termin'),
          meta:  dt.toLocaleDateString('de-DE', {weekday:'short', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) + (f.objekt_adresse ? ' · ' + f.objekt_adresse : ''),
          badge: 'frist', badge_text: diff < 0 ? 'Überfällig' : diff === 0 ? 'Heute' : 'Morgen',
          href: 'termine.html'
        });
      }
    } catch(e) {}
  });

  /* 2. Fälle die Freigabe warten */
  faelle.filter(function(r) { return r.fields.Status === 'Entwurf'; }).slice(0, 3).forEach(function(r) {
    var f = r.fields;
    actions.push({
      prio: 'warn', sort: 1,
      title: (f.Aktenzeichen || 'Fall') + ' — ' + (f.Schadensart || f.schadenart || 'Schadenfall'),
      meta:  (f.Schaden_Strasse ? f.Schaden_Strasse + ', ' : '') + (f.Ort || '') + (f.Timestamp ? ' · ' + new Date(f.Timestamp).toLocaleDateString('de-DE') : ''),
      badge: 'offen', badge_text: 'Freigabe ausstehend',
      href: 'freigabe.html'
    });
  });

  /* 3. Fälle in Bearbeitung (>3 Tage ohne Aktivität) */
  var dreiTageAgo = Date.now() - 3*24*60*60*1000;
  faelle.filter(function(r) {
    if (r.fields.Status !== 'In Bearbeitung') return false;
    return new Date(r.fields.Timestamp || r.createdTime || 0).getTime() < dreiTageAgo;
  }).slice(0, 2).forEach(function(r) {
    var f = r.fields;
    actions.push({
      prio: 'grey', sort: 2,
      title: (f.Aktenzeichen || 'Fall') + ' — ' + (f.Schadensart || f.schadenart || 'Schadenfall'),
      meta:  (f.Schaden_Strasse || (f.Ort ? f.Ort : '')) + ' · In Bearbeitung',
      badge: 'offen', badge_text: 'In Bearbeitung',
      href: 'archiv.html'
    });
  });

  /* 4. Überfällige Rechnungen */
  rechnungen.filter(function(r) {
    return (r.fields.Status || r.fields.status || '') === 'Überfällig';
  }).slice(0, 2).forEach(function(r) {
    var f = r.fields;
    actions.push({
      prio: 'red', sort: 0,
      title: (f.Rechnungsnummer || f.re_nr || 'Rechnung') + ' — ' + (f.Auftraggeber_Name || f.auftraggeber || 'Auftraggeber'),
      meta:  'Betrag: ' + ((parseFloat(f.betrag_brutto || f.Betrag || 0) || 0).toLocaleString('de-DE', {minimumFractionDigits: 2})) + ' € · Überfällig',
      badge: 'frist', badge_text: 'Überfällig',
      href: 'rechnungen.html'
    });
  });

  actions.sort(function(a, b) { return (a.sort || 9) - (b.sort || 9); });

  if (actions.length === 0) {
    var archivCache = [];
    try { archivCache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}').data || []; } catch(e) {}
    var offeneF = archivCache.filter(function(r) {
      var s = (r.fields && r.fields.Status) || '';
      return s !== 'Archiviert' && s !== 'Freigegeben' && s !== 'Exportiert';
    });
    if (offeneF.length > 0) {
      feed.innerHTML = '<div style="padding:0;">' + offeneF.slice(0, 4).map(function(r) {
        var f  = r.fields || {};
        var az = f.Aktenzeichen || '—';
        var sa = f.Schadensart  || 'Schadenfall';
        var ns = !f.KI_Entwurf
          ? {icon:'🎤', label:'Diktat aufnehmen',          col:'#4f8ef7', href:'app.html',                                prio:'blue'}
          : !(f.Stellungnahme_Text && f.Stellungnahme_Text.length > 30)
          ? {icon:'⚖️', label:'§6 Fachurteil schreiben',   col:'#f59e0b', href:'stellungnahme.html?az='+encodeURIComponent(az), prio:'warn'}
          : f.Status !== 'Freigegeben'
          ? {icon:'✅', label:'Freigeben & PDF erstellen', col:'#10b981', href:'freigabe.html?az='+encodeURIComponent(az),   prio:'green'}
          : {icon:'💶', label:'Rechnung erstellen',        col:'#8b5cf6', href:'rechnungen.html?az='+encodeURIComponent(az),  prio:'purple'};
        var bcol = {blue:'rgba(79,142,247,.12)', warn:'rgba(245,158,11,.1)', green:'rgba(16,185,129,.1)', purple:'rgba(139,92,246,.1)'}[ns.prio] || 'rgba(255,255,255,.04)';
        var bord = {blue:'rgba(79,142,247,.25)', warn:'rgba(245,158,11,.2)', green:'rgba(16,185,129,.2)', purple:'rgba(139,92,246,.2)'}[ns.prio] || 'rgba(255,255,255,.08)';
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;margin:6px 12px;background:'+bcol+';border:1px solid '+bord+';border-radius:10px;cursor:pointer;" data-href="akte.html?id='+r.id+'" onclick="window.location.href=this.dataset.href">'
          + '<span style="font-size:18px;">'+ns.icon+'</span>'
          + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escHtml(az)+' · '+escHtml(sa)+'</div>'
          + '<div style="font-size:11px;color:'+ns.col+';margin-top:2px;font-weight:600;">'+ns.label+'</div></div>'
          + '<a href="'+ns.href+'" onclick="event.stopPropagation()" style="padding:6px 14px;border-radius:8px;border:none;background:'+ns.col+';color:#fff;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">→ Jetzt</a></div>';
      }).join('') + '</div>';
    } else {
      feed.innerHTML = '<div class="feed-empty"><div class="feed-empty-icon">✨</div><p>Alle Fälle auf dem neuesten Stand — gute Arbeit!</p></div>';
    }
  } else {
    feed.innerHTML = actions.map(function(a) {
      var bcol = a.prio==='red' ? 'rgba(239,68,68,.08)' : a.prio==='warn' ? 'rgba(245,158,11,.08)' : 'rgba(255,255,255,.03)';
      var bord = a.prio==='red' ? 'rgba(239,68,68,.2)'  : a.prio==='warn' ? 'rgba(245,158,11,.15)' : 'var(--border)';
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;margin:6px 12px;background:'+bcol+';border:1px solid '+bord+';border-radius:10px;cursor:pointer;" data-href="'+(a.href||'archiv.html')+'" onclick="window.location.href=this.dataset.href">'
        + '<div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:'+(a.prio==='red'?'#ef4444':a.prio==='warn'?'#f59e0b':'#6b7280')+';"></div>'
        + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+escHtml(a.title)+'</div>'
        + '<div style="font-size:11px;color:var(--text3);margin-top:2px;">'+escHtml(a.meta)+'</div></div>'
        + '<span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:10px;white-space:nowrap;background:'+(a.prio==='red'?'rgba(239,68,68,.15)':a.prio==='warn'?'rgba(245,158,11,.12)':'rgba(255,255,255,.08)')+';color:'+(a.prio==='red'?'#ef4444':a.prio==='warn'?'#f59e0b':'var(--text2)')+';border:1px solid '+(a.prio==='red'?'rgba(239,68,68,.25)':'var(--border)')+';margin-left:4px;">'+a.badge_text+'</span>'
        + '</div>';
    }).join('');
  }

  /* Briefing Banner */
  var bt   = document.getElementById('briefing-text');
  var btags = document.getElementById('briefing-tags');
  var summary = []; var tagHtml = '';
  if (stats.aktiv > 0)     { summary.push('<strong>'+stats.aktiv+' aktive Fälle</strong>'); tagHtml += '<span class="briefing-tag info">📁 '+stats.aktiv+' aktiv</span>'; }
  if (stats.heuteAnz > 0)  { summary.push('<strong>'+stats.heuteAnz+' Termin'+(stats.heuteAnz!==1?'e':'')+' heute</strong>'); tagHtml += '<span class="briefing-tag warn">📅 '+stats.heuteAnz+' heute</span>'; }
  if (stats.hatUeber)      tagHtml += '<span class="briefing-tag red">⚠ Überfällig</span>';
  else if (stats.offene && stats.offene.length > 0) tagHtml += '<span class="briefing-tag warn">💶 '+stats.offene.length+' offen</span>';
  if (!tagHtml) tagHtml = '<span class="briefing-tag ok">✓ Alles im Griff</span>';
  var anrede = localStorage.getItem('prova_sv_anrede') || 'Sie';
  if (bt) {
    if (summary.length > 0) bt.innerHTML = '<strong>Überblick:</strong> ' + summary.join(' · ') + '.';
    else bt.innerHTML = '<strong>Heute keine dringenden Aktionen.</strong> ' + (anrede==='Du' ? 'Nutze die Zeit für neue Fälle.' : 'Nutzen Sie die Zeit für neue Fälle.');
  }
  if (btags) btags.innerHTML = tagHtml;
};

/* ══ Zuletzt bearbeitete Fälle ══════════════════════════════════════ */
DASH.renderRecent = function(faelle) {
  var list = document.getElementById('recent-list');
  if (!list) return;
  var recent = faelle.slice(0, 5);
  if (recent.length === 0) {
    list.innerHTML = '<div style="padding:20px;text-align:center;font-size:12px;color:var(--text3);">Noch keine Fälle angelegt.<br><a href="app.html" style="color:var(--accent);margin-top:6px;display:inline-block;">Ersten Fall erstellen →</a></div>';
    return;
  }
  list.innerHTML = recent.map(function(r) {
    var f          = r.fields;
    var status     = f.Status || 'In Bearbeitung';
    var statusClass = status==='Freigegeben'||status==='Exportiert' ? 'status-done' : status==='Entwurf' ? 'status-frei' : 'status-bearb';
    var az         = (f.Aktenzeichen || r.id.slice(-6).toUpperCase()).slice(0, 8);
    var addr       = f.Schaden_Strasse || [f.Schaden_Strasse, f.Ort].filter(Boolean).join(', ') || '—';
    var datum      = f.Timestamp ? new Date(f.Timestamp).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}) : '';
    return '<div class="recent-item" onclick="window.location.href=\'archiv.html\'">'
      + '<div class="recent-az">'+az+'</div>'
      + '<div class="recent-info"><div class="recent-name">'+(f.Schadensart||f.schadenart||'Schadenfall')+(datum?' <span style="color:var(--text3);font-weight:400;">'+datum+'</span>':'')+'</div>'
      + '<div class="recent-meta">'+addr+'</div></div>'
      + '<span class="recent-status '+statusClass+'">'+status+'</span>'
      + '</div>';
  }).join('');
};

console.log('[DashKPIs] Geladen ✓');