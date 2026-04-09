/**
 * PROVA — SV-Datensatz (SACHVERSTAENDIGE) Airtable-Helfer
 * Wird von app-login.html und onboarding.html eingebunden.
 */
(function () {
  var BASE = 'appJ7bLlAHZoxENWE';
  var TBL_SV = 'tbladqEQT3tmx4DIB';

  window.provaLoadSVProfilNachLogin = async function (email) {
    if (!email) return;
    try {
      var path =
        '/v0/' + BASE + '/' + TBL_SV +
        '?filterByFormula=' +
        encodeURIComponent('{Email}="' + String(email).replace(/"/g, '\\"') + '"') +
        '&maxRecords=1';
      var res = await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET', path: path })
      });
      if (!res.ok) return;
      var data = await res.json();
      if (!data.records || !data.records.length) return;
      var rec = data.records[0];
      var f = rec.fields || {};
      localStorage.setItem('prova_at_sv_record_id', rec.id);
      if (f.Email) localStorage.setItem('prova_sv_email', f.Email);
      var konto = {
        iban: f.IBAN || '',
        bic: f.BIC || '',
        bank: f.Bank || '',
        steuernr: f.Steuernummer || '',
        ustid: f.USt_IdNr || '',
        mwst: String(f.MwSt_Satz != null ? f.MwSt_Satz : '19'),
        zahlungsziel: String(f.Zahlungsziel_Tage != null ? f.Zahlungsziel_Tage : '30'),
        re_prefix: f.Re_Prefix || 'RE'
      };
      if (
        Object.values(konto).some(function (v) {
          return v && v !== '19' && v !== '30' && v !== 'RE';
        })
      ) {
        localStorage.setItem('prova_kontodaten', JSON.stringify(konto));
      }
      if (f.primary_color) {
        try {
          var s = JSON.parse(localStorage.getItem('prova_settings') || '{}');
          s.wlHex = f.primary_color;
          localStorage.setItem('prova_settings', JSON.stringify(s));
        } catch (e) {}
      }
      var extra = {
        anrede: f.Anrede || '',
        titel: f.Titel || '',
        berufsbez: f.Berufsbezeichnung || '',
        website: f.Website || '',
        app_theme: f.app_theme || '',
        app_fontsize: f.app_fontsize || ''
      };
      if (Object.values(extra).some(function (v) { return v; })) {
        localStorage.setItem('prova_sv_airtable_extra', JSON.stringify(extra));
      }
    } catch (e) {
      console.warn('provaLoadSVProfilNachLogin', e);
    }
  };

  window.provaSetOnboardingDone = async function () {
    var recId = localStorage.getItem('prova_at_sv_record_id');
    if (!recId) return;
    try {
      await fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'PATCH',
          path: '/v0/' + BASE + '/' + TBL_SV + '/' + recId,
          payload: { fields: { onboarding_done: true } }
        })
      });
    } catch (e) {
      console.warn('provaSetOnboardingDone', e);
    }
  };
})();
