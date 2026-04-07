/* ════════════════════════════════════════════════════════════
   PROVA baubegleitung-logic.js
   Baubegleitung — Begehungen, Protokolle, Airtable
   Extrahiert aus baubegleitung.html
════════════════════════════════════════════════════════════ */

document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal('modal-projekt');closeModal('modal-begehung');}});
function logout(){localStorage.removeItem('prova_user');localStorage.removeItem('prova_sv_email');window.location.href='app-login.html';}
(function(){
  var u=localStorage.getItem('prova_user');
  if(!u){window.location.href='app-login.html';return;}
  var p=localStorage.getItem('prova_paket')||'Solo';
  var c={Solo:'#4f8ef7',Team:'#a78bfa',Starter:'#4f8ef7',Pro:'#4f8ef7',Enterprise:'#a78bfa'}[p]||'#4f8ef7';
  var el=document.getElementById('topbar-paket-badge');
  if(el){el.textContent=p;el.style.cssText='font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;letter-spacing:.04em;background:'+c+'18;color:'+c+';border:1px solid '+c+'33;';}
  window.PROVA=window.PROVA||{};PROVA.paket=p;PROVA.isPro=['Solo','Team'].includes(p);PROVA.isEnterprise=p==='Team';
})();

/* ─────────────────────────────────────────── */

// ============================================================
// BAUBEGLEITUNG — DATENMODELL & STORAGE
// ============================================================
const BB_KEY = 'prova_baubegleitung';

function ladeDaten() {
  try { return JSON.parse(localStorage.getItem(BB_KEY) || '{"projekte":[]}'); }
  catch(e) { return {projekte:[]}; }
}
function speichereDaten(data) {
  localStorage.setItem(BB_KEY, JSON.stringify(data));
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}

// ── State ──
var _data = ladeDaten();
var _aktivProjektId = null;
var _editProjektId = null;

// ============================================================
// RENDER PROJEKTLISTE
// ============================================================
function renderProjektliste() {
  var container = document.getElementById('proj-list');
  var suche = (document.getElementById('proj-suche').value || '').toLowerCase();
  var liste = _data.projekte.filter(function(p){
    return !suche || p.name.toLowerCase().includes(suche) || (p.adresse||'').toLowerCase().includes(suche);
  });
  document.getElementById('proj-count').textContent = _data.projekte.length;

  if (!liste.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏗</div><div class="empty-title">Keine Projekte</div><div class="empty-sub">+ Neues Projekt anlegen</div></div>';
    return;
  }
  container.innerHTML = '';
  liste.forEach(function(p) {
    var div = document.createElement('div');
    div.className = 'proj-card' + (p.id === _aktivProjektId ? ' active-proj' : '');
    div.onclick = function(){ ladeProduktDetail(p.id); };
    var statusKlasse = p.status === 'Abgeschlossen' ? 'status-abgeschlossen' : 'status-aktiv';
    var statusText = p.status || 'Aktiv';
    var anz = (p.begehungen || []).length;
    div.innerHTML =
      '<div style="flex:1;min-width:0;">' +
        '<div class="proj-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(p.name) + '</div>' +
        '<div class="proj-meta">' + escHtml(p.auftraggeber||'—') + ' · ' + escHtml(p.typ||'') + '</div>' +
      '</div>' +
      '<div style="text-align:right;flex-shrink:0;">' +
        '<div class="proj-status ' + statusKlasse + '">' + statusText + '</div>' +
        '<div class="proj-begehungen" style="margin-top:4px;">' + anz + ' Begehung' + (anz===1?'':'en') + '</div>' +
      '</div>';
    container.appendChild(div);
  });
}

// ============================================================
// PROJEKT-DETAIL
// ============================================================
function ladeProduktDetail(id) {
  _aktivProjektId = id;
  renderProjektliste(); // Highlight aktualisieren

  var proj = _data.projekte.find(function(p){return p.id===id;});
  if (!proj) return;

  var detail = document.getElementById('proj-detail');
  if (!detail) { console.warn('[BB] proj-detail nicht gefunden'); return; }
  var begehungen = proj.begehungen || [];
  var fortschritt = begehungenFortschritt(proj);

  detail.innerHTML =
    '<div class="card">' +
      '<div class="card-header">' +
        '<div>' +
          '<div class="card-title">📋 ' + escHtml(proj.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text3);margin-top:2px;">' + escHtml(proj.adresse||'—') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-ghost" style="font-size:12px;padding:6px 10px;" onclick="editiereProjekt(\'' + id + '\')">✎ Bearbeiten</button>' +
          '<button class="btn btn-primary" style="font-size:12px;padding:6px 10px;" onclick="openModalBegehung()">+ Begehung</button>' +
        '</div>' +
      '</div>' +
      '<div class="card-body">' +

        // Meta-Zeile
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:16px;">' +
          metaBox('Auftraggeber', proj.auftraggeber||'—') +
          metaBox('Aktenzeichen', proj.az||'—') +
          metaBox('Beginn', formatDatum(proj.beginn)) +
          metaBox('Gepl. Abnahme', formatDatum(proj.abnahme)) +
          metaBox('Begehungen', begehungen.length + ' gesamt') +
          metaBox('Status', proj.status||'Aktiv') +
        '</div>' +

        // Fortschrittsbalken
        '<div style="margin-bottom:16px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px;">' +
            '<span>Projektfortschritt (Begehungen)</span>' +
            '<span>' + fortschritt + '%</span>' +
          '</div>' +
          '<div class="progress-wrap"><div class="progress-bar" style="width:' + fortschritt + '%;"></div></div>' +
        '</div>' +

        // Aktionen
        '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">' +
          '<button class="btn btn-ghost" style="font-size:12px;" onclick="generiereEinzelBericht(\'' + id + '\')">📄 Begehungs-Bericht</button>' +
          '<button class="btn btn-ghost" style="font-size:12px;" onclick="generiereGesamtBericht(\'' + id + '\')">📑 Gesamtbericht</button>' +
          '<button class="btn btn-ghost" style="font-size:12px;" onclick="toggleProjektStatus(\'' + id + '\')">' +
            (proj.status==='Abgeschlossen' ? '🔄 Reaktivieren' : '✅ Abschließen') +
          '</button>' +
          '<button class="btn btn-danger" style="font-size:12px;" onclick="loescheProjekt(\'' + id + '\')">🗑</button>' +
        '</div>' +

        // Begehungen
        '<div class="card-title" style="margin-bottom:10px;">Begehungen</div>' +
        renderBegehungenHtml(begehungen, id) +

        // Mängel-Tracking
        '<div class="card-title" style="margin-top:20px;margin-bottom:10px;">Mängel-Tracking</div>' +
        renderMaengelHtml(proj) +

      '</div>' +
    '</div>';
}

function metaBox(label, value) {
  return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:9px 11px;">' +
    '<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:3px;">' + label + '</div>' +
    '<div style="font-size:12px;font-weight:600;color:var(--text);">' + escHtml(String(value)) + '</div>' +
  '</div>';
}

function renderBegehungenHtml(begehungen, projId) {
  if (!begehungen.length) {
    return '<div class="empty-state" style="padding:24px;"><div class="empty-icon">📋</div><div class="empty-title">Noch keine Begehungen</div><div class="empty-sub">Erste Begehung erfassen</div></div>';
  }
  var dring = {'normal':'','hinweis':'🔵','mangel':'🟡','stopp':'🔴'};
  var html = '<div class="begehung-list">';
  begehungen.forEach(function(b, i) {
    html +=
      '<div class="begehung-item">' +
        '<div class="begehung-nr">' + (i+1) + '</div>' +
        '<div class="begehung-body">' +
          '<div class="begehung-datum">' + (dring[b.dringlichkeit]||'') + ' ' + formatDatum(b.datum) + (b.uhrzeit?' · '+b.uhrzeit:'') + ' — ' + escHtml(b.phase||'') + '</div>' +
          '<div class="begehung-text">' + escHtml(b.text||'') + '</div>' +
          (b.anwesend ? '<div class="begehung-fotos" style="margin-top:4px;">👥 '+escHtml(b.anwesend)+'</div>' : '') +
          (b.fotos>0 ? '<div class="begehung-fotos">📷 '+b.fotos+' Foto'+(b.fotos===1?'':'s')+'</div>' : '') +
        '</div>' +
        '<div class="begehung-actions">' +
          '<button title="Löschen" onclick="loescheBegehung(\'' + projId + '\',' + i + ')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:4px;">🗑</button>' +
        '</div>' +
      '</div>';
  });
  html += '</div>';
  return html;
}

function begehungenFortschritt(proj) {
  // Grobe Schätzung: 8 Begehungen = 100% für typischen Neubau
  var ziel = {'Neubau':8,'Sanierung':6,'Umbau':5,'Denkmalschutz':10}[proj.typ] || 8;
  var anz = (proj.begehungen||[]).length;
  return Math.min(100, Math.round(anz/ziel*100));
}

/* ─── MÄNGEL-TRACKING ─── */
function renderMaengelHtml(proj) {
  var maengel = proj.maengel || [];
  var offen = maengel.filter(function(m){return m.status==='Offen';}).length;
  var inArbeit = maengel.filter(function(m){return m.status==='In Arbeit';}).length;
  var erledigt = maengel.filter(function(m){return m.status==='Erledigt';}).length;

  var html = '';

  // Stats-Leiste
  html += '<div style="display:flex;gap:8px;margin-bottom:12px;">'
    + '<div style="flex:1;padding:8px;border-radius:6px;background:rgba(239,68,68,.08);text-align:center;font-size:11px;">'
    + '<div style="font-size:16px;font-weight:700;color:#ef4444;">' + offen + '</div>Offen</div>'
    + '<div style="flex:1;padding:8px;border-radius:6px;background:rgba(245,158,11,.08);text-align:center;font-size:11px;">'
    + '<div style="font-size:16px;font-weight:700;color:#f59e0b;">' + inArbeit + '</div>In Arbeit</div>'
    + '<div style="flex:1;padding:8px;border-radius:6px;background:rgba(16,185,129,.08);text-align:center;font-size:11px;">'
    + '<div style="font-size:16px;font-weight:700;color:#10b981;">' + erledigt + '</div>Erledigt</div>'
    + '</div>';

  // Add-Button
  html += '<button onclick="addMangel(\'' + proj.id + '\')" style="width:100%;padding:8px;margin-bottom:10px;border-radius:7px;background:rgba(239,68,68,.06);border:1px dashed rgba(239,68,68,.25);color:#ef4444;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">+ Mangel erfassen</button>';

  // Inline-Add-Form
  html += '<div id="mangel-form-' + proj.id + '" style="display:none;padding:12px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;margin-bottom:10px;">'
    + '<input id="mf-text-' + proj.id + '" type="text" placeholder="Mangelbeschreibung…" style="width:100%;padding:8px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;margin-bottom:6px;font-family:inherit;outline:none;">'
    + '<div style="display:flex;gap:6px;">'
    + '<select id="mf-gewerk-' + proj.id + '" style="flex:1;padding:6px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;">'
    + '<option value="">Gewerk…</option><option>Rohbau</option><option>Dach</option><option>Fenster</option><option>Fassade</option><option>Estrich</option><option>Sanitär</option><option>Elektro</option><option>Heizung</option><option>Innenputz</option><option>Maler</option><option>Bodenbelag</option><option>Sonstiges</option>'
    + '</select>'
    + '<select id="mf-prio-' + proj.id + '" style="flex:1;padding:6px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;">'
    + '<option value="normal">Normal</option><option value="hoch">Hoch</option><option value="kritisch">Kritisch</option>'
    + '</select>'
    + '<button onclick="saveMangel(\'' + proj.id + '\')" style="padding:6px 12px;border-radius:6px;background:#ef4444;border:none;color:#fff;font-size:11px;font-weight:600;cursor:pointer;">Speichern</button>'
    + '<button onclick="document.getElementById(\'mangel-form-' + proj.id + '\').style.display=\'none\'" style="padding:6px 8px;border-radius:6px;background:none;border:1px solid var(--border);color:var(--text3);font-size:11px;cursor:pointer;">✕</button>'
    + '</div></div>';

  // Mängel-Liste
  if (maengel.length === 0) {
    html += '<div style="text-align:center;padding:16px;font-size:12px;color:var(--text3);">Keine Mängel erfasst — gut so!</div>';
  } else {
    maengel.forEach(function(m, i) {
      var stColor = m.status === 'Offen' ? '#ef4444' : m.status === 'In Arbeit' ? '#f59e0b' : '#10b981';
      var stBg = m.status === 'Offen' ? 'rgba(239,68,68,.1)' : m.status === 'In Arbeit' ? 'rgba(245,158,11,.1)' : 'rgba(16,185,129,.1)';
      var prioIcon = m.prioritaet === 'kritisch' ? '🔴' : m.prioritaet === 'hoch' ? '🟡' : '';

      html += '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:7px;margin-bottom:6px;">'
        + '<div style="font-size:11px;font-weight:700;color:' + stColor + ';background:' + stBg + ';padding:2px 8px;border-radius:4px;white-space:nowrap;">'
        + 'M-' + String(i+1).padStart(3,'0') + '</div>'
        + '<div style="flex:1;">'
        + '<div style="font-size:12px;font-weight:600;color:var(--text);">' + prioIcon + ' ' + escHtml(m.text) + '</div>'
        + '<div style="font-size:10px;color:var(--text3);margin-top:2px;">' + escHtml(m.gewerk||'') + ' · ' + formatDatum(m.datum) + ' · <span style="color:' + stColor + ';">' + m.status + '</span></div>'
        + '</div>'
        + '<div style="display:flex;gap:4px;">';

      if (m.status === 'Offen') {
        html += '<button onclick="updateMangelStatus(\'' + proj.id + '\',' + i + ',\'In Arbeit\')" style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:4px;color:#f59e0b;font-size:10px;padding:3px 6px;cursor:pointer;" title="In Arbeit">⏳</button>';
      }
      if (m.status !== 'Erledigt') {
        html += '<button onclick="updateMangelStatus(\'' + proj.id + '\',' + i + ',\'Erledigt\')" style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:4px;color:#10b981;font-size:10px;padding:3px 6px;cursor:pointer;" title="Erledigt">✅</button>';
      }
      html += '<button onclick="deleteMangel(\'' + proj.id + '\',' + i + ')" style="background:none;border:none;color:var(--text3);font-size:12px;cursor:pointer;" title="Löschen">🗑</button>';
      html += '</div></div>';
    });
  }

  return html;
}

window.addMangel = function(projId) {
  var form = document.getElementById('mangel-form-' + projId);
  if (form) form.style.display = 'block';
};

window.saveMangel = function(projId) {
  var text = document.getElementById('mf-text-' + projId)?.value.trim();
  if (!text) return;
  var gewerk = document.getElementById('mf-gewerk-' + projId)?.value || '';
  var prio = document.getElementById('mf-prio-' + projId)?.value || 'normal';

  var proj = _data.projekte.find(function(p){return p.id===projId;});
  if (!proj) return;
  if (!proj.maengel) proj.maengel = [];

  proj.maengel.push({
    text: text,
    gewerk: gewerk,
    prioritaet: prio,
    status: 'Offen',
    datum: new Date().toISOString().slice(0,10),
    begehung_nr: (proj.begehungen||[]).length
  });

  speichereDaten();
  ladeProduktDetail(projId);
};

window.updateMangelStatus = function(projId, idx, neuerStatus) {
  var proj = _data.projekte.find(function(p){return p.id===projId;});
  if (!proj || !proj.maengel || !proj.maengel[idx]) return;
  proj.maengel[idx].status = neuerStatus;
  if (neuerStatus === 'Erledigt') proj.maengel[idx].erledigt_am = new Date().toISOString().slice(0,10);
  speichereDaten();
  ladeProduktDetail(projId);
};

window.deleteMangel = function(projId, idx) {
  if (!confirm('Mangel M-' + String(idx+1).padStart(3,'0') + ' wirklich löschen?')) return;
  var proj = _data.projekte.find(function(p){return p.id===projId;});
  if (!proj || !proj.maengel) return;
  proj.maengel.splice(idx, 1);
  speichereDaten();
  ladeProduktDetail(projId);
};

// ============================================================
// MODALS
// ============================================================
window.schliesseProjektModal=function(){closeModal('modal-projekt');};
window.schliesseBegehungModal=function(){closeModal('modal-begehung');};
function openModal(id) { var el=document.getElementById(id); if(el) el.classList.add('open'); }
function closeModal(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }

function openModalProjekt() {
  _editProjektId = null;
  document.getElementById('modal-projekt-titel').textContent = '🏗 Neues Projekt';
  ['mp-name','mp-auftraggeber','mp-az','mp-adresse','mp-notiz'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('mp-beginn').value = new Date().toISOString().slice(0,10);
  document.getElementById('mp-abnahme').value = '';
  openModal('modal-projekt');
  setTimeout(function(){ document.getElementById('mp-name').focus(); }, 100);
}

function editiereProjekt(id) {
  var proj = _data.projekte.find(function(p){return p.id===id;});
  if (!proj) return;
  _editProjektId = id;
  document.getElementById('modal-projekt-titel').textContent = '✎ Projekt bearbeiten';
  document.getElementById('mp-name').value = proj.name||'';
  document.getElementById('mp-auftraggeber').value = proj.auftraggeber||'';
  (document.getElementById('mp-az') || document.getElementById('mp-az-edit')).value = proj.az||'';
  document.getElementById('mp-adresse').value = proj.adresse||'';
  document.getElementById('mp-beginn').value = proj.beginn||'';
  document.getElementById('mp-abnahme').value = proj.abnahme||'';
  document.getElementById('mp-typ').value = proj.typ||'Neubau';
  document.getElementById('mp-notiz').value = proj.notiz||'';
  openModal('modal-projekt');
}

window.openModalBegehung = function openModalBegehung() {
  if (!_aktivProjektId) return;
  document.getElementById('mb-datum').value = new Date().toISOString().slice(0,10);
  document.getElementById('mb-text').value = '';
  document.getElementById('mb-anwesend').value = '';
  document.getElementById('mb-fotos').value = '0';
  document.getElementById('mb-dringlichkeit').value = 'normal';
  openModal('modal-begehung');
  setTimeout(function(){ document.getElementById('mb-text').focus(); }, 100);
}

// ============================================================
// CRUD
// ============================================================
function speichereProjekt() {
  var name = document.getElementById('mp-name').value.trim();
  if (!name) { zeigToast('Projektname ist Pflichtfeld', 'err'); return; }

  if (_editProjektId) {
    var proj = _data.projekte.find(function(p){return p.id===_editProjektId;});
    if (proj) {
      proj.name = name;
      proj.auftraggeber = document.getElementById('mp-auftraggeber').value.trim();
      proj.az = document.getElementById('mp-az') || document.getElementById('mp-az-edit').value.trim();
      proj.adresse = document.getElementById('mp-adresse').value.trim();
      proj.beginn = document.getElementById('mp-beginn').value;
      proj.abnahme = document.getElementById('mp-abnahme').value;
      proj.typ = document.getElementById('mp-typ').value;
      proj.notiz = document.getElementById('mp-notiz').value.trim();
    }
  } else {
    var az = document.getElementById('mp-az') || document.getElementById('mp-az-edit').value.trim();
    if (!az) az = 'PROVA-BB-' + new Date().getFullYear() + '-' + String((_data.projekte.length+1)).padStart(4,'0');
    _data.projekte.unshift({
      id: genId(),
      name: name,
      auftraggeber: document.getElementById('mp-auftraggeber').value.trim(),
      az: az,
      adresse: document.getElementById('mp-adresse').value.trim(),
      beginn: document.getElementById('mp-beginn').value,
      abnahme: document.getElementById('mp-abnahme').value,
      typ: document.getElementById('mp-typ').value,
      notiz: document.getElementById('mp-notiz').value.trim(),
      status: 'Aktiv',
      begehungen: [],
      erstellt: new Date().toISOString()
    });
    _aktivProjektId = _data.projekte[0].id;
  }
  speichereDaten(_data);
  closeModal('modal-projekt');
  renderProjektliste();
  if (_aktivProjektId) ladeProduktDetail(_aktivProjektId);
  zeigToast(_editProjektId ? 'Projekt aktualisiert ✅' : 'Projekt angelegt ✅');
  // Airtable-Sync (non-blocking)
  try {
    var _svE = localStorage.getItem('prova_sv_email')||'';
    var _aktP = _data.projekte.find(function(p){return p.id===(_editProjektId||_data.projekte[0].id);});
    if (_svE && _aktP) {
      fetch('/.netlify/functions/airtable',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({method:'POST',path:'/v0/appJ7bLlAHZoxENWE/tblyMTTdtfGQjjmc2',
          payload:{records:[{fields:{titel:'BB: '+_aktP.name,termin_typ:'Baubegleitung',
            aktenzeichen:_aktP.az||'',sv_email:_svE,notiz:_aktP.adresse||''
          }}]}
        })
      }).catch(function(){});
    }
  } catch(e) {}
}

function speichereBegehung() {
  if (!_aktivProjektId) return;
  var text = document.getElementById('mb-text').value.trim();
  var datum = document.getElementById('mb-datum').value;
  if (!text || !datum) { zeigToast('Datum und Feststellungen sind Pflicht', 'err'); return; }

  var proj = _data.projekte.find(function(p){return p.id===_aktivProjektId;});
  if (!proj) return;
  proj.begehungen = proj.begehungen || [];
  proj.begehungen.push({
    datum: datum,
    uhrzeit: document.getElementById('mb-uhrzeit').value,
    phase: document.getElementById('mb-phase').value,
    text: text,
    anwesend: document.getElementById('mb-anwesend').value.trim(),
    fotos: parseInt(document.getElementById('mb-fotos').value)||0,
    dringlichkeit: document.getElementById('mb-dringlichkeit').value,
    erfasst: new Date().toISOString()
  });
  speichereDaten(_data);
  closeModal('modal-begehung');
  ladeProduktDetail(_aktivProjektId);
  zeigToast('Begehung erfasst ✅');
}

function loescheBegehung(projId, idx) {
  if (!confirm('Begehung löschen?')) return;
  var proj = _data.projekte.find(function(p){return p.id===projId;});
  if (proj) { proj.begehungen.splice(idx, 1); speichereDaten(_data); ladeProduktDetail(projId); zeigToast('Begehung gelöscht'); }
}

function toggleProjektStatus(id) {
  var proj = _data.projekte.find(function(p){return p.id===id;});
  if (!proj) return;
  proj.status = proj.status === 'Abgeschlossen' ? 'Aktiv' : 'Abgeschlossen';
  speichereDaten(_data);
  renderProjektliste();
  ladeProduktDetail(id);
  zeigToast(proj.status === 'Abgeschlossen' ? 'Projekt abgeschlossen' : 'Projekt reaktiviert');
}

function loescheProjekt(id) {
  if (!confirm('Projekt inkl. aller Begehungen unwiderruflich löschen?')) return;
  _data.projekte = _data.projekte.filter(function(p){return p.id!==id;});
  speichereDaten(_data);
  _aktivProjektId = null;
  renderProjektliste();
  document.getElementById('proj-detail').innerHTML = '<div class="card"><div class="card-body"><div class="empty-state"><div class="empty-icon">👈</div><div class="empty-title">Projekt gelöscht</div><div class="empty-sub">Wählen Sie ein anderes Projekt aus.</div></div></div></div>';
  zeigToast('Projekt gelöscht');
}

// ============================================================
// BERICHTE
// ============================================================
function generiereEinzelBericht(projId) {
  var proj = _data.projekte.find(function(p){return p.id===projId;});
  if (!proj) return;
  var begehungen = proj.begehungen || [];
  if (!begehungen.length) { zeigToast('Keine Begehungen vorhanden', 'err'); return; }

  // Letzte Begehung
  var b = begehungen[begehungen.length-1];
  var sv = localStorage.getItem('prova_sv_vorname')||'';
  var svN = localStorage.getItem('prova_sv_nachname')||'Sachverständiger';
  var dring = {'normal':'keine sofortigen Maßnahmen erforderlich','hinweis':'Nachverfolgung erforderlich','mangel':'Nachbesserung vor Fortsetzung erforderlich','stopp':'BAUSTOPP — sofortige Klärung notwendig'}[b.dringlichkeit]||'';

  var text =
    'BEGEHUNGSPROTOKOLL\n' +
    '═'.repeat(45) + '\n\n' +
    'Projekt:        ' + proj.name + '\n' +
    'Aktenzeichen:   ' + (proj.az||'—') + '\n' +
    'Auftraggeber:   ' + (proj.auftraggeber||'—') + '\n' +
    'Objekt:         ' + (proj.adresse||'—') + '\n\n' +
    'Begehung Nr.:   ' + begehungen.length + '\n' +
    'Datum:          ' + formatDatum(b.datum) + (b.uhrzeit ? ' · ' + b.uhrzeit + ' Uhr' : '') + '\n' +
    'Bauphase:       ' + (b.phase||'—') + '\n' +
    (b.anwesend ? 'Anwesend:       ' + b.anwesend + '\n' : '') +
    (b.fotos>0 ? 'Fotodokumentation: ' + b.fotos + ' Aufnahmen\n' : '') +
    '\n' +
    'FESTSTELLUNGEN\n' +
    '─'.repeat(45) + '\n' +
    b.text + '\n\n' +
    'BEWERTUNG\n' +
    '─'.repeat(45) + '\n' +
    'Dringlichkeit:  ' + dring + '\n\n' +
    '─'.repeat(45) + '\n' +
    'Erstellt durch: ' + sv + ' ' + svN + '\n' +
    'Datum:          ' + new Date().toLocaleDateString('de-DE') + '\n';

  _aktuellProjId = proj.id;
  document.getElementById('bericht-modal-titel').textContent = '📄 Begehungsprotokoll · ' + proj.name;
  document.getElementById('bericht-text').textContent = text;
  document.getElementById('ki-bericht-btn').textContent='✨ KI-Bericht';
  document.getElementById('ki-bericht-btn').disabled=false;
  document.getElementById('ki-bericht-status').style.display='none';
  openModal('modal-bericht');
}

function generiereGesamtBericht(projId) {
  var proj = _data.projekte.find(function(p){return p.id===projId;});
  if (!proj) return;
  var begehungen = proj.begehungen || [];
  if (!begehungen.length) { zeigToast('Keine Begehungen vorhanden', 'err'); return; }

  var sv = (localStorage.getItem('prova_sv_vorname')||'') + ' ' + (localStorage.getItem('prova_sv_nachname')||'Sachverständiger');
  var mängel = begehungen.filter(function(b){return b.dringlichkeit==='mangel'||b.dringlichkeit==='stopp';});

  var text =
    'BAUBEGLEITUNGSBERICHT — GESAMTDOKUMENTATION\n' +
    '═'.repeat(50) + '\n\n' +
    'Projekt:         ' + proj.name + '\n' +
    'Aktenzeichen:    ' + (proj.az||'—') + '\n' +
    'Auftraggeber:    ' + (proj.auftraggeber||'—') + '\n' +
    'Objekt:          ' + (proj.adresse||'—') + '\n' +
    'Projektbeginn:   ' + formatDatum(proj.beginn) + '\n' +
    (proj.abnahme ? 'Gepl. Abnahme:   ' + formatDatum(proj.abnahme) + '\n' : '') +
    'Status:          ' + (proj.status||'Aktiv') + '\n\n' +
    'Begehungen ges.: ' + begehungen.length + '\n' +
    'Mängel/Hinweise: ' + mängel.length + '\n\n';

  begehungen.forEach(function(b, i) {
    var dring = {'normal':'','hinweis':'[HINWEIS] ','mangel':'[MANGEL] ','stopp':'[BAUSTOPP] '}[b.dringlichkeit]||'';
    text +=
      '─'.repeat(50) + '\n' +
      'BEGEHUNG ' + (i+1) + ' — ' + formatDatum(b.datum) + ' · ' + (b.phase||'') + '\n' +
      (b.anwesend ? 'Anwesend: ' + b.anwesend + '\n' : '') +
      '\n' +
      dring + b.text + '\n' +
      (b.fotos>0 ? '\n📷 Fotodokumentation: ' + b.fotos + ' Aufnahmen\n' : '') +
      '\n';
  });

  if (mängel.length) {
    text += '═'.repeat(50) + '\n';
    text += 'ZUSAMMENFASSUNG MÄNGEL UND BEANSTANDUNGEN\n';
    text += '─'.repeat(50) + '\n';
    mängel.forEach(function(b, i) {
      text += (i+1) + '. ' + formatDatum(b.datum) + ' · ' + (b.phase||'') + '\n   ' + b.text.split('\n')[0] + '\n\n';
    });
  }

  text +=
    '═'.repeat(50) + '\n' +
    'Sachverständiger: ' + sv.trim() + '\n' +
    'Bericht erstellt: ' + new Date().toLocaleDateString('de-DE') + '\n';

  _aktuellProjId = proj.id;
  document.getElementById('bericht-modal-titel').textContent = '📑 Gesamtbericht · ' + proj.name;
  document.getElementById('bericht-text').textContent = text;
  openModal('modal-bericht');
}

/* ── KI-BERICHT GENERATOR ───────────────────────────────────── */
var _aktuellProjId = null; // wird beim Öffnen gesetzt

async function generiereKIBericht() {
  var btn = document.getElementById('ki-bericht-btn');
  var status = document.getElementById('ki-bericht-status');
  var textEl = document.getElementById('bericht-text');
  if (!btn || !status || !textEl) return;

  btn.disabled = true;
  btn.textContent = '⏳ Generiert…';
  status.style.display = 'block';

  // Aktuellen Rohentext aus dem Modal holen
  var rohenText = textEl.textContent || '';
  var svName = (localStorage.getItem('prova_sv_vorname')||'') + ' ' +
               (localStorage.getItem('prova_sv_nachname')||'Sachverständiger');

  var systemPrompt = 'Du bist ein öffentlich bestellter und vereidigter Bausachverständiger. ' +
    'Formuliere den vorliegenden Baubegleitungsbericht professionell, strukturiert und rechtssicher um. ' +
    'Behalte alle Fakten, Daten und Feststellungen exakt bei. ' +
    'Verwende Fachsprache. Kein Markdown. Klare Absätze. Konjunktiv wo fachlich angebracht.';

  var userPrompt = 'Formuliere diesen Baubegleitungsbericht professionell:\n\n' + rohenText;

  try {
    var res = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        messages: [
          {role: 'system', content: systemPrompt},
          {role: 'user', content: userPrompt}
        ]
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    var text = (data.content && data.content[0] && data.content[0].text)
      ? data.content[0].text : '';
    if (!text) throw new Error('Keine Antwort');

    textEl.textContent = text;
    status.style.display = 'none';
    btn.textContent = '↻ Neu generieren';
    btn.disabled = false;
    zeigToast('✅ KI-Bericht bereit — bitte prüfen und ggf. anpassen', 'ok');
  } catch(e) {
    status.style.display = 'none';
    btn.textContent = '✨ KI-Bericht';
    btn.disabled = false;
    zeigToast('KI-Fehler: ' + e.message, 'err');
  }
}

function berichtKopieren() {
  var text = document.getElementById('bericht-text').textContent;
  navigator.clipboard.writeText(text).then(function(){
    zeigToast('In Zwischenablage kopiert ✅');
  }).catch(function(){
    zeigToast('Kopieren nicht möglich — bitte manuell markieren', 'err');
  });
}

// ============================================================
// HELPERS
// ============================================================
function formatDatum(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}); }
  catch(e) { return iso; }
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.zeigToast = window.zeigToast || window.showToast || function(m){ alert(m); };

// ============================================================
// RESPONSIVE: Mobile Stack
// ============================================================
function checkLayout() {
  var layout = document.getElementById('bb-layout');
  if (!layout) return;
  if (window.innerWidth < 700) {
    layout.style.gridTemplateColumns = '1fr';
  } else {
    layout.style.gridTemplateColumns = '300px 1fr';
  }
}
window.addEventListener('resize', checkLayout);

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  checkLayout();
  renderProjektliste();
  // URL-Parameter: ?projekt=ID
  var params = new URLSearchParams(window.location.search);
  var pidParam = params.get('projekt');
  if (pidParam) {
    var proj = _data.projekte.find(function(p){return p.id===pidParam;});
    if (proj) ladeProduktDetail(pidParam);
  }
  // Support-Modal
  var m = document.getElementById('support-modal');
  if (m) m.addEventListener('click', function(e){ if(e.target===m) closeModal('support-modal'); });
});