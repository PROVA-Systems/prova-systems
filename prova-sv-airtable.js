/**
 * PROVA — SV-Datensatz (SACHVERSTAENDIGE) Airtable + Trial-Status
 */
(function () {
  var P = window.PROVA_AIRTABLE || {};
  var BASE = P.BASE || 'appJ7bLlAHZoxENWE';
  var TBL_SV = P.TABLE_SV || 'tbladqEQT3tmx4DIB';

  function airtableFetch(bodyObj) {
    if (typeof window.provaFetchAirtable === 'function') {
      return window.provaFetchAirtable(bodyObj);
    }
    return fetch('/.netlify/functions/airtable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });
  }

  function applyAccountStatusFromFields(f) {
    var status = String(f.Status || '').trim();
    var paket = String(f.Paket || 'Starter').trim();
    var trialEnd = f.trial_end;
    var sub = String(f.subscription_status || f.Subscription_Status || '')
      .trim()
      .toLowerCase();
    var periodEnd = f.current_period_end || f.Current_Period_End;

    localStorage.setItem('prova_paket', paket);
    localStorage.setItem('prova_airtable_status', status);
    localStorage.setItem('prova_subscription_status', sub);
    if (trialEnd) localStorage.setItem('prova_trial_end', String(trialEnd).slice(0, 10));
    else localStorage.removeItem('prova_trial_end');
    if (periodEnd) localStorage.setItem('prova_current_period_end', String(periodEnd).slice(0, 10));
    else localStorage.removeItem('prova_current_period_end');

    if (status === 'Gekündigt' || sub === 'canceled' || sub === 'cancelled') {
      localStorage.setItem('prova_account_status', 'read_only');
      return;
    }
    if (status === 'Aktiv' || sub === 'active') {
      localStorage.setItem('prova_account_status', 'active');
      return;
    }
    if (status === 'Trial' || paket === 'Trial') {
      if (trialEnd) {
        var end = new Date(String(trialEnd).slice(0, 10) + 'T23:59:59');
        if (!isNaN(end.getTime()) && Date.now() > end.getTime()) {
          localStorage.setItem('prova_account_status', 'expired');
        } else {
          localStorage.setItem('prova_account_status', 'trial');
        }
      } else {
        localStorage.setItem('prova_account_status', 'trial');
      }
      return;
    }
    var tierMap = { Starter: 1, Pro: 1, Enterprise: 1, Solo: 1, Team: 1 };
    if (tierMap[paket]) {
      localStorage.setItem('prova_account_status', 'active');
    } else if (f.Account_Status === 'read_only' || f.Account_Status === 'expired') {
      localStorage.setItem('prova_account_status', 'expired');
    } else {
      localStorage.setItem('prova_account_status', 'trial');
    }
  }

  window.provaProvisionSVAfterLogin = async function (identityUser) {
    if (!identityUser || !identityUser.email) return;
    var token = identityUser.token && identityUser.token.access_token;
    if (!token) return;
    var name = (identityUser.user_metadata && identityUser.user_metadata.full_name) || '';
    try {
      var res = await fetch('/.netlify/functions/provision-sv', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ full_name: name })
      });
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok && data.error) {
        console.warn('provision-sv', data.error);
      }
    } catch (e) {
      console.warn('provision-sv', e);
    }
  };

  window.provaLoadSVProfilNachLogin = async function (email) {
    if (!email) return;
    try {
      var path =
        '/v0/' +
        BASE +
        '/' +
        TBL_SV +
        '?filterByFormula=' +
        encodeURIComponent('{Email}="' + String(email).replace(/"/g, '\\"') + '"') +
        '&maxRecords=1';
      var res = await airtableFetch({ method: 'GET', path: path });
      if (!res.ok) return;
      var data = await res.json();
      if (!data.records || !data.records.length) {
        localStorage.setItem('prova_account_status', 'trial');
        return;
      }
      var rec = data.records[0];
      var f = rec.fields || {};
      localStorage.setItem('prova_at_sv_record_id', rec.id);
      if (f.Email) localStorage.setItem('prova_sv_email', f.Email);
      applyAccountStatusFromFields(f);

      var konto = {
        IBAN: f.IBAN || '',
        BIC: f.BIC || '',
        Bank: f.Bank || '',
        Steuernummer: f.Steuernummer || '',
        USt_IdNr: f.USt_IdNr || '',
        MwSt_Satz: String(f.MwSt_Satz != null ? f.MwSt_Satz : '19'),
        Zahlungsziel_Tage: String(f.Zahlungsziel_Tage != null ? f.Zahlungsziel_Tage : '30'),
        Re_Prefix: f.Re_Prefix || 'RE'
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
      if (Object.values(extra).some(function (v) {
        return v;
      })) {
        localStorage.setItem('prova_sv_airtable_extra', JSON.stringify(extra));
      }
    } catch (e) {
      console.warn('provaLoadSVProfilNachLogin', e);
    }
  };

  window.provaAfterIdentityLogin = async function (email, identityUser) {
    if (!identityUser || !identityUser.email) return;
    if (!localStorage.getItem('prova_trial_start')) {
      try {
        localStorage.setItem('prova_trial_start', Date.now().toString());
      } catch (e) {}
    }
    await window.provaProvisionSVAfterLogin(identityUser);
    await window.provaLoadSVProfilNachLogin(email);
  };

  window.provaSetOnboardingDone = async function () {
    var recId = localStorage.getItem('prova_at_sv_record_id');
    if (!recId) return;
    try {
      await airtableFetch({
        method: 'PATCH',
        path: '/v0/' + BASE + '/' + TBL_SV + '/' + recId,
        payload: { fields: { onboarding_done: true } }
      });
    } catch (e) {
      console.warn('provaSetOnboardingDone', e);
    }
  };
})();
