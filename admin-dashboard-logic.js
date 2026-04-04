/* ════════════════════════════════════════════════════════════
   PROVA admin-dashboard-logic.js
   Admin-Dashboard — User-Verwaltung, Metriken
   Extrahiert aus admin-dashboard.html
════════════════════════════════════════════════════════════ */

(function() {
  var token = sessionStorage.getItem('prova_admin');
  if (!token) { window.location.href = 'admin-login.html'; return; }
  // Token-Expiry: 8 Stunden
  try {
    var ts = parseInt(atob(token));
    if (isNaN(ts) || Date.now() - ts > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem('prova_admin');
      window.location.href = 'admin-login.html';
    }
  } catch(e) {
    sessionStorage.removeItem('prova_admin');
    window.location.href = 'admin-login.html';
  }
})();

/* ─────────────────────────────────────────── */

/* ── AIRTABLE CONFIG ── */
const ADMIN_BASE = 'appJ7bLlAHZoxENWE';
const SV_BASE    = 'appJ7bLlAHZoxENWE';
const T = {
  KUNDEN:         'tbladqEQT3tmx4DIB',  // SACHVERSTEANDIGE
  SCHADENSFAELLE: 'tblSxV8bsXwd1pwa0',  // SCHADENSFAELLE
  SUPPORT:        'tblEb3A4dukGX8GFs',   // SUPPORT_TICKETS ✅
  PIPELINE:       'tblK7a3mBdsrxsrp5',  // PIPELINE_AKQUISE ✅
  AUDIT_LOG:      'tblSxV8bsXwd1pwa0',  // SCHADENSFAELLE als Audit-Fallback
  FINANZEN_MRR:   'tblcGu1fM7PfLYO7c',  // ADMIN_FINANZEN ✅
  NUTZUNG:        'tblSxV8bsXwd1pwa0'
};

/* ── PROXY CALL ── */
async function at(base, table, params='') {
  const res = await fetch('/.netlify/functions/airtable', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      method: 'GET',
      path: `/v0/${base}/${table}?${params}`
    })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

/* ── STATE ── */
let _kunden = [], _tickets = [], _pipeline = [];

/* ── TABS ── */
function showTab(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'kunden')   loadKunden();
  if (id === 'finanzen') loadFinanzen();
  if (id === 'tickets')  loadTickets();
  if (id === 'pipeline') loadPipeline();
  if (id === 'system')   loadAudit();
}

/* ── HELPERS ── */
function paketBadge(p) {
  const m = {Solo:'solo',Team:'team',Starter:'solo',Pro:'solo',Enterprise:'team'};
  return `<span class="badge badge-${m[p]||'solo'}">${p||'Solo'}</span>`;
}
function statusBadge(s) {
  const m = {'Aktiv':'aktiv','Trial':'trial','Gekündigt':'gekuendigt','Offen':'offen','Gelöst':'geloest'};
  return `<span class="badge badge-${m[s]||'aktiv'}">${s||'Aktiv'}</span>`;
}
function fmtDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtEur(n) {
  if (!n && n !== 0) return '–';
  return Number(n).toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
}

/* ── LOAD ALL (Übersicht) ── */
async function loadAll() {
  document.getElementById('lastRefresh').textContent = new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  loadKPIs();
  loadPaketVerteilung();
  loadNeuesteKunden();
  checkAirtableHealth();
}

async function loadKPIs() {
  try {
    // Kunden aus SACHVERSTAENDIGE Tabelle
    const kunden = await at(ADMIN_BASE, T.KUNDEN, 'fields[]=Paket&fields[]=Status&fields[]=Email&fields[]=Vorname&fields[]=Nachname&fields[]=Name');
    const aktiv = kunden.records.filter(r => r.fields.Status !== 'Gekündigt');
    const mrr = aktiv.reduce((s, r) => {
      const p = {Solo:149,Team:349,Starter:149,Pro:149,Enterprise:349};
      return s + (Number(r.fields.MRR_EUR) || p[r.fields.Paket] || 179);
    }, 0);
    document.getElementById('kpiMrr').textContent = fmtEur(mrr);
    document.getElementById('kpiMrrSub').textContent = `ARR ${fmtEur(mrr*12)}`;
    document.getElementById('kpiKunden').textContent = aktiv.length;
    document.getElementById('kpiKundenSub').textContent = `${kunden.records.length} gesamt`;
    if (document.getElementById('finMrr')) document.getElementById('finMrr').textContent = fmtEur(mrr);
    if (document.getElementById('finArr')) document.getElementById('finArr').textContent = fmtEur(mrr*12);

    // Support-Tickets — graceful wenn Tabelle noch nicht existiert
    try {
      const tickets = await at(ADMIN_BASE, T.SUPPORT, 'fields[]=Status');
      const offen = tickets.records.filter(r => r.fields.Status === 'Offen' || r.fields.Status === 'In Bearbeitung');
      document.getElementById('kpiTickets').textContent = offen.length;
      document.getElementById('kpiTicketsSub').textContent = `${tickets.records.length} gesamt`;
    } catch(e) {
      document.getElementById('kpiTickets').textContent = '0';
      document.getElementById('kpiTicketsSub').textContent = 'noch keine';
    }

    // Pipeline — graceful wenn Tabelle noch nicht existiert
    try {
      const pipe = await at(ADMIN_BASE, T.PIPELINE, 'fields[]=Status');
      const aktPipe = pipe.records.filter(r => r.fields.Status !== 'Abgeschlossen' && r.fields.Status !== 'Verloren');
      document.getElementById('kpiPipeline').textContent = aktPipe.length;
      document.getElementById('kpiPipelineSub').textContent = 'aktive Leads';
    } catch(e) {
      document.getElementById('kpiPipeline').textContent = '0';
      document.getElementById('kpiPipelineSub').textContent = 'noch keine';
    }

  } catch(e) {
    console.error('KPI load error:', e);
    document.getElementById('kpiMrr').textContent = 'Fehler';
  }
}

async function loadPaketVerteilung() {
  try {
    const kunden = await at(ADMIN_BASE, T.KUNDEN, 'fields[]=Paket&fields[]=Status');
    const aktiv = kunden.records.filter(r => r.fields.Status !== 'Gekündigt');
    const counts = {Solo:0,Team:0,Starter:0,Pro:0,Enterprise:0};
    aktiv.forEach(r => { const p = r.fields.Paket || 'Starter'; if (counts[p] !== undefined) counts[p]++; });
    const total = aktiv.length || 1;
    const colors = {Starter:'var(--accent)',Pro:'var(--warn)',Enterprise:'var(--purple)'};
    const mrrs = {Solo:149,Team:349,Starter:149,Pro:149,Enterprise:349};
    let html = '<div class="paket-bars">';
    for (const [p, c] of Object.entries(counts)) {
      const pct = Math.round(c/total*100);
      html += `<div class="paket-bar-row">
        <span class="paket-bar-label">${paketBadge(p)}</span>
        <div class="paket-bar-track"><div class="paket-bar-fill" style="width:${pct}%;background:${colors[p]};"></div></div>
        <span class="paket-bar-count">${c}</span>
      </div>`;
    }
    html += `</div><div style="margin-top:12px;font-size:11px;color:var(--text3);font-family:var(--mono);">
      MRR-Mix: Solo ${fmtEur(counts.Solo*149)} · Team ${fmtEur(counts.Team*349)}
    </div>`;
    document.getElementById('paketVerteilung').innerHTML = html;
  } catch(e) { document.getElementById('paketVerteilung').innerHTML = '<div class="empty">Fehler beim Laden</div>'; }
}

async function loadNeuesteKunden() {
  try {
    const data = await at(ADMIN_BASE, T.KUNDEN, 'sort[0][field]=Created&sort[0][direction]=desc&maxRecords=8');
    if (!data.records.length) { document.getElementById('neuesteKunden').innerHTML = '<div class="empty">Keine Kunden</div>'; return; }
    let html = '<table class="tbl"><thead><tr><th>Name</th><th>Paket</th><th>Status</th><th>MRR</th><th>Onboarding</th><th>E-Mail</th></tr></thead><tbody>';
    data.records.forEach(r => {
      const f = r.fields;
      const name = [f.Vorname, f.Nachname].filter(x => x && x.trim()).join(' ') || f.Email || '–';
      if (!name || name === '–') return; // undefined undefined überspringen
      const mrr = f.MRR_EUR || {Solo:149,Team:349,Starter:149,Pro:149,Enterprise:349}[f.Paket] || 149;
      html += `<tr><td><strong>${name}</strong></td>
        <td>${paketBadge(f.Paket)}</td>
        <td>${statusBadge(f.Status||'Aktiv')}</td>
        <td style="font-family:var(--mono);">${fmtEur(mrr)}</td>
        <td style="font-family:var(--mono);font-size:12px;">${fmtDate(f.Onboarding_Datum || f.Onboarding_Datum||f.Created)}</td>
        <td style="font-size:12px;color:var(--text3);">${f.Email||'–'}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('neuesteKunden').innerHTML = html;
  } catch(e) { document.getElementById('neuesteKunden').innerHTML = '<div class="empty" style="padding:16px;">Fehler beim Laden</div>'; }
}

async function checkAirtableHealth() {
  try {
    await at(ADMIN_BASE, T.KUNDEN, 'maxRecords=1');
    document.getElementById('h-airtable').textContent = 'Erreichbar';
    document.getElementById('h-airtable').className = 'health-status green';
    // S3 hat 8/8 Fehler lt. Dokumentation
    document.getElementById('h-s1').className = 'health-dot warn';
    document.getElementById('h-s1-txt').textContent = '30% Fehler';
    document.getElementById('h-s1-txt').className = 'health-status warn';
    document.getElementById('h-s3').className = 'health-dot red';
    document.getElementById('h-s3-txt').textContent = 'PDFMonkey fehlt';
    document.getElementById('h-s3-txt').className = 'health-status red';
  } catch(e) {
    document.getElementById('h-airtable').textContent = 'Fehler';
    document.getElementById('h-airtable').className = 'health-status red';
  }
}

/* ── KUNDEN ── */
async function loadKunden() {
  document.getElementById('kundenTable').innerHTML = '<div class="loading" style="padding:16px 18px;"><div class="spin"></div>Lädt…</div>';
  try {
    const data = await at(ADMIN_BASE, T.KUNDEN, 'sort[0][field]=Onboarding_Datum&sort[0][direction]=desc');
    _kunden = data.records;
    renderKunden(_kunden);
  } catch(e) { document.getElementById('kundenTable').innerHTML = '<div class="empty" style="padding:16px;">Fehler beim Laden</div>'; }
}

function renderKunden(records) {
  if (!records.length) { document.getElementById('kundenTable').innerHTML = '<div class="empty" style="padding:16px;">Keine Kunden</div>'; return; }
  let html = '<table class="tbl"><thead><tr><th>Name</th><th>Paket</th><th>Status</th><th>MRR</th><th>Gutachten/Mo</th><th>Onboarding</th><th>E-Mail</th></tr></thead><tbody>';
  records.forEach(r => {
    const f = r.fields;
    const name = f.Name || [f.Vorname, f.Nachname].filter(Boolean).join(' ') || '–';
    const mrr = f.MRR_EUR || {Solo:149,Team:349,Starter:149,Pro:149,Enterprise:349}[f.Paket] || 149;
    html += `<tr><td><strong>${name}</strong></td>
      <td>${paketBadge(f.Paket)}</td>
      <td>${statusBadge(f.Status)}</td>
      <td style="font-family:var(--mono);">${fmtEur(mrr)}</td>
      <td style="font-family:var(--mono);text-align:center;">${f.Gutachten_pro_Monat||'–'}</td>
      <td style="font-family:var(--mono);font-size:12px;">${fmtDate(f.Onboarding_Datum || f.Onboarding_Datum||f.Created)}</td>
      <td style="font-size:12px;color:var(--text3);">${f.Email||'–'}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('kundenTable').innerHTML = html;
}

function filterKunden() {
  const q = document.getElementById('kundenSearch').value.toLowerCase();
  const filtered = _kunden.filter(r => {
    const f = r.fields;
    const name = (f.Name||[f.Vorname,f.Nachname].filter(Boolean).join(' ')||'').toLowerCase();
    return name.includes(q) || (f.Email||'').toLowerCase().includes(q) || (f.Paket||'').toLowerCase().includes(q);
  });
  renderKunden(filtered);
}

/* ── FINANZEN ── */
async function loadFinanzen() {
  try {
    const data = await at(ADMIN_BASE, T.FINANZEN_MRR, 'sort[0][field]=Monat&sort[0][direction]=desc&maxRecords=12');
    if (!data.records.length) { document.getElementById('finanzenTable').innerHTML = '<div class="empty" style="padding:16px;">Keine Daten</div>'; return; }
    // Chart
    const rev = data.records.reverse();
    const maxVal = Math.max(...rev.map(r => Number(r.fields.MRR_EUR||0)));
    let chartHtml = '<div class="mrr-bars">';
    rev.forEach(r => {
      const f = r.fields;
      const val = Number(f.MRR_EUR||0);
      const h = maxVal > 0 ? Math.round((val/maxVal)*70) : 4;
      const mon = f.Monat ? f.Monat.slice(0,7) : '–';
      chartHtml += `<div class="mrr-bar-wrap">
        <div class="mrr-bar-val">${val > 0 ? fmtEur(val).replace(' €','') : ''}</div>
        <div class="mrr-bar" style="height:${h}px;" title="${fmtEur(val)}"></div>
        <div class="mrr-bar-label">${mon}</div>
      </div>`;
    });
    chartHtml += '</div>';
    document.getElementById('mrrChart').innerHTML = chartHtml;
    // Setup sum
    const setupSum = 0; // Setup wird separat berechnet
    document.getElementById('finSetup').textContent = fmtEur(setupSum);
    // Table
    let html = '<table class="tbl"><thead><tr><th>Monat</th><th>MRR</th><th>Neue Kunden</th><th>Churn</th><th>Setup</th></tr></thead><tbody>';
    data.records.reverse().forEach(r => {
      const f = r.fields;
      html += `<tr><td style="font-family:var(--mono);">${f.Monat||'–'}</td>
        <td style="font-family:var(--mono);">${fmtEur(f.MRR_EUR)}</td>
        <td style="text-align:center;">${f.Neue_Kunden||'–'}</td>
        <td style="text-align:center;color:var(--red);">${f.Churned_Kunden||'0'}</td>
        <td style="font-family:var(--mono);">${fmtEur(0)}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('finanzenTable').innerHTML = html;
  } catch(e) {
    document.getElementById('mrrChart').innerHTML = '<div class="empty">Fehler</div>';
    document.getElementById('finanzenTable').innerHTML = '<div class="empty" style="padding:16px;">Fehler beim Laden</div>';
  }
}

/* ── TICKETS ── */
async function loadTickets() {
  document.getElementById('ticketsTable').innerHTML = '<div class="loading" style="padding:16px 18px;"><div class="spin"></div>Lädt…</div>';
  try {
    const data = await at(ADMIN_BASE, T.SUPPORT, 'sort[0][field]=Datum&sort[0][direction]=desc');
    _tickets = data.records;
    renderTickets(_tickets);
  } catch(e) { document.getElementById('ticketsTable').innerHTML = '<div class="empty" style="padding:16px;">Fehler</div>'; }
}

function renderTickets(records) {
  if (!records.length) { document.getElementById('ticketsTable').innerHTML = '<div class="empty" style="padding:16px;">Keine Tickets</div>'; return; }
  let html = '<table class="tbl"><thead><tr><th>Datum</th><th>Kunde</th><th>Betreff</th><th>Priorität</th><th>Status</th></tr></thead><tbody>';
  records.forEach((r, i) => {
    const f = r.fields;
    const prio = f.Prioritaet || f.Priorität || '–';
    const prioColor = prio === 'Hoch' ? 'var(--red)' : prio === 'Mittel' ? 'var(--warn)' : 'var(--text3)';
    html += `<tr class="ticket-row" onclick="toggleTicketDetail(${i})">
      <td style="font-family:var(--mono);font-size:12px;">${fmtDate(f.Datum||f.Created)}</td>
      <td style="font-size:12px;color:var(--text3);">${f['SV-Email']||'–'}</td>
      <td>${f.Betreff||f.Titel||'–'}</td>
      <td style="color:${prioColor};font-size:12px;">${prio}</td>
      <td>${statusBadge(f.Status)}</td></tr>
      <tr id="td-${i}"><td colspan="5" style="padding:0;">
        <div id="tdp-${i}" class="detail-panel">
          <div style="font-size:12px;color:var(--text2);margin-bottom:6px;">${f.Nachricht||'Keine Beschreibung'}</div>
          ${f.Paket ? `<div style="font-size:12px;color:var(--text3);margin-top:4px;">Paket: ${f.Paket} · Seite: ${f.Seite||'–'}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
            <button onclick="updateTicketStatus('${r.id}','In Bearbeitung',${i})" style="padding:4px 10px;border-radius:5px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);color:#f59e0b;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">⏳ In Bearbeitung</button>
            <button onclick="updateTicketStatus('${r.id}','Gelöst',${i})" style="padding:4px 10px;border-radius:5px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);color:#10b981;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;">✅ Gelöst</button>
            ${f['SV-Email'] ? `<a href="mailto:${f['SV-Email']}?subject=Re: ${encodeURIComponent(f.Betreff||'Support')}&body=${encodeURIComponent('Sehr geehrte/r Herr/Frau,\\n\\nvielen Dank für Ihre Nachricht.\\n\\n')}" style="padding:4px 10px;border-radius:5px;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.25);color:#4f8ef7;font-size:11px;font-weight:600;text-decoration:none;font-family:inherit;">✉️ Antworten</a>` : ''}
          </div>
        </div>
      </td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('ticketsTable').innerHTML = html;
}

function toggleTicketDetail(i) {
  const p = document.getElementById('tdp-'+i);
  if (p) p.classList.toggle('open');
}

function filterTickets() {
  const val = document.getElementById('ticketFilter').value;
  renderTickets(val ? _tickets.filter(r => r.fields.Status === val) : _tickets);
}

async function updateTicketStatus(recordId, newStatus, idx) {
  try {
    await fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        method: 'PATCH',
        path: `/v0/${ADMIN_BASE}/${T.SUPPORT}/${recordId}`,
        payload: { fields: { Status: newStatus } }
      })
    });
    // Lokal aktualisieren
    if (_tickets[idx]) _tickets[idx].fields.Status = newStatus;
    renderTickets(_tickets);
  } catch(e) {
    alert('Fehler beim Aktualisieren: ' + e.message);
  }
}

/* ── PIPELINE ── */
async function loadPipeline() {
  document.getElementById('pipelineTable').innerHTML = '<div class="loading" style="padding:16px 18px;"><div class="spin"></div>Lädt…</div>';
  try {
    const data = await at(ADMIN_BASE, T.PIPELINE, 'sort[0][field]=Erstellt&sort[0][direction]=desc');
    _pipeline = data.records;
    if (!data.records.length) { document.getElementById('pipelineTable').innerHTML = '<div class="empty" style="padding:16px;">Keine Leads</div>'; return; }
    let html = '<table class="tbl"><thead><tr><th>Name</th><th>E-Mail</th><th>Paket-Interesse</th><th>Stufe</th><th>Status</th><th>Datum</th><th>MRR</th></tr></thead><tbody>';
    data.records.forEach(r => {
      const f = r.fields;
      const name = [f.Vorname, f.Nachname].filter(Boolean).join(' ') || f.Email || '–';
      html += `<tr>
        <td><strong>${name}</strong></td>
        <td style="font-size:12px;color:var(--text3);">${f.Email||'–'}</td>
        <td>${paketBadge(f.Stufe||'Solo')}</td>
        <td style="font-size:12px;">${f.Stufe||'–'}</td>
        <td>${statusBadge(f.Status||'Aktiv')}</td>
        <td style="font-family:var(--mono);font-size:12px;">${fmtDate(f.Erstkontakt_Datum||f.Created)}</td>
        <td style="font-family:var(--mono);font-size:12px;">${f.MRR_EUR ? fmtEur(f.MRR_EUR) : '–'}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('pipelineTable').innerHTML = html;
  } catch(e) { document.getElementById('pipelineTable').innerHTML = '<div class="empty" style="padding:16px;">Fehler</div>'; }
}

/* ── AUDIT LOG ── */
async function loadAudit() {
  document.getElementById('auditTable').innerHTML = '<div class="loading" style="padding:16px 18px;"><div class="spin"></div>Lädt…</div>';
  try {
    const data = await at(ADMIN_BASE, T.AUDIT_LOG, 'sort[0][field]=Timestamp&sort[0][direction]=desc&maxRecords=50');
    if (!data.records.length) { document.getElementById('auditTable').innerHTML = '<div class="empty" style="padding:16px;">Keine Einträge</div>'; return; }
    let html = '<table class="tbl"><thead><tr><th>Zeitstempel</th><th>Aktion</th><th>SV / User</th><th>Details</th></tr></thead><tbody>';
    data.records.forEach(r => {
      const f = r.fields;
      html += `<tr>
        <td style="font-family:var(--mono);font-size:11px;">${fmtDate(f.Timestamp||f.Created)}</td>
        <td style="font-size:12px;"><strong>${f.Aktion||f.Action||'–'}</strong></td>
        <td style="font-size:12px;color:var(--text3);">${f.SV||f.User||'–'}</td>
        <td style="font-size:11px;color:var(--text3);max-width:240px;">${f.Details||'–'}</td></tr>`;
    });
    html += '</tbody></table>';
    document.getElementById('auditTable').innerHTML = html;
  } catch(e) { document.getElementById('auditTable').innerHTML = '<div class="empty" style="padding:16px;">Fehler</div>'; }
}

function logout() {
  sessionStorage.removeItem('prova_admin');
  window.location.href = 'admin-login.html';
}

// Init
loadAll();