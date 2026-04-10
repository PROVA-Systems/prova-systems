/**
 * PROVA — gemeinsame Airtable-Hilfen (/.netlify/functions/airtable via prova-auth-api.js)
 */
(function () {
  var BASE = 'appJ7bLlAHZoxENWE';
  var TBL_SV = 'tbladqEQT3tmx4DIB';
  var TBL_SCHADENSFAELLE = 'tblSxV8bsXwd1pwa0';
  var TBL_RECHNUNGEN = 'tblF6MS7uiFAJDjiT';
  var TBL_TERMINE = 'tblyMTTdtfGQjjmc2';
  var TBL_KONTAKTE = 'tblMKmPLjRelr6Hal';
  var TBL_BRIEFE = 'tblSzxvnkRE6B0thx';

  var FELDER_SV = {
    email: 'Email',
    vorname: 'Vorname',
    nachname: 'Nachname',
    paket: 'Paket',
    status: 'Status',
    telefon: 'Telefon',
    strasse: 'Strasse',
    plz: 'PLZ',
    ort: 'Ort',
    firma: 'Firma',
    titel: 'Titel',
    anrede: 'Anrede',
    berufsbezeichnung: 'Berufsbezeichnung',
    website: 'Website',
    iban: 'IBAN',
    bic: 'BIC',
    steuernummer: 'Steuernummer',
    ustIdNr: 'USt_IdNr',
    mwstSatz: 'MwSt_Satz',
    zahlungszielTage: 'Zahlungsziel_Tage',
    rePrefix: 'Re_Prefix',
    trialStart: 'Trial_Start',
    trialEnd: 'Trial_End',
    currentPeriodEnd: 'current_period_end',
    subscriptionStatus: 'subscription_status',
    stripeSubscriptionId: 'stripe_subscription_id',
    onboardingDone: 'onboarding_done',
    onboardingDatum: 'Onboarding_Datum',
    letzterLogin: 'Letzter_Login',
    aktiviertAm: 'aktiviert_am',
    gekuendigtAm: 'gekuendigt_am',
    faelleZusatz: 'Faelle_Zusatz',
    par407aBestaetigt: 'par407a_bestaetigt',
    bestaetigung407a: 'bestaetigung_407a',
    svQualifikation: 'sv_qualifikation',
    svBueronamen: 'sv_bueronamen',
    svStempelUrl: 'sv_stempel_url',
    svSignatur: 'sv_signatur',
    euAiActBestaetigt: 'eu_ai_act_bestaetigt',
    euAiActDatum: 'eu_ai_act_datum',
    smtpHost: 'SMTP_Host',
    smtpPort: 'SMTP_Port',
    smtpUser: 'SMTP_User'
  };

  var FELDER_FAELLE = {
    svEmail: 'sv_email',
    aktenzeichen: 'Aktenzeichen',
    status: 'Status',
    schadensart: 'Schadensart',
    auftraggeberName: 'Auftraggeber_Name',
    auftraggeberEmail: 'Auftraggeber_Email',
    auftraggeberTyp: 'Auftraggeber_Typ',
    strasse: 'Strasse',
    plz: 'PLZ',
    ort: 'Ort',
    gebaeudetyp: 'Gebaeudetyp',
    baujahr: 'Baujahr',
    bereich: 'Bereich',
    geschaedigter: 'Geschaedigter',
    ansprechpartner: 'Ansprechpartner',
    gutachtentyp: 'Gutachtentyp',
    transkript: 'Transkript',
    fotosAnzahl: 'Fotos_Anzahl',
    diktatText: 'Diktat_Text',
    zeiterfassungStart: 'Zeiterfassung_Start',
    zeiterfassungSchritt2: 'Zeiterfassung_Schritt2',
    zeiterfassungSchritt3: 'Zeiterfassung_Schritt3',
    bearbeitungszeitMin: 'Bearbeitungszeit_Min',
    erstellungszeitSek: 'Erstellungszeit_Sekunden',
    gutachtenVorlageId: 'gutachten_vorlage_id',
    pdfUrl: 'PDF_URL',
    erstelltAm: 'Erstellt_Am',
    geaendertAm: 'Geaendert_Am',
    par407aBestaetigt: 'par407a_bestaetigt',
    bestaetigung407a: 'bestaetigung_407a',
    auftragstyp: 'Auftragstyp',
    parentAz: 'Parent_AZ',
    beweisfragen: 'Beweisfragen',
    gerichtName: 'Gericht_Name',
    gerichtAz: 'Gericht_AZ',
    beweisbeschlussDatum: 'Beweisbeschluss_Datum',
    frist407a: 'Frist_407a',
    kvBeantragt: 'KV_Beantragt',
    kvBetrag: 'KV_Betrag',
    auftraggeberA: 'Auftraggeber_A',
    auftraggeberB: 'Auftraggeber_B',
    kostenA: 'Kosten_A',
    kostenB: 'Kosten_B',
    widerspruchDatum: 'Widerspruch_Datum',
    euAiActBestaetigt: 'eu_ai_act_bestaetigt',
    euAiActDatum: 'eu_ai_act_datum',
    notizen: 'Notizen'
  };

  var FELDER_RECHNUNGEN = {
    svEmail: 'sv_email',
    rechnungsnummer: 'Rechnungsnummer',
    az: 'AZ',
    auftraggeberName: 'Auftraggeber_Name',
    auftraggeberEmail: 'Auftraggeber_Email',
    status: 'Status',
    betragNetto: 'Betrag_Netto',
    mwstSatz: 'MwSt_Satz',
    betragBrutto: 'Betrag_Brutto',
    belegdatum: 'Belegdatum',
    faelligkeit: 'Faelligkeit',
    pdfUrl: 'PDF_URL',
    positionen: 'Positionen',
    typ: 'Typ',
    mahnStatus: 'Mahn_Status',
    mahnungDatum: 'Mahnung_Datum',
    verzugszinsen: 'Verzugszinsen'
  };

  var FELDER_TERMINE = {
    svEmail: 'sv_email',
    titel: 'Titel',
    datum: 'Datum',
    uhrzeit: 'Uhrzeit',
    ort: 'Ort',
    typ: 'Typ',
    az: 'AZ',
    notizen: 'Notizen'
  };

  var FELDER_BRIEFE = {
    az: 'AZ',
    svEmail: 'sv_email',
    empfaenger: 'Empfaenger',
    betreff: 'Betreff',
    typ: 'Typ',
    gesendetAm: 'Gesendet_Am',
    status: 'Status'
  };

  function getSvEmail() {
    var e = (localStorage.getItem('prova_sv_email') || '').trim();
    if (e) return e;
    try {
      var u = JSON.parse(localStorage.getItem('prova_user') || '{}');
      return (u.email || '').trim();
    } catch (x) {
      return '';
    }
  }

  async function fetchJson(method, path, body) {
    if (typeof window.provaFetchAirtable !== 'function') {
      throw new Error('prova-auth-api.js fehlt (provaFetchAirtable)');
    }
    var payload = { method: method, path: path };
    if (body !== undefined && body !== null) payload.body = body;
    var res = await window.provaFetchAirtable(payload);
    var text = await res.text();
    var data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { error: text || 'Ungültige JSON-Antwort' };
    }
    if (!res.ok) throw new Error(data.error || data.message || 'HTTP ' + res.status);
    return data;
  }

  window.PROVA_AIRTABLE = {
    BASE: BASE,
    TABLE_SV: TBL_SV,
    TABLE_SCHADENSFAELLE: TBL_SCHADENSFAELLE,
    TABLE_RECHNUNGEN: TBL_RECHNUNGEN,
    TABLE_TERMINE: TBL_TERMINE,
    TABLE_KONTAKTE: TBL_KONTAKTE,
    TABLE_BRIEFE: TBL_BRIEFE,
    FELDER_SV: FELDER_SV,
    FELDER_FAELLE: FELDER_FAELLE,
    FELDER_RECHNUNGEN: FELDER_RECHNUNGEN,
    FELDER_TERMINE: FELDER_TERMINE,
    FELDER_BRIEFE: FELDER_BRIEFE,
    getSvEmail: getSvEmail,
    fetchJson: fetchJson,
    listRecords: function (tableId, filterFormula, maxRecords) {
      var path =
        '/v0/' +
        BASE +
        '/' +
        tableId +
        '?filterByFormula=' +
        encodeURIComponent(filterFormula) +
        '&maxRecords=' +
        (maxRecords || 100);
      return fetchJson('GET', path);
    },
    patchRecord: function (tableId, recId, fields) {
      var path = '/v0/' + BASE + '/' + tableId + '/' + recId;
      return fetchJson('PATCH', path, { fields: fields });
    },
    createRecord: function (tableId, fields) {
      var path = '/v0/' + BASE + '/' + tableId;
      return fetchJson('POST', path, { fields: fields });
    }
  };
})();
