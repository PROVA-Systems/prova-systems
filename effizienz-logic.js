/**
 * PROVA — Effizienz-Dashboard (Airtable SCHADENSFAELLE + RECHNUNGEN)
 */
(function () {
  var TBL_F = window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.TABLE_SCHADENSFAELLE;
  var TBL_R = window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.TABLE_RECHNUNGEN;
  var FF = (window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.FELDER_FAELLE) || {};
  var FR = (window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.FELDER_RECHNUNGEN) || {};

  function escapeEmail(email) {
    return String(email || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function startDateForRange(key) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    if (key === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (key === 'month') {
      d.setDate(1);
    } else if (key === 'year') {
      d.setMonth(0, 1);
    }
    return d;
  }

  function inRange(isoTs, fromD) {
    if (!isoTs) return true;
    var t = new Date(isoTs);
    return !isNaN(t.getTime()) && t >= fromD;
  }

  async function loadFaelle(email, fromD) {
    var esc = escapeEmail(email);
    var formula = '{' + (FF.svEmail || 'sv_email') + '}="' + esc + '"';
    var data = await PROVA_AIRTABLE.listRecords(TBL_F, formula, 100);
    var recs = data.records || [];
    return recs.filter(function (r) {
      var f = r.fields || {};
      var ts = f[FF.erstelltAm || 'Erstellt_Am'] || f.Timestamp || f.Erstellt || f.createdTime;
      return inRange(ts, fromD);
    });
  }

  async function loadRechnungen(email, fromD) {
    var esc = escapeEmail(email);
    var formula = '{' + (FR.svEmail || 'sv_email') + '}="' + esc + '"';
    var data = await PROVA_AIRTABLE.listRecords(TBL_R, formula, 100);
    var recs = data.records || [];
    return recs.filter(function (r) {
      var f = r.fields || {};
      var bd = f[FR.belegdatum || 'Belegdatum'] || f.Rechnungsdatum || f.belegdatum;
      return inRange(bd ? bd + 'T12:00:00' : null, fromD);
    });
  }

  function num(x) {
    var n = parseFloat(x, 10);
    return isFinite(n) ? n : 0;
  }

  function analyze(faelle, rechnungen) {
    var zeitMinSum = 0;
    var zeitN = 0;
    var byTyp = {};
    faelle.forEach(function (r) {
      var f = r.fields || {};
      var typ = String(f[FF.gutachtentyp || 'Gutachtentyp'] || f[FF.schadensart || 'Schadensart'] || 'Sonstiges');
      var min = num(f.Zeiterfassung_Min || f[FF.bearbeitungszeitMin || 'Bearbeitungszeit_Min']);
      if (!min && f[FF.erstellungszeitSek || 'Erstellungszeit_Sekunden']) min = num(f[FF.erstellungszeitSek || 'Erstellungszeit_Sekunden']) / 60;
      if (min > 0) {
        zeitMinSum += min;
        zeitN++;
        if (!byTyp[typ]) byTyp[typ] = { sum: 0, n: 0 };
        byTyp[typ].sum += min;
        byTyp[typ].n++;
      }
    });

    var umsatz = 0;
    var offen = 0;
    var agRank = {};
    rechnungen.forEach(function (r) {
      var f = r.fields || {};
      var net = num(f[FR.betragNetto || 'Betrag_Netto'] != null ? f[FR.betragNetto || 'Betrag_Netto'] : f.Netto);
      var st = String(f[FR.status || 'Status'] || '').toLowerCase();
      umsatz += net;
      if (st.indexOf('bezahlt') < 0 && st.indexOf('paid') < 0) offen += net;
      var ag = String(f[FR.auftraggeberName || 'Auftraggeber_Name'] || f.Auftraggeber || f.Empfaenger_Name || f.empfaenger_name || '—');
      agRank[ag] = (agRank[ag] || 0) + net;
    });

    var stunden = zeitMinSum / 60;
    var honorarH = stunden > 0 ? umsatz / stunden : 0;

    var typRows = Object.keys(byTyp)
      .map(function (k) {
        var b = byTyp[k];
        return { typ: k, avg: b.n ? Math.round(b.sum / b.n) : 0 };
      })
      .sort(function (a, b) {
        return b.avg - a.avg;
      });

    var topAg = Object.keys(agRank)
      .map(function (k) {
        return { name: k, sum: agRank[k] };
      })
      .sort(function (a, b) {
        return b.sum - a.sum;
      })
      .slice(0, 8);

    return {
      honorarH: honorarH,
      offen: offen,
      typRows: typRows,
      topAg: topAg,
      zeitN: zeitN,
      faelleCount: faelle.length,
      rechnCount: rechnungen.length
    };
  }

  async function loadDashboard(rangeKey) {
    var email = PROVA_AIRTABLE.getSvEmail();
    if (!email) throw new Error('Keine SV-E-Mail');
    var fromD = startDateForRange(rangeKey);
    var faelle = await loadFaelle(email, fromD);
    var rechnungen = await loadRechnungen(email, fromD);
    return analyze(faelle, rechnungen);
  }

  window.EffizienzAPI = { loadDashboard: loadDashboard, startDateForRange: startDateForRange };
})();
