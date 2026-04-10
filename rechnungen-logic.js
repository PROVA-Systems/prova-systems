/* PROVA F1 wiring for invoice PDF */
(function () {
  function toast(msg, err) {
    if (window.showToastR) return window.showToastR(msg, err ? 'error' : undefined);
    try { alert(msg); } catch (e) {}
  }
  function read(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function num(v) { return Number(String(v || '0').replace(',', '.')) || 0; }
  function authHeaders() { return window.provaAuthHeaders ? window.provaAuthHeaders() : { 'Content-Type': 'application/json' }; }
  async function runF1(daten) {
    var payload = {
      rechnungsnummer: daten.rechnungsnummer || '',
      az: daten.aktenzeichen || read('r-aktenzeichen'),
      sv_email: localStorage.getItem('prova_sv_email') || '',
      empfaenger: daten.empfaenger_name || read('r-auftraggeber'),
      positionen: [{ text: read('r-beschreibung') || 'Leistung', netto: num(read('r-betrag-netto') || daten.netto_betrag_eur) }],
      netto: num(read('r-betrag-netto') || daten.netto_betrag_eur),
      mwst_satz: num(read('r-ust') || daten.ust_satz),
      brutto: num(read('r-betrag-brutto') || daten.brutto_betrag_eur),
      belegdatum: read('r-datum') || new Date().toISOString().slice(0, 10),
      faelligkeit: read('r-faelligkeit') || '',
      sv_name: read('sv_name'),
      sv_adresse: read('sv_adresse'),
      sv_iban: read('sv_iban'),
      sv_steuernr: read('sv_steuernr')
    };
    var res = await fetch('/.netlify/functions/make-proxy?key=f1', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || data.forwardError) throw new Error(data.forwardError || 'F1 fehlgeschlagen');
    var pdf = data.pdf_url || (data.data && data.data.pdf_url) || payload.pdf_url || '';
    if (pdf && window.provaFetchAirtable && payload.rechnungsnummer) {
      try {
        var AT = window.PROVA_AIRTABLE || {};
        var ab = AT.BASE || 'appJ7bLlAHZoxENWE';
        var tr = AT.TABLE_RECHNUNGEN || 'tblF6MS7uiFAJDjiT';
        var path = '/v0/' + ab + '/' + tr + '?filterByFormula=' + encodeURIComponent('{Rechnungsnummer}="' + payload.rechnungsnummer.replace(/"/g, '\\"') + '"') + '&maxRecords=1';
        var g = await provaFetchAirtable({ method: 'GET', path: path });
        var j = await g.json();
        var rid = j.records && j.records[0] && j.records[0].id;
        if (rid) await provaFetchAirtable({ method: 'PATCH', path: '/v0/' + ab + '/' + tr + '/' + rid, body: { fields: { PDF_URL: pdf } } });
      } catch (e) {}
    }
    if (pdf) {
      toast('PDF bereit');
      window.open(pdf, '_blank');
    } else {
      toast('PDF bereit');
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('btn-rechnung-erstellen');
    if (!btn || !window.sammleDaten) return;
    btn.addEventListener('click', async function () {
      try { await runF1(window.sammleDaten()); }
      catch (e) { toast('PDF-Generierung fehlgeschlagen. Bitte erneut versuchen oder support@prova-systems.de kontaktieren', true); }
    }, true);
  });
})();
