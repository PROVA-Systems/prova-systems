/**
 * PROVA — Schiedsgutachten: Airtable + Rechnungs-Prefill
 */
(function () {
  var TBL = window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.TABLE_SCHADENSFAELLE;
  var FF = (window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.FELDER_FAELLE) || {};

  function escapeEmail(email) {
    return String(email || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function neutralText() {
    return 'Der Unterzeichner versichert Unabhängigkeit von beiden Parteien gemäß §36 GewO.';
  }

  async function createSchiedsFall(form) {
    if (!window.PROVA_AIRTABLE) throw new Error('prova-airtable-api.js fehlt');
    var email = PROVA_AIRTABLE.getSvEmail();
    if (!email) throw new Error('Keine SV-E-Mail');
    var honorar = parseFloat(String(form.honorar || '0').replace(',', '.'), 10) || 0;
    var ka = form.kosten_a != null ? Number(form.kosten_a) : honorar * (Number(form.pct_a || 50) / 100);
    var kb = form.kosten_b != null ? Number(form.kosten_b) : honorar - ka;
    var fields = {};
    fields[FF.svEmail || 'sv_email'] = email;
    fields[FF.auftragstyp || 'Auftragstyp'] = 'Schieds';
    fields[FF.auftraggeberA || 'Auftraggeber_A'] = [form.name_a, form.email_a, form.addr_a].filter(Boolean).join(' · ');
    fields[FF.auftraggeberB || 'Auftraggeber_B'] = [form.name_b, form.email_b, form.addr_b].filter(Boolean).join(' · ');
    fields[FF.kostenA || 'Kosten_A'] = ka;
    fields[FF.kostenB || 'Kosten_B'] = kb;
    fields[FF.notizen || 'Notizen'] = form.streitobjekt ? 'Streitobjekt: ' + form.streitobjekt : '';
    fields[FF.schadensart || 'Schadensart'] = form.schadensart || '';
    fields[FF.status || 'Status'] = 'Neu';
    Object.keys(fields).forEach(function (k) {
      if (fields[k] === '' || fields[k] == null) delete fields[k];
    });
    return PROVA_AIRTABLE.createRecord(TBL, fields);
  }

  function appHref() {
    var t = (window.PROVA && PROVA.tier) || 'Solo';
    return t === 'Team' ? 'app-enterprise.html' : 'app-starter.html';
  }

  function setRechnungenSession(teil) {
    sessionStorage.setItem(
      'prova_schieds_rechnungen',
      JSON.stringify({ typ: 'schieds', teil: teil })
    );
  }

  function queueZweiRechnungen(teilA, teilB) {
    sessionStorage.setItem('prova_schieds_queue', JSON.stringify([teilA, teilB]));
  }

  window.SchiedsAPI = {
    neutralText: neutralText,
    createSchiedsFall: createSchiedsFall,
    appHref: appHref,
    setRechnungenSession: setRechnungenSession,
    queueZweiRechnungen: queueZweiRechnungen
  };
})();
