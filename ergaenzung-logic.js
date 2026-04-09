/**
 * Ergänzungsgutachten §411 ZPO — lokale Entwürfe (Parent-Aktenzeichen)
 */
(function () {
  var KEY = 'prova_ergaenzung_local';

  function loadAll() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(rows) {
    try {
      localStorage.setItem(KEY, JSON.stringify(rows));
    } catch (e) {}
  }

  function addRow(o) {
    var rows = loadAll();
    o.id = o.id || 'EG-' + Date.now();
    o.created = o.created || new Date().toISOString().slice(0, 10);
    rows.unshift(o);
    saveAll(rows);
    return o;
  }

  window.ErgaenzungAPI = {
    loadAll: loadAll,
    addRow: addRow,
    KEY: KEY
  };
})();
