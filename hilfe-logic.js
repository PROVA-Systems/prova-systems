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
    // MEGA⁷⁵-F-Batch2 B9: Hilfe-Ticket → support_tickets-Tabelle.
    var ad = await import('/lib/prova-supabase-adapters.js');
    var sb = await ad.getSupabase();
    if (!sb) throw new Error('no-supabase');
    var sess = await sb.auth.getSession();
    var userId = sess?.data?.session?.user?.id || null;
    var wsId = await ad.getCurrentWorkspaceId();
    var ins = await sb.from('support_tickets').insert({
      workspace_id: wsId,
      user_id:      userId,
      email:        svEmail,
      betreff:      betreff,
      nachricht:    nachricht,
      quelle:       'hilfe',
      status:       'offen'
    });
    if (ins.error) throw new Error(ins.error.message);
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

