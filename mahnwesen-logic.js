/**
 * PROVA — Mahnwesen: offene Rechnungen, Ampel, Status
 * Daten: localStorage prova_rechnungen_local (+ optionale Felder faellig, mahn_status)
 */
(function () {
  function parseEuro(n) {
    return typeof n === 'number' && isFinite(n) ? n : parseFloat(String(n || '0').replace(',', '.')) || 0;
  }

  function loadRows() {
    try {
      var a = JSON.parse(localStorage.getItem('prova_rechnungen_local') || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function saveRows(rows) {
    try {
      localStorage.setItem('prova_rechnungen_local', JSON.stringify(rows));
    } catch (e) {}
  }

  function daysOpen(r) {
    var faellig = r.faellig || r.faelligkeit;
    if (!faellig) {
      var bd = r.belegdatum || '';
      if (bd) {
        var d = new Date(bd + 'T12:00:00');
        if (!isNaN(d)) {
          var z = Number(r.zahlungsziel_tage || localStorage.getItem('prova_zahlungsziel') || 30);
          d.setDate(d.getDate() + z);
          faellig = d.toISOString().slice(0, 10);
        }
      }
    }
    if (!faellig) return 0;
    var f = new Date(faellig + 'T12:00:00');
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    f.setHours(0, 0, 0, 0);
    return Math.floor((t - f) / 86400000);
  }

  function ampelClass(tage) {
    if (tage < 30) return 'ampel-gruen';
    if (tage <= 60) return 'ampel-gelb';
    return 'ampel-rot';
  }

  function setMahnStatus(nr, status) {
    var rows = loadRows();
    rows.forEach(function (r) {
      if ((r.rechnungsnummer || r.nr) === nr) {
        r.mahn_status = status;
        r.mahn_datum = new Date().toISOString().slice(0, 10);
      }
    });
    saveRows(rows);
  }

  window.MahnwesenAPI = {
    loadRows: loadRows,
    daysOpen: daysOpen,
    ampelClass: ampelClass,
    setMahnStatus: setMahnStatus,
    verzugszins: function (brutto, tage) {
      var basis = parseEuro(brutto);
      if (tage < 1 || basis <= 0) return 0;
      var zins = 0.05 + 0.09;
      return Math.round((basis * (zins / 100) * (tage / 365)) * 100) / 100;
    }
  };
})();
