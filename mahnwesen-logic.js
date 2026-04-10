/**
 * PROVA — Mahnwesen: offene Rechnungen aus Airtable (RECHNUNGEN), Ampel, Mahn-Status
 */
(function () {
  var TBL = window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.TABLE_RECHNUNGEN;
  var FR = (window.PROVA_AIRTABLE && window.PROVA_AIRTABLE.FELDER_RECHNUNGEN) || {};

  function parseEuro(n) {
    return typeof n === 'number' && isFinite(n) ? n : parseFloat(String(n || '0').replace(',', '.')) || 0;
  }

  function pickField(f, keys, fallback) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (f[k] != null && f[k] !== '') return f[k];
    }
    return fallback;
  }

  /** Airtable-Record → einheitliche Zeile */
  function normalizeRechnung(rec) {
    var f = rec.fields || {};
    var statusRaw = String(pickField(f, [FR.status || 'Status', 'status'], '') || '');
    var nr = String(pickField(f, [FR.rechnungsnummer || 'Rechnungsnummer', 'rechnungsnummer', 'Nummer', 'Nr'], '') || '');
    var empfaenger = String(
      pickField(f, ['Auftraggeber', 'Empfaenger_Name', 'empfaenger_name', 'Kunde', 'Auftraggeber_Name'], '') || ''
    );
    var netto = parseEuro(pickField(f, [FR.betragNetto || 'Betrag_Netto', 'Netto', 'netto_betrag_eur', 'Nettobetrag'], 0));
    var bruttoFld = pickField(f, [FR.betragBrutto || 'Betrag_Brutto', 'Brutto', 'brutto'], null);
    var brutto = bruttoFld != null ? parseEuro(bruttoFld) : netto * (1 + parseEuro(pickField(f, [FR.mwstSatz || 'MwSt_Satz', 'USt_Satz', 'ust_satz'], 19)) / 100);
    var beleg = String(pickField(f, [FR.belegdatum || 'Belegdatum', 'Rechnungsdatum', 'belegdatum', 'Leistungsdatum'], '') || '');
    var zt = parseInt(String(pickField(f, ['Zahlungsziel_Tage', 'Zahlungsziel', 'zahlungsziel_tage'], 30)), 10);
    if (!isFinite(zt) || zt < 0) zt = 30;
    var mahn = String(pickField(f, [FR.mahnStatus || 'Mahn_Status'], 'Offen') || 'Offen');
    return {
      airtable_id: rec.id,
      _fields: f,
      rechnungsnummer: nr,
      nr: nr,
      empfaenger_name: empfaenger,
      netto: netto,
      brutto: brutto,
      status: statusRaw,
      belegdatum: beleg,
      zahlungsziel_tage: zt,
      mahn_status: mahn,
      ust_satz: parseEuro(pickField(f, ['USt_Satz', 'ust_satz'], 19)) || 19
    };
  }

  function faelligkeitStr(r) {
    var faellig = r.faellig || r.faelligkeit;
    if (faellig) return faellig;
    var bd = r.belegdatum || '';
    if (!bd) return '';
    var d = new Date(bd + 'T12:00:00');
    if (isNaN(d.getTime())) return '';
    var z = Number(r.zahlungsziel_tage || 30);
    d.setDate(d.getDate() + z);
    return d.toISOString().slice(0, 10);
  }

  function daysOpen(r) {
    var faellig = faelligkeitStr(r);
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

  /** §288 BGB: Verzugszins p.a. ≈ Basiszinssatz + 9 %-Punkte (Basiszinssatz hier vereinfacht 1,27 % p.a., Stand 2024/2025 übliche Größenordnung) */
  function verzugszins(brutto, tage) {
    var basis = parseEuro(brutto);
    if (tage < 1 || basis <= 0) return 0;
    var basiszinssatz = 0.0127;
    var jahreszins = basiszinssatz + 0.09;
    return Math.round(basis * jahreszins * (tage / 365) * 100) / 100;
  }

  function escapeFormulaEmail(email) {
    return String(email || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  async function loadOpenFromAirtable() {
    if (!window.PROVA_AIRTABLE || !TBL) throw new Error('PROVA_AIRTABLE nicht geladen');
    var email = PROVA_AIRTABLE.getSvEmail();
    if (!email) throw new Error('Keine SV-E-Mail — bitte unter Einstellungen hinterlegen.');
    var esc = escapeFormulaEmail(email);
    var formula =
      'AND({sv_email}="' +
      esc +
      '",OR({' + (FR.status || 'Status') + '}="Offen",{' + (FR.status || 'Status') + '}="Überfällig",{' + (FR.status || 'Status') + '}="offen",{' + (FR.status || 'Status') + '}="überfällig"))';
    var data = await PROVA_AIRTABLE.listRecords(TBL, formula, 100);
    var records = data.records || [];
    return records.map(normalizeRechnung);
  }

  async function patchMahnStatus(airtableId, stufe) {
    var map = { 1: 'Mahnung1', 2: 'Mahnung2', 3: 'Mahnung3' };
    var val = map[stufe];
    if (!val || !airtableId) throw new Error('Ungültige Mahnung');
    var heute = new Date().toISOString().slice(0, 10);
    try {
      await PROVA_AIRTABLE.patchRecord(TBL, airtableId, {
        Mahn_Status: val,
        Mahnung_Datum: heute
      });
    } catch (e1) {
      try {
        await PROVA_AIRTABLE.patchRecord(TBL, airtableId, {
          Mahn_Status: val,
          Verzugszinsen: 0
        });
      } catch (e2) {
        await PROVA_AIRTABLE.patchRecord(TBL, airtableId, { Mahn_Status: val });
      }
    }
  }

  window.MahnwesenAPI = {
    normalizeRechnung: normalizeRechnung,
    loadOpenFromAirtable: loadOpenFromAirtable,
    patchMahnStatus: patchMahnStatus,
    daysOpen: function (r) {
      if (!r.faellig) r.faellig = faelligkeitStr(r);
      return daysOpen(r);
    },
    ampelClass: ampelClass,
    verzugszins: verzugszins,
    /** Legacy-Signatur: setMahnStatus(nr, status) — nur noch für Kompatibilität ohne Airtable-ID */
    setMahnStatus: function () {}
  };
})();
