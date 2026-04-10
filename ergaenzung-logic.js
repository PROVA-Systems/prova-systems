/**
 * PROVA — Ergänzungsgutachten §411 ZPO (SCHADENSFAELLE via Airtable)
 */
(function () {
  var TBL = window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.TABLE_SCHADENSFAELLE;
  var FF = (window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.FELDER_FAELLE) || {};

  function escapeFormulaEmail(email) {
    return String(email || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function pick(f, keys, fb) {
    for (var i = 0; i < keys.length; i++) {
      if (f[keys[i]] != null && f[keys[i]] !== '') return f[keys[i]];
    }
    return fb;
  }

  function normalizeFall(rec) {
    var f = rec.fields || {};
    var az = String(pick(f, [FF.aktenzeichen || 'Aktenzeichen', 'Schadensnummer', 'schadensnummer'], '') || '');
    var ag = String(pick(f, [FF.auftraggeberName || 'Auftraggeber_Name', 'Auftraggeber', 'auftraggeber'], '') || '');
    return { airtable_id: rec.id, fields: f, aktenzeichen: az, auftraggeber: ag, label: (az || 'Ohne AZ') + (ag ? ' · ' + ag : '') };
  }

  async function loadHauptfaelle() {
    if (!window.PROVA_AIRTABLE) throw new Error('prova-airtable-api.js fehlt');
    var email = PROVA_AIRTABLE.getSvEmail();
    if (!email) throw new Error('Keine SV-E-Mail — bitte unter Einstellungen hinterlegen.');
    var esc = escapeFormulaEmail(email);
    var formula =
      'AND({' + (FF.svEmail || 'sv_email') + '}="' +
      esc +
      '",OR({' + (FF.auftragstyp || 'Auftragstyp') + '}="",{' + (FF.auftragstyp || 'Auftragstyp') + '}="Haupt",{' + (FF.auftragstyp || 'Auftragstyp') + '}="Hauptgutachten",{' + (FF.auftragstyp || 'Auftragstyp') + '}="Standard"))';
    var data;
    try {
      data = await PROVA_AIRTABLE.listRecords(TBL, formula, 100);
    } catch (e) {
      formula = 'AND({' + (FF.svEmail || 'sv_email') + '}="' + esc + '")';
      data = await PROVA_AIRTABLE.listRecords(TBL, formula, 100);
    }
    var records = (data.records || []).filter(function (rec) {
      var t = String((rec.fields || {})[FF.auftragstyp || 'Auftragstyp'] || '').toLowerCase();
      return !t || t.indexOf('erg') < 0;
    });
    return records.map(normalizeFall);
  }

  async function createErgaenzungsFall(payload) {
    var email = PROVA_AIRTABLE.getSvEmail();
    if (!email) throw new Error('Keine SV-E-Mail');
    var fields = {};
    fields[FF.svEmail || 'sv_email'] = email;
    fields[FF.auftragstyp || 'Auftragstyp'] = 'Ergaenzung';
    fields[FF.parentAz || 'Parent_AZ'] = payload.parent_az || '';
    fields[FF.beweisfragen || 'Beweisfragen'] = payload.beweisfragen || '';
    fields[FF.frist407a || 'Frist_407a'] = payload.frist_407a || undefined;
    fields[FF.notizen || 'Notizen'] = [payload.anlass ? 'Anlass: ' + payload.anlass : '', payload.termin ? 'Termin: ' + payload.termin : '', payload.stunden ? 'Geschätzte Stunden: ' + payload.stunden : '']
        .filter(Boolean)
        .join('\n');
    fields[FF.status || 'Status'] = 'Neu';
    Object.keys(fields).forEach(function (k) {
      if (fields[k] === undefined || fields[k] === '') delete fields[k];
    });
    var res = await PROVA_AIRTABLE.createRecord(TBL, fields);
    return res;
  }

  function frist411Plus56(isoDateStr) {
    var d = new Date((isoDateStr || new Date().toISOString().slice(0, 10)) + 'T12:00:00');
    if (isNaN(d.getTime())) d = new Date();
    d.setDate(d.getDate() + 56);
    return d.toISOString().slice(0, 10);
  }

  function appHref() {
    var t = (window.PROVA && PROVA.tier) || 'Solo';
    return t === 'Team' ? 'app-enterprise.html' : 'app-starter.html';
  }

  function prefillRechnungErgänzung(parentAz, stunden) {
    var h = parseFloat(String(stunden || '2'), 10);
    if (!isFinite(h) || h < 0) h = 2;
    var satz = 120;
    try {
      satz = parseFloat(localStorage.getItem('prova_sv_stundensatz') || '120', 10) || 120;
    } catch (e) {}
    var akte = Math.round(satz * 1.5 * 100) / 100;
    var ot = Math.round(satz * h * 100) / 100;
    var pos = [
      { bezeichnung: 'Aktenstudium / Vorbereitung Ergänzungsgutachten (§411 ZPO)', menge: 1, ep: akte, gp: akte },
      { bezeichnung: 'Ergänzungsbegehung / Ortstermin', menge: h, ep: satz, gp: ot }
    ];
    var netto = Math.round((akte + ot) * 100) / 100;
    sessionStorage.setItem(
      'prova_rechnung_prefill',
      JSON.stringify({
        aktenzeichen: parentAz || '',
        positionen: pos,
        netto: netto,
        leistungszeitraum: new Date().toLocaleDateString('de-DE'),
        quelle: 'ergaenzung'
      })
    );
  }

  window.ErgaenzungAPI = {
    loadHauptfaelle: loadHauptfaelle,
    createErgaenzungsFall: createErgaenzungsFall,
    frist411Plus56: frist411Plus56,
    appHref: appHref,
    prefillRechnungErgänzung: prefillRechnungErgänzung
  };
})();
