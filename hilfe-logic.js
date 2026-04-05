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
