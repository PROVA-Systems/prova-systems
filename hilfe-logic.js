/* ════════════════════════════════════════════════════════════
   PROVA hilfe-logic.js
   Hilfe-Center — FAQ Toggle, Suche
════════════════════════════════════════════════════════════ */

function toggleFAQ(btn) {
  var item = btn.closest('.faq-item');
  var wasOpen = item.classList.contains('open');
  // Alle schließen
  document.querySelectorAll('.faq-item.open').forEach(function(el) {
    el.classList.remove('open');
  });
  if (!wasOpen) item.classList.add('open');
}

function filterFAQ(q) {
  var query = q.trim().toLowerCase();
  document.querySelectorAll('.faq-item').forEach(function(item) {
    if (!query) {
      item.classList.remove('hidden');
      return;
    }
    var text = (item.dataset.keywords || '') + ' ' + item.textContent;
    item.classList.toggle('hidden', !text.toLowerCase().includes(query));
  });
}

// Direkt-Anker aus URL
(function() {
  var hash = location.hash.replace('#', '');
  if (hash) {
    var el = document.getElementById(hash) || document.querySelector('[data-keywords*="' + hash + '"]');
    if (el) setTimeout(function() { el.scrollIntoView({ behavior: 'smooth' }); }, 300);
  }
})();

/* ── Support-Ticket aus Hilfe-Seite ── */
window.sendeHilfeTicket = async function() {
  var betreff  = (document.getElementById('hilfe-betreff')  || document.getElementById('ticket-betreff')  || {}).value || '';
  var nachricht = (document.getElementById('hilfe-nachricht') || document.getElementById('ticket-text')    || {}).value || '';
  var svEmail   = localStorage.getItem('prova_sv_email') || '';
  var paket     = localStorage.getItem('prova_paket') || 'Trial';
  
  if (!betreff || !nachricht) {
    if(typeof showToast==='function') showToast('Bitte Betreff und Beschreibung ausfüllen', 'warn');
    return;
  }
  
  var btn = document.querySelector('[onclick*="sendeHilfeTicket"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Wird gesendet…'; }
  
  try {
    await provaFetch('/.netlify/functions/airtable', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ method: 'POST',
        path: '/v0/appJ7bLlAHZoxENWE/tblEb3A4dukGX8GFs',
        payload: { fields: {
          Betreff: betreff, Nachricht: nachricht,
          'SV-Email': svEmail, Status: 'Offen',
          Prioritaet: 'Normal', Paket: paket,
          Seite: 'hilfe.html',
          Datum: new Date().toISOString().slice(0,10)
        }}
      })
    });
    if(typeof showToast==='function') showToast('Ticket gesendet ✅ — Wir antworten innerhalb von 24h');
    // Felder leeren
    ['hilfe-betreff','hilfe-nachricht','ticket-betreff','ticket-text'].forEach(function(id) {
      var el = document.getElementById(id); if(el) el.value = '';
    });
  } catch(e) {
    if(typeof showToast==='function') showToast('Fehler: ' + e.message + ' — support@prova-systems.de', 'error');
  }
  
  if (btn) { btn.disabled = false; btn.textContent = 'Ticket senden'; }
};

