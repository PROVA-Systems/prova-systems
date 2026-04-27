/* ═══════════════════════════════════════════════════════════════════
   PROVA beratung-logic.js — Flow C Beratung (Session 30 / Sprint 3)

   Kurz-Flow mit 3 Phasen:
   1. Auftragsannahme (Stammdaten, Thema)
   2. Beratungstermin (Timer + Protokoll)
   3. Abschluss (Protokoll-PDF, Rechnung)

   Nutzt vorhandene Infrastruktur:
   - Airtable: SCHADENSFAELLE (tblSxV8bsXwd1pwa0), Flow='C'
   - rechnungen.html für Rechnungserstellung (mit vorausgefüllten Stunden)
   - briefvorlagen / PDFMonkey für Protokoll-PDF (BRIEF-Template)
   - paragraph-generator.js für KI-Unterstützung
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (!localStorage.getItem('prova_user')) {
    window.location.href = 'app-login.html';
    return;
  }

  var AT_BASE   = 'appJ7bLlAHZoxENWE';
  var AT_FAELLE = 'tblSxV8bsXwd1pwa0';

  // Paket/Preis-Info
  var paket = localStorage.getItem('prova_paket') || 'Solo';
  var pc = { Solo: '#4f8ef7', Team: '#a78bfa' }[paket] || '#4f8ef7';
  var badgeEl = document.getElementById('topbar-paket-badge');
  if (badgeEl) {
    badgeEl.textContent = paket;
    badgeEl.style.cssText = 'font-size:10px;font-weight:700;padding:3px 9px;border-radius:10px;background:'+pc+'18;color:'+pc+';border:1px solid '+pc+'33;';
  }

  // Stundensatz aus Einstellungen (Default: 120 € netto)
  var stundensatzEuro = parseInt(localStorage.getItem('prova_beratung_stundensatz') || '120', 10);
  var satzEl = document.getElementById('br-stundensatz');
  if (satzEl) satzEl.textContent = stundensatzEuro + ' €/h netto';

  /* ── STATE ── */
  var _recordId      = null;        // Airtable-Record-ID
  var _auftragstyp   = localStorage.getItem('prova_aktiver_auftragstyp') || 'kaufberatung';
  var _flow          = localStorage.getItem('prova_aktiver_flow') || 'C';
  var _phase         = 1;           // 1|2|3
  var _timerStart    = null;        // ms timestamp oder null
  var _timerInterval = null;
  var _eintraege     = [];          // [{dauer_sekunden, beschreibung, ts_iso}]
  var _saveTimer     = null;

  var TYP_LABEL = {
    kaufberatung:       { label: '🏠 Kaufberatung',       color: '#f97316' },
    sanierungsberatung: { label: '🔧 Sanierungsberatung', color: '#84cc16' },
    bauherrenberatung:  { label: '🧰 Bauherrenberatung',  color: '#06b6d4' }
  };

  /* ── UI-HELPER ── */
  function toast(msg, typ) {
    var t = document.getElementById('br-toast');
    if (!t) return;
    t.className = 'br-toast show' + (typ ? ' ' + typ : '');
    t.textContent = msg;
    setTimeout(function(){ t.classList.remove('show'); }, 3200);
  }
  window.provaToast = toast; // damit andere Module es nutzen können

  function formatDauer(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return [h, m, s].map(function(n){ return String(n).padStart(2,'0'); }).join(':');
  }

  function formatEuro(cents) {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  }

  /* ── PHASEN-INDIKATOR ── */
  function renderPhasen() {
    [1,2,3].forEach(function(n) {
      var el = document.getElementById('ph-' + n);
      if (!el) return;
      el.classList.remove('done', 'active', 'pending');
      if (n < _phase) el.classList.add('done');
      else if (n === _phase) el.classList.add('active');
      else el.classList.add('pending');
    });
  }

  /* ── TYP-BADGE ── */
  function renderTypBadge() {
    var el = document.getElementById('br-typ-badge');
    if (!el) return;
    var cfg = TYP_LABEL[_auftragstyp] || { label: 'Beratung', color: '#f97316' };
    // P5f.X1.2: 'Flow C'-Suffix entfernt — Entwickler-Begriff, nicht user-facing.
    el.textContent = cfg.label;
    el.style.color = cfg.color;
    el.style.background = cfg.color + '18';
    el.style.borderColor = cfg.color + '33';
  }

  /* ── FALL-DATEN (Stammdaten) ── */
  function ladeStammdatenFromStorage() {
    var d = {};
    try { d = JSON.parse(sessionStorage.getItem('prova_neuer_auftrag') || '{}'); } catch(e){}
    var ex = d.extracted || {};
    // Aus Auftrags-Dialog vorausgefüllt wenn vorhanden
    if (ex.aktenzeichen) document.getElementById('br-az').value = ex.aktenzeichen;
    if (ex.auftraggeber) document.getElementById('br-ag').value = ex.auftraggeber;
    if (ex.ag_email)     document.getElementById('br-ag-email').value = ex.ag_email;
    if (ex.adresse)      document.getElementById('br-obj').value = ex.adresse;
    // Termindatum default: heute
    var tdEl = document.getElementById('br-termin-datum');
    if (tdEl && !tdEl.value) tdEl.value = new Date().toISOString().slice(0,10);
  }

  /* ── RECORD-ID aus URL oder sessionStorage ── */
  function ermittleRecordId() {
    var urlId = new URLSearchParams(location.search).get('id');
    if (urlId) return urlId;
    return sessionStorage.getItem('prova_beratung_record_id') || null;
  }

  /* ── AIRTABLE: Fall laden ── */
  async function ladeFallFromAirtable() {
    if (!_recordId) return;
    try {
      var res = await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          path: '/v0/' + AT_BASE + '/' + AT_FAELLE + '/' + _recordId
        })
      });
      if (!res.ok) return;
      var data = await res.json();
      var f = data.fields || {};

      document.getElementById('br-az').value     = f.Aktenzeichen       || '';
      document.getElementById('br-ag').value     = f.Auftraggeber_Name  || '';
      document.getElementById('br-ag-email').value = f.Auftraggeber_Email || '';
      document.getElementById('br-obj').value    = [f.Schaden_Strasse, f.Ort].filter(Boolean).join(', ') || '';
      document.getElementById('br-thema').value  = f.Beratungs_Thema    || f.Schadensart || '';
      document.getElementById('br-anwesende').value = f.Anwesende        || '';
      document.getElementById('br-termin-datum').value = (f.Termin_Datum || '').slice(0,10);
      document.getElementById('br-protokoll').value = f.Protokoll_Text || '';

      _phase = parseInt(f.Phase, 10) || 1;
      renderPhasen();

      // Lade Zeit-Einträge aus localStorage (da Airtable kein nested Array)
      _eintraege = ladeEintraegeFromLocal();
      renderEintraege();
    } catch(e) {
      console.warn('[Beratung] Laden fehlgeschlagen:', e);
    }
  }

  /* ── ZEIT-EINTRAEGE: localStorage-Persistenz ── */
  function ladeEintraegeFromLocal() {
    var key = 'prova_beratung_eintraege_' + (_recordId || 'neu');
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ return []; }
  }
  function speichereEintraegeLocal() {
    var key = 'prova_beratung_eintraege_' + (_recordId || 'neu');
    localStorage.setItem(key, JSON.stringify(_eintraege));
  }

  function renderEintraege() {
    var list = document.getElementById('br-eintraege-list');
    var count = document.getElementById('br-eintraege-count');
    var sum = document.getElementById('br-sum');
    if (!list) return;

    count.textContent = _eintraege.length + ' ' + (_eintraege.length === 1 ? 'Eintrag' : 'Einträge');

    if (!_eintraege.length) {
      list.innerHTML = '<div class="br-empty">Noch keine Zeiten erfasst.</div>';
      sum.style.display = 'none';
      return;
    }

    list.innerHTML = _eintraege.map(function(e, idx) {
      var zeit = formatDauer(e.dauer_sekunden);
      var beschr = e.beschreibung || '(ohne Beschreibung)';
      return '<div class="br-eintrag">'
        + '<span class="br-eintrag-dauer">' + zeit + '</span>'
        + '<span class="br-eintrag-beschreibung" title="' + escAttr(beschr) + '">' + escHtml(beschr) + '</span>'
        + '<button class="br-eintrag-del" onclick="loescheEintrag(' + idx + ')" title="Entfernen">✕</button>'
        + '</div>';
    }).join('');

    // Summe
    var totalSec = _eintraege.reduce(function(s, e){ return s + (e.dauer_sekunden || 0); }, 0);
    var stunden = totalSec / 3600;
    var honorarCents = Math.round(stunden * stundensatzEuro * 100);

    document.getElementById('br-sum-zeit').textContent  = formatDauer(totalSec) + ' (' + stunden.toFixed(2).replace('.',',') + ' h)';
    document.getElementById('br-sum-satz').textContent  = stundensatzEuro + ',00 €/h';
    document.getElementById('br-sum-total').textContent = formatEuro(honorarCents);
    sum.style.display = 'block';
  }

  window.loescheEintrag = function(idx) {
    if (!confirm('Zeit-Eintrag löschen?')) return;
    _eintraege.splice(idx, 1);
    speichereEintraegeLocal();
    renderEintraege();
  };

  /* ── TIMER ── */
  window.timerToggle = function() {
    var btn   = document.getElementById('br-timer-btn');
    var timer = document.getElementById('br-timer');
    var label = document.getElementById('br-timer-label');
    var beschrWrap = document.getElementById('br-timer-beschreibung-wrap');

    if (_timerStart) {
      // STOP
      var dauer = (Date.now() - _timerStart) / 1000;
      if (dauer < 3) {
        if (!confirm('Timer läuft erst ' + Math.round(dauer) + 's. Trotzdem stoppen und speichern?')) return;
      }
      var beschrEl = document.getElementById('br-timer-beschreibung');
      var beschreibung = (beschrEl && beschrEl.value || '').trim();
      if (!beschreibung) {
        beschreibung = prompt('Was wurde besprochen? (Kurz-Beschreibung für Rechnung)', '');
        if (beschreibung === null) return; // abgebrochen
        if (!beschreibung.trim()) beschreibung = 'Beratungstermin';
      }
      _eintraege.push({
        dauer_sekunden: Math.round(dauer),
        beschreibung: beschreibung.trim(),
        ts_iso: new Date().toISOString()
      });
      speichereEintraegeLocal();
      renderEintraege();

      _timerStart = null;
      clearInterval(_timerInterval);
      _timerInterval = null;
      timer.classList.remove('br-timer-running');
      document.getElementById('br-timer-display').textContent = '00:00:00';
      label.textContent = 'Nicht laufend';
      btn.className = 'br-timer-btn br-timer-btn-start';
      btn.textContent = '▶ Start';
      if (beschrWrap) beschrWrap.style.display = 'none';
      if (beschrEl) beschrEl.value = '';

      // Phase 1 → 2 Übergang beim ersten Eintrag
      if (_phase === 1 && _eintraege.length > 0) {
        _phase = 2;
        renderPhasen();
      }

      toast('✅ ' + formatDauer(Math.round(dauer)) + ' erfasst', 'success');
    } else {
      // START
      _timerStart = Date.now();
      _timerInterval = setInterval(function() {
        var sec = (Date.now() - _timerStart) / 1000;
        document.getElementById('br-timer-display').textContent = formatDauer(sec);
      }, 1000);
      timer.classList.add('br-timer-running');
      label.textContent = 'Läuft seit ' + new Date(_timerStart).toLocaleTimeString('de-DE');
      btn.className = 'br-timer-btn br-timer-btn-stop';
      btn.textContent = '■ Stop & Speichern';
      if (beschrWrap) beschrWrap.style.display = 'block';
    }
  };

  window.manuellerEintrag = function() {
    var s = prompt('Dauer in Minuten (z.B. 45):', '');
    if (s === null) return;
    var min = parseFloat(s.replace(',','.'));
    if (isNaN(min) || min <= 0) { toast('Ungültige Dauer', 'error'); return; }
    var beschr = prompt('Beschreibung (für Rechnung):', '');
    if (!beschr) beschr = 'Beratungsleistung';
    _eintraege.push({
      dauer_sekunden: Math.round(min * 60),
      beschreibung: beschr.trim(),
      ts_iso: new Date().toISOString()
    });
    speichereEintraegeLocal();
    renderEintraege();
    if (_phase === 1) { _phase = 2; renderPhasen(); }
    toast('✅ Eintrag hinzugefügt', 'success');
  };

  /* ── AUTO-SAVE des Protokolls in localStorage ── */
  function bindAutoSave() {
    ['br-protokoll','br-anwesende','br-thema','br-az','br-ag','br-ag-email','br-obj','br-termin-datum'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function() {
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(autoSaveLocal, 600);
      });
    });
  }
  function autoSaveLocal() {
    var data = leseFormular();
    var key = 'prova_beratung_draft_' + (_recordId || 'neu');
    localStorage.setItem(key, JSON.stringify(data));
    var el = document.getElementById('br-autosave');
    if (el) { el.textContent = 'Gespeichert ' + new Date().toLocaleTimeString('de-DE'); el.style.color = 'var(--green)'; }
  }
  function ladeLocalDraft() {
    var key = 'prova_beratung_draft_' + (_recordId || 'neu');
    var raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      Object.keys(d).forEach(function(k) {
        var el = document.getElementById(k);
        if (el && !el.value) el.value = d[k];
      });
    } catch(e){}
  }

  function leseFormular() {
    return {
      'br-az':            (document.getElementById('br-az')||{}).value || '',
      'br-ag':            (document.getElementById('br-ag')||{}).value || '',
      'br-ag-email':      (document.getElementById('br-ag-email')||{}).value || '',
      'br-obj':           (document.getElementById('br-obj')||{}).value || '',
      'br-thema':         (document.getElementById('br-thema')||{}).value || '',
      'br-anwesende':     (document.getElementById('br-anwesende')||{}).value || '',
      'br-termin-datum':  (document.getElementById('br-termin-datum')||{}).value || '',
      'br-protokoll':     (document.getElementById('br-protokoll')||{}).value || ''
    };
  }

  /* ── AIRTABLE: Fall speichern (create oder update) ── */
  window.speichereFall = async function() {
    var f = leseFormular();
    if (!f['br-az']) { toast('Aktenzeichen fehlt', 'error'); return; }
    if (!f['br-ag']) { toast('Auftraggeber fehlt', 'error'); return; }

    var payload = {
      fields: {
        Aktenzeichen:       f['br-az'],
        Auftraggeber_Name:  f['br-ag'],
        Auftraggeber_Email: f['br-ag-email'],
        Schaden_Strasse:    f['br-obj'],
        Schadensart:        f['br-thema'],   // Thema ins Schadensart-Feld
        Beratungs_Thema:    f['br-thema'],   // dediziertes Feld falls vorhanden
        Anwesende:          f['br-anwesende'],
        Termin_Datum:       f['br-termin-datum'] || null,
        Protokoll_Text:     f['br-protokoll'],
        Flow:               'C',
        Auftragstyp:        _auftragstyp,
        Phase:              _phase,
        Status:             _phase === 3 ? 'Abgeschlossen' : (_phase === 2 ? 'In Bearbeitung' : 'Neuer Auftrag'),
        sv_email:           localStorage.getItem('prova_sv_email') || ''
      }
    };

    try {
      var method, path;
      if (_recordId) {
        method = 'PATCH';
        path = '/v0/' + AT_BASE + '/' + AT_FAELLE + '/' + _recordId;
      } else {
        method = 'POST';
        path = '/v0/' + AT_BASE + '/' + AT_FAELLE;
      }
      var res = await provaFetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: method, path: path, payload: payload })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      if (data.id) {
        _recordId = data.id;
        sessionStorage.setItem('prova_beratung_record_id', _recordId);
        // URL aktualisieren damit Reload den Fall findet
        history.replaceState(null, '', 'beratung.html?id=' + _recordId);
      }
      // Archiv-Cache invalidieren
      try { localStorage.removeItem('prova_archiv_cache_v2'); } catch(e){}
      toast('💾 Fall gespeichert', 'success');
    } catch(e) {
      toast('Speichern fehlgeschlagen: ' + e.message, 'error');
    }
  };

  /* ── KI-ASSISTENZ: Protokoll strukturieren ── */
  window.kiStrukturiere = async function() {
    var rohtext = (document.getElementById('br-protokoll')||{}).value || '';
    if (!rohtext.trim() || rohtext.length < 30) {
      toast('Bitte erst Stichpunkte eingeben (min. 30 Zeichen)', 'error');
      return;
    }
    var out = document.getElementById('br-ki-output');
    if (out) out.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text3);">⏳ KI strukturiert…</div>';

    try {
      var res = await provaFetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1000,
          temperature: 0.2,
          messages: [
            { role: 'system', content:
              'Du bist Assistent eines ö.b.u.v. Bausachverständigen. '
              + 'Strukturiere die folgenden Stichpunkte zu einem formellen Beratungsprotokoll. '
              + 'REGELN: '
              + '1. Halluzinationsverbot — verwende nur was in den Stichpunkten steht. '
              + '2. Konjunktiv II bei Empfehlungen ("wäre zu empfehlen", "könnte sinnvoll sein"). '
              + '3. Struktur: Ausgangslage · Beobachtungen · Empfehlungen · Offene Punkte. '
              + '4. Sachlich, präzise, juristisch klar. Keine Marketing-Sprache. '
              + '5. Antworte NUR mit dem strukturierten Protokoll-Text — keine Einleitung.'
            },
            { role: 'user', content: 'Stichpunkte / Rohtext:\n\n' + rohtext }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var txt = (data.content && data.content[0] && data.content[0].text) || '';
      if (!txt) throw new Error('Leere KI-Antwort');

      if (out) {
        out.innerHTML = '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px;font-size:12px;line-height:1.7;white-space:pre-wrap;color:var(--text2);max-height:400px;overflow-y:auto;">'
          + escHtml(txt)
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-top:8px;">'
          + '<button class="br-btn br-btn-primary" onclick="kiUebernehmen()">✓ In Protokoll übernehmen</button>'
          + '<button class="br-btn br-btn-ghost" onclick="document.getElementById(\'br-ki-output\').innerHTML=\'\'">✕ Verwerfen</button>'
          + '</div>';
      }
      window._kiStruktText = txt;
    } catch(e) {
      if (out) out.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--red);">❌ ' + escHtml(e.message) + '</div>';
    }
  };

  window.kiUebernehmen = function() {
    if (!window._kiStruktText) return;
    var ta = document.getElementById('br-protokoll');
    if (!ta) return;
    if (ta.value && !confirm('Protokoll-Text überschreiben?')) return;
    ta.value = window._kiStruktText;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('br-ki-output').innerHTML = '';
    toast('✓ Protokoll übernommen', 'success');
  };

  /* ── KI: Empfehlungen vorschlagen ── */
  window.kiEmpfehlungen = async function() {
    var thema = (document.getElementById('br-thema')||{}).value || '';
    var protokoll = (document.getElementById('br-protokoll')||{}).value || '';
    if (!thema && !protokoll) {
      toast('Bitte erst Thema oder Protokoll eingeben', 'error');
      return;
    }
    var out = document.getElementById('br-ki-output');
    if (out) out.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--text3);">⏳ KI schlägt Empfehlungen vor…</div>';

    try {
      var res = await provaFetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 800,
          temperature: 0.25,
          messages: [
            { role: 'system', content:
              'Du bist Assistent eines ö.b.u.v. Bausachverständigen für Bau- und Gebäudeschäden. '
              + 'Schlage 3–6 konkrete Empfehlungen für eine ' + (_auftragstyp === 'kaufberatung' ? 'Kaufberatung' : _auftragstyp === 'sanierungsberatung' ? 'Sanierungsberatung' : 'Bauherrenberatung') + ' vor. '
              + 'REGELN: '
              + '1. Halluzinationsverbot — keine erfundenen Normen, kein erfundenes Wissen. '
              + '2. Konjunktiv II ("wäre zu empfehlen", "könnte sinnvoll sein", "spräche dafür"). '
              + '3. Format: kurze Bulletpoints (je 1-2 Sätze), beginnend mit "•". '
              + '4. Sachlich, konkret, umsetzbar. '
              + '5. Keine finale Bewertung — SV entscheidet.'
            },
            { role: 'user', content: 'Beratungsthema: ' + thema + '\n\nProtokoll-Notizen:\n' + protokoll }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var txt = (data.content && data.content[0] && data.content[0].text) || '';
      if (!txt) throw new Error('Leere KI-Antwort');

      if (out) {
        out.innerHTML = '<div style="background:var(--bg3);border-left:3px solid var(--purple);border-radius:8px;padding:12px;font-size:12px;line-height:1.8;white-space:pre-wrap;color:var(--text2);">'
          + '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--purple);margin-bottom:8px;">💡 KI-Vorschläge — bitte prüfen (§ 407a ZPO)</div>'
          + escHtml(txt)
          + '</div>';
      }
    } catch(e) {
      if (out) out.innerHTML = '<div style="padding:10px;font-size:12px;color:var(--red);">❌ ' + escHtml(e.message) + '</div>';
    }
  };

  /* ── PROTOKOLL ALS PDF ── */
  window.erstelleProtokollPDF = async function() {
    var f = leseFormular();
    if (!f['br-protokoll'] || f['br-protokoll'].length < 50) {
      toast('Protokoll zu kurz (min. 50 Zeichen)', 'error');
      return;
    }
    // Auto-Save vorher
    await speichereFall();
    if (!_recordId) { toast('Fall muss erst gespeichert sein', 'error'); return; }

    // PDF via Make-Webhook (nutzt BRIEF-Template oder custom Beratungsprotokoll)
    var WEBHOOK = 'https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl'; // K3 Webhook (Brief)
    var totalSec = _eintraege.reduce(function(s, e){ return s + (e.dauer_sekunden || 0); }, 0);
    var stundenTxt = (totalSec / 3600).toFixed(2).replace('.',',') + ' h';

    var payload = {
      vorlage_id:       'BERATUNGS-PROTOKOLL',
      vorlage_name:     'Beratungs-Protokoll',
      aktenzeichen:     f['br-az'],
      auftraggeber:     f['br-ag'],
      ag_email:         f['br-ag-email'],
      sv_email:         localStorage.getItem('prova_sv_email') || '',
      adresse:          f['br-obj'],
      datum:            f['br-termin-datum'],
      sv_name:          (localStorage.getItem('prova_sv_vorname')||'') + ' ' + (localStorage.getItem('prova_sv_nachname')||''),
      brieftext:        'Beratungs-Protokoll\n\n'
                        + 'Beratungsthema: ' + f['br-thema'] + '\n'
                        + 'Termin: ' + f['br-termin-datum'] + '\n'
                        + 'Anwesende: ' + f['br-anwesende'] + '\n'
                        + 'Dauer gesamt: ' + stundenTxt + '\n\n'
                        + '─────────────────────────────\n\n'
                        + f['br-protokoll']
    };

    try {
      var res = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      toast('📄 Protokoll wird erstellt — PDF kommt per E-Mail', 'success');
    } catch(e) {
      toast('PDF-Erstellung fehlgeschlagen: ' + e.message, 'error');
    }
  };

  /* ── RECHNUNG ERSTELLEN: Zu rechnungen.html mit vorausgefüllten Daten ── */
  window.erstelleRechnung = async function() {
    if (!_eintraege.length) { toast('Keine Zeit-Einträge vorhanden', 'error'); return; }
    // Fall speichern
    await speichereFall();
    if (!_recordId) { toast('Fall muss erst gespeichert sein', 'error'); return; }

    // Rechnungsposten berechnen
    var totalSec = _eintraege.reduce(function(s, e){ return s + (e.dauer_sekunden || 0); }, 0);
    var stunden = totalSec / 3600;
    var gesamtNetto = Math.round(stunden * stundensatzEuro * 100) / 100;

    // Vorausgefüllte Rechnungs-Data in sessionStorage
    var rechnungData = {
      quelle: 'beratung',
      record_id: _recordId,
      aktenzeichen: leseFormular()['br-az'],
      auftraggeber_name: leseFormular()['br-ag'],
      auftraggeber_email: leseFormular()['br-ag-email'],
      posten: _eintraege.map(function(e) {
        var h = (e.dauer_sekunden / 3600);
        return {
          beschreibung: e.beschreibung || 'Beratungsleistung',
          menge: parseFloat(h.toFixed(2)),
          einheit: 'Std.',
          einzelpreis: stundensatzEuro,
          gesamt: parseFloat((h * stundensatzEuro).toFixed(2))
        };
      }),
      gesamtNetto: gesamtNetto,
      mwst_pct: 19,
      gesamtBrutto: Math.round(gesamtNetto * 1.19 * 100) / 100
    };
    sessionStorage.setItem('prova_rechnung_draft', JSON.stringify(rechnungData));
    window.location.href = 'rechnungen.html?neu=beratung&fall=' + _recordId;
  };

  /* ── FALL ABSCHLIESSEN ── */
  window.fallAbschliessen = async function() {
    if (!_eintraege.length) {
      if (!confirm('Keine Zeit-Einträge erfasst. Trotzdem abschließen?')) return;
    }
    if (!(leseFormular()['br-protokoll'] || '').trim()) {
      if (!confirm('Protokoll ist leer. Trotzdem abschließen?')) return;
    }
    _phase = 3;
    renderPhasen();
    await speichereFall();
    toast('✓ Beratungs-Fall abgeschlossen', 'success');
  };

  /* ── Helper ── */
  function escHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function escAttr(s){return String(s==null?'':s).replace(/"/g,'&quot;');}

  /* ── INIT ── */
  _recordId = ermittleRecordId();
  renderTypBadge();
  renderPhasen();
  ladeStammdatenFromStorage();
  ladeLocalDraft();
  if (_recordId) {
    ladeFallFromAirtable();
  } else {
    _eintraege = ladeEintraegeFromLocal();
    renderEintraege();
  }
  bindAutoSave();

})();
