/**
 * PROVA Systems — dashboard-aufgaben.js
 * ══════════════════════════════════════════════════════════════════════
 * Category 3 Performance Fix — Dashboard Aufgaben + Fristen Modul (3/4)
 * Abhängigkeit: dashboard-core.js + dashboard-kpis.js
 * ══════════════════════════════════════════════════════════════════════
 */
'use strict';

var DASH = window.DASH = window.DASH || {};
function escHtml(s) { return String(s).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>'); }

/* ══ Profil-Vollständigkeit ══════════════════════════════════════════ */
DASH.checkProfil = function() {
  var vorname = localStorage.getItem('prova_sv_vorname') || '';
  var firma   = localStorage.getItem('prova_sv_firma')   || '';
  if (!vorname || !firma) {
    var feed = document.getElementById('aufgaben-feed');
    if (!feed) return;
    var seen = parseInt(localStorage.getItem('prova_profil_banner_seen') || '0');
    if (seen >= 3) return;
    localStorage.setItem('prova_profil_banner_seen', String(seen + 1));
    var banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;';
    banner.innerHTML = '<span style="font-size:20px;">👤</span>'
      + '<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:var(--warning,#f59e0b);">SV-Profil unvollständig</div>'
      + '<div style="font-size:11px;color:var(--text3);margin-top:2px;">Name und Büroangaben werden auf dem Gutachten-PDF angezeigt</div></div>'
      + '<a href="onboarding-schnellstart.html" style="padding:7px 14px;border-radius:8px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);color:#f59e0b;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">Jetzt ausfüllen</a>'
      + '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:0;">×</button>';
    feed.insertBefore(banner, feed.firstChild);
  }
};

/* ══ Aufgaben sofort aus Cache ═══════════════════════════════════════ */
DASH.renderAufgabenSofort = function() {
  var paket         = DASH.paket || localStorage.getItem('prova_paket') || 'Solo';
  var maxKontingent = DASH.maxKontingent || (paket==='Solo' ? 25 : paket==='Team' ? 75 : 5);
  var feed          = document.getElementById('aufgaben-feed');
  var skel          = document.getElementById('aufgaben-skeleton');
  if (!feed) return;

  var cache = [];
  try { cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}').data || []; } catch(e) {}

  if (cache.length === 0) {
    if (skel) skel.remove();
    feed.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:28px 20px;text-align:center;">'
      + '<div style="font-size:32px;margin-bottom:12px;">🏗️</div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:8px;">Noch kein Fall angelegt</div>'
      + '<div style="font-size:13px;color:var(--text3);margin-bottom:20px;">Erstellen Sie Ihren ersten Fall — PROVA führt Sie durch den gesamten Workflow.</div>'
      + '<button onclick="window.location.href=\'app.html\'" style="padding:10px 22px;border-radius:8px;background:var(--accent,#4f8ef7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--font-ui,sans-serif);">+ Ersten Fall anlegen</button>'
      + '</div>';
    return;
  }

  var offen = cache.filter(function(r) {
    var s = (r.fields && r.fields.Status) || '';
    return s !== 'Archiviert' && s !== 'Freigegeben' && s !== 'Exportiert';
  });

  /* Cache-KPIs sofort zeigen */
  var kpiAktiv = document.getElementById('kpi-aktiv');
  if (kpiAktiv) kpiAktiv.textContent = offen.length;
  var kpiK = document.getElementById('kpi-kontingent');
  if (kpiK) kpiK.textContent = cache.length + '/' + maxKontingent;

  /* Letzter Fall im Schnellzugriff */
  var letzterFallEl = document.getElementById('letzter-fall-link');
  if (letzterFallEl && cache.length > 0) {
    var letzter = cache.slice().sort(function(a,b) {
      return new Date(b.fields.Timestamp||0) - new Date(a.fields.Timestamp||0);
    })[0];
    var lf   = letzter.fields || {};
    var lfAz = lf.Aktenzeichen || '—';
    var lfSa = lf.Schadensart || '';
    letzterFallEl.href = 'akte.html?id=' + letzter.id;
    letzterFallEl.innerHTML = '<span style="font-size:14px;">📂</span>'
      + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
      + lfAz + (lfSa ? ' · ' + lfSa.replace('schaden','').replace('befall','').trim() : '')
      + '</span><span style="font-size:10px;color:var(--accent);font-weight:700;flex-shrink:0;">→</span>';
    letzterFallEl.style.display = 'flex';
  }

  if (skel) skel.remove();

  if (offen.length === 0) {
    feed.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px 20px;text-align:center;">'
      + '<div style="font-size:28px;margin-bottom:10px;">✨</div>'
      + '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">Alle Fälle abgeschlossen</div>'
      + '<div style="font-size:12px;color:var(--text3);">Gute Arbeit! Neuen Fall anlegen?</div></div>';
    return;
  }

  /* Kontextuell: nächster Schritt je Fall */
  feed.innerHTML = offen.slice(0, 5).map(function(r) {
    var f   = r.fields || {};
    var az  = f.Aktenzeichen || r.id.slice(-6).toUpperCase() || '—';
    var sa  = f.Schadensart  || f.schadenart || 'Schadenfall';
    var ag  = f.Auftraggeber_Name || f.auftraggeber_name || '';
    var adr = f.Schaden_Strasse || '';
    var ort = f.Ort || '';
    var loc = [adr, ort].filter(Boolean).join(', ');
    var hat_diktat = !!(f.KI_Entwurf && f.KI_Entwurf.length > 50);
    var hat_stell  = !!(f.Stellungnahme_Text && f.Stellungnahme_Text.length > 30);
    var explPhase  = parseInt(f.Phase || 0);
    if (explPhase >= 4) hat_stell = true;
    if (explPhase >= 2) hat_diktat = hat_diktat || explPhase >= 2;
    var ns;
    if (!hat_diktat) {
      ns = {icon:'🎤', label:'Diktat aufnehmen',          col:'#4f8ef7', bg:'rgba(79,142,247,.08)',  bc:'rgba(79,142,247,.2)',  href:'app.html'};
    } else if (!hat_stell) {
      ns = {icon:'⚖️', label:'§6 Fachurteil schreiben',   col:'#f59e0b', bg:'rgba(245,158,11,.08)', bc:'rgba(245,158,11,.2)', href:'stellungnahme.html?az='+encodeURIComponent(az)};
    } else {
      ns = {icon:'✅', label:'Freigeben & PDF erstellen', col:'#10b981', bg:'rgba(16,185,129,.08)', bc:'rgba(16,185,129,.2)', href:'freigabe.html?az='+encodeURIComponent(az)};
    }
    return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:'+ns.bg+';border:1px solid '+ns.bc+';border-radius:12px;cursor:pointer;transition:all .15s;" onclick="window._goFall(this)" data-rid="'+r.id+'" onmouseover="this.style.opacity=.85" onmouseout="this.style.opacity=1">'
      + '<span style="font-size:22px;">'+ns.icon+'</span>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">'
      + '<span style="font-family:var(--font-mono);font-size:11px;color:var(--accent);">'+escHtml(az)+'</span>'
      + '<span style="color:var(--text3);">·</span>'
      + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escHtml(sa)+'</span>'
      + (ag ? '<span style="font-size:10px;font-weight:500;color:var(--text3);padding:1px 6px;background:rgba(255,255,255,.05);border-radius:4px;flex-shrink:0;">'+escHtml(ag)+'</span>' : '')
      + '</div>'
      + (loc ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;">📍 '+escHtml(loc)+'</div>' : '')
      + '<div style="font-size:11px;font-weight:700;color:'+ns.col+';margin-top:3px;">'+ns.label+'</div>'
      + '</div>'
      + '<a href="'+ns.href+'" onclick="event.stopPropagation()" style="padding:7px 14px;border-radius:8px;border:none;background:'+ns.col+';color:#fff;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">→ Jetzt</a>'
      + '</div>';
  }).join('');
};

/* ══ Fristen Mini-Widget ═════════════════════════════════════════════ */
DASH.renderFristenMini = function() {
  var container = document.getElementById('fristen-mini');
  if (!container) return;

  var termine = [];
  try { termine = JSON.parse(localStorage.getItem('prova_termine_cache') || '[]'); } catch(e) {}

  /* Fristdaten auch aus Archiv-Cache (Gutachten-Fristen) */
  try {
    var cache = JSON.parse(localStorage.getItem('prova_archiv_cache_v2') || '{}');
    (cache.data || []).forEach(function(r) {
      var f = r.fields || {};
      if (f.Fristdatum) {
        termine.push({
          id: r.id + '_frist',
          fields: {
            termin_typ:   'Frist',
            termin_datum: f.Fristdatum,
            aktenzeichen: f.Aktenzeichen || '',
            notiz:        'Gutachten-Frist: ' + (f.Aktenzeichen || '—'),
            src:          'fall'
          }
        });
      }
    });
  } catch(e) {}

  var heute = new Date();
  var bald  = termine.filter(function(r) {
    var f = r.fields || {};
    if (!f.termin_datum) return false;
    var diff = Math.floor((new Date(f.termin_datum) - heute) / (1000*60*60*24));
    return diff >= -1 && diff <= 14;
  }).sort(function(a,b) {
    return new Date(a.fields.termin_datum) - new Date(b.fields.termin_datum);
  }).slice(0, 5);

  if (!bald.length) {
    container.innerHTML = '<div style="font-size:11px;color:var(--text3);text-align:center;padding:8px 0;">Keine Fristen in den nächsten 14 Tagen</div>';
    return;
  }

  container.innerHTML = bald.map(function(r) {
    var f    = r.fields || {};
    var diff = Math.floor((new Date(f.termin_datum) - heute) / (1000*60*60*24));
    var col  = diff < 0 ? '#ef4444' : diff <= 3 ? '#f59e0b' : '#10b981';
    var label = diff < 0 ? 'Überfällig' : diff === 0 ? 'Heute' : 'in ' + diff + 'T';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);">'
      + '<div style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;">'+escHtml(f.titel||f.termin_typ||'Termin')+'</div>'
      + '<div style="font-size:10px;font-weight:700;color:'+col+';flex-shrink:0;margin-left:8px;">'+label+'</div>'
      + '</div>';
  }).join('');

  var fristenKPI = document.getElementById('kpi-heute');
  if (fristenKPI) fristenKPI.textContent = bald.filter(function(r) {
    return Math.floor((new Date(r.fields.termin_datum) - heute) / (1000*60*60*24)) <= 7;
  }).length;
};

/* Navigation helper — kompatibel mit bisherigem window._goFall */
window._goFall = window._goFall || function(el) {
  var rid = el.dataset.rid;
  if (rid) window.location.href = 'akte.html?id=' + rid;
};

console.log('[DashAufgaben] Geladen ✓');