
/* ── FIX: Neues Gutachten → Aktiver Fall zurücksetzen ── */
(function() {
  var urlParams = new URLSearchParams(window.location.search);
  var azParam = urlParams.get('az') || urlParams.get('AZ') || '';
  if (!azParam) {
    // Keine AZ in URL = neues Gutachten → aktiven Fall zurücksetzen
    localStorage.removeItem('prova_aktiver_fall');
    localStorage.removeItem('prova_letztes_az');
  }
})();
/* ============================================================
   PROVA Systems — app-logic.js
   Ausgelagerte Business-Logik für app.html
   Diktat, Fotos, Webhook, Formular, Keyboard-Shortcuts
   
   WICHTIG: Wird mit defer geladen — DOM ist vollständig
   wenn dieser Code ausgeführt wird.
   
   Netify: Keine Änderung nötig
   Airtable: Keine Änderung nötig  
   Make.com: Keine Änderung nötig
============================================================ */

/* ── Block 4 ── */
function berechneFristWarnung(){
            var fd=document.getElementById('f-fristdatum');
            var warn=document.getElementById('frist-warnung');
            if(!fd||!fd.value||!warn)return;
            var frist=new Date(fd.value);
            var heute=new Date();
            var tage=Math.ceil((frist-heute)/(1000*60*60*24));
            if(tage<0){warn.style.display='block';warn.style.background='rgba(239,68,68,.1)';warn.style.color='#ef4444';warn.textContent='⚠️ Frist überschritten! '+Math.abs(tage)+' Tage überfällig.';}
            else if(tage<=7){warn.style.display='block';warn.style.background='rgba(239,68,68,.1)';warn.style.color='#ef4444';warn.textContent='🔴 Nur noch '+tage+' Tage bis zur Frist!';}
            else if(tage<=21){warn.style.display='block';warn.style.background='rgba(245,158,11,.1)';warn.style.color='#f59e0b';warn.textContent='🟡 Noch '+tage+' Tage bis zur Frist.';}
            else{warn.style.display='block';warn.style.background='rgba(16,185,129,.08)';warn.style.color='#10b981';warn.textContent='✅ Noch '+tage+' Tage bis zur Frist.';}
          }
          function onAuftragsartChange(val){
            var fb=document.getElementById('frist-block');
            if(fb) fb.style.display=(val==='Gerichtsgutachten')?'block':'none';
          }
          var _origSwitchAT = window.switchAuftraggeberTyp || function(){};
          window.switchAuftraggeberTyp = function(val) {
            _origSwitchAT(val);
            var fb=document.getElementById('frist-block');
            if(fb) fb.style.display=(val==='Gericht')?'block':'none';
            // Auftragsart auch synchronisieren
            var aa=document.getElementById('f-auftragsart');
            if(aa&&val==='Gericht'&&!aa.value) aa.value='Gerichtsgutachten';
          };

/* ── Block 5 ── */
/* ── Auftragsart aus Panel pre-füllen (wurde vor dieser Seite gewählt) ── */
          (function() {
            var at = sessionStorage.getItem('prova_auftragsart') || localStorage.getItem('prova_auftragsart') || '';
            if (at) {
              var sel = document.getElementById('f-auftragsart');
              if (sel) {
                // Suche exakten Match oder enthält-Match
                var found = false;
                for (var i = 0; i < sel.options.length; i++) {
                  if (sel.options[i].value === at || sel.options[i].text.toLowerCase().includes(at.toLowerCase())) {
                    sel.selectedIndex = i;
                    found = true;
                    break;
                  }
                }
                if (found) onAuftragsartChange(sel.value);
              }
            }
          })();

/* ── Block 6 ── */
/* ============================================================
   PROVA APP-STARTER — Echtes JavaScript
   G1-Webhook: imn2n5xs7j251xicrmdmk17of042pt2t
   Airtable Base: appJ7bLlAHZoxENWE / tblSxV8bsXwd1pwa0
============================================================ */
const WEBHOOK_G1 = 'https://hook.eu1.make.com/imn2n5xs7j251xicrmdmk17of042pt2t';
const WEBHOOK_K1 = 'https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl';
const AIRTABLE_BASE = 'appJ7bLlAHZoxENWE';
const AIRTABLE_TABLE = 'tblSxV8bsXwd1pwa0';
const AIRTABLE_SV_TABLE = 'tbladqEQT3tmx4DIB';

// Gutachten-Output-Templates (formulare/) — Auswahl in Schritt 3, S3/PDFMonkey
const GUTACHTEN_VORLAGEN = [
  { id: 'standard',        label: 'Standard-Gutachten',   file: 'vorlage-01-standard.html' },
  { id: 'kurzgutachten',   label: 'Kurzgutachten',        file: 'vorlage-02-kurzgutachten.html' },
  { id: 'beweissicherung', label: 'Beweissicherung',      file: 'vorlage-03-beweissicherung.html' },
  { id: 'gericht',         label: 'Gerichtsgutachten',    file: 'vorlage-04-gerichtsgutachten.html', enterpriseOnly: true },
  { id: 'brand',           label: 'Brandschaden',         file: 'vorlage-05-brandschaden.html' },
  { id: 'feuchte',         label: 'Feuchte/Schimmel',    file: 'vorlage-06-feuchteschimmel.html' },
  { id: 'elementar',       label: 'Elementarschaden',    file: 'vorlage-07-elementarschaden.html' },
  { id: 'baumaengel',      label: 'Baumängel',           file: 'vorlage-08-baumaengel.html' },
];
// Starter: nur standard, kurzgutachten, feuchte
const GUTACHTEN_VORLAGEN_STARTER_IDS = ['standard', 'kurzgutachten', 'feuchte'];

function defaultVorlageIdBySchadenart() {
  const v = document.getElementById('f-schadenart')?.value || '';
  if (v === 'Schimmelbefall' || v === 'Wasserschaden') return 'feuchte';
  if (v === 'Brandschaden') return 'brand';
  if (v === 'Sturmschaden') return 'elementar';
  return 'standard';
}

function getSelectedGutachtenVorlageId() {
  const r = document.querySelector('input[name="gutachten_vorlage"]:checked');
  return r ? r.value : (sessionStorage.getItem('prova_gutachten_vorlage_id') || 'standard');
}

function renderGutachtenVorlageRadios(erlaubteIds) {
  const container = document.getElementById('gutachtenVorlageRadios');
  if (!container) return;
  const current = sessionStorage.getItem('prova_gutachten_vorlage_id') || defaultVorlageIdBySchadenart();
  container.innerHTML = GUTACHTEN_VORLAGEN
    .filter(v => erlaubteIds.includes(v.id))
    .map(v => `<label style="display:block;margin-bottom:.35rem;"><input type="radio" name="gutachten_vorlage" value="${v.id}" ${v.id === current ? 'checked' : ''}> ${v.label}</label>`)
    .join('');
  container.querySelectorAll('input[name="gutachten_vorlage"]').forEach(el => {
    el.addEventListener('change', () => sessionStorage.setItem('prova_gutachten_vorlage_id', el.value));
  });
}

window.vorlageVorschau = function() {
  const id = getSelectedGutachtenVorlageId();
  const vorlage = GUTACHTEN_VORLAGEN.find(v => v.id === id);
  if (!vorlage) { showToast('Bitte zuerst eine Vorlage wählen.', 'warning'); return; }
  const params = new URLSearchParams({
    aktenzeichen: document.getElementById('f-schadensnummer')?.value || '',
    schadenart: document.getElementById('f-schadenart')?.value || '',
    strasse: document.getElementById('f-strasse')?.value || '',
    plz: document.getElementById('f-plz')?.value || '',
    ort: document.getElementById('f-ort')?.value || '',
    auftraggeber: document.getElementById('f-auftraggeber-name')?.value || ''
  });
  window.open('formulare/' + vorlage.file + (params.toString() ? '?' + params.toString() : ''), '_blank', 'noopener');
};


/* ============================================================
   ZEIT-TRACKING — Misst echte Erstellungszeiten für Auswertung
   Startet wenn Schritt 1 aufgerufen wird, endet nach Webhook-OK
============================================================ */
const TRACKING = {
  start: null,
  schrittZeiten: {},
  starte: function() {
    this.start = Date.now();
    this.schrittZeiten = { schritt1_start: new Date().toISOString() };
    sessionStorage.setItem('prova_session_start', this.start);
  },
  schritt: function(nr) {
    this.schrittZeiten['schritt' + nr + '_start'] = new Date().toISOString();
  },
  ende: function() {
    if (!this.start) return null;
    const dauer_ms = Date.now() - this.start;
    return {
      dauer_sekunden: Math.round(dauer_ms / 1000),
      dauer_minuten: (dauer_ms / 60000).toFixed(1),
      schritte: this.schrittZeiten,
      ende: new Date().toISOString()
    };
  }
};

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const on = (el, ev, fn) => el?.addEventListener(ev, fn);

/* ============================================================
   SV PROFIL — via Netlify Airtable Proxy
============================================================ */
window.SV_PROFIL = null;
window.SV_RECORD_ID = null;

async function airtableProxy(method, path, body = null) {
  const res = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, body })
  });
  const text = await res.text();
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? JSON.parse(text || '{}') : text;
  if (!res.ok) throw new Error((data && data.error) ? data.error : ('HTTP ' + res.status));
  return data;
}

window.setSVEmail = async function() {
  const v = (document.getElementById('svEmailInput')?.value || '').trim();
  if (!v) { showToast('Bitte SV E-Mail eintragen.', 'warning'); return; }
  sessionStorage.setItem('prova_email', v);
  await ladeSVProfil();
};

async function ladeSVProfil() {
  const email = (sessionStorage.getItem('prova_email') || localStorage.getItem('prova_email') || '').trim();
  if (!email) return null;
  const path = `/v0/${AIRTABLE_BASE}/${AIRTABLE_SV_TABLE}?filterByFormula=${encodeURIComponent(`Email=\"${email}\"`)}&maxRecords=1`;
  const data = await airtableProxy('GET', path);
  const rec = (data.records || [])[0];
  if (!rec) return null;
  window.SV_PROFIL = rec.fields || null;
  window.SV_RECORD_ID = rec.id || null;
  // Cache SV-Felder in localStorage für Payload + andere Seiten
  if (window.SV_PROFIL) {
    try {
      const f = window.SV_PROFIL;
      if (f['Email']) localStorage.setItem('prova_sv_email', f['Email']);
      if (f['Vorname']) localStorage.setItem('prova_sv_vorname', f['Vorname']);
      if (f['Nachname']) localStorage.setItem('prova_sv_nachname', f['Nachname']);
      if (f['Zertifizierung']) localStorage.setItem('prova_sv_quali', f['Zertifizierung']);
      if (f['Firma']) localStorage.setItem('prova_sv_firma', f['Firma']);
      if (f['Strasse']) localStorage.setItem('prova_sv_strasse', f['Strasse']);
      if (f['PLZ']) localStorage.setItem('prova_sv_plz', String(f['PLZ']));
      if (f['Ort']) localStorage.setItem('prova_sv_ort', f['Ort']);
    } catch(e) {}
  }
  return window.SV_PROFIL;
}

function getSVVal(key, fallback = '') {
  const f = window.SV_PROFIL || {};
  return (f[key] ?? fallback) || fallback;
}

function fmtHeute() {
  return new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function replacePlaceholders(html, vars) {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => (vars[k] ?? ''));
}

/* TOAST */
window.showToast = function(msg, type = 'default', dur = 4000) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast' + (type !== 'default' ? ' toast-' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideIn .3s ease reverse'; setTimeout(() => t.remove(), 280); }, dur);
};

/* PAGE ROUTING */
window.showPage = function(name) {
  const page = document.getElementById('page-' + name);
  if (!page) return;
  $$('[id^="page-"]').forEach(p => { if (p && p.style) p.style.display = 'none'; });
  page.style.display = '';
  if (name === 'new') goToStep(1);
  if (name === 'list') ladeGutachtenListe();
  if (name === 'archiv') ladeArchivDaten();
  if (name === 'briefe') {
    try { initBriefPage(); } catch(e) { console.error(e); }
  }
};

/* ============================================================
   BRIEFVORLAGEN (K1) — Starter+
============================================================ */
const BRIEF_TEMPLATES = [
  { id: 'A-01', name: 'Angebot Gutachten', file: 'angebot-app.html', send: true },
  { id: 'A-03', name: 'Auftragsbestätigung', file: 'auftragsbestaetigung.html', send: true },
  { id: 'B-01', name: 'Einladung Ortstermin', file: 'einladung-ortstermin.html', send: true },
  { id: 'D-01', name: 'Erstbericht Versicherung', file: 'erstbericht-versicherung.html', send: true },
  { id: 'D-04', name: 'Nachforderung Unterlagen', file: 'nachforderung-unterlagen.html', send: true },
  { id: 'D-06', name: 'Abschlussbericht Versicherung', file: 'abschlussbericht-versicherung.html', send: true },
  { id: 'E-06', name: 'Einverständnis DSGVO', file: 'einverstaendnis-dsgvo.html', send: true },
  { id: 'G-01', name: 'Checkliste Wasserschaden', file: 'checkliste-wasserschaden.html', send: true },
  { id: 'G-01b', name: 'Checkliste Sturmschaden', file: 'checkliste-sturmschaden.html', send: true },
  { id: 'H-01', name: 'Aktennotiz (intern)', file: 'aktennotiz.html', send: false },
  { id: 'H-04', name: 'Datenschutz Mandant', file: 'datenschutz-mandant.html', send: true },
];

function initBriefPage() {
  // Defaults aus aktuellem Fall ziehen (sofern vorhanden)
  const az = document.getElementById('f-schadensnummer')?.value || '';
  const empMail = document.getElementById('f-auftraggeber-email')?.value || '';
  const empName = document.getElementById('f-auftraggeber-name')?.value || '';
  const azEl = document.getElementById('brief-aktenzeichen');
  const emEl = document.getElementById('brief-empfaenger-email');
  const nmEl = document.getElementById('brief-empfaenger-name');
  if (azEl && !azEl.value) azEl.value = az;
  if (emEl && !emEl.value) emEl.value = empMail;
  if (nmEl && !nmEl.value) nmEl.value = empName;

  // Profil ggf. automatisch laden
  ladeSVProfil().catch(() => {});
  renderBriefTable();
}

function renderBriefTable() {
  const tbody = document.getElementById('briefTableBody');
  if (!tbody) return;
  tbody.innerHTML = BRIEF_TEMPLATES.map(t => `
    <tr>
      <td style="font-family:monospace;font-weight:700">${t.id}</td>
      <td>${t.name}</td>
      <td>${t.send ? '<span class="badge badge-success">E-Mail</span>' : '<span class="badge badge-gray">Intern</span>'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="window.oeffneBrief('${t.id}')">Vorschau</button>
        ${t.send
          ? `<button class="btn btn-primary btn-sm" onclick="window.sendeBrief('${t.id}')">Senden</button>`
          : `<button class="btn btn-primary btn-sm" onclick="window.speichereAktennotiz('${t.id}')">Speichern</button>`
        }
      </td>
    </tr>
  `).join('');
}

async function ladeBriefTemplateHtml(file) {
  const res = await fetch('briefe/' + file, { cache: 'no-store' });
  if (!res.ok) throw new Error('Template nicht gefunden: ' + file);
  return await res.text();
}

function buildBriefVars() {
  const az = (document.getElementById('brief-aktenzeichen')?.value || '').trim();
  const empfaenger_email = (document.getElementById('brief-empfaenger-email')?.value || '').trim();
  const empfaenger_name = (document.getElementById('brief-empfaenger-name')?.value || '').trim();
  const empfaenger_addr = (document.getElementById('brief-empfaenger-addr')?.value || '').trim();
  const addrParts = empfaenger_addr.split(',').map(s => s.trim()).filter(Boolean);
  const empfaenger_strasse = addrParts[0] || '';
  const plzOrt = (addrParts[1] || '').split(' ').filter(Boolean);
  const empfaenger_plz = plzOrt[0] || '';
  const empfaenger_ort = plzOrt.slice(1).join(' ') || '';

  const sv_vorname = getSVVal('Vorname', '');
  const sv_nachname = getSVVal('Nachname', '');
  const sv_name = [sv_vorname, sv_nachname].filter(Boolean).join(' ').trim();

  return {
    aktenzeichen: az,
    empfaenger_email,
    empfaenger_name,
    empfaenger_strasse,
    empfaenger_plz,
    empfaenger_ort,
    datum: fmtHeute(),

    sv_vorname,
    sv_nachname,
    sv_firma: getSVVal('Firma', ''),
    sv_email: getSVVal('Email', ''),
    sv_telefon: getSVVal('Telefon', ''),
    sv_strasse: getSVVal('Strasse', ''),
    sv_plz: String(getSVVal('PLZ', '') || ''),
    sv_ort: getSVVal('Ort', ''),
    sv_qualifikation: getSVVal('Zertifizierung', ''),
    sv_ihk_hwk: getSVVal('Zertifizierungsnummer', ''),
    sv_name,
  };
}

window.oeffneBrief = async function(templateId) {
  const t = BRIEF_TEMPLATES.find(x => x.id === templateId);
  if (!t) return;
  try {
    const html = await ladeBriefTemplateHtml(t.file);
    const vars = buildBriefVars();
    const filled = replacePlaceholders(html, vars);
    const w = window.open('', '_blank');
    w.document.open();
    w.document.write(filled);
    w.document.close();
  } catch (e) {
    console.error(e);
    showToast('Vorlage konnte nicht geladen werden.', 'error');
  }
};

window.sendeBrief = async function(templateId) {
  const t = BRIEF_TEMPLATES.find(x => x.id === templateId);
  if (!t) return;
  const vars = buildBriefVars();
  if (!vars.empfaenger_email) { showToast('Empfänger E-Mail fehlt.', 'error'); return; }
  if (!vars.aktenzeichen) { showToast('Aktenzeichen fehlt.', 'error'); return; }

  try {
    const html = await ladeBriefTemplateHtml(t.file);
    const html_body = replacePlaceholders(html, vars);
    const betreff = `${t.name} · ${vars.aktenzeichen}`;

    await fetch(WEBHOOK_K1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: t.id,
        empfaenger_email: vars.empfaenger_email,
        betreff,
        html_body,
        aktenzeichen: vars.aktenzeichen,
        sv_name: vars.sv_name,
        sv_email: vars.sv_email,
        sv_strasse: vars.sv_strasse,
        sv_plz: vars.sv_plz,
        sv_ort: vars.sv_ort,
        sv_telefon: vars.sv_telefon,
        sv_qualifikation: vars.sv_qualifikation,
        sv_ihk_hwk: vars.sv_ihk_hwk,
        empfaenger_name: vars.empfaenger_name,
        empfaenger_strasse: vars.empfaenger_strasse,
        empfaenger_plz: vars.empfaenger_plz,
        empfaenger_ort: vars.empfaenger_ort,
        datum: vars.datum
      })
    });
    showToast('Brief versendet.', 'success');
  } catch (e) {
    console.error(e);
    showToast('Versand fehlgeschlagen.', 'error');
  }
};

window.speichereAktennotiz = async function(templateId) {
  if (templateId !== 'H-01') return;
  const vars = buildBriefVars();
  if (!vars.aktenzeichen) { showToast('Aktenzeichen fehlt.', 'error'); return; }
  try {
    const html = await ladeBriefTemplateHtml('aktennotiz.html');
    const note = replacePlaceholders(html, vars)
      .replace(/<[^>]*>/g, '') // sehr einfache Text-Extraktion
      .trim();
    const findPath = `/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?filterByFormula=${encodeURIComponent(`OR({Schadensnummer}=\"${vars.aktenzeichen}\",{Aktenzeichen}=\"${vars.aktenzeichen}\")`)}&maxRecords=1`;
    const data = await airtableProxy('GET', findPath);
    const rec = (data.records || [])[0];
    if (!rec) { showToast('Fall nicht gefunden (Airtable).', 'error'); return; }

    const existing = (rec.fields?.Aktennotiz || rec.fields?.Notiz || rec.fields?.Notizen || '').trim();
    const stamp = new Date().toLocaleString('de-DE');
    const newEntry = `[${stamp}] ${note}`;
    const combined = existing ? (newEntry + '\n\n---\n\n' + existing) : newEntry;

    const patchPath = `/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}/${rec.id}`;
    await airtableProxy('PATCH', patchPath, { fields: { Aktennotiz: combined } });
    showToast('Aktennotiz gespeichert.', 'success');
  } catch (e) {
    console.error(e);
    showToast('Aktennotiz konnte nicht erstellt werden.', 'error');
  }
};

/* STEP NAVIGATION */
window.goToStep = function(n) {
  try { TRACKING.schritt(n); } catch(e) {}
  if (n === 1) { try { TRACKING.starte(); } catch(e) {} }
  // Bei Schritt 2: wenn neue AZ → alten Diktat-Kontext löschen
  if (n === 2) {
    var neueAz = document.getElementById('f-schadensnummer')?.value || '';
    var alteAz = localStorage.getItem('prova_letztes_az') || '';
    if (neueAz && neueAz !== alteAz) {
      localStorage.removeItem('prova_transkript');
      localStorage.removeItem('prova_messwerte');
      localStorage.removeItem('prova_entwurf_text');
      localStorage.removeItem('prova_stellungnahme_text');
      window.transcriptText = '';
      var taEl = document.getElementById('transcriptArea');
      if (taEl) taEl.innerHTML = '';
    }
    setTimeout(updateStep2Panel, 100);
  }
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById('step' + i + '-content');
    if (el) el.style.display = (i === n) ? 'block' : 'none';
  }
  for (let i = 1; i <= 5; i++) {
    const s = document.getElementById('step-' + i);
    if (!s) continue;
    s.classList.toggle('active', i === n);
    s.classList.toggle('done', i < n);
  }
  for (let i = 1; i <= 4; i++) document.getElementById('conn-' + i)?.classList.toggle('done', i < n);
  if (n === 2) {
    var az = document.getElementById('f-schadensnummer')?.value?.trim()
           || sessionStorage.getItem('prova_current_az')
           || localStorage.getItem('prova_letztes_az') || '—';
    var sa = document.getElementById('f-schadenart')?.value
           || sessionStorage.getItem('prova_current_schadenart')
           || localStorage.getItem('prova_current_schadenart') || '—';
    var str = document.getElementById('f-strasse')?.value || '';
    var plz = document.getElementById('f-plz')?.value || '';
    var ort = document.getElementById('f-ort')?.value || '';
    var adr = [str, plz, ort].filter(Boolean).join(', ')
           || sessionStorage.getItem('prova_current_objekt')
           || localStorage.getItem('prova_current_objekt') || '—';
    var ag = document.getElementById('f-auftraggeber-name')?.value?.trim()
           || localStorage.getItem('prova_letzter_auftraggeber') || '—';
    var elAz = document.getElementById('step2-az'); if (elAz) elAz.textContent = az;
    var elSa = document.getElementById('step2-schadenart'); if (elSa) elSa.textContent = sa;
    var elAdr = document.getElementById('step2-adresse'); if (elAdr) elAdr.textContent = adr;
    var elAg = document.getElementById('step2-auftraggeber'); if (elAg) elAg.textContent = ag;
    try { window.updateMesswerteLayout(); } catch(e) {}
  }
  window.scrollTo(0, 0);
};

/* VALIDIERUNG SCHRITT 1 — exakt wie alte Version */
window.weiterZuSchritt2 = function() {
  let ok = true;
  const log = [];
  document.querySelectorAll('input,select').forEach(el => el.blur());

  // Hilfsfunktion: Feld + Fehlermeldung prüfen
  function chk(id, eid) {
    const el = document.getElementById(id);
    const em = document.getElementById(eid);
    if (!el) { log.push(id + ': ELEMENT NICHT GEFUNDEN'); return; }
    const val = el.value || '';
    if (!val.trim()) {
      el.classList.add('err');
      if (em) em.classList.add('on');
      ok = false;
      log.push(id + ': LEER (blockiert)');
    } else {
      el.classList.remove('err');
      if (em) em.classList.remove('on');
      log.push(id + ': OK = "' + val.substring(0,30) + '"');
    }
  }

  chk('f-schadenart',        'e-schadenart');
  chk('f-auftraggeber-name', 'e-auftraggeber-name');
  chk('f-strasse',           'e-strasse');
  chk('f-plz',               'e-plz');
  chk('f-ort',               'e-ort');
  // E-Mail: nur warnen wenn vorhanden aber ungültig — kein Hard-Block bei leer
  var mailEl = document.getElementById('f-auftraggeber-email');
  var mailEm = document.getElementById('e-auftraggeber-email');
  if (mailEl && mailEl.value.trim() && !mailEl.value.includes('@')) {
    mailEl.classList.add('err');
    if (mailEm) { mailEm.textContent = 'Bitte gültige E-Mail eingeben'; mailEm.classList.add('on'); }
    ok = false;
    log.push('E-Mail: kein @ Zeichen');
  }

  // Zeige immer was passiert
  console.log('PROVA Validierung:', log.join(' | '), '| ok=', ok);
  // DEBUG-ALERT ENTFERNT: blockiert Netlify-Deployments und Popup-Blocker

  if (!ok) {
    showToast('Bitte alle Pflichtfelder ausfüllen.', 'error');
    const firstErr = document.querySelector('.err, .field-error.on');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  goToStep(2);
};

/* ============================================================
   VERSICHERUNGS-LISTE FÜR AUTOCOMPLETE
============================================================ */
const VERSICHERUNGEN = [
  'Allianz','AXA','Zurich','Generali','R+V Versicherung','Talanx / HDI','Münchener Rück','Hannover Rück','Ergo',
  'Continentale','Debeka','HUK-Coburg','LVM','DEVK','Württembergische','Gothaer','Barmenia','Signal Iduna',
  'Nürnberger','Provinzial','VGH','Öffentliche','Bayerische','Alte Leipziger','Condor','Arag',
  'Roland Rechtsschutz','DA Direkt','CosmosDirekt','Helvetia','Basler','Inter','Mecklenburgische',
  'Concordia','Rhion','Adam Riese','Friday','Wefox','Hiscox','Chubb','Aon','Marsh','Willis Towers Watson'
].sort();

/* Placeholder je nach Typ anpassen; Versicherung = Autocomplete, sonst Freitext */
window.switchAuftraggeberTyp = function(val) {
  const input = document.getElementById('f-auftraggeber-name');
  const drop = document.getElementById('ag-dropdown');
  if (input) {
    input.value = '';
    if (val === 'Versicherung') {
      input.placeholder = 'Versicherung suchen… (z.B. Allianz, AXA)';
    } else if (val === 'Privatperson' || val === 'Anwaltskanzlei' || val === 'Gericht' || val === 'Bauherr' || val === 'Wohnungsbaugesellschaft' || val === 'Sonstiges') {
      input.placeholder = 'Name oder Firma eingeben';
    } else {
      input.placeholder = 'Name oder Firma eingeben';
    }
  }
  if (drop) { drop.innerHTML = ''; drop.style.display = 'none'; }
};

/* Autocomplete — nur bei Typ Versicherung; Klick auf Vorschlag füllt Feld und schließt Dropdown */
window.handleAuftraggeberInput = function(val) {
  const typ = document.getElementById('f-auftraggeber-typ')?.value;
  const drop = document.getElementById('ag-dropdown');
  if (!drop) return;
  if (typ !== 'Versicherung' || !val.trim()) { drop.innerHTML = ''; drop.style.display = 'none'; return; }
  const filtered = VERSICHERUNGEN.filter(function(v) { return v.toLowerCase().includes(val.toLowerCase()); });
  if (!filtered.length) { drop.innerHTML = ''; drop.style.display = 'none'; return; }
  drop.innerHTML = filtered.map(function(v) {
    const escaped = String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    return '<div style="padding:9px 14px;cursor:pointer;font-size:.85rem;border-bottom:1px solid #F3F4F6" onmousedown="document.getElementById(\'f-auftraggeber-name\').value=\'' + escaped + '\';document.getElementById(\'ag-dropdown\').style.display=\'none\';document.getElementById(\'ag-dropdown\').innerHTML=\'\';" onmouseover="this.style.background=\'#EFF6FF\'" onmouseout="this.style.background=\'\'">' + v + '</div>';
  }).join('');
  drop.style.display = 'block';
};

document.getElementById('f-auftraggeber-typ')?.addEventListener('change', function() {
  window.switchAuftraggeberTyp(this.value);
});

/* ENTWURF SPEICHERN */
window.speichereEntwurf = function() {
  showToast('Entwurf lokal gespeichert.', 'success');
};

/* ============================================================
   FOTO-UPLOAD MIT KOMPRIMIERUNG (Canvas API)
============================================================ */
let fotos = [];

const uploadZone = document.getElementById('uploadZone');
if (uploadZone) {
  on(uploadZone, 'dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  on(uploadZone, 'dragleave', () => uploadZone.classList.remove('dragover'));
  on(uploadZone, 'drop', e => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    verarbeiteFotos(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')));
  });
}
on(document.getElementById('fotoInput'), 'change', e => {
  verarbeiteFotos(Array.from(e.target.files));
  e.target.value = '';
});
on(document.getElementById('fotoKameraInput'), 'change', e => {
  verarbeiteFotos(Array.from(e.target.files));
  e.target.value = '';
});

async function komprimiereBild(file, maxW = 1920, maxH = 1920, qual = 0.82) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW / w, maxH / h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          const r2 = new FileReader();
          r2.onload = e2 => resolve({ dataUrl: e2.target.result, size: blob.size, w, h });
          r2.readAsDataURL(blob);
        }, 'image/jpeg', qual);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function verarbeiteFotos(files) {
  if (fotos.length + files.length > 20) {
    showToast('Maximal 20 Fotos.', 'warning');
    files = files.slice(0, 20 - fotos.length);
  }
  if (!files.length) return;
  const statusEl = document.getElementById('uploadStatus');
  const statusText = document.getElementById('uploadStatusText');
  if (statusEl) statusEl.style.display = 'flex';
  let gespart = 0;
  for (let i = 0; i < files.length; i++) {
    if (statusText) statusText.textContent = `Foto ${i+1} von ${files.length} wird optimiert…`;
    const orig = files[i].size;
    const res = await komprimiereBild(files[i]);
    gespart += orig - res.size;
    const fotoIdx = fotos.length;
    fotos.push({ dataUrl: res.dataUrl, caption: '', origSize: orig, compSize: res.size, captionLoading: true });
    renderFotoGrid();
    autoCaption(fotoIdx);
  }
  if (statusEl) statusEl.style.display = 'none';
  showToast(`${files.length} Foto${files.length>1?'s':''} optimiert — ${Math.round(gespart/1024)} KB gespart.`, 'success');
}

/* AUTO-CAPTION: Foto-Beschriftung via GPT-4o Vision (Magic Moment)
   Nutzt foto-captioning.js Function für strukturierte Metadaten              */
async function autoCaption(idx) {
  var foto = fotos[idx];
  if (!foto || !foto.dataUrl) return;

  var b64  = foto.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
  var mime = (foto.dataUrl.match(/^data:(image\/[a-z]+);base64,/) || [])[1] || 'image/jpeg';
  var az   = document.getElementById('f-schadensnummer')?.value
             || localStorage.getItem('prova_letztes_az') || '';
  var schadenart = (document.getElementById('f-schadenart') || {}).value || '';

  try {
    var res = await fetch('/.netlify/functions/foto-captioning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: b64,
        mediaType: mime,
        aktenzeichen: az,
        schadensart: schadenart
      })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();

    if (data.success && data.metadata && fotos[idx]) {
      var meta = data.metadata;
      var caption = meta.beschriftung || '';

      // Caption ins Foto-Objekt + Input-Feld
      fotos[idx].caption = caption;
      fotos[idx].captionLoading = false;
      fotos[idx].metadata = meta; // Volle Metadaten speichern

      var inp = document.getElementById('foto-cap-' + idx);
      if (inp) {
        inp.value = caption;
        inp.placeholder = 'Beschriftung…';
        // Grünes Aufleuchten = Magic Moment
        inp.style.background = 'rgba(34,197,94,0.12)';
        inp.style.borderRadius = '4px';
        setTimeout(function() {
          if(inp) { inp.style.background = 'transparent'; }
        }, 2500);
      }

      // Badge mit Schadensart + Schweregrad unter dem Foto anzeigen
      var badgeEl = document.getElementById('foto-badge-' + idx);
      if (badgeEl && meta.schadensart) {
        var farbe = {gering:'#22c55e',mittel:'#f59e0b',schwer:'#ef4444',kritisch:'#dc2626'}[meta.schweregrad] || '#6b7280';
        badgeEl.innerHTML = '<span style="background:'+farbe+'22;color:'+farbe+';border:1px solid '+farbe+'44;border-radius:4px;font-size:9px;font-weight:700;padding:1px 5px;">'
          + meta.schadensart + (meta.schweregrad ? ' · ' + meta.schweregrad : '') + '</span>';
      }

      // Alle Foto-Metadaten in localStorage persistieren (für Bildarchiv später)
      try {
        var stored = JSON.parse(localStorage.getItem('prova_foto_metadata_' + az) || '[]');
        stored.push({ idx: idx, az: az, datum: new Date().toISOString(), ...meta });
        localStorage.setItem('prova_foto_metadata_' + az, JSON.stringify(stored.slice(-50)));
      } catch(e) {}
    }
  } catch(e) {
    if (fotos[idx]) fotos[idx].captionLoading = false;
    var inp = document.getElementById('foto-cap-' + idx);
    if (inp) { inp.placeholder = 'Beschriftung…'; inp.style.background = 'transparent'; }
    console.warn('[PROVA] Foto-Captioning Fehler:', e.message);
  }
}


function renderFotoGrid() {
  const grid = document.getElementById('fotoGrid');
  if (!grid) return;
  var hinweis = document.getElementById('fotoKeineHinweis');
  if (hinweis) hinweis.style.display = fotos.length > 0 ? 'none' : 'block';
  // Export-Button zeigen/verstecken
  var exportBtn = document.getElementById('fotoAnlageBtn');
  if (exportBtn) exportBtn.style.display = fotos.length > 0 ? 'flex' : 'none';

  updateStep2Panel();
  grid.innerHTML = fotos.map((f, i) => `
    <div style="position:relative;border-radius:.5rem;overflow:hidden;background:var(--gray-100);border:1px solid var(--gray-200)">
      <img src="${f.dataUrl}" style="width:100%;height:80px;object-fit:cover;display:block" alt="Foto ${i+1}">
      <div style="position:absolute;top:3px;left:3px;background:rgba(0,0,0,.7);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px;">Foto ${i+1}</div>
      <button onclick="entferneFoto(${i})" style="position:absolute;top:3px;right:3px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.6);color:white;border:none;cursor:pointer;font-size:.65rem;display:flex;align-items:center;justify-content:center">×</button>
      <div style="padding:.25rem .375rem">
        <input type="text" id="foto-cap-${i}"
          placeholder="${f.captionLoading ? '⟳ KI analysiert…' : 'Beschriftung…'}"
          value="${f.caption}"
          style="width:100%;font-size:.65rem;border:none;background:${f.captionLoading ? 'rgba(74,144,217,0.08)' : 'transparent'};color:var(--gray-700);outline:none;font-family:inherit;border-radius:3px;padding:1px 2px;transition:background .3s"
          oninput="fotos[${i}].caption=this.value">
        <div id="foto-badge-${i}" style="margin-top:2px;min-height:14px;"></div>
        <div style="font-size:.6rem;color:var(--gray-400)">${Math.round(f.compSize/1024)} KB ${f.origSize>f.compSize?`(-${Math.round((1-f.compSize/f.origSize)*100)}%)`:''}
        </div>
      </div>
    </div>
  `).join('');
}

window.entferneFoto = function(i) { fotos.splice(i,1); renderFotoGrid(); updateStep2Panel(); };

/* ── SCHRITT 2: Rechte Spalte live updaten ───────────────── */
function updateStep2Panel() {
  // Diktat-Status
  // transcriptArea = contenteditable div; transcriptManuell = textarea
  const taEl = document.getElementById('transcriptArea');
  const manuellEl = document.getElementById('transcriptManuell');
  const transkript = (taEl ? taEl.innerText.trim() : '') ||
                     (manuellEl ? manuellEl.value.trim() : '') ||
                     window.transcriptText || '';
  const dotD = document.getElementById('step2-diktat-dot');
  const lblD = document.getElementById('step2-diktat-label');
  const prevD = document.getElementById('step2-diktat-preview');
  if (dotD && lblD) {
    if (transkript.length > 20) {
      dotD.style.background = '#10b981';
      lblD.textContent = transkript.length + ' Zeichen aufgenommen';
      lblD.style.color = '#10b981';
      if (prevD) {
        prevD.style.display = 'block';
        prevD.textContent = transkript.substring(0, 120) + (transkript.length > 120 ? '…' : '');
      }
      // Tipp anpassen
      const tipp = document.getElementById('step2-tipp');
      if (tipp) tipp.textContent = 'Gut! Sie können jetzt die Analyse starten oder weitere Fotos anhängen.';
    } else {
      dotD.style.background = '#f59e0b';
      lblD.textContent = 'Diktat noch leer — bitte sprechen oder eintippen';
      lblD.style.color = '#f59e0b';
    }
  }

  // Foto-Status
  const dotF = document.getElementById('step2-foto-dot');
  const lblF = document.getElementById('step2-foto-label');
  const miniF = document.getElementById('step2-foto-mini');
  if (dotF && lblF) {
    if (fotos && fotos.length > 0) {
      dotF.style.background = '#10b981';
      lblF.textContent = fotos.length + ' Foto' + (fotos.length > 1 ? 's' : '') + ' bereit';
      lblF.style.color = '#10b981';
      // Mini-Vorschau (max 4)
      if (miniF) {
        miniF.style.display = 'flex';
        miniF.innerHTML = fotos.slice(0, 4).map(function(f, i) {
          return '<img src="' + f.dataUrl + '" style="width:40px;height:40px;object-fit:cover;border-radius:5px;border:1px solid rgba(0,0,0,.1);" title="Foto ' + (i+1) + '">';
        }).join('') + (fotos.length > 4 ? '<span style="width:40px;height:40px;border-radius:5px;background:rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gray-500);">+' + (fotos.length-4) + '</span>' : '');
      }
    } else {
      dotF.style.background = '#d1d5db';
      lblF.textContent = 'Keine Fotos — optional';
      lblF.style.color = '';
      if (miniF) miniF.style.display = 'none';
    }
  }
}


/* FOTO-ANLAGE EXPORT als druckbares HTML */
window.exportFotoAnlage = async function() {
  if (!fotos.length) { showToast('Keine Fotos vorhanden.', 'warning'); return; }
  var az = document.getElementById('f-schadensnummer')?.value || localStorage.getItem('prova_letztes_az') || 'Ohne AZ';
  var svName = localStorage.getItem('prova_sv_name') || '';
  var datum = new Date().toLocaleDateString('de-DE');

  // Versuch 1: PdfMonkey (professionelles PDF)
  try {
    showToast('PDF wird generiert…', 'info');
    var res = await fetch('/.netlify/functions/foto-anlage-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aktenzeichen: az, sv_name: svName, datum: datum,
        fotos: fotos.map(function(f) { return { dataUrl: f.dataUrl, caption: f.caption || '' }; })
      })
    });
    if (res.ok) {
      var data = await res.json();
      if (data.success && data.url) {
        window.open(data.url, '_blank');
        showToast('Foto-Anlage PDF erstellt ✓', 'success');
        return;
      }
    }
  } catch(e) { /* Fallback zu Browser-Print */ }

  // Versuch 2: Browser-Print (Fallback)
  var html = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Fotodokumentation – ' + az + '</title>'
    + '<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a1a;}'
    + '.header{text-align:center;padding:20px 0 10px;border-bottom:2px solid #2563eb;margin-bottom:20px;}'
    + '.header h1{font-size:16pt;margin-bottom:4px;}'
    + '.header .sub{font-size:10pt;color:#666;}'
    + '.foto-item{page-break-inside:avoid;margin-bottom:16px;border:1px solid #ddd;border-radius:4px;overflow:hidden;}'
    + '.foto-img{width:100%;max-height:400px;object-fit:contain;display:block;background:#f5f5f5;}'
    + '.foto-caption{padding:8px 12px;font-size:10pt;border-top:1px solid #ddd;display:flex;gap:8px;}'
    + '.foto-nr{font-weight:700;color:#2563eb;white-space:nowrap;}'
    + '.footer{text-align:center;font-size:9pt;color:#999;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;}'
    + '@media print{body{margin:1.5cm;}}'
    + '</style></head><body>'
    + '<div class="header"><h1>Fotodokumentation</h1>'
    + '<div class="sub">Aktenzeichen: ' + az + ' | Datum: ' + datum + (svName ? ' | SV: ' + svName : '') + '</div></div>';

  fotos.forEach(function(f, i) {
    html += '<div class="foto-item">'
      + '<img class="foto-img" src="' + f.dataUrl + '" alt="Foto ' + (i+1) + '">'
      + '<div class="foto-caption"><span class="foto-nr">Foto ' + (i+1) + ':</span><span>' + (f.caption || 'Ohne Beschriftung') + '</span></div>'
      + '</div>';
  });

  html += '<div class="footer">Erstellt mit PROVA Systems | ' + fotos.length + ' Fotos | ' + datum + '</div>';

  // Druckfenster öffnen
  var w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(function() { w.print(); }, 500);
  } else {
    showToast('Pop-up blockiert — bitte Pop-ups erlauben.', 'warning');
  }
};


/* ── Block 7 ── */
/* ── Auto-grow Textareas ── */
(function() {
  function grow(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(80, el.scrollHeight) + 'px';
  }
  function attachGrow(el) {
    if (el.dataset.ag) return;
    el.dataset.ag = '1';
    el.style.overflow = 'hidden';
    el.style.resize = 'none';
    el.addEventListener('input', function() { grow(this); });
    grow(el);
  }
  function initAll() {
    document.querySelectorAll('textarea').forEach(attachGrow);
  }
  document.addEventListener('DOMContentLoaded', initAll);
  new MutationObserver(initAll).observe(document.body || document.documentElement, {childList:true, subtree:true});
})();

/* ── Block 8 ── */
/* ════════════════════════════════════════════════════
   PC KEYBOARD-SHORTCUTS + TOUCH/SWIPE NAVIGATION
   Diktat & Fotos (Step 2)
════════════════════════════════════════════════════ */
(function() {
  /* ── PC: Leertaste = Aufnahme toggle ── */
  document.addEventListener('keydown', function(e) {
    if (document.getElementById('step2-content')?.style.display === 'none') return;
    var activeEl = document.activeElement;
    var isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.contentEditable === 'true');

    // Leertaste = Aufnahme (nur wenn kein Textfeld fokussiert)
    if (e.code === 'Space' && !isInput) {
      e.preventDefault();
      if (typeof toggleRecord === 'function') toggleRecord();
    }
    // Strg+Enter = Analyse starten
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (typeof weiterZuAnalyse === 'function') weiterZuAnalyse();
    }
    // Escape = zurück zu Step 1
    if (e.key === 'Escape') {
      var activeInput = document.activeElement;
      if (!activeInput || activeInput.tagName === 'BODY') {
        if (typeof goToStep === 'function') goToStep(1);
      }
    }
  });

  /* ── Mobile: FAB Sync mit Record-Zustand ── */
  var origToggleRecord = window.toggleRecord;
  if (origToggleRecord) {
    window.toggleRecord = function() {
      origToggleRecord.apply(this, arguments);
      setTimeout(function() {
        var fab = document.getElementById('mobile-rec-fab');
        var recBtn = document.getElementById('recBtn');
        if (fab && recBtn) {
          var isRec = recBtn.classList.contains('recording');
          fab.classList.toggle('recording', isRec);
        }
      }, 50);
    };
  }

  /* ── Mobile: Touch-Swipe für Step-Navigation ── */
  var touchStartX = 0;
  var touchStartY = 0;
  var swipeEl = document.getElementById('step2-content');

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (document.getElementById('step2-content')?.style.display === 'none') return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    // Nur horizontale Swipes auswerten (vertikal = Scroll)
    if (Math.abs(dx) < 60 || Math.abs(dy) > 80) return;
    // Swipe von Textarea/Input ignorieren
    var el = document.elementFromPoint(touchStartX, touchStartY);
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) return;
    // Links-Swipe = Analyse (nur wenn genug Diktat vorhanden)
    if (dx < -60) {
      var diktat = localStorage.getItem('prova_transkript') || '';
      if (diktat.length > 30 && typeof weiterZuAnalyse === 'function') {
        weiterZuAnalyse();
      }
    }
    // Rechts-Swipe = zurück zu Stammdaten
    if (dx > 60 && typeof goToStep === 'function') {
      goToStep(1);
    }
  }, { passive: true });

  /* ── Auto-Save Indikator ── */
  var _saveTimer = null;
  function zeigeStep2AutoSave() {
    var hint = document.getElementById('step2-autosave');
    if (!hint) return;
    hint.style.display = 'flex';
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function() {
      hint.style.display = 'none';
    }, 3500);
  }
  // Hook in Transcript-Changes
  document.addEventListener('input', function(e) {
    if (e.target.id === 'transcriptManuell' || e.target.id === 'transcriptArea' || e.target.id === 'f-bereich') {
      clearTimeout(_saveTimer);
      _saveTimer = setTimeout(zeigeStep2AutoSave, 1500);
    }
  });

  /* ── iOS: Font-Size Fix (verhindert Auto-Zoom beim Fokus) ── */
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.querySelectorAll('input, select, textarea').forEach(function(el) {
      el.style.fontSize = '16px';
    });
  }

})();

/* ── Block 9 ── */
window.PROVA = window.PROVA || {};
PROVA.paket = localStorage.getItem('prova_paket') || 'Solo';
PROVA.isPro = true; // Solo/Team: alle Features für alle
PROVA.isEnterprise = PROVA.paket === 'Team';
PROVA.canUse = function(feature) {
  const proFeatures = ['ki_brieftext','chef_freigabe','auto_erstbericht','auftraggeber_db','foto_erweitert','3_seats'];
  const enterpriseFeatures = ['paragraph_407a','jahresbericht','audit_trail','outbound_webhook','whitelabel','foto_forensik'];
  if (enterpriseFeatures.includes(feature)) return PROVA.isEnterprise;
  if (proFeatures.includes(feature)) return PROVA.isPro;
  return true;
};
PROVA.requirePaket = function(feature, minPaket) {
  if (!PROVA.canUse(feature)) {
    const msg = '🔒 Nur im Team-Paket verfügbar';
    alert(msg + '\n\nPaket upgraden unter Einstellungen → Paket & Features');
    return false;
  }
  return true;
};

// ── GATE: Nach Analyse → §6-Fachurteil ──
/* ── STEP NAVIGATION ── */
function goToStep(n) {
  for (var i = 1; i <= 5; i++) {
    var el = document.getElementById('step' + i + '-content');
    if (el) el.style.display = (i === n) ? 'block' : 'none';
    var circ = document.getElementById('step-' + i);
    if (circ) {
      circ.classList.remove('active','done','completed');
      if (i < n) circ.classList.add('done');
      else if (i === n) circ.classList.add('active');
    }
    var conn = document.getElementById('conn-' + i);
    if (conn) conn.classList.toggle('done', i < n);
  }
  window.scrollTo({top: 0, behavior: 'smooth'});
}
function weiterZuSchritt2() {
  var sa = document.getElementById('f-schadenart');
  if (!sa || !sa.value) {
    if (window.showToast) showToast('Bitte Schadensart wählen', 'warn');
    if (sa) sa.focus();
    return;
  }
  goToStep(2);
}
function weiterZuAnalyse() {
  goToStep(3);
  setTimeout(function() {
    if (typeof sendeWebhook === 'function') sendeWebhook();
  }, 300);
}

function goToGate() {
  var az = localStorage.getItem('prova_letztes_az') || '';
  var sa = localStorage.getItem('prova_schadenart') || '';
  var adr = localStorage.getItem('prova_adresse') || '';
  
  // Kontext für Stellungnahme-Seite setzen
  if (az) sessionStorage.setItem('prova_current_az', az);
  if (sa) sessionStorage.setItem('prova_current_schadenart', sa);
  if (adr) sessionStorage.setItem('prova_current_objekt', adr);
  
  window.location.href = az
    ? 'stellungnahme.html?az=' + encodeURIComponent(az)
    : 'stellungnahme.html';
}

/* ── Block 10 ── */
/* ============================================================
   PROVA OFFLINE MODULE — Ebene 2 + 3 + 4
   IndexedDB Auto-Save, Offline-Queue, Netz-Status-Anzeige
============================================================ */
(function() {
'use strict';

/* ── Konstanten ──────────────────────────────────────────── */
const DB_NAME    = 'prova_offline';
const DB_VERSION = 2;
const STORE_DRAFT = 'entwuerfe';
const STORE_QUEUE = 'offline_queue';
const DRAFT_KEY   = 'aktueller_entwurf';
const AUTOSAVE_INTERVAL_MS = 30000; // 30 Sekunden

/* ── IndexedDB öffnen ────────────────────────────────────── */
let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_DRAFT)) {
        db.createObjectStore(STORE_DRAFT, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

/* ── Entwurf speichern (IDB) ─────────────────────────────── */
async function speichereEntwurfIDB() {
  try {
    // sammleDaten() ist im Haupt-Script definiert
    const daten = window.sammleDaten ? window.sammleDaten() : null;
    if (!daten) return;
    const eintrag = {
      id: DRAFT_KEY,
      daten,
      gespeichert_am: new Date().toISOString()
    };
    const db = await openDB();
    const tx = db.transaction(STORE_DRAFT, 'readwrite');
    tx.objectStore(STORE_DRAFT).put(eintrag);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch (err) {
    // Silent — niemals User-Fehler für Auto-Save werfen
    console.warn('[PROVA IDB] Speichern fehlgeschlagen:', err);
  }
}

/* ── Entwurf laden + Formular befüllen ───────────────────── */
async function ladeUndRestoreEntwurf() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DRAFT, 'readonly');
    const store = tx.objectStore(STORE_DRAFT);
    const req = store.get(DRAFT_KEY);
    const eintrag = await new Promise((res, rej) => {
      req.onsuccess = e => res(e.target.result);
      req.onerror   = rej;
    });
    if (!eintrag || !eintrag.daten) return;

    const d = eintrag.daten;
    const felder = [
      ['f-schadenart',         d.schadenart],
      ['f-schadensnummer',     d.schadensnummer],
      ['f-schadensdatum',      d.schadensdatum],
      ['f-auftraggeber-typ',   d.auftraggeber_typ],
      ['f-auftraggeber-name',  d.auftraggeber_name],
      ['f-ansprechpartner',    d.ansprechpartner],
      ['f-auftraggeber-email', d.auftraggeber_email],
      ['f-strasse',            d.strasse],
      ['f-plz',                d.plz],
      ['f-ort',                d.ort],
      ['f-gebaeudetyp',        d.gebaeudetyp],
      ['f-baujahr',            d.baujahr],
      ['f-geschaedigter',      d.geschaedigter],
      ['f-bereich',            d.bereich],
      ['f-feuchte',            d.feuchtemessung],
      ['f-luftfeuchte',        d.luftfeuchtigkeit],
      ['f-temperatur',         d.temperatur],
      ['f-taupunkt',           d.taupunkt],
      ['f-flaeche',            d.schadensflaeche],
      ['f-tiefe',              d.schadenstiefe],
      ['f-messgeraet',         d.messgeraet],
      ['f-mw-extra',           d.messwerte ? '' : ''],
    ];
    let restored = 0;
    felder.forEach(([id, val]) => {
      if (!val) return;
      const el = document.getElementById(id);
      if (el && !el.value) { el.value = val; restored++; }
    });
    // Transkript wiederherstellen
    if (d.transkript && window.transcriptText === '') {
      window.transcriptText = d.transkript;
      const ta = document.getElementById('transcriptArea');
      if (ta) {
        const p = document.createElement('p');
        p.style.cssText = 'font-family:var(--font-body);font-size:.9375rem;line-height:1.7;color:var(--gray-700);margin-bottom:.5rem';
        p.textContent = d.transkript;
        const empty = ta.querySelector('.transcript-empty');
        if (empty) empty.style.display = 'none';
        ta.appendChild(p);
      }
    }
    if (restored > 0) {
      try { window.updateMesswerteLayout && window.updateMesswerteLayout(); } catch(e) {}
      // Kein Toast bei neuem Fall
      var istNeu = sessionStorage.getItem('prova_neuer_fall') === '1';
      var zeitStr = new Date().toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
      if (istNeu) {
        window.showToast && window.showToast('Start ' + zeitStr + ' Uhr', 'success', 3000);
        sessionStorage.removeItem('prova_neuer_fall');
      } else {
        window.showToast && window.showToast('Wiederaufnahme um ' + zeitStr + ' Uhr', 'default', 4000);
      }
    }
  } catch (err) {
    console.warn('[PROVA IDB] Restore fehlgeschlagen:', err);
  }
}

/* ── Entwurf löschen (nach erfolgreichem Send) ───────────── */
async function löscheEntwurfIDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DRAFT, 'readwrite');
    tx.objectStore(STORE_DRAFT).delete(DRAFT_KEY);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch(err) {
    console.warn('[PROVA IDB] Löschen fehlgeschlagen:', err);
  }
}

/* ── Offline-Queue: Eintrag hinzufügen ───────────────────── */
async function queueHinzufügen(url, payload) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).add({
      url,
      payload,
      erstellt_am: new Date().toISOString(),
      status: 'pending_sync'
    });
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch(err) {
    console.warn('[PROVA Queue] Hinzufügen fehlgeschlagen:', err);
  }
}

/* ── Offline-Queue: Alle pending senden ──────────────────── */
async function sendeOfflineQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    const alle = await new Promise((res, rej) => { req.onsuccess = e => res(e.target.result||[]); req.onerror = rej; });

    for (const eintrag of alle) {
      try {
        const res = await fetch(eintrag.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eintrag.payload)
        });
        if (res.ok) {
          const tx2 = db.transaction(STORE_QUEUE, 'readwrite');
          tx2.objectStore(STORE_QUEUE).delete(eintrag.id);
          await new Promise((res2, rej2) => { tx2.oncomplete = res2; tx2.onerror = rej2; });
        }
      } catch(err) {
        // Noch kein Netz für diesen Eintrag — beim nächsten Mal
      }
    }
  } catch(err) {
    console.warn('[PROVA Queue] Senden fehlgeschlagen:', err);
  }
}

/* ── Webhook-Wrapper: Online → direkt; Offline → Queue ───── */
// Überschreibt sendeWebhook() aus dem Haupt-Script
const _originalSendeWebhook = window.sendeWebhook;

window.sendeWebhookMitOfflineFallback = async function() {
  if (navigator.onLine) {
    return _originalSendeWebhook
      ? _originalSendeWebhook()
      : sendeWebhookOriginal();
  }
  // Offline: In Queue speichern
  if (typeof sammleDaten === 'function') {
    const daten = sammleDaten();
    await queueHinzufügen(
      'https://hook.eu1.make.com/imn2n5xs7j251xicrmdmk17of042pt2t',
      daten
    );
  }
  // UI: Offline-Feedback anzeigen (Schritt 3 bleibt sichtbar)
  const h2 = document.querySelector('#step3-content h2');
  const p  = document.querySelector('#step3-content .ki-header p');
  if (h2) h2.textContent = 'Offline gespeichert';
  if (p)  p.textContent  = 'Daten sind lokal gesichert und werden automatisch übertragen, sobald Sie wieder online sind.';
  const spinner = document.getElementById('kiSpinner');
  if (spinner) spinner.style.display = 'none';
  // Alle Steps als "gesichert" markieren
  ['ki-s1','ki-s2','ki-s3','ki-s4','ki-s5','ki-s6'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'ki-step';
    const icon = el.querySelector('.ki-step-icon');
    if (icon) icon.textContent = '○';
  });
  const box = document.getElementById('kiSuccessBox');
  if (box) { box.style.display = 'block'; }
  window.showToast && window.showToast('Offline — Daten lokal gesichert. Wird automatisch gesendet.', 'warning', 6000);
};

// weiterZuAnalyse patchen damit es den Offline-Wrapper nutzt
const _origWeiterZuAnalyse = window.weiterZuAnalyse;
window.weiterZuAnalyse = async function() {
  // Sync: falls Nutzer direkt im Transkript-Bereich getippt hat
  const ta = document.getElementById('transcriptArea');
  if (ta) window.transcriptText = ta.innerText.trim();
  if (window.diktatMode === 'text') {
    const manuellTa = document.getElementById('transcriptManuell');
    window.transcriptText = (manuellTa && manuellTa.value) ? manuellTa.value.trim() : window.transcriptText;
  }
  if (!(window.transcriptText || '').trim()) {
    window.showToast && window.showToast('Bitte Diktat aufnehmen oder Text eingeben.', 'warning');
    return;
  }
  sessionStorage.setItem('prova_gutachten_vorlage_id',
    typeof defaultVorlageIdBySchadenart === 'function' ? defaultVorlageIdBySchadenart() : 'standard');

  const s2text = document.getElementById('ki-s2-text');
  if (s2text) {
    s2text.style.color = '';
    if ((window.fotos||[]).length > 0) {
      s2text.textContent = window.fotos.length + ' Foto' + (window.fotos.length > 1 ? 's' : '') + ' werden mit der Anfrage übermittelt';
    } else {
      s2text.textContent = 'Keine Fotos — können nachgereicht werden';
      s2text.style.color = 'var(--warning, #F59E0B)';
    }
  }
  if (typeof window.goToStep === 'function') window.goToStep(3);
  await window.sendeWebhookMitOfflineFallback();
};

// Nach erfolgreichem Webhook: Entwurf aus IDB löschen
// Wir wrappen die Erfolgs-Logik in sendeWebhook
const _sendeWebhookUrsprung = window.sendeWebhook;
if (_sendeWebhookUrsprung) {
  window.sendeWebhook = async function() {
    await _sendeWebhookUrsprung();
    // Prüfen ob Erfolg (kiSuccessBox sichtbar)
    const box = document.getElementById('kiSuccessBox');
    if (box && box.style.display !== 'none') {
      await löscheEntwurfIDB();
    }
  };
}

/* ── Netz-Status Badge ───────────────────────────────────── */
function aktualisiereNetBadge(online) {
  const badge = document.getElementById('prova-net-badge');
  const label = document.getElementById('prova-net-label');
  if (!badge || !label) return;

  if (online) {
    badge.className = 'online';
    label.textContent = 'Online';
    // Badge kurz einblenden, dann ausblenden
    clearTimeout(badge._hideTimer);
    badge._hideTimer = setTimeout(() => badge.classList.add('hidden'), 3000);
  } else {
    badge.className = 'offline';
    label.textContent = 'Offline — Daten gesichert';
    clearTimeout(badge._hideTimer);
    // Offline-Badge bleibt dauerhaft sichtbar
  }
}

window.addEventListener('online', async () => {
  aktualisiereNetBadge(true);
  window.showToast && window.showToast('Verbindung wiederhergestellt — Daten werden synchronisiert', 'success', 5000);
  // Queue abarbeiten
  await sendeOfflineQueue();
  // SW informieren (Background Sync triggern)
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'TRIGGER_SYNC' });
  }
});

window.addEventListener('offline', () => {
  aktualisiereNetBadge(false);
  window.showToast && window.showToast('Keine Verbindung — Daten werden lokal gesichert', 'warning', 5000);
});

/* ── Auto-Save: alle Felder + alle 30s ──────────────────── */
let _autoSaveTimer = null;

function startAutoSave() {
  // Alle Formularfelder beobachten
  const felder = document.querySelectorAll('.form-input, .form-select, textarea');
  felder.forEach(el => {
    el.addEventListener('input',  () => speichereEntwurfIDB(), { passive: true });
    el.addEventListener('change', () => speichereEntwurfIDB(), { passive: true });
  });
  // Intervall-Fallback
  _autoSaveTimer = setInterval(speichereEntwurfIDB, AUTOSAVE_INTERVAL_MS);
  // Bei Seitenwechsel (Tab-Wechsel, Fenster minimieren)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') speichereEntwurfIDB();
  });
  // Bei Navigation innerhalb der App (showPage)
  const _origShowPage = window.showPage;
  if (_origShowPage) {
    window.showPage = function(name) {
      speichereEntwurfIDB();
      return _origShowPage(name);
    };
  }
}

/* ── Init: alles starten wenn DOM bereit ─────────────────── */
function init() {
  // IDB Support prüfen
  if (!window.indexedDB) {
    console.warn('[PROVA Offline] IndexedDB nicht verfügbar');
    return;
  }
  // Aktuellen Netz-Status setzen
  aktualisiereNetBadge(navigator.onLine);
  if (!navigator.onLine) {
    // Beim Start offline: Badge sofort zeigen
    const badge = document.getElementById('prova-net-badge');
    if (badge) badge.classList.remove('hidden');
  }
  // Auto-Save starten
  startAutoSave();
  // Entwurf laden (leicht verzögert, damit Formular bereit ist)
  setTimeout(ladeUndRestoreEntwurf, 600);
  // Beim Laden prüfen ob Queue noch Einträge hat (z.B. nach Reload)
  if (navigator.onLine) {
    setTimeout(sendeOfflineQueue, 2000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Public API (für Neues Gutachten Button)
window.PROVA_OFFLINE = {
  speichereEntwurf: speichereEntwurfIDB,
  löscheEntwurf:    löscheEntwurfIDB,
  sendeQueue:       sendeOfflineQueue
};

})(); // Ende IIFE

// ── Kontakt-Picker ──
function oeffneKontaktPicker() {
  var popup = window.open(
    'kontakte.html?modus=quickimport&return='+encodeURIComponent(window.location.pathname.split('/').pop()),
    'PROVA_Kontakte', 'width=540,height=680,scrollbars=yes,resizable=yes'
  );
  window.addEventListener('message', function handler(e) {
    if (e.data && e.data.type === 'prova_kontakt_import') {
      var k = e.data.kontakt;
      var nameEl = document.getElementById('f-auftraggeber-name');
      var typEl = document.getElementById('f-auftraggeber-typ');
      var emailEl = document.getElementById('f-auftraggeber-email');
      var anspEl = document.getElementById('f-ansprechpartner');
      if (nameEl) { nameEl.value = k.auftraggeber_name||''; nameEl.dispatchEvent(new Event('input')); }
      if (typEl) { typEl.value = k.auftraggeber_typ||''; typEl.dispatchEvent(new Event('change')); }
      if (emailEl) { emailEl.value = k.auftraggeber_email||''; }
      if (anspEl) { anspEl.value = k.ansprechpartner||''; }
      window.removeEventListener('message', handler);
      if (popup && !popup.closed) popup.close();
    }
  });
}

/* ── NORMEN AUTO-VORSCHLAG ── */
var NORMEN_DB=[
  {n:"DIN 4108-2",t:"Wärmeschutz und Energie-Einsparung in Gebäuden – Mindestanforderungen",k:["mindestanforderungen", "energie-einsparung", "wärmeschutz", "gebäuden"],g:"Mindestoberflächentemperaturfaktor fRsi ≥ 0,70 bei Wohngebäu"},
  {n:"DIN 4108-3",t:"Wärmeschutz und Energie-Einsparung – Klimabedingter Feuchteschutz",k:["feuchteschutz", "energie-einsparung", "klimabedingter", "wärmeschutz"],g:"Tauwassermenge an Dampfsperre max. 1,0 kg/m² je Tauperiode |"},
  {n:"DIN 4108-7",t:"Wärmeschutz – Luftdichtheit von Gebäuden",k:["luftdichtheit", "wärmeschutz", "gebäuden"],g:"n50-Wert ≤ 3,0 h⁻¹ ohne RLT | n50-Wert ≤ 1,5 h⁻¹ mit RLT nac"},
  {n:"DIN EN ISO 13788",t:"Wärme- und feuchtetechnisches Verhalten von Bauteilen – Raumseitige Oberflächent",k:["wärme-", "raumseitige", "bauteilen", "feuchtetechnisches", "oberflächentemperatur", "verhalten"],g:"fRsi ≥ 0,70 für normales Wohnklima (20°C/50% rF) | Kritische"},
  {n:"DIN EN 13187",t:"Wärmetechnisches Verhalten von Gebäuden – Nachweis von Wärmebrücken (Thermografi",k:["gebäuden", "wärmetechnisches", "(thermografie)", "wärmebrücken", "nachweis", "verhalten"],g:"Mindest-Temperaturdifferenz innen/außen ΔT ≥ 10 K für verwer"},
  {n:"DIN 18533",t:"Abdichtung von erdberührten Bauteilen",k:["bauteilen", "erdberührten", "abdichtung"],g:"Lastfall W1-E (Bodenfeuchte) bis W4-E (aufstauendes Sickerwa"},
  {n:"DIN 18534",t:"Abdichtung von Innenräumen",k:["innenräumen", "abdichtung"],g:"Beanspruchungsklasse A0 (gelegentlich nass) bis A3 (häufig n"},
  {n:"DIN 18531",t:"Abdichtung von Dächern und anderen Flächen",k:["dächern", "flächen", "anderen", "abdichtung"],g:"Mindest-Abdichtungsdicke Bitumenbahnen 2-lagig ≥ 6 mm | Foli"},
  {n:"DIN 18550",t:"Planung, Zubereitung und Ausführung von Innen- und Außenputzsystemen",k:["innen-", "außenputzsystemen", "ausführung", "zubereitung", "planung"],g:"Mindestdicke Unterputz 10 mm | Mindestdicke Außenputz 15 mm "},
  {n:"DIN 18353",t:"Estricharbeiten (VOB Teil C)",k:["estricharbeiten"],g:"Belegreife Zementestrich CM-Wert ≤ 2,0 % | Anhydritestrich ≤"},
  {n:"DIN 18202",t:"Toleranzen im Hochbau",k:["hochbau", "toleranzen"],g:"Ebenheitstoleranz Fußboden mit Bodenbelag: max. 5 mm bei 4 m"},
  {n:"DIN 68800-1",t:"Holzschutz – Teil 1: Allgemeines",k:["holzschutz", "allgemeines"],g:"Gebrauchsklasse GK 0 (kein Kontakt mit Feuchte) bis GK 5 (st"},
  {n:"DIN 68800-2",t:"Holzschutz – Teil 2: Vorbeugende bauliche Maßnahmen",k:["vorbeugende", "bauliche", "holzschutz", "maßnahmen"],g:"Holzfeuchte bei Einbau max. 20 % | Dauerfeuchte im Einbauzus"},
  {n:"DIN 68800-4",t:"Holzschutz – Teil 4: Bekämpfende Maßnahmen",k:["maßnahmen", "holzschutz", "bekämpfende"],g:"Erkennbarer Schimmelpilzbefall an Holz ist ab Befall sanieru"},
  {n:"DIN 18338",t:"Dachdeckungsarbeiten (VOB Teil C)",k:["dachdeckungsarbeiten"],g:"Mindestdachneigung Tonziegel ab 22° | Betondachstein ab 15° "},
  {n:"DIN 18460",t:"Dachentwässerungsarbeiten (VOB Teil C)",k:["dachentwässerungsarbeiten"],g:"Rinnengefälle mindestens 3 mm/m (0,3%) | Niederschlagsintens"},
  {n:"DIN 1946-6",t:"Raumlufttechnik – Lüftung von Wohnungen",k:["lüftung", "wohnungen", "raumlufttechnik"],g:"Lüftungsstufe 1 (Feuchteschutz) bis Lüftungsstufe 4 (Intensi"},
  {n:"DIN 4109",t:"Schallschutz im Hochbau",k:["schallschutz", "hochbau"],g:"Mindest-Luft-Schalldämmmaß R'w ≥ 53 dB zwischen Wohnungen | "},
  {n:"DIN EN ISO 140",t:"Schallschutzmessungen im Gebäude",k:["schallschutzmessungen", "gebäude"],g:"Messunsicherheit Feld ca. ±2 dB | mindestens 5 Frequenzbände"},
  {n:"DIN VDE 0100",t:"Errichten von Niederspannungsanlagen",k:["errichten", "niederspannungsanlagen"],g:"Isolationswiderstand ≥ 1 MΩ bei 500V Prüfspannung | RCCB-Aus"},
  {n:"DIN EN 14604",t:"Rauchwarnmelder",k:["rauchwarnmelder"],g:"Rauchwarnmelder müssen DIN EN 14604 entsprechen | Standzeit "},
  {n:"DIN 4102-4",t:"Brandverhalten von Baustoffen – Teil 4: Klassifizierung",k:["klassifizierung", "baustoffen", "brandverhalten"],g:"Baustoffklasse A1/A2 (nicht brennbar) bis B3 (leicht entflam"},
  {n:"DIN EN 13501-1",t:"Klassifizierung von Bauprodukten und Bauarten – Brandverhalten",k:["bauarten", "bauprodukten", "klassifizierung", "brandverhalten"],g:"Euroklasse A1/A2 (nichtbrennbar) bis F (brennbar) | s1 (kein"},
  {n:"DIN 14675",t:"Brandmeldeanlagen – Planung und Einbau",k:["einbau", "brandmeldeanlagen", "planung"],g:"BMA muss nach DIN 14675 geplant und von anerkanntem Errichte"},
  {n:"WTA 2-9-04/D",t:"Sanierputzsysteme (WTA-Merkblatt)",k:["sanierputzsysteme", "(wta-merkblatt)"],g:"Wasseraufnahme Sanierputz w ≤ 0,5 kg/(m²·h⁰˙⁵) | Wasserdampf"},
  {n:"WTA 6-3-05/D",t:"Wärmebrücken – Planung und Bewertung",k:["bewertung", "wärmebrücken", "planung"],g:"Temperaturfaktor fRsi ≥ 0,70 für Wohnbedingungen Normklima |"},
  {n:"UBA-Leitfaden",t:"Schimmelpilze in Innenräumen (Umweltbundesamt Leitfaden)",k:["leitfaden)", "(umweltbundesamt", "schimmelpilze", "innenräumen"],g:"Schimmelbefall >0,5 m² in Wohnräumen gilt als erheblicher Ma"},
  {n:"VDI 6022",t:"Raumlufttechnik – Hygieneanforderungen",k:["hygieneanforderungen", "raumlufttechnik"],g:"Lüftungsanlage nach >2 Jahren ohne Reinigung gilt als hygien"},
  {n:"DIN ISO 16000-1",t:"Innenraumluftverunreinigungen – Probenahmestrategie",k:["innenraumluftverunreinigungen", "probenahmestrategie"],g:"Mindestprobenahmezeitraum 8 h für integrierende Probenahme |"},
  {n:"DIN ISO 16000-17",t:"Innenraumluft – Nachweis und Zählung von Schimmelpilzen",k:["schimmelpilzen", "innenraumluft", "nachweis", "zählung"],g:"Keine gesetzlichen Grenzwerte | Orientierungswerte: Belastun"},
  {n:"DIN EN ISO 12572",t:"Wärme- und feuchtetechnisches Verhalten von Baustoffen – Bestimmung der Wasserda",k:["bestimmung", "wärme-", "wasserdampfdurchlässigkeit", "baustoffen", "feuchtetechnisches", "verhalten"],g:"µ-Wert Mineralwolle ca. 1 | Holz 40-200 | PE-Folie >100.000 "},
  {n:"DIN EN ISO 6946",t:"Bauteile – Wärmedurchlasswiderstand und Wärmedurchgangskoeffizient",k:["wärmedurchgangskoeffizient", "wärmedurchlasswiderstand", "bauteile"],g:"U-Wert Außenwand Neubau nach GEG max. 0,24 W/(m²K) | Fenster"},
  {n:"GEG 2024",t:"Gebäudeenergiegesetz",k:["gebäudeenergiegesetz"],g:"U-Wert Außenwand ≤ 0,24 W/(m²K) | Dach ≤ 0,20 | Kellerdecke "},
  {n:"DIN 1053-1",t:"Mauerwerk – Berechnung und Ausführung",k:["mauerwerk", "ausführung", "berechnung"],g:"Druckfestigkeit Mauerstein MZ je nach Klasse | Mindestwanddi"},
  {n:"DIN EN 1992-1-1",t:"Eurocode 2 – Bemessung von Stahlbetontragwerken",k:["stahlbetontragwerken", "bemessung", "eurocode"],g:"Betondeckung Mindestmaß cmin nach Expositionsklasse | XC1 (t"},
  {n:"DIN EN ISO 14688",t:"Benennung und Beschreibung von Boden",k:["boden", "beschreibung", "benennung"],g:"Bodenklassifikation nach Korngröße | Schotterböden >63mm | K"},
  {n:"DIN 4095",t:"Dränung zum Schutz baulicher Anlagen",k:["dränung", "schutz", "baulicher", "anlagen"],g:"Filterkies Permeabilität k ≥ 1×10⁻⁴ m/s | Drainageleitung Ge"},
  {n:"DIN 18157",t:"Ausführung von Fliesenarbeiten (VOB Teil C)",k:["ausführung", "fliesenarbeiten"],g:"Zugfestigkeit Untergrund ≥ 1,0 N/mm² | Restfeuchte Zementest"},
  {n:"DIN EN 13813",t:"Estrichmörtel, Estrichmassen und Estriche",k:["estriche", "estrichmörtel", "estrichmassen"],g:"Druckfestigkeit CT C25 ≥ 25 N/mm² | Biegezugfestigkeit F4 ≥ "},
  {n:"DIN 18180",t:"Gipskartonplatten – Arten und Anforderungen",k:["arten", "gipskartonplatten", "anforderungen"],g:"GKF (feuchtbeständig) für Nassräume | GKB (Standard) nur in "},
  {n:"VOB/B §13",t:"Mängelansprüche",k:["mängelansprüche"],g:"Gewährleistung Bauwerk 4 Jahre | bewegliche Sachen 2 Jahre |"},
  {n:"VOB/B §4",t:"Ausführung von Bauleistungen",k:["ausführung", "bauleistungen"],g:"Prüf- und Hinweispflicht vor Ausführung | bei fehlender Anze"},
  {n:"VOB/B §17",t:"Sicherheitsleistung",k:["sicherheitsleistung"],g:"Höhe Sicherheitsleistung max. 10% der Auftragssumme | Bürgsc"},
  {n:"ZPO §404",t:"Auswahl des Sachverständigen",k:["sachverständigen", "auswahl"],g:"SV muss für das Fachgebiet öffentlich bestellt oder besonder"},
  {n:"ZPO §407a",t:"Pflichten des Sachverständigen",k:["pflichten", "sachverständigen"],g:"Persönliche Erstattung | keine Delegation | unverzügliche An"},
  {n:"ZPO §411",t:"Schriftliches Gutachten",k:["schriftliches", "gutachten"],g:"Begründungspflicht | Tatsachengrundlage benennen | Schlussfo"},
  {n:"DIN 18195",t:"Bauwerksabdichtungen (Bestandsbau-Referenz, ersetzt durch DIN 18531-18535)",k:["(bestandsbau-referenz", "ersetzt", "durch", "18531-18535)", "bauwerksabdichtungen"],g:"Dickschicht bituminös min. 4 mm | Dünnschicht 2-lagig | Druc"},
  {n:"DIN 55699",t:"WDVS – Wärmedämm-Verbundsysteme",k:["wärmedämm-verbundsysteme"],g:"Haftfestigkeit Dämmplatte am Untergrund ≥ 0,25 N/mm² | Dübel"},
  {n:"ZVDH Fachregeln",t:"Fachregeln für Dachdeckungen – Zentralverband des Deutschen Dachdeckerhandwerks",k:["fachregeln", "dachdeckerhandwerks", "zentralverband", "deutschen", "dachdeckungen"],g:"Mindestüberdeckung Dachziegel nach Dachneigung und Windlastz"},
  {n:"ZVDH Flachdach-Richtlinie",t:"Flachdachrichtlinie des ZVDH",k:["flachdachrichtlinie"],g:"Mindestneigung Flachdach 2% (1,15°) | Mindestaufkantung Dach"},
  {n:"DIN 18330",t:"Mauerarbeiten (VOB Teil C)",k:["mauerarbeiten"],g:"Mindestmörteldicke Lagerfuge 10-15 mm | Stoßfugen vermörtelt"},
  {n:"DIN 18300",t:"Erdarbeiten (VOB Teil C)",k:["erdarbeiten"],g:"Bodenverdichtungsgrad Dpr ≥ 97% (Straße) bzw. 95% (Grundstüc"},
  {n:"DIN EN ISO 4628",t:"Beschichtungen – Beurteilung von Beschichtungsschäden",k:["beschichtungsschäden", "beurteilung", "beschichtungen"],g:"Rostgrad Ri 0 (kein Rost) bis Ri 5 (sehr starker Rost) | Bla"},
  {n:"DIN 18363",t:"Malerarbeiten (VOB Teil C)",k:["malerarbeiten"],g:"Untergrundfeuchte max. 3 CM% für Anstriche | Haftzugfestigke"},
  {n:"DIN 18365",t:"Bodenbelagarbeiten (VOB Teil C)",k:["bodenbelagarbeiten"],g:"CM-Wert Zementestrich ≤ 2,0% | Anhydrit ≤ 0,5% | Ebenheitsab"},
  {n:"DIN 18560",t:"Estriche im Bauwesen",k:["estriche", "bauwesen"],g:"Mindestdicke schwimmender Estrich auf EPS 20mm: 45mm (Zement"},
  {n:"DIN EN 1329",t:"Kunststoff-Rohrleitungssysteme für Ablaufinstallationen",k:["kunststoff-rohrleitungssysteme", "ablaufinstallationen"],g:"Wanddicke nach Druckklasse | Dichtheitsprüfung mit Wasser od"},
  {n:"DIN EN 1057",t:"Kupfer und Kupferlegierungen – Kupferrohre",k:["kupferrohre", "kupfer", "kupferlegierungen"],g:"Mindestwanddicke je Außendurchmesser | Druckprüfung 1,5-fach"},
  {n:"DIN 18540",t:"Abdichten von Außenwandfugen",k:["abdichten", "außenwandfugen"],g:"Fugentiefe/Fugenbreite = 1:1 | Mindestfugenbreite 10 mm | Di"},
  {n:"DIN EN 806",t:"Trinkwasserinstallationen in Gebäuden",k:["trinkwasserinstallationen", "gebäuden"],g:"Fließdruck mind. 1 bar an jeder Entnahmestelle | Druckprüfun"},
  {n:"DIN EN 1264",t:"Fußboden-Heizung und -Kühlung",k:["-kühlung", "fußboden-heizung"],g:"Betriebsdruck Fußbodenheizung 0,5-0,6 MPa | Druckprüfung 1,3"},
  {n:"AVV",t:"Abfallverzeichnis-Verordnung (Entsorgungsnachweis)",k:["(entsorgungsnachweis)", "abfallverzeichnis-verordnung"],g:"Asbest-Abfall (17 06 01*) gefährlicher Abfall | teerhaltiger"},
  {n:"DIN EN ISO 16000-6",t:"Innenraumluftverunreinigungen – VOC-Messung",k:["innenraumluftverunreinigungen", "voc-messung"],g:"Summe VOC (TVOC) Richtwert II (Sanierungsbedarf) = 10 mg/m³ "},
  {n:"DIN EN 13564",t:"Rückstauverschlüsse",k:["rückstauverschlüsse"],g:"Rückstauebene = Straßenoberkante | unterhalb: Rückstauschutz"},
  {n:"DIN EN 12056",t:"Schwerkraftentwässerungsanlagen innerhalb von Gebäuden",k:["schwerkraftentwässerungsanlagen", "innerhalb", "gebäuden"],g:"Dimensionierung nach Bemessungsdurchfluss | Gefälle Leitunge"},
  {n:"DIN 18461",t:"Klempnerarbeiten (VOB Teil C)",k:["klempnerarbeiten"],g:"Blechdicke Zink mind. 0,8 mm | Kupfer 0,6 mm | Anschlusshöhe"},
  {n:"DIN 4102-1",t:"Brandverhalten von Baustoffen – Baustoffklassen",k:["baustoffklassen", "baustoffen", "brandverhalten"],g:"A1 nichtbrennbar (Beton, Ziegel) | B1 schwer entflammbar | B"},
  {n:"VdS 3151",t:"Leitfaden zur Schadensanierung nach Wasser- und Sturmschäden",k:["schadensanierung", "wasser-", "leitfaden", "sturmschäden"],g:"Grenzwert Materialfeuchte vor Trocknungsende je nach Baustof"},
  {n:"DIN EN 14351-1",t:"Fenster und Türen – Produktnorm",k:["fenster", "türen", "produktnorm"],g:"Schlagregenwiderstand Klasse 4A (übliche Wohngebäude) bis E1"},
  {n:"DIN 18055",t:"Fensteranschlüsse – Anforderungen an Wärme- und Feuchteschutz",k:["feuchteschutz", "anforderungen", "fensteranschlüsse", "wärme-"],g:"Innenabdichtung sd ≥ 0,3 m (dampfbremsend) | Außenabdichtung"},
  {n:"DIN EN ISO 9972",t:"Wärmetechnisches Verhalten von Gebäuden – Luftdurchlässigkeit (Blower-Door)",k:["gebäuden", "wärmetechnisches", "(blower-door)", "luftdurchlässigkeit", "verhalten"],g:"Messung bei 50 Pa | n50-Wert in h⁻¹ | q50-Wert in m³/(h·m²)"},
  {n:"DIN EN 15026",t:"Hygrothermische Simulation von Bauteilen",k:["simulation", "hygrothermische", "bauteilen"],g:"Kritische Feuchtegehalt für Schimmelwachstum RH > 80% an Obe"},
  {n:"DIN EN 206",t:"Beton – Festlegung, Eigenschaften, Herstellung",k:["festlegung", "eigenschaften", "herstellung", "beton"],g:"Expositionsklasse XC3/XC4 für Außenbauteile | w/z-Wert ≤ 0,5"},
  {n:"DIN EN 12390",t:"Prüfung von Festbeton",k:["festbeton", "prüfung"],g:"Druckfestigkeit Bohrkern mind. 85% der Würfelfestigkeit | Ko"},
  {n:"DIN EN 771",t:"Festlegungen für Mauersteine",k:["festlegungen", "mauersteine"],g:"Druckfestigkeit Mauerziegel nach Klasse | NM (Normalmörtel) "},
  {n:"DIN EN 1996-1-1",t:"Eurocode 6 – Bemessung und Konstruktion von Mauerwerksbauten",k:["mauerwerksbauten", "konstruktion", "bemessung", "eurocode"],g:"Mindestquerschnitt tragend | Mindestexzentrizität | Wandschl"},
  {n:"DIN 18335",t:"Zimmerarbeiten (VOB Teil C)",k:["zimmerarbeiten"],g:"Holzfeuchte bei Einbau max. 20% | Geradheit ≤ 3 mm/m | Ansch"},
  {n:"DIN VDE 0185-305",t:"Blitzschutz",k:["blitzschutz"],g:"Schutzklasse I bis IV | Maschenweite Fangeinrichtung nach Kl"},
  {n:"DIN 18232",t:"Rauch- und Wärmeabzugsanlagen",k:["rauch-", "wärmeabzugsanlagen"],g:"RWA-Fläche 1% der Grundfläche in Aufenthaltsräumen > 200 m²"},
  {n:"DIN EN 1991-1-4",t:"Eurocode 1 – Einwirkungen auf Tragwerke – Windlasten",k:["tragwerke", "windlasten", "eurocode", "einwirkungen"],g:"Windlastzone Deutschland 1-4 | Böengeschwindigkeitsdruck 0,3"},
  {n:"TRWI",t:"Technische Regeln für Trinkwasserinstallationen",k:["regeln", "trinkwasserinstallationen", "technische"],g:"Stagnationswasser max. 3 Tage | Kaltwasser max. 25°C | Warmw"},
  {n:"DIN 4109-2",t:"Schallschutz im Hochbau – Rechnerische Nachweise",k:["schallschutz", "nachweise", "hochbau", "rechnerische"],g:"Korrekturterm K für Flankenübertragung | Rechenwert ≥ Anford"},
  {n:"DIN 18533-2",t:"Abdichtung erdberührter Bauteile – Teil 2: Bahnenwerkstoffe",k:["erdberührter", "bahnenwerkstoffe", "bauteile", "abdichtung"],g:"Überlappungsbreite Bitumenbahn ≥ 100 mm | Kunststoffbahn ≥ 1"},
  {n:"ZDB-Merkblatt",t:"Verbundabdichtungen – Zentralverband des Deutschen Baugewerbes",k:["baugewerbes", "verbundabdichtungen", "deutschen", "zentralverband"],g:"Verbundabdichtung erforderlich in allen Nassräumen | mind. 1"},
  {n:"DIN EN 998-1",t:"Festlegungen für Mörtel im Mauerwerksbau – Teil 1: Putzmörtel",k:["festlegungen", "mörtel", "putzmörtel", "mauerwerksbau"],g:"CS I (0,4-2,5 N/mm²) bis CS IV (≥ 6 N/mm²) | w-Wert Wasserau"},
  {n:"DIN EN 520",t:"Gipskartonplatten – Anforderungen",k:["gipskartonplatten", "anforderungen"],g:"GKF Feuchtigkeitsbeständigkeit | GKFI Feuerschutz und feucht"},
  {n:"DIN EN 1542",t:"Produkte für den Schutz von Betonbauwerken – Haftfestigkeit",k:["haftfestigkeit", "schutz", "betonbauwerken", "produkte"],g:"Haftzugfestigkeit nach Instandsetzung ≥ 1,5 N/mm² (Klasse B2"},
  {n:"DIN 18532",t:"Abdichtung von befahrbaren Verkehrsflächen",k:["verkehrsflächen", "befahrbaren", "abdichtung"],g:"Mindestdicke Abdichtung 4 mm | Nutzschicht Betonpflaster min"},
  {n:"DIN EN 15651",t:"Fugendichtstoffe für Fassaden und Glasarbeiten",k:["glasarbeiten", "fassaden", "fugendichtstoffe"],g:"Klasse F (Fassade) Bewegungsaufnahme ±25% der Fugenbreite | "},
  {n:"DIN EN 1991-1-3",t:"Eurocode 1 – Einwirkungen auf Tragwerke – Schneelasten",k:["tragwerke", "eurocode", "einwirkungen", "schneelasten"],g:"Schneelastzone Deutschland 1-3 | Charakteristische Schneelas"},
  {n:"DIN 18317",t:"Verkehrswegebauarbeiten – Pflasterdecken (VOB Teil C)",k:["verkehrswegebauarbeiten", "pflasterdecken"],g:"Gefälle Pflasterfläche mind. 1,5% für Wasserableitung | Bett"},
  {n:"DIN 18315",t:"Verkehrswegebauarbeiten – Oberbauschichten (VOB Teil C)",k:["oberbauschichten", "verkehrswegebauarbeiten"],g:"Verdichtungsgrad nach Schicht | Asphalt 97% nach Prüfung"},
  {n:"DIN 18322",t:"Kabelanlagen (VOB Teil C)",k:["kabelanlagen"],g:"Verlegetiefe mind. 0,6 m unter Gelände | Schutzrohr bei mech"},
  {n:"DIN EN ISO 11600",t:"Hochbau – Fugendichtstoffe",k:["fugendichtstoffe", "hochbau"],g:"Fugenbreite 6-40 mm | Dehnung ≥ 25% (Klasse 25) oder 12,5% ("},
  {n:"DIN 18182",t:"Zubehör für die Verarbeitung von Gipskartonplatten",k:["gipskartonplatten", "zubehör", "verarbeitung"],g:"Unterkonstruktion Metallständer C-Profil | Befestigung nach "},
  {n:"DIN 18550-2",t:"Planung und Ausführung von Außenputzsystemen",k:["außenputzsystemen", "ausführung", "planung"],g:"Unterputz mind. 10 mm | Oberputz mind. 5 mm | Deckputz mind."},
  {n:"DIN EN 13914",t:"Außen- und Innenputze",k:["innenputze", "außen-"],g:"Untergrundvorbereitung | Haftbrücke bei glattem Untergrund |"},
  {n:"DIN EN 10255",t:"Stahlrohre für allgemeine Zwecke",k:["stahlrohre", "zwecke", "allgemeine"],g:"Wanddicke und Druckstufe je Rohrdimension | Korrosionsschutz"},
  {n:"DIN EN 12831",t:"Heizungsanlagen in Gebäuden – Raumheizlastberechnung",k:["raumheizlastberechnung", "heizungsanlagen", "gebäuden"],g:"Mindestraumtemperatur 20°C für Wohnräume | 24°C für Bäder"},
  {n:"DIN EN 1627",t:"Türen, Fenster – Einbruchhemmung",k:["einbruchhemmung", "fenster", "türen"],g:"RC2 empfohlen für Wohngebäude | RC3 für erhöhten Einbruchsch"},
  {n:"DIN EN ISO 7730",t:"Ergonomie der thermischen Umgebung",k:["umgebung", "thermischen", "ergonomie"],g:"PMV-Wert (Predicted Mean Vote) -0,5 bis +0,5 für Behaglichke"},
  {n:"DIN 18041",t:"Hörsamkeit in Räumen",k:["räumen", "hörsamkeit"],g:"Nachhallzeit T nach Raumnutzung | Unterrichtsräume T ≤ 0,8 s"},
  {n:"DIN EN ISO 6781",t:"Wärmetechnisches Verhalten von Gebäuden – Qualitative Erkennung von Feuchte",k:["gebäuden", "erkennung", "wärmetechnisches", "qualitative", "feuchte", "verhalten"],g:"Temperaturdifferenz ΔT mind. 10 K | Messabstand und Emission"},
  {n:"DIN 18310",t:"Naturwerksteinarbeiten (VOB Teil C)",k:["naturwerksteinarbeiten"],g:"Druckfestigkeit Naturstein ≥ 60 N/mm² | Biegebruchfestigkeit"},
  {n:"DIN 18200",t:"Übereinstimmungsnachweis für Bauprodukte",k:["übereinstimmungsnachweis", "bauprodukte"],g:"CE-Kennzeichnung mit Leistungserklärung | ÜZ-Zeichen für nat"},
  {n:"DIN EN ISO 13793",t:"Wärmetechnisches Verhalten von Gebäuden – Thermische Gestaltung von Fundamenten",k:["gebäuden", "thermische", "wärmetechnisches", "fundamenten", "gestaltung", "verhalten"],g:"Frostfreie Tiefe in Deutschland 0,8-1,2 m unter GOK je nach "},
  {n:"DIN 18320",t:"Landschaftsbauarbeiten (VOB Teil C)",k:["landschaftsbauarbeiten"],g:"Stammumfang | Wurzelballengröße | Standsicherheitsbeurteilun"},
  {n:"DIN EN 12350",t:"Prüfung von Frischbeton",k:["frischbeton", "prüfung"],g:"Setzmaß nach Konsistenzklasse | Luftgehalt nach Expositionsk"},
  {n:"DIN EN ISO 4628",t:"Beschichtungen – Beurteilung von Beschichtungsschäden (Ergänzungsnorm)",k:["beschichtungsschäden", "(ergänzungsnorm)", "beurteilung", "beschichtungen"],g:"Rostgrad Ri 0 (kein Rost) bis Ri 5 (sehr starker Rost) | Bla"},
  {n:"DIN 18531-3",t:"Abdichtung von Dächern – Teil 3: Stoffe",k:["dächern", "stoffe", "abdichtung"],g:"Bitumendachbahn min. Klasse E3 (3 mm dick, Polyestervlies) |"},
  {n:"DIN 4159",t:"Rohre aus weichmacherfreiem Polyvinylchlorid PVC-U",k:["polyvinylchlorid", "weichmacherfreiem", "rohre", "pvc-u"],g:"Rohrsteifigkeit nach Klasse | Dichtheit nach DIN EN 1401"},
  {n:"DIN EN 1401",t:"Kunststoff-Rohrleitungssysteme – PVC-U für Entwässerung außerhalb von Gebäuden",k:["entwässerung", "gebäuden", "außerhalb", "kunststoff-rohrleitungssysteme", "pvc-u"],g:"Ringsteifigkeit SN 4 (Garten) | SN 8 (Straße) | Dichtheit na"},
  {n:"DIN 18360",t:"Metallbauarbeiten (VOB Teil C)",k:["metallbauarbeiten"],g:"Korrosionsschutzklassen C1-C5 | Beschichtungsdicke nach Klas"},
  {n:"DIN EN 450",t:"Flugasche für Beton",k:["beton", "flugasche"],g:"Glühverlust max. 7% | Feinheit nach Norm"},
  {n:"DIN 18555",t:"Prüfung von Mörteln mit mineralischen Bindemitteln",k:["mineralischen", "mörteln", "prüfung", "bindemitteln"],g:"Frischmörtelkonsistenz | Druckfestigkeit nach 28 Tagen je Mö"},
  {n:"DIN 18252",t:"Steckdosen und Schalter – Einbautoleranzen",k:["einbautoleranzen", "schalter", "steckdosen"],g:"Einbautiefe Unterputz | Lage genau"},
  {n:"DIN EN 1264-4",t:"Fußbodenheizung – Teil 4: Installation",k:["fußbodenheizung", "installation"],g:"Mindestüberdeckung Heizrohr mit Estrich 45 mm | Rohrabstand "},
  {n:"DIN 18531-2",t:"Abdichtung von Dächern – Teil 2: Planung",k:["dächern", "planung", "abdichtung"],g:"Entwässerungsquerschnitt Notüberläufe | Dachablauf Dimension"},
  {n:"DIN EN 12056-3",t:"Schwerkraftentwässerung – Dachentwässerung",k:["dachentwässerung", "schwerkraftentwässerung"],g:"Bemessungsregenspende r5(2) für Standort | Dachabläufe minde"},
  {n:"DIN 4108-10",t:"Wärmeschutz – Anwendungsbezogene Anforderungen an Wärmedämmstoffe",k:["wärmedämmstoffe", "anwendungsbezogene", "anforderungen", "wärmeschutz"],g:"Druckspannungsklasse CS (10) bis CS (100) für druckbelastete"}
];

var _normenTimer = null;
var _normenShown = {};
var _normenToastEl = null;

function initNormenVorschlag() {
  // Toast-Element erstellen
  var toast = document.createElement('div');
  toast.id = 'normen-toast';
  toast.style.cssText = [
    'position:fixed',
    'bottom:80px',
    'right:20px',
    'max-width:360px',
    'background:#1c2537',
    'border:1px solid rgba(79,142,247,.3)',
    'border-radius:12px',
    'padding:14px 16px',
    'box-shadow:0 8px 32px rgba(0,0,0,.4)',
    'z-index:500',
    'display:none',
    'font-family:inherit'
  ].join(';');
  document.body.appendChild(toast);
  _normenToastEl = toast;

  // Alle relevanten Textfelder überwachen
  ['transcriptManuell','f-befund','f-beschreibung'].forEach(function(id) {
    var el = document.getElementById(id);
    if(el) el.addEventListener('input', function() {
      clearTimeout(_normenTimer);
      _normenTimer = setTimeout(function() {
        pruefeNormen(el.value);
      }, 900);
    });
  });

  // Auch contentEditable-Elemente überwachen (KI-Ergebnis, §6-Editor)
  document.addEventListener('input', function(e) {
    if(e.target && e.target.isContentEditable) {
      clearTimeout(_normenTimer);
      _normenTimer = setTimeout(function() {
        pruefeNormen(e.target.innerText);
      }, 1200);
    }
  });
}

function pruefeNormen(text) {
  if(!text || text.length < 20) return;
  var lower = text.toLowerCase();
  var treffer = [];

  NORMEN_DB.forEach(function(norm) {
    if(_normenShown[norm.n]) return;
    var matchCount = 0;
    norm.k.forEach(function(kw) {
      if(kw.length > 3 && lower.indexOf(kw.toLowerCase()) >= 0) matchCount++;
    });
    if(matchCount >= 2 || lower.indexOf(norm.n.toLowerCase()) >= 0) {
      treffer.push({norm: norm, score: matchCount});
    }
  });

  treffer.sort(function(a,b) { return b.score - a.score; });
  treffer = treffer.slice(0, 3);
  if(treffer.length === 0) return;

  var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
    + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#4f8ef7;">📐 Relevante Normen erkannt</div>'
    + '<button onclick="this.closest(\'#normen-toast\').style.display=\'none\'" style="background:none;border:none;color:#6b7a99;cursor:pointer;font-size:16px;padding:2px;">✕</button>'
    + '</div>';

  treffer.forEach(function(t) {
    var norm = t.norm;
    _normenShown[norm.n] = true;
    html += '<div style="margin-bottom:8px;padding:8px 10px;background:rgba(79,142,247,.08);border-radius:8px;">';
    html += '<div style="font-size:12px;font-weight:700;color:#e8eaf0;">' + norm.n + '</div>';
    html += '<div style="font-size:11px;color:#aab4cb;margin:2px 0;line-height:1.4;">' + norm.t + '</div>';
    if(norm.g) html += '<div style="font-size:10px;color:#6b7a99;font-style:italic;margin-top:2px;">' + norm.g + '</div>';
    html += '<div style="display:flex;gap:6px;margin-top:6px;">';
    html += '<button onclick="normEinfuegen(\'' + norm.n.replace(/'/g,"\\'") + '\',\'' + norm.t.replace(/'/g,"\\'") + '\')" ';
    html += 'style="font-size:11px;padding:4px 10px;background:rgba(79,142,247,.2);border:1px solid rgba(79,142,247,.3);border-radius:6px;color:#4f8ef7;cursor:pointer;font-family:inherit;">+ Einfügen</button>';
    html += '<button onclick="normIgnorieren(\'' + norm.n.replace(/'/g,"\\'") + '\')" ';
    html += 'style="font-size:11px;padding:4px 10px;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:6px;color:#6b7a99;cursor:pointer;font-family:inherit;">Ignorieren</button>';
    html += '</div></div>';
  });

  // Link zum Slide-Panel
  html += '<button onclick="PROVA.openPanel(\'normen\');document.getElementById(\'normen-toast\').style.display=\'none\';" '
    + 'style="width:100%;margin-top:6px;padding:7px;background:transparent;border:1px solid rgba(79,142,247,.2);border-radius:7px;color:#4f8ef7;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">'
    + '📚 Alle Normen durchsuchen</button>';

  _normenToastEl.innerHTML = html;
  _normenToastEl.style.display = 'block';

  // Auto-hide nach 15 Sekunden
  setTimeout(function() {
    if(_normenToastEl) _normenToastEl.style.display = 'none';
  }, 15000);
}

function normEinfuegen(normNr, titel) {
  var insert = '\n(gem. ' + normNr + ' – ' + titel + ')';
  // Versuche aktives Textfeld, dann transcriptManuell, dann Clipboard
  var active = document.activeElement;
  if(active && active.tagName === 'TEXTAREA') {
    var pos = active.selectionStart || active.value.length;
    active.value = active.value.slice(0,pos) + insert + active.value.slice(pos);
    active.dispatchEvent(new Event('input', {bubbles:true}));
  } else if(active && active.isContentEditable) {
    document.execCommand('insertText', false, insert);
  } else {
    var ta = document.getElementById('transcriptManuell');
    if(ta) {
      var pos = ta.selectionStart || ta.value.length;
      ta.value = ta.value.slice(0,pos) + insert + ta.value.slice(pos);
      if(typeof syncManuellToTranscript === 'function') syncManuellToTranscript();
    }
  }
  if(_normenToastEl) _normenToastEl.style.display = 'none';
  if(typeof showToast === 'function') showToast('Norm ' + normNr + ' eingefügt ✓', 'success');
}

function normIgnorieren(normNr) {
  _normenShown[normNr] = true;
  // Nächste Norm aus Queue anzeigen (falls vorhanden)
  if(_normenToastEl) _normenToastEl.style.display = 'none';
}

// Init nach DOM-Ready
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(initNormenVorschlag, 500);
});


/* ══════════════════════════════════════════════════════════
   OPTION 4: WEB SPEECH (live) + WHISPER-KORREKTUR
   S11 Webhook: https://hook.eu1.make.com/h019rspppkvc4m146sv1opxs74h9dp3x
   ══════════════════════════════════════════════════════════ */

var WHISPER_WEBHOOK = 'https://hook.eu1.make.com/h019rspppkvc4m146sv1opxs74h9dp3x';
var mediaRecorder = null;
var audioChunks = [];
var whisperLaeuft = false;

/* ── CONSENT CHECK ── */
function whisperConsentOk() {
  return localStorage.getItem('prova_whisper_consent') === '1';
}

function zeigeWhisperConsent(callback) {
  if(whisperConsentOk()) { callback(); return; }
  var overlay = document.createElement('div');
  overlay.id = 'whisper-consent-overlay';
  overlay.style.cssText = [
    'position:fixed','inset:0','z-index:9999',
    'background:rgba(11,18,32,.92)',
    'display:flex','align-items:center','justify-content:center',
    'padding:20px'
  ].join(';');
  overlay.innerHTML = [
    '<div style="background:#1c2537;border:1px solid rgba(79,142,247,.3);border-radius:16px;',
    'padding:28px;max-width:480px;width:100%;font-family:inherit;">',
    '<div style="font-size:24px;margin-bottom:12px;">🎤</div>',
    '<div style="font-size:17px;font-weight:700;color:#e8eaf0;margin-bottom:10px;">',
    'Sprachdiktat aktivieren</div>',
    '<div style="font-size:13px;color:#aab4cb;line-height:1.7;margin-bottom:20px;">',
    'Ihr Diktat wird zur Qualitätsverbesserung an unseren KI-Transkriptionsdienst übermittelt.<br><br>',
    '<strong style="color:#e8eaf0;">Was passiert mit der Aufnahme?</strong><br>',
    '• Audiodaten werden ausschließlich zur Texterkennung verwendet<br>',
    '• Keine dauerhafte Speicherung nach der Transkription<br>',
    '• Übermittlung verschlüsselt (HTTPS)<br>',
    '• Details in unserer <a href="legal/avv.html" target="_blank" style="color:#4f8ef7;">AVV §3.6</a>',
    '</div>',
    '<div style="display:flex;gap:10px;">',
    '<button id="consent-ja" style="flex:1;padding:12px;background:linear-gradient(135deg,#4f8ef7,#3a7be0);',
    'border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">',
    'Verstanden, Diktat starten</button>',
    '<button id="consent-nein" style="padding:12px 18px;background:transparent;',
    'border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#aab4cb;',
    'font-size:13px;cursor:pointer;font-family:inherit;">',
    'Abbrechen</button>',
    '</div></div>'
  ].join('');
  document.body.appendChild(overlay);
  document.getElementById('consent-ja').onclick = function() {
    localStorage.setItem('prova_whisper_consent','1');
    overlay.remove();
    callback();
  };
  document.getElementById('consent-nein').onclick = function() {
    overlay.remove();
  };
}

/* ── WHISPER KORREKTUR ── */
async function starteWhisperKorrektur(audioBlob) {
  if(!audioBlob || audioBlob.size < 1000) return;
  whisperLaeuft = true;

  // Status-Anzeige
  var status = document.getElementById('recStatus');
  if(status) status.textContent = '🔄 KI verfeinert…';

  // Whisper-Badge einblenden
  var badge = document.getElementById('whisper-badge');
  if(badge) badge.style.display = 'flex';

  try {
    // AudioBlob → Base64
    var base64 = await new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) {
        // Data-URL → nur Base64-Teil
        resolve(e.target.result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    // Dateiformat bestimmen
    var filename = 'diktat.webm';
    if(audioBlob.type.includes('mp4')) filename = 'diktat.mp4';
    else if(audioBlob.type.includes('ogg')) filename = 'diktat.ogg';
    else if(audioBlob.type.includes('wav')) filename = 'diktat.wav';

    // An S11 senden
    var resp = await fetch(WHISPER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: base64, filename: filename })
    });

    if(!resp.ok) throw new Error('S11 HTTP ' + resp.status);
    var data = await resp.json();

    if(data.success && data.text && data.text.trim()) {
      // Whisper-Text in Textarea übernehmen
      var ta = document.getElementById('transcriptManuell');
      if(ta) {
        // Whisper-Text ist besser — ersetze den Web-Speech-Text
        ta.value = data.text.trim();
        syncManuellToTranscript && syncManuellToTranscript();

        // Auch transcriptText (globale Variable) updaten
        if(typeof window.transcriptText !== 'undefined') window.transcriptText = data.text.trim();

        // Live-Transcript-Area mit korrigiertem Text updaten
        var area = document.getElementById('transcriptArea');
        if(area) {
          var existing = area.querySelectorAll('p:not(.interim)');
          existing.forEach(function(p) { p.remove(); });
          var p = document.createElement('p');
          p.style.cssText = 'font-family:var(--font-body);font-size:.9375rem;line-height:1.7;color:var(--gray-700);margin-bottom:.5rem';
          p.textContent = data.text.trim();
          var empty = area.querySelector('.transcript-empty');
          if(empty) empty.style.display = 'none';
          area.appendChild(p);
        }
      }

      // Badge: fertig
      if(badge) {
        badge.innerHTML = '<span style="color:#10b981;">✅</span><span>Whisper-Korrektur abgeschlossen</span>';
        setTimeout(function() { badge.style.display='none'; }, 4000);
      }
      if(status) status.textContent = 'Bereit';
    }
  } catch(err) {
    console.warn('Whisper-Korrektur fehlgeschlagen:', err);
    // Kein Fehler für Nutzer — Web-Speech-Text bleibt einfach
    if(badge) badge.style.display = 'none';
    if(status) status.textContent = 'Bereit';
  }

  whisperLaeuft = false;
}

/* ── MEDIACORDER INIT ── */
function starteMediaRecorder(stream) {
  audioChunks = [];
  // Bestes unterstütztes Format wählen
  var mimeType = 'audio/webm;codecs=opus';
  if(!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'audio/webm';
    if(!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/ogg;codecs=opus';
      if(!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
    }
  }
  var opts = mimeType ? { mimeType: mimeType } : {};
  try {
    mediaRecorder = new MediaRecorder(stream, opts);
  } catch(e) {
    mediaRecorder = new MediaRecorder(stream);
  }
  mediaRecorder.ondataavailable = function(e) {
    if(e.data && e.data.size > 0) audioChunks.push(e.data);
  };
  mediaRecorder.onstop = function() {
    if(audioChunks.length > 0) {
      var blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      starteWhisperKorrektur(blob);
    }
  };
  mediaRecorder.start(1000); // Jede Sekunde ein Chunk
}

/* ── 3-MIN LIMIT ── */
var recLimitTimer = null;
function starteAufnahmeLimit() {
  clearTimeout(recLimitTimer);
  recLimitTimer = setTimeout(function() {
    if(isRecording) {
      zeigToast('3-Minuten-Limit erreicht — Aufnahme gestoppt.', 'info');
      stoppeAufnahme();
    }
  }, 3 * 60 * 1000);
}

/* ── Block 11 ── */
/* ── AKTENZEICHEN AUTO-GENERATOR ── */
(function(){
  var KUERZEL = {
    'Schimmelbefall':    'SCH',
    'Wasserschaden':     'WAS',
    'Sturmschaden':      'STU',
    'Brandschaden':      'BRA',
    'Einbruchschaden':   'EIN',
    'Baumängel':         'BAU',
    'Elementarschaden':  'ELE',
    'Beweissicherung':   'BWS',
    'Kaufberatung':      'KAU',
    'Sanierungsberatung':'SAN',
    'Sonstiger Schaden': 'SON'
  };

  function generiereAZ(schadenart) {
    var kuerzel = KUERZEL[schadenart] || 'SON';
    var jahr = new Date().getFullYear();
    // Laufnummer aus localStorage
    var counterKey = 'prova_az_counter_' + jahr;
    var counter = parseInt(localStorage.getItem(counterKey) || '0') + 1;
    localStorage.setItem(counterKey, counter);
    var nr = String(counter).padStart(3, '0');
    return kuerzel + '-' + jahr + '-' + nr;
  }

  function aktualisiereAZ() {
    var sel = document.getElementById('f-schadenart');
    var azField = document.getElementById('f-schadensnummer');
    if (!sel || !azField) return;
    var schadenart = sel.value;
    if (!schadenart) return;
    // Nur generieren wenn Feld leer oder altes Format (PRO-V etc.)
    var current = azField.value.trim();
    var currentPrefix = current.split('-')[0];
    var neuerPrefix = KUERZEL[schadenart] || 'SON';
    // AZ: nur Prefix tauschen wenn Nummer schon existiert — KEIN Inkrement
    if (!current) {
      azField.value = generiereAZ(schadenart);
    } else if (currentPrefix !== neuerPrefix) {
      var parts = current.split('-');
      parts[0] = neuerPrefix;
      azField.value = parts.join('-');
    }
    // gleiche Schadenart → AZ unverändert
  }

  document.addEventListener('DOMContentLoaded', function() {
    var sel = document.getElementById('f-schadenart');
    if (sel) {
      sel.addEventListener('change', aktualisiereAZ);
      // Beim Laden sofort generieren falls Schadenart bereits gewählt
      if (sel.value) aktualisiereAZ();
    }
  });

  window.generiereAZ = generiereAZ;
  window.aktualisiereAZ = aktualisiereAZ;
  // Alias für onchange="onSchadenartChange()" im HTML
  window.onSchadenartChange = function() { aktualisiereAZ(); };
})();

/* ── Block 12 ── */
/* ================================================================
   PROVA Fall-Kontext-System v1.0
   Zeigt auf jeder Workflow/Werkzeug-Seite den aktiven Fall-Kontext
   und führt den SV zum nächsten Schritt.
   
   Aktiviert sich automatisch wenn ein aktiver Fall vorhanden ist.
   Kein Eingriff in bestehende Seiten-Logik.
================================================================ */

(function() {
'use strict';

// ── WORKFLOW-KONFIGURATION ──────────────────────────────────────────────
var WORKFLOW = [
  {
    schritt: 1,
    name: 'Fall anlegen',
    seite: 'app.html',
    icon: '📋',
    farbe: '#4f8ef7'
  },
  {
    schritt: 2,
    name: 'Diktat & Fotos',
    seite: 'app-starter.html#step2',
    icon: '🎙️',
    farbe: '#4f8ef7'
  },
  {
    schritt: 3,
    name: 'KI-Analyse',
    seite: 'app-starter.html#step3',
    icon: '🤖',
    farbe: '#6366f1'
  },
  {
    schritt: 4,
    name: '§6 Fachurteil',
    seite: 'stellungnahme.html',
    icon: '⚖️',
    farbe: '#f59e0b'
  },
  {
    schritt: 5,
    name: 'Freigabe',
    seite: 'freigabe.html',
    icon: '✅',
    farbe: '#10b981'
  },
  {
    schritt: 6,
    name: 'Rechnung',
    seite: 'rechnungen.html',
    icon: '💶',
    farbe: '#10b981'
  },
  {
    schritt: 7,
    name: 'Abschluss',
    seite: 'archiv.html',
    icon: '📁',
    farbe: '#6b7280'
  }
];

// ── WERKZEUGE (kontextuell, kein fester Workflow-Schritt) ───────────────
var WERKZEUGE = {
  'normen.html':         { name: 'Normendatenbank',    icon: '📚', zurück: true },
  'positionen.html':     { name: 'Positionsdatenbank', icon: '📦', zurück: true },
  'textbausteine.html':  { name: 'Textbausteine',      icon: '✏️',  zurück: true },
  'jveg.html':           { name: 'JVEG-Rechner',       icon: '⚖️',  zurück: false },
  'kostenermittlung.html':{ name: 'Kosten & Aufmaß',   icon: '📐', zurück: true },
  'briefvorlagen.html':  { name: 'Briefvorlagen',      icon: '✉️',  zurück: false }
};

// ── SEITE BESTIMMEN ─────────────────────────────────────────────────────
var currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
if (currentPage === '') currentPage = 'dashboard.html';

// ── AKTUELLEN SCHRITT BESTIMMEN ─────────────────────────────────────────
function getCurrentSchritt() {
  var basePage = currentPage.split('#')[0];
  for (var i = 0; i < WORKFLOW.length; i++) {
    if (WORKFLOW[i].seite.split('#')[0] === basePage) {
      return WORKFLOW[i].schritt;
    }
  }
  return null;
}

// ── FALL-KONTEXT LADEN ──────────────────────────────────────────────────
function ladeFallKontext() {
  // Versuche aus URL-Parameter zu laden
  var params = new URLSearchParams(window.location.search);
  var urlAz   = params.get('az') || params.get('fall') || params.get('aktenzeichen');
  
  // Dann aus sessionStorage/localStorage
  var az         = urlAz
                 || sessionStorage.getItem('prova_current_az')
                 || localStorage.getItem('prova_letztes_az')
                 || '';
  
  var schadenart = sessionStorage.getItem('prova_current_schadenart')
                 || localStorage.getItem('prova_schadenart')
                 || '';
  
  var adresse    = sessionStorage.getItem('prova_current_objekt')
                 || localStorage.getItem('prova_adresse')
                 || '';
  
  var recordId   = sessionStorage.getItem('prova_record_id')
                 || sessionStorage.getItem('prova_current_record_id')
                 || '';
  
  if (!az) return null;
  
  return { az: az, schadenart: schadenart, adresse: adresse, recordId: recordId };
}

// ── NÄCHSTER SCHRITT ─────────────────────────────────────────────────────
function naechsterSchritt(aktuellerSchritt) {
  if (!aktuellerSchritt) return null;
  for (var i = 0; i < WORKFLOW.length; i++) {
    if (WORKFLOW[i].schritt === aktuellerSchritt + 1) {
      return WORKFLOW[i];
    }
  }
  return null;
}

// ── BANNER HTML BAUEN ───────────────────────────────────────────────────
function baueBanner(kontext, aktuellerSchritt, istWerkzeug) {
  var az        = kontext.az;
  var sa        = kontext.schadenart;
  var adr       = kontext.adresse;
  var recordId  = kontext.recordId;
  
  // Schadensart Farbe
  var saFarben = {
    'Schimmelbefall': '#10b981',
    'Wasserschaden':  '#3b82f6',
    'Brandschaden':   '#ef4444',
    'Sturmschaden':   '#8b5cf6',
    'Baumängel':      '#f59e0b',
    'Sonstiger Schaden': '#6b7280'
  };
  var saFarbe = saFarben[sa] || '#4f8ef7';
  
  // Akte-Link bauen
  var akteLink = recordId
    ? (localStorage.setItem('prova_erster_fall_erstellt','1'), 'akte.html?id=' + recordId)
    : az
      ? 'akte.html?az=' + encodeURIComponent(az)
      : 'archiv.html';
  
  // Nächster-Schritt Button
  var naechsterBtn = '';
  if (!istWerkzeug && aktuellerSchritt) {
    var naechster = naechsterSchritt(aktuellerSchritt);
    if (naechster) {
      var naechsterUrl = naechster.seite;
      // AZ mitgeben wenn relevant
      if (naechster.seite.indexOf('stellungnahme') >= 0 && az) {
        naechsterUrl = naechster.seite + '?az=' + encodeURIComponent(az);
      } else if (naechster.seite.indexOf('freigabe') >= 0 && recordId) {
        naechsterUrl = naechster.seite + '?id=' + recordId;
      } else if (naechster.seite.indexOf('rechnungen') >= 0 && az) {
        naechsterUrl = naechster.seite + '?az=' + encodeURIComponent(az);
      } else if (naechster.seite.indexOf('archiv') >= 0) {
        naechsterUrl = naechster.seite;
      }
      
      naechsterBtn = '<a href="' + naechsterUrl + '" style="'
        + 'display:inline-flex;align-items:center;gap:5px;padding:4px 12px;'
        + 'background:' + naechster.farbe + '22;border:1px solid ' + naechster.farbe + '44;'
        + 'border-radius:999px;font-size:11px;font-weight:700;color:' + naechster.farbe + ';'
        + 'text-decoration:none;white-space:nowrap;transition:all .15s;'
        + '" data-bg="' + naechster.farbe + '22" data-bgh="' + naechster.farbe + '33"'
        + ' onmouseenter="this.style.background=this.dataset.bgh" onmouseleave="this.style.background=this.dataset.bg">'
        + naechster.icon + ' ' + naechster.name + ' →'
        + '</a>';
    }
  }
  
  // Zurück-zu-Fall Button (für Werkzeuge)
  var zurueckBtn = '';
  if (istWerkzeug && WERKZEUGE[currentPage] && WERKZEUGE[currentPage].zurück) {
    zurueckBtn = '<a href="' + akteLink + '" style="'
      + 'display:inline-flex;align-items:center;gap:5px;padding:4px 10px;'
      + 'background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.25);'
      + 'border-radius:999px;font-size:11px;font-weight:600;color:#4f8ef7;'
      + 'text-decoration:none;white-space:nowrap;'
      + '">← Zurück zu ' + az + '</a>';
  }
  
  // Akte-Link in AZ
  var azHtml = '<a href="' + akteLink + '" style="'
    + 'font-weight:800;font-size:13px;color:var(--text, #e2e8f0);'
    + 'text-decoration:none;letter-spacing:.02em;'
    + 'border-bottom:1px solid rgba(255,255,255,.2);'
    + '" title="Akte öffnen">' + az + '</a>';
  
  // Schrittanzeige
  var schrittHtml = '';
  if (aktuellerSchritt && !istWerkzeug) {
    schrittHtml = '<span style="font-size:10px;color:rgba(255,255,255,.4);white-space:nowrap;">'
      + 'Schritt ' + aktuellerSchritt + ' von 7'
      + '</span>';
    
    // Mini-Progress (7 Punkte)
    var dots = '';
    for (var s = 1; s <= 7; s++) {
      var dotColor = s < aktuellerSchritt
        ? '#10b981'
        : s === aktuellerSchritt
          ? '#4f8ef7'
          : 'rgba(255,255,255,.15)';
      dots += '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor
            + ';display:inline-block;' + (s < 7 ? 'margin-right:3px;' : '') + '"></span>';
    }
    schrittHtml += '<span style="display:inline-flex;align-items:center;margin-left:6px;">' + dots + '</span>';
  }
  
  // Banner HTML
  var html = '<div id="prova-fall-kontext-banner" style="'
    + 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
    + 'padding:7px 16px 7px 20px;'
    + 'background:linear-gradient(90deg,rgba(79,142,247,.12) 0%,rgba(10,15,28,.0) 100%);'
    + 'border-bottom:1px solid rgba(79,142,247,.15);'
    + 'font-family:inherit;position:relative;z-index:10;'
    + 'min-height:36px;'
    + '">'
    
    // AZ + Schadenart
    + '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">'
    + '<span style="width:8px;height:8px;border-radius:50%;background:' + saFarbe + ';flex-shrink:0;"></span>'
    + azHtml;
    
  if (sa) {
    html += '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:' + saFarbe + '18;color:' + saFarbe + ';font-weight:600;white-space:nowrap;">' + sa + '</span>';
  }
  
  if (adr && adr.length > 2 && adr !== '—') {
    html += '<span style="font-size:11px;color:rgba(255,255,255,.35);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;" title="' + adr + '">'
          + adr.split(',')[0] // nur Straße, kürzer
          + '</span>';
  }
  
  html += '</div>'; // end flex-1
  
  // Mitte: Schritt-Anzeige
  if (schrittHtml) {
    html += '<div style="display:flex;align-items:center;gap:4px;">' + schrittHtml + '</div>';
  }
  
  // Rechts: Werkzeug-Zurück oder Nächster-Schritt
  if (zurueckBtn) {
    html += '<div>' + zurueckBtn + '</div>';
  }
  if (naechsterBtn) {
    html += '<div>' + naechsterBtn + '</div>';
  }
  
  html += '</div>'; // end banner
  
  return html;
}

// ── BANNER EINFÜGEN ─────────────────────────────────────────────────────
function einfuegenBanner() {
  // Nicht auf Dashboard, Zentrale, Login, Onboarding
  var ausnahmen = ['dashboard.html', 'archiv.html', 'app-login.html', 
                   'onboarding.html', 'onboarding-schnellstart.html',
                   'index.html', 'impressum.html', 'datenschutz.html',
                   'agb.html', 'avv.html', 'termine.html', 'kontakte.html',
                   'einstellungen.html'];
  
  if (ausnahmen.indexOf(currentPage) >= 0) return;
  
  var kontext = ladeFallKontext();
  if (!kontext) return; // Kein aktiver Fall — kein Banner
  
  var aktuellerSchritt = getCurrentSchritt();
  var istWerkzeug = !!WERKZEUGE[currentPage];
  
  var bannerHtml = baueBanner(kontext, aktuellerSchritt, istWerkzeug);
  
  // Einfüge-Strategie: nach <header class="topbar"> oder nach <div class="topbar">
  // Suche den richtigen Einfügepunkt
  var insertAfter = null;
  
  // Strategie 1: Nach topbar Header
  var topbar = document.querySelector('header.topbar, div.topbar, .topbar');
  if (topbar) {
    insertAfter = topbar;
  }
  
  // Strategie 2: Als erstes Child von main oder page-content
  if (!insertAfter) {
    insertAfter = document.querySelector('main, .page-content, .main, .page');
    if (insertAfter) {
      insertAfter.insertAdjacentHTML('afterbegin', bannerHtml);
      return;
    }
  }
  
  if (insertAfter) {
    insertAfter.insertAdjacentHTML('afterend', bannerHtml);
  }
}

// ── INIT ────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', einfuegenBanner);
} else {
  einfuegenBanner();
}

// ── PUBLIC API ──────────────────────────────────────────────────────────
window.PROVA_KONTEXT = {
  // Erlaubt anderen Scripts den Fall-Kontext zu setzen
  setFall: function(az, schadenart, adresse, recordId) {
    if (az) { localStorage.setItem('prova_letztes_az', az); localStorage.setItem('prova_aktiver_fall', az); }
    if (schadenart) localStorage.setItem('prova_schadenart', schadenart);
    if (adresse) localStorage.setItem('prova_adresse', adresse);
    if (recordId) sessionStorage.setItem('prova_record_id', recordId);
    // Banner aktualisieren
    var existing = document.getElementById('prova-fall-kontext-banner');
    if (existing) existing.remove();
    einfuegenBanner();
  },
  // Fall-Kontext löschen (nach Archivierung)
  clearFall: function() {
    localStorage.removeItem('prova_letztes_az');
    localStorage.removeItem('prova_schadenart');
    localStorage.removeItem('prova_adresse');
    sessionStorage.removeItem('prova_record_id');
    sessionStorage.removeItem('prova_current_az');
    sessionStorage.removeItem('prova_current_schadenart');
    var existing = document.getElementById('prova-fall-kontext-banner');
    if (existing) existing.remove();
  }
};

})();

/* ── Block 13 ── */
/* ================================================================
   PROVA Audit-Trail v1.0
   Schreibt KI-Beteiligungen in Airtable AUDIT_TRAIL (Pro/Enterprise)
   Starter: nur localStorage
   Pro: + Airtable
   Enterprise: + Airtable + PDF-Offenlegungstext
================================================================ */

window.PROVA_AUDIT = (function() {
  'use strict';
  
  var AT_BASE = 'appJ7bLlAHZoxENWE';
  var AT_AUDIT = 'AUDIT_TRAIL'; // Tabellenname (wird per Name aufgelöst)
  
  // Einfacher Hash-Funktion (SHA-256 Simulation via djb2 für Client-Side)
  function simpleHash(str) {
    var hash = 5381;
    for (var i = 0; i < Math.min(str.length, 500); i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // 32bit int
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
  
  // Offenlegungstext je nach Gutachtentyp
  var OFFENLEGUNG = {
    gericht: 'Dieses Gutachten wurde unter Zuhilfenahme des digitalen Assistenzsystems PROVA Systems erstellt. Das System wurde zur strukturellen Aufbereitung der vom Sachverständigen erhobenen Daten (§1–§5), zur formalen Textgestaltung sowie zur Sicherstellung der normgerechten Fachsprache (insb. Konjunktiv-Prüfung in §6) eingesetzt. Die fachliche Datenerhebung, die Kausalitätsprüfung sowie die abschließende Bewertung in §6 erfolgten ausschließlich durch den Sachverständigen persönlich. Die KI-Nutzung wird hiermit gemäß §407a Abs. 3 ZPO offengelegt.',
    versicherung: 'Die Erstellung dieses Gutachtens erfolgte unter Einsatz des digitalen Assistenzsystems PROVA Systems (KI-gestützte Strukturierung §1–§5, Konjunktiv-Prüfung §6). Das Fachurteil in §6 wurde eigenständig vom Sachverständigen erstellt.',
    privat: 'Erstellt mit PROVA Systems (KI-Assistenz §1–§5). §6 Fachurteil: eigenständige Leistung des Sachverständigen.'
  };
  
  function genOffenlegungstext(auftraggeber_typ) {
    if (!auftraggeber_typ) return OFFENLEGUNG.gericht;
    var typ = auftraggeber_typ.toLowerCase();
    if (typ.includes('gericht') || typ.includes('gerichtlich')) return OFFENLEGUNG.gericht;
    if (typ.includes('versicherung') || typ.includes('insurance')) return OFFENLEGUNG.versicherung;
    return OFFENLEGUNG.privat;
  }
  
  // Lokal in localStorage speichern (alle Pakete)
  function speichereLokal(eintrag) {
    try {
      var key = 'prova_audit_' + (eintrag.fall_id || eintrag.aktenzeichen || Date.now());
      var existing = [];
      try { existing = JSON.parse(localStorage.getItem('prova_audit_log') || '[]'); } catch(e) {}
      existing.push(eintrag);
      // Maximal 50 Einträge lokal speichern
      if (existing.length > 50) existing = existing.slice(-50);
      localStorage.setItem('prova_audit_log', JSON.stringify(existing));
    } catch(e) {}
  }
  
  // In Airtable schreiben (Pro/Enterprise)
  async function speichereAirtable(eintrag) {
    var paket = localStorage.getItem('prova_paket') || 'Solo';
    if (paket === 'Solo') return; // Starter nur localStorage
    
    try {
      var res = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          method: 'POST',
          path: '/v0/' + AT_BASE + '/tblqQmMwJKxltXXXl',
          payload: {
            records: [{
              fields: {
                fldBk9Qpni99KO5sc: eintrag.fall_id || eintrag.aktenzeichen || 'PROVA-' + Date.now(),
                fldfbNMQDJSmmNnT7: eintrag.aktenzeichen || '',
                fldgSoSEHNX7gDBCj: eintrag.sv_email || '',
                fld4XDJA7wE54WYBg: paket,
                fldT6ZDEhrNa38hyT: eintrag.aktion || '',
                fldEXhCUAgokRJxSA: eintrag.ki_modell || '',
                fldj2cR7sLY4tu8Mv: eintrag.sv_validiert || false,
                fldrGtAJlW3aOoxgi: eintrag.timestamp || new Date().toISOString(),
                fldXwHCuiidCkqQoo: eintrag.input_hash || '',
                fld5wR400PRNE7hJL: eintrag.output_laenge || 0,
                fldhzKP4LhG6HubZq: eintrag.aenderungsquote || 0,
                fldk4V3tEinYwHeRQ: eintrag.offenlegungstext || '',
                fld8EeypJENJPVFPJ: eintrag.notizen || ''
              }
            }]
          }
        })
      });
      if (!res.ok) console.warn('PROVA Audit-Trail: Airtable Fehler', res.status);
    } catch(e) {
      console.warn('PROVA Audit-Trail: Netzwerkfehler', e.message);
    }
  }
  
  // Öffentliche API
  return {
    // Hauptfunktion: Aktion protokollieren
    log: function(params) {
      var paket = localStorage.getItem('prova_paket') || 'Solo';
      var svEmail = localStorage.getItem('prova_sv_email') || '';
      var az = localStorage.getItem('prova_letztes_az') || '';
      var rid = sessionStorage.getItem('prova_record_id') || '';
      var auftraggeber_typ = localStorage.getItem('prova_auftraggeber_typ') || '';
      
      var eintrag = {
        fall_id:          params.fall_id || rid,
        aktenzeichen:     params.aktenzeichen || az,
        sv_email:         svEmail,
        paket:            paket,
        aktion:           params.aktion || 'unbekannt',
        ki_modell:        params.ki_modell || '',
        sv_validiert:     params.sv_validiert || false,
        timestamp:        new Date().toISOString(),
        input_hash:       params.input ? simpleHash(params.input) : '',
        output_laenge:    params.output ? params.output.length : 0,
        aenderungsquote:  params.aenderungsquote || 0,
        offenlegungstext: params.offenlegungstext || genOffenlegungstext(auftraggeber_typ),
        notizen:          params.notizen || ''
      };
      
      // Immer lokal speichern
      speichereLokal(eintrag);
      
      // Pro/Enterprise: auch Airtable
      if (paket === 'Solo' || paket === 'Team') {
        speichereAirtable(eintrag).catch(function(e) {
          console.warn('PROVA Audit-Trail:', e);
        });
      }
      
      // Enterprise: Offenlegungstext in sessionStorage für Freigabe
      if (paket === 'Team') {
        try {
          sessionStorage.setItem('prova_offenlegungstext', eintrag.offenlegungstext);
        } catch(e) {}
      }
      
      return eintrag;
    },
    
    // Audit-Log aus localStorage abrufen
    getLokalesLog: function() {
      try { return JSON.parse(localStorage.getItem('prova_audit_log') || '[]'); } catch(e) { return []; }
    },
    
    // Offenlegungstext generieren
    genOffenlegungstext: genOffenlegungstext
  };
})();

/* ── Block 14 ── */
/* ══ PROVA Versicherungen Autocomplete mit Pfeiltasten ══ */
var VERS_DB = [
  'Allianz','Allianz Versicherung','ARAG','ARAG Versicherung',
  'Alte Leipziger','Alte Oldenburger','AXA','AXA Versicherung',
  'Barmenia','Basler Versicherung','Bayerische Versicherung',
  'BGV','BHW','Condor','Continentale','Debeka','DEVK','DEVK Versicherungen',
  'DKV','DKV Krankenversicherung','Dialog Versicherung',
  'Ergo','Ergo Versicherung','Ergo Direkt',
  'Generali','GEV','Gothaer','Gothaer Versicherung',
  'Hamburg Mannheimer','HanseMerkur','Hannoversche',
  'HDI','HDI Versicherung','Helvetia',
  'HUK-Coburg','HUK24',
  'Janitos','KS-Auxilia','Kravag',
  'LVM','LVM Versicherung','Mecklenburgische','Münchener Verein',
  'Nürnberger','Nürnberger Versicherung',
  'Öffentliche Versicherung','ÖRAG',
  'Provinzial','Provinzial NordWest','Provinzial Rheinland',
  'R+V','R+V Versicherung','R+V Allgemeine Versicherung',
  'Roland Rechtsschutz','S-Versicherung','Signal Iduna',
  'SV SparkassenVersicherung','Talanx','Universa','Uniqa',
  'VGH','VHV','VHV Versicherungen',
  'Versicherungskammer Bayern','Victoria','Volksfürsorge',
  'WGV','Württembergische','WWK',
  'Zurich','Zurich Versicherung',
  /* Gerichte */
  'Amtsgericht','Landgericht','Oberlandesgericht',
  'Arbeitsgericht','Finanzgericht','Verwaltungsgericht',
  'Sozialgericht','Bundesgerichtshof','Bundesverwaltungsgericht',
];
var _acIdx = -1;

function acSuche(input, listId) {
  var q = (input.value || '').trim().toLowerCase();
  var list = document.getElementById(listId);
  if (!list) return;
  _acIdx = -1;
  if (q.length < 1) { acClose(listId); return; }
  var hits = VERS_DB.filter(function(v){ return v.toLowerCase().startsWith(q); })
    .concat(VERS_DB.filter(function(v){ return !v.toLowerCase().startsWith(q) && v.toLowerCase().includes(q); }));
  hits = hits.filter(function(v,i,a){ return a.indexOf(v)===i; }).slice(0,8);
  if (!hits.length) { acClose(listId); return; }
  var iid = input.id;
  list.innerHTML = hits.map(function(v,i){
    var hl = v.replace(new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi'), '<strong>$1</strong>');
    return '<div class="ac-opt" data-v="' + v.replace(/"/g,'&quot;') + '" onmousedown="acPick(event,\'' + listId + '\',\'' + iid + '\')">' + hl + '</div>';
  }).join('');
  list.classList.add('open');
}

function acKeydown(e, listId, inputId) {
  var list = document.getElementById(listId);
  var opts = list ? list.querySelectorAll('.ac-opt') : [];
  if (!list || !list.classList.contains('open') || !opts.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _acIdx = Math.min(_acIdx+1, opts.length-1); acHL(opts); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _acIdx = Math.max(_acIdx-1, 0); acHL(opts); }
  else if (e.key === 'Enter' && _acIdx >= 0) { e.preventDefault(); var v = opts[_acIdx].getAttribute('data-v'); acSet(listId, inputId, v); }
  else if (e.key === 'Escape') { acClose(listId); }
}

function acHL(opts) {
  opts.forEach(function(o,i){ o.classList.toggle('hi', i===_acIdx); if(i===_acIdx) o.scrollIntoView({block:'nearest'}); });
}

function acPick(e, listId, inputId) {
  e.preventDefault();
  var v = e.currentTarget.getAttribute('data-v');
  acSet(listId, inputId, v);
}

function acSet(listId, inputId, val) {
  var inp = document.getElementById(inputId);
  if (inp) { inp.value = val; inp.dispatchEvent(new Event('input',{bubbles:true})); }
  acClose(listId);
  _acIdx = -1;
}

function acClose(listId) {
  var l = document.getElementById(listId);
  if (l) l.classList.remove('open');
}


/* ── Orphaned Code (war durch <\/script>-Bug außerhalb von <script>-Tags) ── */
window.switchDiktatTab = function(mode) {
  diktatMode = mode;
  var diktatPanel = document.getElementById('diktat-panel');
  var eingabePanel = document.getElementById('eingabe-panel');
  var tabDiktat = document.getElementById('tab-diktat');
  var tabEingabe = document.getElementById('tab-eingabe');
  if (mode === 'diktat') {
    if (diktatPanel) diktatPanel.style.display = 'block';
    if (eingabePanel) eingabePanel.style.display = 'none';
    if (tabDiktat) { tabDiktat.classList.add('active'); tabDiktat.setAttribute('aria-selected','true'); tabDiktat.tabIndex = 0; }
    if (tabEingabe) { tabEingabe.classList.remove('active'); tabEingabe.setAttribute('aria-selected','false'); tabEingabe.tabIndex = -1; }
    var ta = document.getElementById('transcriptManuell');
    if (ta && ta.value.trim()) window.transcriptText = ta.value.trim();
  } else {
    if (diktatPanel) diktatPanel.style.display = 'none';
    if (eingabePanel) eingabePanel.style.display = 'block';
    if (tabDiktat) { tabDiktat.classList.remove('active'); tabDiktat.setAttribute('aria-selected','false'); tabDiktat.tabIndex = -1; }
    if (tabEingabe) { tabEingabe.classList.add('active'); tabEingabe.setAttribute('aria-selected','true'); tabEingabe.tabIndex = 0; }
    var ta = document.getElementById('transcriptManuell');
    if (ta) ta.value = window.transcriptText;
  }
};

window.syncManuellToTranscript = function() {
  var ta = document.getElementById('transcriptManuell');
  if (ta) window.transcriptText = ta.value;
};

// Tastatursteuerung für Tabs (←/→, Enter/Space)
(function initDiktatTabsA11y() {
  var tabD = document.getElementById('tab-diktat');
  var tabE = document.getElementById('tab-eingabe');
  if (!tabD || !tabE) return;
  function focusAndSelect(which) {
    if (which === 'diktat') { tabD.focus(); window.switchDiktatTab('diktat'); }
    else { tabE.focus(); window.switchDiktatTab('text'); }
  }
  function onKey(e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      var isD = (document.activeElement === tabD);
      focusAndSelect((k === 'ArrowLeft') ? (isD ? 'text' : 'diktat') : (isD ? 'text' : 'diktat'));
    }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (document.activeElement === tabD) window.switchDiktatTab('diktat');
      if (document.activeElement === tabE) window.switchDiktatTab('text');
    }
  }
  tabD.addEventListener('keydown', onKey);
  tabE.addEventListener('keydown', onKey);
})();

window.toggleRecord = async function() {
  if (isRecording) stoppeAufnahme();
  else await starteAufnahme();
};

async function starteAufnahme() {
  // 1. Browser-Kompatibilitätsprüfung
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast('Spracherkennung erfordert Chrome oder Edge. Bitte Browser wechseln.', 'error');
    // Zeige dauerhaften Hinweis
    var hint = document.getElementById('diktat-browser-hint');
    if(hint) hint.style.display='block';
    return;
  }
  // 2. HTTPS-Check
  if(location.protocol !== 'https:' && location.hostname !== 'localhost') {
    showToast('Diktat benötigt eine sichere HTTPS-Verbindung.', 'error');
    return;
  }
  // 3. Consent-Check
  if(!whisperConsentOk()) {
    zeigeWhisperConsent(function() { starteAufnahme(); });
    return;
  }
  // 4. Mikrofon-Permission prüfen
  var aufnahmeStream = null;
  try {
    if(navigator.permissions) {
      try {
        var perm = await navigator.permissions.query({name:'microphone'});
        if(perm.state === 'denied') {
          showToast('Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen freigeben (🔒 in der Adressleiste).', 'error');
          return;
        }
      } catch(e) {} // permissions API nicht verfügbar — ignorieren
    }
    aufnahmeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch(err) {
    if(err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      showToast('Mikrofon-Zugriff verweigert. Klicken Sie auf das 🔒-Symbol in der Adressleiste und erlauben Sie das Mikrofon.', 'error');
    } else if(err.name === 'NotFoundError') {
      showToast('Kein Mikrofon gefunden. Bitte Mikrofon anschließen.', 'error');
    } else {
      showToast('Mikrofon-Fehler: ' + err.message, 'error');
    }
    return;
  }
  // MediaRecorder parallel starten (für Whisper)
  starteMediaRecorder(aufnahmeStream);
  starteAufnahmeLimit();
  // SpeechRecognition braucht eigenen Stream (Browser-intern)
  isRecording = true; recSecs = 0;
  const btn = $('#recBtn'), lbl = $('#recLabel'), status = $('#recStatus');
  btn.classList.add('recording'); lbl.textContent = 'Stopp'; status.textContent = 'Aufnahme läuft…';
  // Update modern UI elements
  var statusBadge = document.getElementById('diktat-status-badge');
  if (statusBadge) { statusBadge.textContent = 'Aufnahme'; statusBadge.classList.add('recording'); }
  var recLabel2 = document.getElementById('recLabel');
  if (recLabel2) recLabel2.textContent = 'Stopp';
  var waveBg = document.getElementById('recordWave');
  if (waveBg) waveBg.style.display = 'flex';
  var transcriptDot = document.getElementById('transcriptDot');
  if (transcriptDot) transcriptDot.classList.add('active');
  var iconPlay = document.getElementById('recIconPlay'); var iconStop = document.getElementById('recIconStop');
  if (iconPlay) iconPlay.style.display = 'none'; if (iconStop) iconStop.style.display = '';
  recTimer = setInterval(() => {
    recSecs++;
    $('#recTime').textContent = String(Math.floor(recSecs/60)).padStart(2,'0')+':'+String(recSecs%60).padStart(2,'0');
  }, 1000);

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true; recognition.interimResults = false; recognition.lang = 'de-DE';

  recognition.onresult = e => {
    const area = $('#transcriptArea');
    const empty = area.querySelector('.transcript-empty');
    if (empty) empty.style.display = 'none';
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        const text = e.results[i][0].transcript.trim();
        if (text) {
          window.transcriptText += (window.transcriptText ? ' ' : '') + text;
          const p = document.createElement('p');
          p.style.cssText = 'font-family:var(--font-body);font-size:.9375rem;line-height:1.7;color:var(--gray-700);margin-bottom:.5rem';
          p.textContent = text;
          const interimEl = area.querySelector('.interim');
          if (interimEl) interimEl.remove();
          area.appendChild(p);
          area.scrollTop = area.scrollHeight;
        }
      } else { interim += e.results[i][0].transcript; }
    }
    let interimEl = area.querySelector('.interim');
    if (interim) {
      if (!interimEl) { interimEl = document.createElement('p'); interimEl.className = 'interim'; interimEl.style.cssText='font-family:var(--font-body);font-size:.9375rem;color:var(--gray-400);font-style:italic;margin-bottom:.5rem'; area.appendChild(interimEl); }
      interimEl.textContent = interim + '…'; area.scrollTop = area.scrollHeight;
    } else if (interimEl) interimEl.remove();
    const z = area.querySelectorAll('p:not(.interim)').length;
    $('#transcriptBadge').textContent = z + ' Abschnitte';
    // Live-Update rechte Spalte
    if (typeof updateStep2Panel === 'function') updateStep2Panel();
  };

  recognition.onerror = e => {
    if (e.error === 'not-allowed') { showToast('Mikrofon verweigert.', 'error'); stoppeAufnahme(); }
  };
  recognition.onend = () => { if (isRecording) { try { recognition.start(); } catch(err) {} } };
  try { recognition.start(); } catch(err) { showToast('Fehler beim Starten.', 'error'); }
}

function stoppeAufnahme() {
  isRecording = false; clearInterval(recTimer); clearTimeout(recLimitTimer);
  const btn = $('#recBtn'), lbl = $('#recLabel'), status = $('#recStatus');
  btn.classList.remove('recording'); lbl.textContent = 'Start'; status.textContent = 'Bereit';
  // Reset modern UI elements
  var statusBadge = document.getElementById('diktat-status-badge');
  if (statusBadge) { statusBadge.textContent = 'Bereit'; statusBadge.classList.remove('recording'); }
  var recLabel2 = document.getElementById('recLabel');
  if (recLabel2) recLabel2.textContent = 'Tippen zum Starten';
  var waveBg = document.getElementById('recordWave');
  if (waveBg) waveBg.style.display = 'none';
  var transcriptDot = document.getElementById('transcriptDot');
  if (transcriptDot) transcriptDot.classList.remove('active');
  var iconPlay = document.getElementById('recIconPlay'); var iconStop = document.getElementById('recIconStop');
  if (iconPlay) iconPlay.style.display = ''; if (iconStop) iconStop.style.display = 'none';
  if (recognition) { try { recognition.stop(); } catch(err) {} recognition = null; }
  // MediaRecorder stoppen → Whisper-Korrektur startet
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch(e) {}
  }
  mediaRecorder = null;

  // Nach Aufnahme: Text bereinigen + Diktat nummerieren
  if (window.transcriptText.trim().length > 20) {
    bereinigeDiktatText();
  }
}

/* ── DIKTAT-POST-PROCESSING ───────────────────────────── */
var diktate = []; // Array aller Diktate
var aktivDiktatIdx = -1;

async function bereinigeDiktatText() {
  var area = document.getElementById('transcriptArea');
  var rawText = window.transcriptText.trim();
  if (!rawText || rawText.length < 10) return;

  // Loading-Indikator
  var badge = document.getElementById('diktat-status-badge');
  if (badge) { badge.textContent = '⟳ Wird aufbereitet…'; badge.style.background = 'rgba(245,158,11,.2)'; }

  try {
    var res = await fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        messages: [
          {role:'system', content:'Du bist ein Textkorrektur-Assistent. Formatiere den folgenden Sprach-zu-Text-Diktat-Text: setze Kommas, Punkte und Großschreibung korrekt. Korrigiere offensichtliche Spracherkennungsfehler ("zirka" statt "zirkr", Zahlen ausschreiben wenn klar). Behalte ALLE inhaltlichen Angaben exakt bei — ändere keine Zahlen, Messwerte oder Fakten. Antworte NUR mit dem korrigierten Fließtext, keine Erklärungen.'},
          {role:'user', content: rawText}
        ]
      })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var d = await res.json();
    var bereinigt = (d.content&&d.content[0]&&d.content[0].text)
      ? d.content[0].text.trim()
      : (d.choices&&d.choices[0] ? d.choices[0].message.content.trim() : rawText);

    if (bereinigt && bereinigt.length > 10) {
      window.transcriptText = bereinigt;
      localStorage.setItem('prova_transkript', bereinigt);

      // Diktat zur Liste hinzufügen
      var diktatNr = diktate.length + 1;
      diktate.push({ nr: diktatNr, text: bereinigt, ts: new Date().toISOString() });

      // Transkript-Area neu rendern
      if (area) {
        area.innerHTML = '';
        var p = document.createElement('p');
        p.style.cssText = 'font-family:var(--font-body);font-size:.9375rem;line-height:1.7;color:var(--gray-700);margin:0;white-space:pre-wrap;';
        p.textContent = bereinigt;
        area.appendChild(p);
      }

      // Diktat-Badge
      var badge2 = document.getElementById('transcriptBadge');
      if (badge2) badge2.textContent = diktatNr + '. Diktat · ' + bereinigt.length + ' Zeichen';
    }
  } catch(e) {
    // Fallback: Rohtext behalten
    console.warn('[PROVA] Diktat-Bereinigung Fehler:', e.message);
  }

  // Badge zurücksetzen
  if (badge) { badge.textContent = 'Bereit'; badge.style.background = ''; }
  if (typeof updateStep2Panel === 'function') updateStep2Panel();
}

/* ============================================================
   DATEN SAMMELN
============================================================ */
function sammleDaten() {
  const nowIso = new Date().toISOString();
  const startMs = (typeof TRACKING?.start === 'number' && TRACKING.start > 0) ? TRACKING.start : null;
  const dauerSek = startMs ? Math.round((Date.now() - startMs) / 1000) : null;
  const dauerMin = dauerSek !== null ? Math.round((dauerSek / 60) * 10) / 10 : null;

  try {
    const _mw = [
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-feuchte')?.value ? 'Materialfeuchte (%): ' + document.getElementById('f-feuchte').value : '',
      document.getElementById('f-mw-extra')?.value ? String(document.getElementById('f-mw-extra').value) : '',
    ].filter(Boolean).join(' | ');
    localStorage.setItem('prova_messwerte_strukturiert', JSON.stringify({ paket: localStorage.getItem('prova_paket') || 'Solo', messwerte: _mw, zeit: nowIso }));
  } catch (_e) {}

  return {
    auftragsart:        document.getElementById('f-auftragsart')?.value || '',
    schadenart:         document.getElementById('f-schadenart')?.value || '',
    schadensnummer:     document.getElementById('f-schadensnummer')?.value || '',
    schadennummer_ag:   document.getElementById('f-schadennummer-ag')?.value || '',
    schadensdatum:      document.getElementById('f-schadensdatum')?.value || '',
    ortstermin_datum:   document.getElementById('f-ortstermin-datum')?.value || '',
    gerichts_az:        document.getElementById('f-gerichts-az')?.value || '',
    fristdatum:         document.getElementById('f-fristdatum')?.value || '',
    beweisfragen:       document.getElementById('f-beweisfragen')?.value || '',
    auftraggeber_typ:   document.getElementById('f-auftraggeber-typ')?.value || '',
    auftraggeber_name:  document.getElementById('f-auftraggeber-name')?.value || '',
    ansprechpartner:    document.getElementById('f-ansprechpartner')?.value || '',
    auftraggeber_email: document.getElementById('f-auftraggeber-email')?.value || '',
    auftraggeber_telefon: document.getElementById('f-auftraggeber-telefon')?.value || '',
    strasse:            document.getElementById('f-strasse')?.value || '',
    plz:                document.getElementById('f-plz')?.value || '',
    ort:                document.getElementById('f-ort')?.value || '',
    gebaeudetyp:        document.getElementById('f-gebaeudetyp')?.value || '',
    baujahr:            document.getElementById('f-baujahr')?.value || '',
    etage:              document.getElementById('f-etage')?.value || '',
    geschaedigter:      document.getElementById('f-geschaedigter')?.value || '',
    geschaedigter_email:  document.getElementById('f-geschaedigter-email')?.value || '',
    geschaedigter_telefon: document.getElementById('f-geschaedigter-telefon')?.value || '',
    bereich:            document.getElementById('f-bereich')?.value || '',
    feuchtemessung:     document.getElementById('f-feuchte')?.value || '',
    luftfeuchtigkeit:   document.getElementById('f-luftfeuchte')?.value || '',
    temperatur:         document.getElementById('f-temperatur')?.value || '',
    taupunkt:           document.getElementById('f-taupunkt')?.value || '',
    schadensflaeche:    document.getElementById('f-flaeche')?.value || '',
    schadenstiefe:      document.getElementById('f-tiefe')?.value || '',
    messgeraet:         document.getElementById('f-messgeraet')?.value || '',
    paket:               localStorage.getItem('prova_paket') || 'Solo',
    sv_email:            localStorage.getItem('prova_sv_email') || '',
    sv_at_record_id:     localStorage.getItem('prova_at_sv_record_id') || '',
    unterschrift_base64: localStorage.getItem('prova_sv_signatur') || '',
    wl_name:             localStorage.getItem('prova_wl_name') || localStorage.getItem('prova_sv_firma') || '',
    wl_primary_color:    localStorage.getItem('prova_primary_color') || '#4f8ef7',
    messwerte:          [
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-feuchte')?.value ? 'Materialfeuchte (%): ' + document.getElementById('f-feuchte').value : '',
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-luftfeuchte')?.value ? 'Luftfeuchtigkeit (%): ' + document.getElementById('f-luftfeuchte').value : '',
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-temperatur')?.value ? 'Raumtemperatur (°C): ' + document.getElementById('f-temperatur').value : '',
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-taupunkt')?.value ? 'Taupunkt (°C): ' + document.getElementById('f-taupunkt').value : '',
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-flaeche')?.value ? 'Befallene Fläche (m²): ' + document.getElementById('f-flaeche').value : '',
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-tiefe')?.value ? 'Schadenstiefe (cm): ' + document.getElementById('f-tiefe').value : '',
      document.getElementById('mw-feuchte')?.style.display !== 'none' && document.getElementById('f-messgeraet')?.value ? 'Messgerät: ' + document.getElementById('f-messgeraet').value : '',

      document.getElementById('mw-brand')?.style.display !== 'none' && document.getElementById('f-brand-russtiefe')?.value ? 'Rußtiefe (mm): ' + document.getElementById('f-brand-russtiefe').value : '',
      document.getElementById('mw-brand')?.style.display !== 'none' && document.getElementById('f-brand-flaeche')?.value ? 'Betroffene Fläche (m²): ' + document.getElementById('f-brand-flaeche').value : '',
      document.getElementById('mw-brand')?.style.display !== 'none' && document.getElementById('f-brand-geruch')?.value ? 'Geruchsintensität (1–10): ' + document.getElementById('f-brand-geruch').value : '',
      document.getElementById('mw-brand')?.style.display !== 'none' && document.getElementById('f-brand-temp')?.value ? 'Temperatureinwirkung (°C): ' + document.getElementById('f-brand-temp').value : '',
      document.getElementById('mw-brand')?.style.display !== 'none' && document.getElementById('f-brand-entfernung')?.value ? 'Entfernung zum Brandherd (m): ' + document.getElementById('f-brand-entfernung').value : '',
      document.getElementById('mw-brand')?.style.display !== 'none' && document.getElementById('f-brand-messgeraet')?.value ? 'Messgerät: ' + document.getElementById('f-brand-messgeraet').value : '',

      document.getElementById('mw-sturm')?.style.display !== 'none' && document.getElementById('f-sturm-flaeche')?.value ? 'Betroffene Fläche (m²): ' + document.getElementById('f-sturm-flaeche').value : '',
      document.getElementById('mw-sturm')?.style.display !== 'none' && document.getElementById('f-sturm-oeffnung')?.value ? 'Öffnungsgröße (m²): ' + document.getElementById('f-sturm-oeffnung').value : '',
      document.getElementById('mw-sturm')?.style.display !== 'none' && document.getElementById('f-sturm-eindring')?.value ? 'Eindringtiefe (cm): ' + document.getElementById('f-sturm-eindring').value : '',
      document.getElementById('mw-sturm')?.style.display !== 'none' && document.getElementById('f-sturm-windlast')?.value ? 'Windlastzone: ' + document.getElementById('f-sturm-windlast').value : '',
      document.getElementById('mw-sturm')?.style.display !== 'none' && document.getElementById('f-sturm-dach')?.value ? 'Dachabdeckung (%): ' + document.getElementById('f-sturm-dach').value : '',
      document.getElementById('mw-sturm')?.style.display !== 'none' && document.getElementById('f-sturm-messgeraet')?.value ? 'Messgerät: ' + document.getElementById('f-sturm-messgeraet').value : '',

      document.getElementById('mw-einbruch')?.style.display !== 'none' && document.getElementById('f-einbruch-anzahl')?.value ? 'Anzahl Schadensstellen: ' + document.getElementById('f-einbruch-anzahl').value : '',
      document.getElementById('mw-einbruch')?.style.display !== 'none' && document.getElementById('f-einbruch-flaeche')?.value ? 'Betroffene Fläche (m²): ' + document.getElementById('f-einbruch-flaeche').value : '',
      document.getElementById('mw-einbruch')?.style.display !== 'none' && document.getElementById('f-einbruch-tiefe')?.value ? 'Schadenstiefe (cm): ' + document.getElementById('f-einbruch-tiefe').value : '',
      document.getElementById('mw-einbruch')?.style.display !== 'none' && document.getElementById('f-einbruch-verlust')?.value ? 'Materialverlust (kg): ' + document.getElementById('f-einbruch-verlust').value : '',
      document.getElementById('mw-einbruch')?.style.display !== 'none' && document.getElementById('f-einbruch-bauteile')?.value ? 'Betroffene Bauteile: ' + document.getElementById('f-einbruch-bauteile').value : '',

      document.getElementById('mw-bau')?.style.display !== 'none' && document.getElementById('f-bau-soll')?.value ? 'Abweichung vom Sollmaß (mm): ' + document.getElementById('f-bau-soll').value : '',
      document.getElementById('mw-bau')?.style.display !== 'none' && document.getElementById('f-bau-flaeche')?.value ? 'Betroffene Fläche (m²): ' + document.getElementById('f-bau-flaeche').value : '',
      document.getElementById('mw-bau')?.style.display !== 'none' && document.getElementById('f-bau-din')?.value ? 'DIN-Referenz: ' + document.getElementById('f-bau-din').value : '',
      document.getElementById('mw-bau')?.style.display !== 'none' && document.getElementById('f-bau-toleranz')?.value ? 'Toleranzüberschreitung (mm): ' + document.getElementById('f-bau-toleranz').value : '',
      document.getElementById('mw-bau')?.style.display !== 'none' && document.getElementById('f-bau-betrieb')?.value ? 'Betriebszustand: ' + document.getElementById('f-bau-betrieb').value : '',

      document.getElementById('f-mw-extra')?.value ? String(document.getElementById('f-mw-extra').value) : '',
    ].filter(Boolean).join(' | ') || '',
    transkript:         window.transcriptText || transcriptText || '',
    fotos_anzahl:       fotos.length,
    fotos:              fotos.map((f, i) => ({ index: i+1, dataUrl: f.dataUrl, caption: f.caption || 'Foto '+(i+1), groesse_kb: Math.round(f.compSize/1024) })),
    timestamp:          nowIso,

    // Zeiterfassung (für Airtable/Analytics in Make.com)
    zeiterfassung_start:    TRACKING?.schrittZeiten?.schritt1_start || null,
    zeiterfassung_schritt2: TRACKING?.schrittZeiten?.schritt2_start || null,
    zeiterfassung_schritt3: TRACKING?.schrittZeiten?.schritt3_start || null,
    zeiterfassung_fertig:   null,
    dauer_gesamt_sekunden:  dauerSek,
    dauer_gesamt_minuten:   dauerMin,

    // Legacy-Feld (bereits genutzt)
    erstellungszeit_sekunden: dauerSek,

    gutachten_vorlage_id: getSelectedGutachtenVorlageId(),
    paket: localStorage.getItem('prova_paket') || 'Solo',

    // KI-Anreicherung: Normen + Kosten gefiltert nach Schadensart
    normen_kontext:  bauNormenKontext(document.getElementById('f-schadenart')?.value || ''),
    kosten_kontext:  bauKostenKontext(document.getElementById('f-schadenart')?.value || ''),
    
    // Beweisfragen-Assistent: Gutachten nach Beweisfragen strukturieren
    beweisfragen:    (document.getElementById('f-beweisfragen')?.value || '').trim(),
    gerichts_az:     (document.getElementById('f-gerichts-az')?.value || '').trim(),
    ist_gerichtsgutachten: !!(document.getElementById('f-beweisfragen')?.value || '').trim()
  };
}

/* ── KI-Kontext: Top-Normen nach Schadensart ────────────────
   Liefert kompakten String für GPT-4o Prompt (max. ~500 Zeichen)
──────────────────────────────────────────────────────────── */
function bauNormenKontext(schadenart) {
  const SA_MAP = {
    'Wasserschaden':'WS','Schimmelbefall':'SC','Schimmel':'SC',
    'Brandschaden':'BS','Sturmschaden':'SS','Elementarschaden':'ES',
    'Baumängel':'BA','Feuchte':'SC'
  };
  let tag = null;
  for (const [k,v] of Object.entries(SA_MAP)) {
    if (schadenart.toLowerCase().includes(k.toLowerCase())) { tag = v; break; }
  }

  // Kompakte Normen-Referenzdaten (hoch-frequent, schadensartgefiltert)
  const NORMEN_KOMPAKT = [
    {n:'DIN 4108-2',sa:['WS','SC','BA'],gw:'fRsi ≥ 0,70 | Taupunkt 20°C/50%rF ≈ 9,3°C'},
    {n:'DIN EN ISO 13788',sa:['WS','SC'],gw:'fRsi ≥ 0,70 | Oberflächenfeuchte 80%rF krit.'},
    {n:'DIN EN 13187',sa:['SC','BA'],gw:'ΔT innen/außen ≥ 10 K für Thermografie'},
    {n:'DIN 18533',sa:['WS','SC','BA'],gw:'Lastfall W1-E bis W4-E | Abdichtung 3–8mm'},
    {n:'DIN 18534',sa:['WS','SC','BA'],gw:'Beanspruchungsklasse A0–A3 Nassraum'},
    {n:'DIN 18531',sa:['WS','SS','BA'],gw:'Aufkantung ≥ 150mm | Bitumen 2-lagig ≥ 6mm'},
    {n:'DIN 18353',sa:['WS','BA'],gw:'CM Zementestrich ≤ 2,0% | Anhydrit ≤ 0,5%'},
    {n:'DIN 18202',sa:['BA'],gw:'Ebenheit Boden mit Belag: max. 5mm/4m'},
    {n:'DIN 68800-1',sa:['WS','BS','SC','BA'],gw:'Gebrauchsklassen GK 0–5'},
    {n:'DIN 68800-2',sa:['WS','SC','BA'],gw:'Holzfeuchte Einbau max. 20%'},
    {n:'DIN 18338',sa:['WS','BS','SS'],gw:'Mindestdachneigung Tonziegel 22°'},
    {n:'DIN 18550',sa:['WS','BS','SC','BA'],gw:'Unterputz ≥ 10mm | Außenputz ≥ 15mm'},
    {n:'WTA 2-9-04/D',sa:['WS','SC','BA'],gw:'Sanierputz w ≤ 0,5 kg/(m²·h⁰˙⁵)'},
    {n:'UBA-Leitfaden',sa:['SC'],gw:'Schimmel >0,5m² = erheblicher Mangel'},
    {n:'VdS 3151',sa:['WS','SS'],gw:'Holz ≤ 15% | Mauerwerk ≤ 3% KMG Trocknungsziel'},
    {n:'DIN 1946-6',sa:['SC','BA'],gw:'Feuchteschutzlüftung ≥ 0,3-facher Luftwechsel/h'},
    {n:'DIN 4102-4',sa:['BS'],gw:'F30/F60/F90 Feuerwiderstandsklassen'},
    {n:'ZPO §407a',sa:['BA','WS','BS','SS','SC','ES'],gw:'Persönliche Erstattungspflicht'},
    {n:'VOB/B §13',sa:['BA'],gw:'Gewährleistung Bauwerk 4 Jahre'},
    {n:'DIN EN 13564',sa:['WS','ES'],gw:'Rückstauebene = Straßenoberkante'},
    {n:'ZVDH Flachdach',sa:['WS','BA'],gw:'Mindestneigung 2% | Aufkantung 150mm'},
    {n:'DIN 18157',sa:['WS','BA'],gw:'Zugfestigkeit Untergrund ≥ 1,0 N/mm² | Hohllagen max. 5%'},
    {n:'DIN 55699',sa:['SC','BA','SS'],gw:'WDVS Haftfestigkeit ≥ 0,25 N/mm²'},
    {n:'AVV',sa:['BS','SC','BA'],gw:'Asbest (17 06 01*) = gefährlicher Abfall'},
    {n:'DIN ISO 16000-17',sa:['SC'],gw:'Außenluft als Referenz | Verhältnis Innen/Außen'},
  ];

  const gefiltert = tag
    ? NORMEN_KOMPAKT.filter(n => n.sa.includes(tag))
    : NORMEN_KOMPAKT.slice(0, 8);

  const top = gefiltert.slice(0, 8);
  return top.map(n => `${n.n}: ${n.gw}`).join(' | ');
}

/* ── KI-Kontext: Top-Kostenpositionen nach Schadensart ──────
   Liefert kompakten String für GPT-4o Prompt (max. ~600 Zeichen)
──────────────────────────────────────────────────────────── */
function bauKostenKontext(schadenart) {
  const SA_MAP = {
    'Wasserschaden':'WS','Schimmelbefall':'SC','Schimmel':'SC',
    'Brandschaden':'BS','Sturmschaden':'SS','Elementarschaden':'ES',
    'Baumängel':'BA','Feuchte':'SC'
  };
  let tag = null;
  for (const [k,v] of Object.entries(SA_MAP)) {
    if (schadenart.toLowerCase().includes(k.toLowerCase())) { tag = v; break; }
  }

  // Repräsentative Top-Positionen je Schadensart (Median-Preis, netto)
  const KOSTEN_TOP = {
    WS: [
      {b:'Trocknungsgerät Kondensationstrockner/Tag',e:'Stk',m:28},
      {b:'Estrich aufbrechen+entsorgen Zementestrich',e:'m²',m:42},
      {b:'Putz Innenputz neu Kalkgips',e:'m²',m:33},
      {b:'Sanierputz Feuchtigkeitsschutz',e:'m²',m:43},
      {b:'Fliesen neu verlegen Standard',e:'m²',m:68},
      {b:'Gipskartonwand nass erneuern',e:'m²',m:68},
      {b:'Gipskartondecke neu einbauen',e:'m²',m:65},
      {b:'E-Prüfung nach Wasserschaden VDE-Protokoll',e:'Psch',m:280},
      {b:'Dusche bodengleich neu',e:'Stk',m:980},
      {b:'Wasserleitung Kupfer DN15 UP erneuern',e:'lfm',m:72},
    ],
    SC: [
      {b:'Schimmelanalyse Abklatsch Labor',e:'Stk',m:130},
      {b:'Luftkeimmessung je Raum',e:'Stk',m:225},
      {b:'Schimmelbefall entfernen <2m²',e:'m²',m:225},
      {b:'Schimmelbefall Totalreinigung Raum',e:'m²',m:27},
      {b:'Biozidbehandlung nach Sanierung',e:'m²',m:13},
      {b:'Horizontalsperre Injektion',e:'lfm',m:48},
      {b:'Sanierputzsystem WTA Innen',e:'m²',m:43},
      {b:'Lüftungsanlage dezentral je Raum',e:'Stk',m:745},
      {b:'Lüftungskonzept Planung DIN 1946-6',e:'Psch',m:435},
      {b:'Freimessung nach Sanierung',e:'Psch',m:285},
    ],
    BS: [
      {b:'Rußreinigung Wände trocken',e:'m²',m:13},
      {b:'Rußreinigung Decken trocken',e:'m²',m:15},
      {b:'Rußreinigung nass chemisch',e:'m²',m:18},
      {b:'Ozonbehandlung Geruchsneutralisation',e:'m³',m:2},
      {b:'Brandschutt entsorgen bis 5m³',e:'Psch',m:580},
      {b:'Gipskartonwand nach Brand neu',e:'m²',m:68},
      {b:'Brandschutzwand F90',e:'m²',m:130},
      {b:'Dachstuhl Neubau Vollholz',e:'m²',m:190},
      {b:'Elektroinstallation komplett erneuern',e:'m²',m:85},
      {b:'Dachfenster nach Brand erneuern',e:'Stk',m:590},
    ],
    SS: [
      {b:'Dachziegel Tonziegel tauschen',e:'Stk',m:27},
      {b:'Dacheindeckung Teilfläche bis 10m²',e:'m²',m:85},
      {b:'Dachrinne Zink erneuern',e:'lfm',m:43},
      {b:'Fallrohr Zinkblech erneuern',e:'lfm',m:34},
      {b:'Notabdichtung Dachfolie',e:'m²',m:13},
      {b:'Fenster Kunststoff erneuern',e:'m²',m:435},
      {b:'Fensterglas Isolierverglasung 2-fach',e:'m²',m:130},
      {b:'WDVS Fassadendämmplatten erneuern',e:'m²',m:85},
      {b:'Baum Fällarbeiten',e:'Stk',m:285},
      {b:'Dachstuhl Auflager reparieren',e:'Stk',m:225},
    ],
    ES: [
      {b:'Aufräumarbeiten nach Überflutung',e:'m²',m:27},
      {b:'Schlamm entfernen',e:'m²',m:34},
      {b:'Keller auspumpen',e:'h',m:130},
      {b:'Bautrocknung nach Überschwemmung',e:'m²',m:13},
      {b:'Elektroanlage nach Hochwasser prüfen',e:'Psch',m:435},
      {b:'Rückstauklappe DN100 einbauen',e:'Stk',m:745},
      {b:'Heizung nach Hochwasser instandsetzen',e:'Psch',m:740},
      {b:'Frostschaden Wasserleitung reparieren',e:'lfm',m:85},
      {b:'Hangsicherung Gabionen',e:'m²',m:130},
      {b:'Stützmauer Beton neu',e:'m²',m:285},
    ],
    BA: [
      {b:'Rissprotokoll je Bauteil',e:'Psch',m:145},
      {b:'Riss Injektionsharz',e:'lfm',m:34},
      {b:'Setzungsprotokoll Nivellement',e:'Psch',m:435},
      {b:'Kellerwandabdichtung außen bituminös',e:'m²',m:68},
      {b:'Kellerdrainageleitung erneuern',e:'lfm',m:85},
      {b:'Balkonabdichtung PMMA',e:'m²',m:52},
      {b:'Estrichhohlstelle Injektion',e:'m²',m:34},
      {b:'Flachdachabdichtung Blasen reparieren',e:'m²',m:43},
      {b:'Außenputz Reparatur bis 1m²',e:'Stk',m:130},
      {b:'Schallmessung Luftschall je Raum',e:'Psch',m:435},
    ],
  };

  const positionen = tag ? (KOSTEN_TOP[tag] || []) : [];
  if (!positionen.length) return 'Keine Kostenpositionen verfügbar';
  return positionen.slice(0, 10)
    .map(p => `${p.b}: ${p.m}€/${p.e}`)
    .join(' | ');
}

/* ============================================================
   SCHRITT 2 → 3: WEBHOOK
============================================================ */
window.weiterZuAnalyse = async function() {
  // Sync: falls Nutzer direkt im Transkript-Bereich getippt hat
  const ta = document.getElementById('transcriptArea');
  if (ta) window.transcriptText = ta.innerText.trim();
  if (diktatMode === 'text') {
    var manuellTa = document.getElementById('transcriptManuell');
    window.transcriptText = (manuellTa && manuellTa.value) ? manuellTa.value.trim() : window.transcriptText;
  }
  if (!(window.transcriptText || transcriptText || '').trim()) {
    showToast('Bitte Diktat aufnehmen oder Text eingeben.', 'warning');
    return;
  }
  // ── KRITISCH: Diktat + Messwerte in localStorage für stellungnahme.html ──
  localStorage.setItem('prova_transkript', window.transcriptText || transcriptText || '');
  // Manuelle Eingabe separat für stellungnahme.html 3-Quellen-Diktat
  var manuellEl = document.getElementById('transcriptManuell');
  var manuellText = manuellEl ? manuellEl.value.trim() : '';
  if (manuellText) localStorage.setItem('prova_manuell_text', manuellText);
  // Diktat-Nachtrag (leer beim ersten Durchgang — wird später in stellungnahme.html befüllt)
  if (!localStorage.getItem('prova_diktat_nachtrag')) {
    localStorage.setItem('prova_diktat_nachtrag', '');
  }
  const az = document.getElementById('f-schadensnummer')?.value || '';
  const sa = document.getElementById('f-schadenart')?.value || '';
  const baujahr = document.getElementById('f-baujahr')?.value || '';
  if(az) { localStorage.setItem('prova_letztes_az', az); localStorage.setItem('prova_aktiver_fall', az); }
  if(sa) localStorage.setItem('prova_schadenart', sa);
  if(baujahr) localStorage.setItem('prova_baujahr', baujahr);
  // Messwerte sammeln
  const mwFeuchte = document.getElementById('f-feuchte')?.value || '';
  const mwLuft = document.getElementById('f-luftfeuchte')?.value || '';
  const mwTemp = document.getElementById('f-temperatur')?.value || '';
  const mwListe = [
    mwFeuchte ? 'Materialfeuchte: ' + mwFeuchte + ' %' : '',
    mwLuft    ? 'Luftfeuchtigkeit: ' + mwLuft + ' %' : '',
    mwTemp    ? 'Raumtemperatur: ' + mwTemp + ' °C' : '',
  ].filter(Boolean).join(' | ');
  if(mwListe) localStorage.setItem('prova_messwerte', mwListe);
  sessionStorage.setItem('prova_gutachten_vorlage_id', defaultVorlageIdBySchadenart());
  const s2text = document.getElementById('ki-s2-text');
  if (s2text) {
    s2text.style.color = '';
    if (fotos.length > 0) {
      s2text.textContent = fotos.length + ' Foto' + (fotos.length > 1 ? 's' : '') + ' werden mit der Anfrage übermittelt';
    } else {
      s2text.textContent = 'Keine Fotos — können nachgereicht werden';
      s2text.style.color = 'var(--warning, #F59E0B)';
    }
  }
  goToStep(3);
  await sendeWebhook();
};

async function sendeWebhook() {
  const daten = sammleDaten();
  const schritte = ['ki-s1','ki-s2','ki-s3','ki-s4','ki-s5','ki-s6'];
  // UI-Progress bewusst kurz halten (≈2s), unabhängig von der tatsächlichen Übertragungsdauer
  const timings  = [0, 350, 700, 1050, 1400, 1750];

  const statusTexte = [
    'Daten werden übermittelt…',
    'Fotos werden verarbeitet…',
    'Schadensart wird analysiert…',
    'KI erstellt Gutachten-Entwurf…',
    'Entwurf wird finalisiert…',
    'In PROVA gespeichert…'
  ];
  let statusIdx = 0;
  const iv = setInterval(() => {
    const st = document.getElementById('kiStatusText');
    if (st && statusIdx < statusTexte.length) {
      st.textContent = statusTexte[Math.min(statusIdx, statusTexte.length - 1)];
    }
    statusIdx++;
  }, 400);

  schritte.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id); if (!el) return;
      if (i > 0) { const p = document.getElementById(schritte[i-1]); if(p){p.className='ki-step done';p.querySelector('.ki-step-icon').textContent='✓';} }
      el.className = 'ki-step active'; el.querySelector('.ki-step-icon').textContent='⟳';
    }, timings[i]);
  });

  try {
    const res = await fetch(WEBHOOK_G1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(daten)
    });
    clearInterval(iv);
    schritte.forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      if (id === 'ki-s2' && fotos.length === 0) {
        el.className = 'ki-step skipped';
        const icon = el.querySelector('.ki-step-icon'); if (icon) icon.textContent = '−';
        const s2text = document.getElementById('ki-s2-text'); if (s2text) s2text.textContent = 'Keine Fotos — können nachgereicht werden';
      } else {
        el.className = 'ki-step done';
        const icon = el.querySelector('.ki-step-icon'); if (icon) icon.textContent = '✓';
      }
    });
    const spinner=$('#kiSpinner');
    const st=document.getElementById('kiStatusText');
    if(spinner) spinner.style.display='none';
    if(st) st.textContent='';
    if (res.ok) {
      // Zeiterfassung abschließen
      const timing = TRACKING.ende();
      if (timing) {
        console.log('PROVA Zeiterfassung:', timing.dauer_minuten, 'Minuten für dieses Gutachten');
      }
      
      // Fall-Kontext für Folgeseiten setzen
      const _daten = sammleDaten();
      const _az = _daten.schadensnummer || localStorage.getItem('prova_letztes_az') || '';
      const _sa = _daten.schadenart || localStorage.getItem('prova_schadenart') || '';
      const _adr = [_daten.strasse, _daten.plz, _daten.ort].filter(Boolean).join(', ');
      
      if (typeof window.PROVA_KONTEXT !== 'undefined') {
        window.PROVA_KONTEXT.setFall(_az, _sa, _adr, '');
      }
      
      // Schadenart und AZ für Banner speichern
      if (_az) { localStorage.setItem('prova_letztes_az', _az); localStorage.setItem('prova_aktiver_fall', _az); }
      if (_sa) localStorage.setItem('prova_schadenart', _sa);
      if (_adr) localStorage.setItem('prova_adresse', _adr);
      
      // Fristdaten in Fälle-Cache speichern (für Dashboard-Widget)
      if (_daten.fristdatum) {
        try {
          var _cache = JSON.parse(localStorage.getItem('prova_faelle_cache') || '[]');
          _cache.push({
            aktenzeichen: _az,
            gerichts_az: _daten.gerichts_az || '',
            schadenart: _sa,
            fristdatum: _daten.fristdatum,
            beweisfragen: _daten.beweisfragen || '',
            status: 'In Bearbeitung',
            erstellt: new Date().toISOString()
          });
          localStorage.setItem('prova_faelle_cache', JSON.stringify(_cache));
        } catch(e) {}
      }
      
      // Stellungnahme-Daten für neues Gutachten zurücksetzen
      localStorage.removeItem('prova_stellungnahme_done');
      localStorage.removeItem('prova_stellungnahme_text');
      localStorage.removeItem('prova_stellungnahme_kj2_ok');
      localStorage.removeItem('prova_ki_stellungnahme_vorschlag');
      
      const h2 = document.querySelector('#step3-content h2');
      const p  = document.querySelector('#step3-content .ki-header p');
      if (h2) h2.textContent = 'Entwurf erfolgreich erstellt!';
      if (p)  p.textContent  = 'Sie erhalten in Kürze eine Eingangsbestätigung per E-Mail.';
      const box = document.getElementById('kiSuccessBox');
      if (box) box.style.display = 'block';
      const naechste = document.getElementById('ki-naechste-schritte');
      if (naechste) naechste.style.display = 'flex';
      const vorlageBox = document.getElementById('gutachtenVorlageBox');
      if (vorlageBox) { vorlageBox.style.display = 'block'; renderGutachtenVorlageRadios(GUTACHTEN_VORLAGEN_STARTER_IDS); }
      const btnF = document.getElementById('btnFreigabe'), btnN = document.getElementById('btnNeues');
      if (btnF) btnF.style.display = ''; if (btnN) btnN.style.display = '';
      fotos = [];
      showToast('Gutachten übermittelt!', 'success');
    } else {
      const h2 = document.querySelector('#step3-content h2');
      if (h2) h2.textContent = 'Fehler ' + res.status;
      showToast('Webhook-Fehler ' + res.status, 'error');
      const btnN = document.getElementById('btnNeues'); if(btnN) btnN.style.display='';
    }
  } catch(err) {
    clearInterval(iv);
    const h2 = document.querySelector('#step3-content h2');
    if (h2) h2.textContent = 'Verbindungsfehler';
    showToast('Netzwerk prüfen und erneut versuchen.', 'error');
    const btnN = document.getElementById('btnNeues'); if(btnN) btnN.style.display='';
    console.error('S1:', err);
  }
}

/* ============================================================
   GUTACHTEN-LISTE AUS AIRTABLE
============================================================ */
let alleGutachten = [];

async function ladeGutachtenListe() {
  const tbody = document.getElementById('gutachtenTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:2rem">Wird geladen…</td></tr>';
  try {
    const path = `/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?maxRecords=100&sort[0][field]=Timestamp&sort[0][direction]=desc`;
    const res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path })
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    alleGutachten = data.records || [];
    const sub = document.getElementById('listSubtitle');
    if (sub) sub.textContent = alleGutachten.length + ' Gutachten insgesamt';
    const cnt = document.getElementById('gutachtenCount');
    if (cnt) cnt.textContent = alleGutachten.length;
    renderTabelle(alleGutachten);
  } catch(err) {
    const tbody = document.getElementById('gutachtenTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:2rem">Fehler beim Laden. Seite neu laden.</td></tr>';
    console.error('Airtable:', err);
  }
}

function renderTabelle(records) {
  const tbody = document.getElementById('gutachtenTableBody');
  if (!tbody) return;
  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:2rem">Noch keine Gutachten vorhanden.</td></tr>';
    return;
  }
  const klassen = { 'Entwurf':'badge-gray','In Freigabe':'badge-warning','Freigegeben':'badge-success','Exportiert':'badge-primary' };
  tbody.innerHTML = records.map(r => {
    const f = r.fields || {};
    const status = f.Status || 'Entwurf';
    const badge = klassen[status] || 'badge-gray';
    const datum = f.Timestamp ? new Date(f.Timestamp).toLocaleDateString('de-DE') : '—';
    const adresse = [f.Strasse, f.Ort].filter(Boolean).join(', ') || '—';
    const nr = f.Schadensnummer || r.id.slice(-6).toUpperCase();
    return `<tr>
      <td style="font-weight:600;font-family:monospace">${nr}</td>
      <td>${adresse}</td>
      <td>${f.Schadenart||'—'}</td>
      <td>${datum}</td>
      <td><span class="badge ${badge}">${status}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="window.location.href='freigabe.html?fall=${encodeURIComponent(nr)}'">Öffnen</button></td>
    </tr>`;
  }).join('');
}

window.filterGutachten = function() {
  const s = document.getElementById('searchInput')?.value.toLowerCase()||'';
  const st = document.getElementById('statusFilter')?.value||'';
  renderTabelle(alleGutachten.filter(r => {
    const f = r.fields||{};
    const txt = [f.Schadensnummer,f.Strasse,f.Ort,f.Schadenart].join(' ').toLowerCase();
    return (!st||f.Status===st) && (!s||txt.includes(s));
  }));
};


/* ============================================================
   ARCHIV
============================================================ */
let alleArchivDaten = [];

async function ladeArchivDaten() {
  const tbody = document.getElementById('archivTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray-400);padding:2rem">Wird geladen…</td></tr>';

  try {
    const path = `/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}?maxRecords=500&sort[0][field]=Timestamp&sort[0][direction]=desc`;
    const res = await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path })
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    alleArchivDaten = data.records || [];

    // Statistiken berechnen
    const gesamt = alleArchivDaten.length;
    const freigegeben = alleArchivDaten.filter(r => ['Freigegeben','Exportiert'].includes(r.fields?.Status)).length;
    const offen = gesamt - freigegeben;

    // Durchschnittliche Erstellungszeit aus Tracking-Daten
    const zeiten = alleArchivDaten
      .map(r => r.fields?.Erstellungszeit_Sekunden)
      .filter(z => z && z > 0);
    const avgMin = zeiten.length ? Math.round(zeiten.reduce((a,b) => a+b, 0) / zeiten.length / 60) : null;

    const el = id => document.getElementById(id);
    if (el('archivStatGesamt')) el('archivStatGesamt').textContent = gesamt;
    if (el('archivStatFreigegeben')) el('archivStatFreigegeben').textContent = freigegeben;
    if (el('archivStatOffen')) el('archivStatOffen').textContent = offen;
    if (el('archivStatDauer')) el('archivStatDauer').textContent = avgMin ? avgMin + ' Min.' : 'n/a';
    if (el('archivSubtitle')) el('archivSubtitle').textContent = `${gesamt} Gutachten insgesamt`;

    renderArchivTabelle(alleArchivDaten);
  } catch(err) {
    const tbody = document.getElementById('archivTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray-400);padding:2rem">Fehler beim Laden. Seite neu laden.</td></tr>';
    console.error('Archiv Fehler:', err);
  }
}

function renderArchivTabelle(records) {
  const tbody = document.getElementById('archivTableBody');
  if (!tbody) return;

  if (!records.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray-400);padding:2rem">Keine Gutachten gefunden.</td></tr>';
    return;
  }

  const klassen = {
    'Entwurf':'badge-gray', 'In Freigabe':'badge-warning',
    'Freigegeben':'badge-success', 'Exportiert':'badge-primary'
  };

  tbody.innerHTML = records.map(r => {
    const f = r.fields || {};
    const status = f.Status || 'Entwurf';
    const badge = klassen[status] || 'badge-gray';
    const datum = f.Timestamp ? new Date(f.Timestamp).toLocaleDateString('de-DE') : '—';
    const adresse = [f.Strasse, f.PLZ, f.Ort].filter(Boolean).join(', ') || '—';
    const nr = f.Schadensnummer || r.id.slice(-6).toUpperCase();
    const auftraggeber = f.Auftraggeber_Name || '—';
    const dauerSek = f.Erstellungszeit_Sekunden;
    const dauerText = dauerSek ? Math.round(dauerSek/60) + ' Min.' : '—';

    return `<tr>
      <td style="font-weight:600;font-family:monospace;font-size:.8125rem">${nr}</td>
      <td style="font-size:.875rem">${adresse}</td>
      <td style="font-size:.875rem">${f.Schadenart||'—'}</td>
      <td style="font-size:.875rem;color:var(--gray-500)">${auftraggeber}</td>
      <td style="font-size:.875rem">${datum}</td>
      <td style="font-size:.875rem;color:var(--gray-500)">${dauerText}</td>
      <td><span class="badge ${badge}" style="font-size:.68rem">${status}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" onclick="window.location.href='freigabe.html?fall=${encodeURIComponent(nr)}'" style="font-size:.75rem;padding:.3rem .625rem">Öffnen</button>
      </td>
    </tr>`;
  }).join('');
}

window.filterArchiv = function() {
  const suche = document.getElementById('archivSearch')?.value.toLowerCase() || '';
  const art = document.getElementById('archivSchadenart')?.value || '';
  const jahr = document.getElementById('archivJahr')?.value || '';
  const status = document.getElementById('archivStatus')?.value || '';

  const gefiltert = alleArchivDaten.filter(r => {
    const f = r.fields || {};
    const txt = [f.Schadensnummer, f.Strasse, f.PLZ, f.Ort, f.Auftraggeber_Name, f.Schadenart].join(' ').toLowerCase();
    const datumJahr = f.Timestamp ? new Date(f.Timestamp).getFullYear().toString() : '';
    return (!suche || txt.includes(suche))
        && (!art || f.Schadenart === art)
        && (!jahr || datumJahr === jahr)
        && (!status || f.Status === status);
  });

  renderArchivTabelle(gefiltert);
};

window.resetArchivFilter = function() {
  ['archivSearch','archivSchadenart','archivJahr','archivStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderArchivTabelle(alleArchivDaten);
};

window.exportiereCSV = function() {
  if (!alleArchivDaten.length) { showToast('Keine Daten zum Exportieren.', 'warning'); return; }

  const header = ['Aktenzeichen','Schadenart','Straße','PLZ','Ort','Auftraggeber','Datum','Status','Erstellungszeit (Min.)'];
  const rows = alleArchivDaten.map(r => {
    const f = r.fields || {};
    const nr = f.Schadensnummer || r.id.slice(-6).toUpperCase();
    const datum = f.Timestamp ? new Date(f.Timestamp).toLocaleDateString('de-DE') : '';
    const dauer = f.Erstellungszeit_Sekunden ? Math.round(f.Erstellungszeit_Sekunden/60) : '';
    return [nr, f.Schadenart||'', f.Strasse||'', f.PLZ||'', f.Ort||'', f.Auftraggeber_Name||'', datum, f.Status||'', dauer]
      .map(v => '"' + String(v).replace(/"/g,'""') + '"').join(';');
  });

  const csv = '\uFEFF' + [header.join(';'), ...rows].join('\n'); // BOM für Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'PROVA_Gutachten_Export_' + new Date().toISOString().slice(0,10) + '.csv';
  link.click();
  showToast('CSV exportiert.', 'success');
};

/* ============================================================
   UPGRADE-HINT — dezenter Tooltip statt Redirect
============================================================ */
window.zeigeUpgradeHint = function(e, featureName) {
  e.preventDefault();
  showToast(`${featureName} ist ab dem Pro-Paket verfügbar. → prova-systems.de/onboarding`, 'default', 4000);
};


/* FORM FEHLER ZURÜCKSETZEN */
document.querySelectorAll('.form-input,.form-select').forEach(el => {
  el.addEventListener('input', () => el.classList.remove('error'));
  el.addEventListener('change', () => el.classList.remove('error'));
});

/* DATUM HEUTE */
const datumEl = document.getElementById('f-schadensdatum');
if (datumEl) datumEl.valueAsDate = new Date();

/* MESSWERTE TOGGLE — standardmäßig eingeklappt, Pfeil dreht sich */
window.toggleMesswerte = function() {
  const body = document.getElementById('messwerte-body');
  const btn = document.getElementById('messwerte-toggle-btn');
  const icon = document.getElementById('messwerte-toggle-icon');
  if (!body) return;
  const isOpen = body.style.display === 'block';
  body.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.classList.toggle('messwerte-open', !isOpen);
  if (icon) icon.textContent = isOpen ? '▼ Ausklappen' : '▲ Einklappen';
};

/* Messwerte-Felder je nach Schadensart anzeigen */
window.updateMesswerteLayout = function() {
  const sa = (document.getElementById('f-schadenart')?.value || '').toLowerCase();
  const blocks = [
    { id: 'mw-feuchte',  on: (sa.includes('schimmel') || sa.includes('wasser') || sa.includes('feucht')) },
    { id: 'mw-brand',    on: (sa.includes('brand')) },
    { id: 'mw-sturm',    on: (sa.includes('sturm') || sa.includes('elementar')) },
    { id: 'mw-einbruch', on: (sa.includes('einbruch') || sa.includes('vandal')) },
    { id: 'mw-bau',      on: (sa.includes('baumängel') || sa.includes('baumaengel')) },
  ];
  let any = false;
  blocks.forEach(b => {
    const el = document.getElementById(b.id);
    if (!el) return;
    el.style.display = b.on ? 'block' : 'none';
    if (b.on) any = true;
  });
  // Fallback: wenn nichts matched (Sonstiger Schaden), zeige Feuchte-Block
  if (!any) {
    const el = document.getElementById('mw-feuchte');
    if (el) el.style.display = 'block';
  }
};

document.getElementById('f-schadenart')?.addEventListener('change', function() {
  try { window.updateMesswerteLayout(); } catch(e) {}
});
