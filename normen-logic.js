/* ════════════════════════════════════════════════════════════
   PROVA normen-logic.js
   Normen-Datenbank, Suche, Render, KI-Kontext
   Extrahiert aus normen.html
════════════════════════════════════════════════════════════ */

// ── AUTH ──
// Auth via auth-guard.js (synchron im <head> geladen)

// ── PAKET ──
var paket = localStorage.getItem('prova_paket')||'Solo';
(function(){
  var c = {Solo:'#4f8ef7',Team:'#a78bfa',Starter:'#4f8ef7',Pro:'#4f8ef7',Enterprise:'#a78bfa'}[paket]||'#4f8ef7';
  var badge = document.getElementById('topbarPaket');
  if(badge){ badge.textContent=paket; badge.style.cssText='background:'+c+'18;color:'+c+';border:1px solid '+c+'33;'; }
})();

// ── NORMEN DATENBANK ──

/* ══════════════════════════════════════════════════════════════
   PROVA Normen-Datenbank — live aus Airtable
   Wird von /.netlify/functions/normen geladen
   Fallback: leeres Array → Fehlermeldung
════════════════════════════════════════════════════════════════ */
let NORMEN_DB = [];

async function ladeNormenVonAirtable() {
  var grid = document.getElementById('normenGrid');
  var counter = document.getElementById('normenCount');
  
  // Loading-State zeigen
  if (grid) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text2);">' +
      '<div style="font-size:32px;margin-bottom:12px;">⏳</div>' +
      '<div style="font-size:14px;">Normen werden geladen…</div>' +
      '</div>';
  }
  if (counter) counter.textContent = '…';

  try {
    var res = await fetch('/.netlify/functions/normen');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();
    
    if (!data.normen || !data.normen.length) throw new Error('Keine Normen');
    
    // NORMEN_DB befüllen
    NORMEN_DB = data.normen;
    window.PROVA_NORMEN_DB = NORMEN_DB;
    
    // Aenderungshinweise sammeln
    var updates = NORMEN_DB.filter(function(n) { return n.aenderungshinweis; });
    if (updates.length > 0) {
      zeigeAenderungsHinweis(updates);
    }
    
    // Rendern
    if (typeof renderNormen === 'function') renderNormen();
    
  } catch (err) {
    console.error('[PROVA] Normen laden fehlgeschlagen:', err.message);
    if (grid) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;">' +
        '<div style="font-size:32px;margin-bottom:12px;">⚠️</div>' +
        '<div style="font-size:14px;color:var(--text2);margin-bottom:16px;">Normen konnten nicht geladen werden.</div>' +
        '<button onclick="ladeNormenVonAirtable()" style="padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Erneut versuchen</button>' +
        '</div>';
    }
    if (counter) counter.textContent = '0 Normen';
  }
}

function zeigeAenderungsHinweis(updates) {
  var banner = document.createElement('div');
  banner.style.cssText = 'background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);' +
    'border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--text2);';
  banner.innerHTML = '<span style="font-size:14px;">🔔</span> <strong style="color:#f59e0b;">' +
    updates.length + ' Norm' + (updates.length > 1 ? 'en' : '') + ' aktualisiert:</strong> ' +
    updates.map(function(n) { return n.num + ' — ' + n.aenderungshinweis; }).join(' · ');
  var grid = document.getElementById('normenGrid');
  if (grid && grid.parentElement) {
    grid.parentElement.insertBefore(banner, grid);
  }
}


window.PROVA_NORMEN_DB = NORMEN_DB;



let activeChipSA = '';
let activeChipHF = '';
let expandedId = null;

// Schadenart → Langname
const SA_LABEL = {WS:'Wasserschaden',SC:'Schimmel',BS:'Brand',SS:'Sturm',ES:'Elementar',BA:'Baumängel'};

function setChip(val, el) {
  document.querySelectorAll('.stat-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  // val kann SA-Code (WS/SC...) oder 'hoch' sein
  if(val==='hoch'){ activeChipHF='hoch'; activeChipSA=''; document.getElementById('filterHF').value='hoch'; document.getElementById('filterSA').value=''; }
  else{ activeChipSA=val; activeChipHF=''; document.getElementById('filterSA').value=val; document.getElementById('filterHF').value=''; }
  renderNormen();
}

function getFiltered() {
  var _si = document.getElementById('searchInput');
  if (!_si) return NORMEN_DB; // Guard: nicht auf normen.html — alle zurückgeben
  const q = (_si.value||'').toLowerCase().trim();
  const bereich = document.getElementById('filterBereich').value;
  const sa = document.getElementById('filterSA').value || activeChipSA;
  const hf = document.getElementById('filterHF').value || activeChipHF;
  return NORMEN_DB.filter(n => {
    if(bereich && n.bereich !== bereich) return false;
    if(sa && !n.sa.includes(sa)) return false;
    if(hf && n.hf !== hf) return false;
    if(q) {
      const hay = (n.num+' '+n.titel+' '+n.bereich+' '+n.gw+' '+n.hint+' '+n.anw).toLowerCase();
      // Normalisierte Suche: "DIN4108" findet "DIN 4108-2" (Leerzeichen/Bindestriche ignorieren)
      const hayNorm = hay.replace(/[\s\-\.]/g,'');
      const qNorm   = q.replace(/[\s\-\.]/g,'');
      if(!hay.includes(q) && !hayNorm.includes(qNorm)) return false;
    }
    return true;
  });
}

function renderNormen() {
  if (!document.getElementById('normenGrid')) return; // Guard: nur auf normen.html
  const filtered = getFiltered();
  const grid = document.getElementById('normenGrid');
  const empty = document.getElementById('emptyState');
  const q = (document.getElementById('searchInput').value||'').trim();
  document.getElementById('normenCount').textContent = filtered.length + ' Normen';

  // Figma-Style: Zuletzt genutzte Normen oben (wenn kein Filter)
  var recentSection = '';
  if (!q && !document.getElementById('filterBereich').value) {
    try {
      var recentNums = JSON.parse(localStorage.getItem('prova_normen_recent')||'[]');
      var recentNormen = recentNums.map(function(num){ return NORMEN_DB.find(function(n){return n.num===num;}); }).filter(Boolean).slice(0,4);
      if (recentNormen.length > 0) {
        recentSection = '<div style="margin-bottom:20px;">'
          + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:10px;padding:0 2px;">Zuletzt verwendet</div>'
          + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;">'
          + recentNormen.map(function(n){
              return normCard(n, true);
            }).join('')
          + '</div></div>'
          + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:10px;padding:0 2px;">Alle Normen</div>';
      }
    } catch(e) {}
  }

  if(!filtered.length){ grid.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';
  grid.innerHTML = filtered.map((n,i) => {
    const saArr = n.sa.split(',').filter(Boolean);
    const expanded = expandedId === n.num;
    return `<div class="normen-card${expanded?' expanded':''}" onclick="toggleCard('${n.num}',event)" data-id="${n.num}">
      <div class="card-header">
        <div class="card-num">${n.num}</div>
        <div class="card-titel">${escHtml(n.titel)}</div>
      </div>
      <div class="card-badges">
        <span class="badge badge-bereich">${n.bereich}</span>
        <span class="badge badge-${n.hf}">${{'hoch':'🔴 Häufig','mittel':'🟡 Mittel','gering':'⚪ Selten'}[n.hf]||n.hf}</span>
        ${saArr.map(s=>`<span class="badge badge-sa">${SA_LABEL[s]||s}</span>`).join('')}
      </div>
      <div class="card-gw">
        <div class="card-gw-label">⚖ Praxisrelevante Grenzwerte</div>
        ${escHtml(n.gw)}
      </div>
      <div class="card-detail">
        <div class="detail-section">
          <div class="detail-label">Anwendungsbereich</div>
          <div class="detail-text">${escHtml(n.anw)}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">Typische Messmethode</div>
          <div class="detail-text">${escHtml(n.mess)}</div>
        </div>
        <div class="hint-box">
          <span class="hint-icon">💡</span>
          <span class="hint-text">${escHtml(n.hint)}</span>
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="btn-insert" onclick="insertInStellung('${n.num}')">📝 In §6 einfügen</button>
          <button class="btn-copy" onclick="copyZitat('${n.num}')">📋 Zitat kopieren</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleCard(id, e) {
  if(e && e.target.closest('.card-actions')) return;
  expandedId = expandedId===id ? null : id;
  renderNormen();
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function insertInStellung(normNum) {
  const n = NORMEN_DB.find(x=>x.num===normNum);
  if(!n) return;
  const text = `Gemäß ${n.num} (${n.titel}) gilt: ${n.gw}`;

  // In localStorage-Queue für Stellungnahme speichern
  try {
    var bestehend = JSON.parse(localStorage.getItem('prova_normen_queue') || '[]');
    bestehend.push({ num: n.num, titel: n.titel, text: text, ts: new Date().toISOString() });
    localStorage.setItem('prova_normen_queue', JSON.stringify(bestehend));
  } catch(e) {}

  // postMessage wenn als Popup geöffnet
  if(window.opener) {
    window.opener.postMessage({type:'prova_norm', text:text}, '*');
    zeigeEingefuegtBanner(n.num, true);
    setTimeout(()=>window.close(), 1200);
    return;
  }

  // Clipboard als Fallback
  navigator.clipboard.writeText(text).catch(()=>{});

  // Inline-Banner auf der Seite anzeigen
  zeigeEingefuegtBanner(n.num, false);
}

function zeigeEingefuegtBanner(normNum, istPopup) {
  var az = localStorage.getItem('prova_aktiver_fall') || '';
  // Bestehendes Banner entfernen
  var alt = document.getElementById('normen-insert-banner');
  if (alt) alt.remove();

  var banner = document.createElement('div');
  banner.id = 'normen-insert-banner';
  banner.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:99999;' +
    'background:#0f2518;' +
    'border:2px solid #10b981;border-radius:14px;padding:14px 20px;' +
    'display:flex;align-items:center;gap:14px;min-width:320px;max-width:90vw;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.8);animation:slideDown .25s ease;' +
    'backdrop-filter:none;-webkit-backdrop-filter:none;';

  banner.innerHTML =
    '<span style="font-size:22px;">✅</span>' +
    '<div style="flex:1;">' +
      '<div style="font-size:13px;font-weight:700;color:#10b981;margin-bottom:2px;">' + normNum + ' gespeichert</div>' +
      '<div style="font-size:11px;color:var(--text2);">' +
        (az ? ('Für Fall ' + az + ' · ') : '') + 'In §6 Stellungnahme verfügbar' +
      '</div>' +
    '</div>' +
    (az ? '<a href="stellungnahme.html" style="padding:7px 14px;background:#10b981;color:#fff;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;white-space:nowrap;">→ Zu §6</a>' : '') +
    '<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;padding:0 4px;line-height:1;">×</button>';

  document.body.appendChild(banner);
  setTimeout(function(){ if(banner.parentElement) banner.style.opacity='0'; banner.style.transition='opacity .4s'; setTimeout(function(){if(banner.parentElement)banner.remove();},400); }, 4000);
}

function copyZitat(normNum) {
  const n = NORMEN_DB.find(x=>x.num===normNum);
  if(!n) return;
  const zitat = `Gemäß ${n.num} (${n.titel}) beträgt der maßgebliche Grenzwert: ${n.gw}`;
  navigator.clipboard.writeText(zitat).then(()=>showToast('Zitat kopiert ✅')).catch(()=>{
    showToast('In Zwischenablage: '+zitat.slice(0,60)+'…');
  });
}

window.showToast = window.showToast || window.zeigToast || function(m){ alert(m); };
function showToastMitCTA(msg, ctaLabel, ctaHref) {
  const t = document.getElementById('toast');
  const txt = document.getElementById('toast-text');
  const cta = document.getElementById('toast-cta');
  if(txt) txt.textContent = msg;
  if(cta) {
    if(ctaLabel && ctaHref) {
      cta.style.display = 'block';
      cta.innerHTML = '<a href="'+ctaHref+'" style="display:inline-block;padding:7px 14px;background:var(--accent);color:#fff;border-radius:7px;font-size:12px;font-weight:700;text-decoration:none;">'+ctaLabel+'</a>';
    } else {
      cta.style.display = 'none';
      cta.innerHTML = '';
    }
  }
  if(t) {
    t.classList.remove('show');
    void t.offsetWidth; // reflow
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(()=>t.classList.remove('show'), ctaLabel ? 4000 : 2500);
  }
}

// Init
document.addEventListener('DOMContentLoaded', function() {
  ladeNormenVonAirtable();
});

// Schadenart aus sessionStorage vorauswählen (wenn von app-starter etc. geöffnet)
(function(){
  var sa = sessionStorage.getItem('prova_schadenart') || '';
  if(sa) {
    var saMap = {'Wasserschaden':'WS','Schimmel':'SC','Schimmelbefall':'SC','Brandschaden':'BS','Sturmschaden':'SS','Elementarschaden':'ES','Baumängel':'BA'};
    var saCode = '';
    for(var k in saMap) { if(sa.toLowerCase().includes(k.toLowerCase())){ saCode=saMap[k]; break; } }
    if(saCode) {
      document.getElementById('filterSA').value = saCode;
      renderNormen();
    }
  }
})();

/* ─────────────────────────────────────────── */

(function(){
  var path=window.location.pathname.split('/').pop()||'dashboard';
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('[data-nav]').forEach(function(el){el.classList.remove('active');});
    var map={'normen':'nav-normen','textbausteine':'nav-textbausteine','positionen':'nav-positionen'};
    var id=map[path];
    if(id){var el=document.getElementById(id);if(el)el.classList.add('active');}
  });
})();