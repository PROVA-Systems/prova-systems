/* ═══════════════════════════════════════════════════════════════════
   PROVA wertgutachten-logic.js — Sprint 6 Flow B Etappe 1

   IMPLEMENTIERT IN ETAPPE 1:
   - Wizard: Objektdaten → Verfahren → Ergebnis
   - Sachwertverfahren nach §§ 35–39 ImmoWertV
   - Alterswertminderung nach linearem Modell (Ross-Methode optional Etappe 2)
   - PDF-Versand via Make K3-Webhook (Template BRIEF-WERTGUTACHTEN)
   - localStorage-Persistenz

   NICHT IN ETAPPE 1:
   - Vergleichswertverfahren (§§ 24–26) → Etappe 2
   - Ertragswertverfahren (§§ 27–34) → Etappe 2
   - Mietwert, Beleihungswert (BelWertV) → Etappe 3
   - KI-Marktanalyse-Hypothesen → Etappe 3

   § 407a ZPO: SV bleibt Entscheider. Werkzeug liefert Rechengrundlage.
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var K3_WEBHOOK = 'https://hook.eu1.make.com/bslfuqmlud1vo8qems5ccn5z5f2eq4dl';
  var STORAGE_KEY = 'prova_wg_state';

  // ─── State ───
  var _state = {
    typ: 'verkehrswert',        // aus URL-Param
    currentStep: 1,
    verfahrenSet: [],            // Array: ['sachwert','vergleich','ertrag']
    objekt: {},
    sachwert: {},
    vergleich: { objekte: [], bezug: 'qm' },
    ertrag: {},
    ergebnis: null               // {sachwert:…, vergleich:…, ertrag:…, empfohlen:…}
  };

  /* ═══════════════════════════════════════════════════════════
     UTILS
  ═══════════════════════════════════════════════════════════ */
  function $(id) { return document.getElementById(id); }
  function num(id) { var el = $(id); return el ? (parseFloat(el.value) || 0) : 0; }
  function val(id) { var el = $(id); return el ? (el.value || '').trim() : ''; }

  function fmtEUR(n, dezimalstellen) {
    var d = dezimalstellen == null ? 0 : dezimalstellen;
    return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:d, maximumFractionDigits:d}) + ' €';
  }
  function fmtPct(n) { return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' %'; }
  function fmtM2(n)  { return (Number(n)||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' m²'; }
  function fmtJahr(n){ return Math.round(Number(n)||0).toString() + ' J.'; }

  function toast(msg, art) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.color = art === 'err' ? '#ef4444' : art === 'ok' ? '#10b981' : '';
    t.classList.add('show');
    setTimeout(function(){ t.classList.remove('show'); }, 2400);
  }

  function speichern() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch(e) {}
  }
  function laden() {
    try {
      var s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (s) Object.assign(_state, s);
    } catch(e) {}
  }

  /* ═══════════════════════════════════════════════════════════
     WIZARD-NAVIGATION
  ═══════════════════════════════════════════════════════════ */
  window.wgNextStep = function(step) {
    if (step === 2) {
      // Validierung Step 1
      if (!num('wg-gr-flaeche') || !num('wg-brw') || !num('wg-baujahr')) {
        toast('Bitte Grundstücksfläche, Bodenrichtwert und Baujahr angeben', 'err'); return;
      }
      _state.objekt = objektDatenSammeln();
      speichern();
      // Sprint 4: Normen-Liste laden (Flow B — statisch, kein KI-Spinner nötig)
      if (typeof ladeWertgutachtenNormen === 'function') ladeWertgutachtenNormen();
    } else if (step === 3) {
      // Validierung Step 2
      if (!_state.verfahrenSet.length) { toast('Bitte mindestens ein Verfahren wählen', 'err'); return; }
      // Alle gewählten Verfahren berechnen
      _state.ergebnis = {};
      if (_state.verfahrenSet.indexOf('sachwert') !== -1) {
        _state.sachwert = sachwertDatenSammeln();
        _state.ergebnis.sachwert = berechneSachwert();
      }
      if (_state.verfahrenSet.indexOf('vergleich') !== -1) {
        _state.ergebnis.vergleich = berechneVergleich();
      }
      if (_state.verfahrenSet.indexOf('ertrag') !== -1) {
        _state.ertrag = ertragDatenSammeln();
        _state.ergebnis.ertrag = berechneErtrag();
      }
      // Empfohlenen Verkehrswert bestimmen (Mittel der Verfahren, gewichtet nach Objektart)
      _state.ergebnis.empfohlen = berechneEmpfohlenenVerkehrswert();

      // Session 31 Etappe 3: Typ-spezifische Finalberechnungen
      if (_state.typ === 'beleihungswert') {
        _state.beleihung = beleihungDatenSammeln();
        _state.ergebnis.beleihung = berechneBeleihung();
      }
      if (_state.typ === 'mietwert') {
        _state.mietwert = mietDatenSammeln();
        _state.ergebnis.mietwert = berechneMiet();
      }

      speichern();
      renderErgebnis();
    } else if (step === 1) {
      // zurück — nichts validieren
    }

    _state.currentStep = step;
    ['1','2','3'].forEach(function(n) {
      var panel = $('panel-' + n);
      var tabEl = $('ws-' + n);
      if (panel) panel.hidden = (n !== String(step));
      if (tabEl) {
        tabEl.classList.toggle('active', n === String(step));
        tabEl.classList.toggle('done', parseInt(n,10) < step);
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ═══════════════════════════════════════════════════════════
     VERFAHREN TOGGELN (Multi-Select)
  ═══════════════════════════════════════════════════════════ */
  window.wgToggleVerfahren = function(verf) {
    if (['sachwert','vergleich','ertrag'].indexOf(verf) === -1) return;
    var idx = _state.verfahrenSet.indexOf(verf);
    if (idx === -1) _state.verfahrenSet.push(verf);
    else            _state.verfahrenSet.splice(idx, 1);

    // UI: Card-Highlight + Form-Sichtbarkeit
    document.querySelectorAll('.verf-card').forEach(function(c) {
      var v = c.getAttribute('data-verf');
      c.classList.toggle('selected', _state.verfahrenSet.indexOf(v) !== -1);
    });
    var sF = $('sachwert-form');  if (sF) sF.hidden = _state.verfahrenSet.indexOf('sachwert')  === -1;
    var vF = $('vergleich-form'); if (vF) vF.hidden = _state.verfahrenSet.indexOf('vergleich') === -1;
    var eF = $('ertrag-form');    if (eF) eF.hidden = _state.verfahrenSet.indexOf('ertrag')    === -1;

    // Weiter-Button aktivieren wenn mind. 1 Verfahren
    var btn = $('btn-zu-ergebnis');
    if (btn) {
      var aktiv = _state.verfahrenSet.length > 0;
      btn.disabled = !aktiv;
      btn.style.opacity = aktiv ? '1' : '0.4';
      btn.style.cursor  = aktiv ? 'pointer' : 'not-allowed';
    }

    // Initiale Berechnungen
    if (_state.verfahrenSet.indexOf('sachwert') !== -1) wgBerechneSachwert();
    if (_state.verfahrenSet.indexOf('vergleich') !== -1) wgVergleichRender();
    if (_state.verfahrenSet.indexOf('ertrag') !== -1) wgBerechneErtrag();
    // Session 31 Etappe 3: Typ-abhängige Berechnungen nachziehen
    if (_state.typ === 'beleihungswert' && typeof wgBerechneBeleihung === 'function') wgBerechneBeleihung();
    if (_state.typ === 'mietwert' && typeof wgBerechneMiet === 'function') wgBerechneMiet();
    speichern();
  };

  // Rückwärts-Kompat: alter Name
  window.wgSelectVerfahren = window.wgToggleVerfahren;

  /* ═══════════════════════════════════════════════════════════
     DATEN SAMMELN
  ═══════════════════════════════════════════════════════════ */
  function objektDatenSammeln() {
    return {
      az:          val('wg-az'),
      stichtag:    val('wg-stichtag'),
      auftraggeber: val('wg-auftraggeber'),
      zweck:       val('wg-zweck'),
      adresse:     val('wg-adresse'),
      objektart:   val('wg-objektart'),
      baujahr:     parseInt(val('wg-baujahr'), 10) || 0,
      modernisierung: val('wg-modern'),
      grundstuecksflaeche: num('wg-gr-flaeche'),
      bodenrichtwert:      num('wg-brw'),
      wohnflaeche:         num('wg-wfl'),
      bgf:                 num('wg-bgf'),
      gesamtnutzungsdauer: num('wg-gnd') || 80,
      lage:        val('wg-lage')
    };
  }

  function sachwertDatenSammeln() {
    return {
      nhk:      num('sw-nhk'),
      bpi:      num('sw-bpi'),
      region:   num('sw-region') || 1,
      awm_pct:  num('sw-awm'),
      zuschlag: num('sw-zuschlag'),
      smf:      num('sw-smf') || 1
    };
  }

  /* ═══════════════════════════════════════════════════════════
     ALTERSWERTMINDERUNG nach § 38 ImmoWertV
     Lineare Methode: AWM = (Alter / Gesamtnutzungsdauer) × 100
     Modernisierungs-Anpassungen ergänzen effektives Baujahr.
  ═══════════════════════════════════════════════════════════ */
  function berechneRestnutzungsdauer(baujahr, gnd, modernisierung) {
    var stichtag = _state.objekt.stichtag ? new Date(_state.objekt.stichtag) : new Date();
    var jahr = stichtag.getFullYear();
    var alter = Math.max(0, jahr - (baujahr || jahr));
    // Modernisierungs-Anpassung (vereinfacht, nach Sprengnetter-Tabelle grober Ansatz):
    // keine: 0, teil: -20% Alter, umfassend: -50% Alter, kernsaniert: effektiv neu (Alter ~5J)
    var reduzierung = 0;
    switch (modernisierung) {
      case 'teil':         reduzierung = alter * 0.20; break;
      case 'umfassend':    reduzierung = alter * 0.50; break;
      case 'kernsaniert':  reduzierung = Math.max(0, alter - 5); break;
      default:             reduzierung = 0;
    }
    var effAlter = Math.max(0, alter - reduzierung);
    var rnd = Math.max(0, gnd - effAlter);
    var awm_pct = gnd > 0 ? Math.min(100, (effAlter / gnd) * 100) : 0;
    return { alter: alter, effAlter: effAlter, rnd: rnd, awm_pct: awm_pct };
  }

  /* ═══════════════════════════════════════════════════════════
     SACHWERTBERECHNUNG nach §§ 35–39 ImmoWertV

     1. Bodenwert           = Grundstücksfläche × Bodenrichtwert
     2. Gebäude-Neubauwert  = BGF × NHK × BPI × Regionalfaktor
     3. Gebäudesachwert     = Neubauwert × (1 - AWM%) + Bauteile-Zuschläge
     4. Sachwert vor SMF    = Bodenwert + Gebäudesachwert
     5. Verkehrswert        = Sachwert × Sachwert-Marktanpassungsfaktor
  ═══════════════════════════════════════════════════════════ */
  function berechneSachwert() {
    var o = _state.objekt;
    var s = _state.sachwert;

    // 1. Bodenwert
    var bodenwert = (o.grundstuecksflaeche || 0) * (o.bodenrichtwert || 0);

    // 2. Gebäude-Neubauwert
    var neuwert = (o.bgf || 0) * (s.nhk || 0) * (s.bpi || 1) * (s.region || 1);

    // 3. Alterswertminderung berechnen wenn nicht manuell gesetzt
    var awmBerechnung = berechneRestnutzungsdauer(o.baujahr, o.gesamtnutzungsdauer, o.modernisierung);
    var awm_pct = s.awm_pct > 0 ? s.awm_pct : awmBerechnung.awm_pct;
    var awm_abzug = neuwert * (awm_pct / 100);
    var gebaeudesachwert = neuwert - awm_abzug;

    // 4. Sachwert vor SMF
    var vorSmf = bodenwert + gebaeudesachwert + (s.zuschlag || 0);

    // 5. Verkehrswert
    var verkehrswert = vorSmf * (s.smf || 1);

    return {
      bodenwert:         bodenwert,
      neuwert:           neuwert,
      awm_pct:           awm_pct,
      awm_abzug:         awm_abzug,
      gebaeudesachwert:  gebaeudesachwert,
      zuschlag:          s.zuschlag || 0,
      vorSmf:            vorSmf,
      smf:               s.smf || 1,
      verkehrswert:      verkehrswert,
      alter:             awmBerechnung.alter,
      effektivesAlter:   awmBerechnung.effAlter,
      restnutzungsdauer: awmBerechnung.rnd
    };
  }

  /* ═══════════════════════════════════════════════════════════
     LIVE-UPDATE SACHWERT-ERGEBNIS
  ═══════════════════════════════════════════════════════════ */
  window.wgBerechneSachwert = function() {
    _state.objekt = objektDatenSammeln();
    _state.sachwert = sachwertDatenSammeln();
    var e = berechneSachwert();

    function setTxt(id, v) { var el = $(id); if (el) el.textContent = v; }
    setTxt('sw-bodenwert',    fmtEUR(e.bodenwert));
    setTxt('sw-neuwert',      fmtEUR(e.neuwert));
    setTxt('sw-awm-abzug',    '− ' + fmtEUR(e.awm_abzug) + ' (' + fmtPct(e.awm_pct) + ')');
    setTxt('sw-gsw',          fmtEUR(e.gebaeudesachwert));
    setTxt('sw-zuschlag-anz', fmtEUR(e.zuschlag));
    setTxt('sw-vor-smf',      fmtEUR(e.vorSmf));
    setTxt('sw-verkehrswert', fmtEUR(e.verkehrswert));
  };

  /* ═══════════════════════════════════════════════════════════
     VERGLEICHSWERTVERFAHREN §§ 24–26 ImmoWertV

     Mindestens 3 bereinigte Vergleichspreise → Mittelwert +
     Standardabweichung zur Plausibilitätskontrolle.
  ═══════════════════════════════════════════════════════════ */
  window.wgVergleichAdd = function() {
    _state.vergleich.objekte = _state.vergleich.objekte || [];
    _state.vergleich.objekte.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      beschreibung: '',
      preis: 0,
      flaeche: 0,
      abweichung_pct: 0
    });
    speichern();
    wgVergleichRender();
  };

  window.wgVergleichDel = function(id) {
    _state.vergleich.objekte = (_state.vergleich.objekte || []).filter(function(o){return o.id !== id;});
    speichern();
    wgVergleichRender();
  };

  window.wgVergleichSet = function(id, feld, wert) {
    var o = (_state.vergleich.objekte || []).find(function(x){return x.id === id;});
    if (!o) return;
    o[feld] = (feld === 'beschreibung') ? String(wert) : (parseFloat(wert) || 0);
    speichern();
    wgBerechneVergleich();
  };

  function wgVergleichRender() {
    var list = $('vg-objekte-list');
    if (!list) return;
    var objekte = _state.vergleich.objekte || [];
    var bezugEl = $('vg-bezug');
    var bezug = bezugEl ? bezugEl.value : 'qm';
    _state.vergleich.bezug = bezug;

    // Header
    var html = '<div class="vg-row-header">'
      + '<span>Beschreibung</span>'
      + '<span>Preis (€)</span>'
      + '<span>' + (bezug === 'qm' ? 'Fläche (m²)' : '—') + '</span>'
      + '<span>Bereinigung (%)</span>'
      + '<span>Bereinigt</span>'
      + '<span></span>'
      + '</div>';

    if (!objekte.length) {
      html += '<div style="padding:14px;text-align:center;color:var(--text3);font-size:12px;font-style:italic;">Noch keine Vergleichsobjekte — min. 3 empfohlen.</div>';
    } else {
      objekte.forEach(function(o) {
        var bereinigt = bereinigterWert(o, bezug);
        html += '<div class="vg-row">'
          + '<input type="text" value="' + escAttr(o.beschreibung) + '" placeholder="z.B. EFH Musterstr. 7, 2024" oninput="wgVergleichSet(\'' + o.id + '\',\'beschreibung\',this.value)">'
          + '<input type="number" value="' + o.preis + '" min="0" step="1000" oninput="wgVergleichSet(\'' + o.id + '\',\'preis\',this.value)">'
          + (bezug === 'qm'
              ? '<input type="number" value="' + o.flaeche + '" min="0" step="0.01" oninput="wgVergleichSet(\'' + o.id + '\',\'flaeche\',this.value)">'
              : '<span style="font-size:11px;color:var(--text3);text-align:center;">—</span>')
          + '<input type="number" value="' + o.abweichung_pct + '" min="-50" max="50" step="0.5" oninput="wgVergleichSet(\'' + o.id + '\',\'abweichung_pct\',this.value)">'
          + '<span class="vg-ergebnis-cell">' + (bezug === 'qm' ? fmtEUR(bereinigt) + '/m²' : fmtEUR(bereinigt)) + '</span>'
          + '<button class="btn-del" title="Löschen" onclick="wgVergleichDel(\'' + o.id + '\')">✕</button>'
          + '</div>';
      });
    }
    list.innerHTML = html;
    wgBerechneVergleich();
  }
  window.wgVergleichRender = wgVergleichRender;

  // Ein Vergleichsobjekt bereinigen: Preis pro Bezug × (1 + Abweichung%)
  function bereinigterWert(o, bezug) {
    if (!o.preis) return 0;
    var basis = 0;
    if (bezug === 'qm') {
      if (!o.flaeche) return 0;
      basis = o.preis / o.flaeche;
    } else {
      basis = o.preis;
    }
    return basis * (1 + (o.abweichung_pct || 0) / 100);
  }

  function berechneVergleich() {
    var objekte = _state.vergleich.objekte || [];
    var bezug = _state.vergleich.bezug || 'qm';
    var o = _state.objekt;

    var bereinigteWerte = objekte
      .map(function(x){ return bereinigterWert(x, bezug); })
      .filter(function(v){ return v > 0; });

    if (!bereinigteWerte.length) {
      return { anzahl: 0, mittel: 0, streuung: 0, verkehrswert: 0, bezug: bezug };
    }

    var summe = bereinigteWerte.reduce(function(s,v){return s+v;}, 0);
    var mittel = summe / bereinigteWerte.length;
    var varianz = bereinigteWerte.reduce(function(s,v){return s + Math.pow(v - mittel, 2);}, 0) / bereinigteWerte.length;
    var streuung = Math.sqrt(varianz);

    // Verkehrswert = Mittel × Fläche (wenn €/m²) oder Mittel direkt
    var vw = bezug === 'qm' ? mittel * (o.wohnflaeche || o.bgf || 0) : mittel;

    return {
      anzahl: bereinigteWerte.length,
      mittel: mittel,
      streuung: streuung,
      verkehrswert: vw,
      bezug: bezug,
      bereinigteWerte: bereinigteWerte
    };
  }

  window.wgBerechneVergleich = function() {
    var e = berechneVergleich();
    var bezug = e.bezug;
    function setTxt(id, v) { var el = $(id); if (el) el.textContent = v; }
    setTxt('vg-anzahl', String(e.anzahl) + (e.anzahl < 3 ? ' (min. 3 empfohlen)' : ''));
    setTxt('vg-mittel', bezug === 'qm' ? fmtEUR(e.mittel) + '/m²' : fmtEUR(e.mittel));
    setTxt('vg-streuung', e.anzahl > 1 ? (bezug === 'qm' ? fmtEUR(e.streuung) + '/m²' : fmtEUR(e.streuung)) : '—');
    setTxt('vg-verkehrswert', fmtEUR(e.verkehrswert));
  };

  /* ═══════════════════════════════════════════════════════════
     ERTRAGSWERTVERFAHREN §§ 27–34 ImmoWertV

     Vervielfältiger V = (q^n − 1) / (q^n × (q − 1)), q = 1 + LZS
     Ertragswert = Gebäudeertragswert + Bodenwert
     Gebäudeertragswert = Gebäudereinertrag × V
     Gebäudereinertrag  = Jahresreinertrag − Bodenwert × LZS
  ═══════════════════════════════════════════════════════════ */
  function ertragDatenSammeln() {
    return {
      rohertrag:  num('ew-rohertrag'),
      bwk_pct:    num('ew-bwk'),
      lzs_pct:    num('ew-lzs'),
      rnd:        num('ew-rnd'),
      emf:        num('ew-emf') || 1
    };
  }

  function berechneErtrag() {
    var o = _state.objekt;
    var e = _state.ertrag;

    var bodenwert = (o.grundstuecksflaeche || 0) * (o.bodenrichtwert || 0);
    var rohertrag = e.rohertrag || 0;
    var bwkAbzug = rohertrag * (e.bwk_pct || 0) / 100;
    var reinertrag = rohertrag - bwkAbzug;

    var lzs = (e.lzs_pct || 0) / 100;
    var bodenwertVerzinsung = bodenwert * lzs;
    var gebaeudeReinertrag = Math.max(0, reinertrag - bodenwertVerzinsung);

    // RND: wenn leer, aus Sachwert-Berechnung schätzen
    var rnd = e.rnd;
    if (!rnd) {
      var awmB = berechneRestnutzungsdauer(o.baujahr, o.gesamtnutzungsdauer, o.modernisierung);
      rnd = awmB.rnd;
    }

    // Vervielfältiger (Barwertfaktor einer Rente)
    var vervielf = 0;
    if (lzs > 0 && rnd > 0) {
      var q = 1 + lzs;
      var qn = Math.pow(q, rnd);
      vervielf = (qn - 1) / (qn * (q - 1));
    } else if (rnd > 0) {
      vervielf = rnd; // bei LZS=0 degeneriert zu Jahren
    }

    var gebaeudeErtragswert = gebaeudeReinertrag * vervielf;
    var ertragswertVorEMF = bodenwert + gebaeudeErtragswert;
    var ertragswert = ertragswertVorEMF * (e.emf || 1);

    return {
      bodenwert:            bodenwert,
      rohertrag:            rohertrag,
      bwkAbzug:             bwkAbzug,
      reinertrag:           reinertrag,
      bodenwertVerzinsung:  bodenwertVerzinsung,
      gebaeudeReinertrag:   gebaeudeReinertrag,
      rnd:                  rnd,
      lzs_pct:              e.lzs_pct || 0,
      vervielf:             vervielf,
      gebaeudeErtragswert:  gebaeudeErtragswert,
      vorEMF:               ertragswertVorEMF,
      emf:                  e.emf || 1,
      verkehrswert:         ertragswert
    };
  }

  window.wgBerechneErtrag = function() {
    _state.objekt = objektDatenSammeln();
    _state.ertrag = ertragDatenSammeln();
    var e = berechneErtrag();
    function setTxt(id, v) { var el = $(id); if (el) el.textContent = v; }
    setTxt('ew-anz-roh',         fmtEUR(e.rohertrag));
    setTxt('ew-anz-bwk',         '− ' + fmtEUR(e.bwkAbzug));
    setTxt('ew-anz-reinertrag',  fmtEUR(e.reinertrag));
    setTxt('ew-anz-bwv',         '− ' + fmtEUR(e.bodenwertVerzinsung) + ' (' + fmtPct(e.lzs_pct) + ' von Boden)');
    setTxt('ew-anz-grer',        fmtEUR(e.gebaeudeReinertrag));
    setTxt('ew-anz-vervielf',    e.vervielf > 0 ? ('× ' + e.vervielf.toFixed(3) + ' (RND ' + Math.round(e.rnd) + 'J · LZS ' + fmtPct(e.lzs_pct) + ')') : '—');
    setTxt('ew-anz-gebaew',      fmtEUR(e.gebaeudeErtragswert));
    setTxt('ew-anz-boden',       '+ ' + fmtEUR(e.bodenwert));
    setTxt('ew-verkehrswert',    fmtEUR(e.verkehrswert));
  };

  /* ═══════════════════════════════════════════════════════════
     EMPFOHLENER VERKEHRSWERT AUS VERFAHRENSMIX
     Gewichtung nach Objektart (§ 8 ImmoWertV):
     - EFH/DHH/RH/ETW: Sachwert + Vergleichswert gewichtet, Ertrag optional
     - MFH/Gewerbe: Ertragswert führend, Sachwert zur Plausibilisierung
     - Gru unbebaut: nur Vergleichswert
  ═══════════════════════════════════════════════════════════ */
  function berechneEmpfohlenenVerkehrswert() {
    var e = _state.ergebnis || {};
    var oa = (_state.objekt.objektart || '').toLowerCase();

    var verfahren = [];
    if (e.sachwert && _state.verfahrenSet.indexOf('sachwert') !== -1) verfahren.push({ key:'sachwert', wert: e.sachwert.verkehrswert });
    if (e.vergleich && _state.verfahrenSet.indexOf('vergleich') !== -1) verfahren.push({ key:'vergleich', wert: e.vergleich.verkehrswert });
    if (e.ertrag && _state.verfahrenSet.indexOf('ertrag') !== -1) verfahren.push({ key:'ertrag', wert: e.ertrag.verkehrswert });

    if (!verfahren.length) return { verkehrswert: 0, begruendung: '—', gewichtung: {} };
    if (verfahren.length === 1) {
      var map = { sachwert: 'Sachwertverfahren', vergleich: 'Vergleichswertverfahren', ertrag: 'Ertragswertverfahren' };
      return { verkehrswert: verfahren[0].wert, begruendung: 'Nur ' + map[verfahren[0].key] + ' gewählt', gewichtung: { [verfahren[0].key]: 1 } };
    }

    // Gewichtung nach Objektart
    var g = {};
    if (['mfh','geh'].indexOf(oa) !== -1) {
      // Ertragswert führend bei Renditeobjekten
      g = { ertrag: 0.6, sachwert: 0.2, vergleich: 0.2 };
    } else if (oa === 'gru') {
      g = { vergleich: 1.0, sachwert: 0, ertrag: 0 };
    } else {
      // EFH, DHH, RH, ETW
      g = { vergleich: 0.5, sachwert: 0.4, ertrag: 0.1 };
    }

    // Nur tatsächlich gewählte Verfahren gewichten, Gewichte renormieren
    var summe = 0;
    verfahren.forEach(function(v){ summe += g[v.key] || 0; });
    if (summe === 0) {
      // Gleichverteilt fallback
      var gl = 1 / verfahren.length;
      verfahren.forEach(function(v){ g[v.key] = gl; });
      summe = 1;
    } else {
      verfahren.forEach(function(v){ g[v.key] = (g[v.key] || 0) / summe; });
    }

    var vw = verfahren.reduce(function(s, v){ return s + v.wert * (g[v.key] || 0); }, 0);

    // Plausibilitäts-Spread
    var werte = verfahren.map(function(v){return v.wert;});
    var minW = Math.min.apply(null, werte);
    var maxW = Math.max.apply(null, werte);
    var spread = minW > 0 ? ((maxW - minW) / minW) * 100 : 0;

    var begruendung;
    if (['mfh','geh'].indexOf(oa) !== -1) {
      begruendung = 'Gewichtet nach § 8 ImmoWertV: Ertragswert führend bei Renditeobjekten.';
    } else if (oa === 'gru') {
      begruendung = 'Unbebautes Grundstück — nur Vergleichswertverfahren aussagekräftig.';
    } else {
      begruendung = 'Gewichtet nach § 8 ImmoWertV: Vergleichswert und Sachwert bei Eigennutz-Objekten führend.';
    }
    if (spread > 20) begruendung += ' Spread zwischen Verfahren ' + spread.toFixed(0) + ' % — Prüfen ob Eingabedaten plausibel.';

    return {
      verkehrswert: vw,
      begruendung: begruendung,
      gewichtung: g,
      spread_pct: spread,
      spread_warnung: spread > 20
    };
  }

  /* ═══════════════════════════════════════════════════════════
     KLEINE HELPER
  ═══════════════════════════════════════════════════════════ */
  function escAttr(s) { return String(s||'').replace(/"/g,'&quot;').replace(/&/g,'&amp;'); }

  /* ═══════════════════════════════════════════════════════════
     BELEIHUNGSWERT § 16 BelWertV (Etappe 3)
     Beleihungswert = Verkehrswert × (1 − Abschlag%) × (1 + Korrektur%)
  ═══════════════════════════════════════════════════════════ */
  function ermittleVerkehrswertFuerBeleihung() {
    // Nutzt empfohlenen Wert falls Mix, sonst erster verfügbarer Einzelwert
    var e = _state.ergebnis;
    if (e && e.empfohlen && e.empfohlen.verkehrswert) return e.empfohlen.verkehrswert;
    if (e && e.sachwert)  return e.sachwert.verkehrswert;
    if (e && e.vergleich) return e.vergleich.verkehrswert;
    if (e && e.ertrag)    return e.ertrag.verkehrswert;
    // Fallback: Berechnung vorab
    if (_state.verfahrenSet && _state.verfahrenSet.length) {
      if (_state.verfahrenSet.indexOf('sachwert') !== -1) {
        _state.sachwert = sachwertDatenSammeln();
        return berechneSachwert().verkehrswert;
      }
      if (_state.verfahrenSet.indexOf('vergleich') !== -1) return berechneVergleich().verkehrswert;
      if (_state.verfahrenSet.indexOf('ertrag') !== -1) {
        _state.ertrag = ertragDatenSammeln();
        return berechneErtrag().verkehrswert;
      }
    }
    return 0;
  }

  function beleihungDatenSammeln() {
    return {
      abschlag_pct: num('bw-abschlag'),
      sonst_pct:    num('bw-sonst')
    };
  }

  function berechneBeleihung() {
    var ausgang = ermittleVerkehrswertFuerBeleihung();
    var b = beleihungDatenSammeln();
    var nachAbschlag = ausgang * (1 - (b.abschlag_pct || 0) / 100);
    var beleihungswert = nachAbschlag * (1 + (b.sonst_pct || 0) / 100);
    return {
      ausgang: ausgang,
      abschlag: ausgang * (b.abschlag_pct || 0) / 100,
      abschlag_pct: b.abschlag_pct || 0,
      sonst: nachAbschlag * (b.sonst_pct || 0) / 100,
      sonst_pct: b.sonst_pct || 0,
      beleihungswert: beleihungswert
    };
  }

  window.wgBerechneBeleihung = function() {
    var e = berechneBeleihung();
    _state.beleihung = beleihungDatenSammeln();
    function setTxt(id, v) { var el = $(id); if (el) el.textContent = v; }
    setTxt('bw-ausgang',         fmtEUR(e.ausgang));
    setTxt('bw-abschlag-anz',    '− ' + fmtEUR(e.abschlag) + ' (' + fmtPct(e.abschlag_pct) + ')');
    setTxt('bw-sonst-anz',       (e.sonst >= 0 ? '+ ' : '− ') + fmtEUR(Math.abs(e.sonst)) + ' (' + fmtPct(e.sonst_pct) + ')');
    setTxt('bw-beleihungswert',  fmtEUR(e.beleihungswert));
    speichern();
  };

  /* ═══════════════════════════════════════════════════════════
     MIETWERT § 558 BGB (Etappe 3)
     Ortsübliche Vergleichsmiete = Mietspiegel-Wert × (1 + Zuschläge%)
  ═══════════════════════════════════════════════════════════ */
  function mietDatenSammeln() {
    return {
      spiegel: num('mw-spiegel'),
      spann_pct: num('mw-spann'),
      lage_pct: num('mw-lage'),
      aus_pct:  num('mw-aus'),
      zst_pct:  num('mw-zst')
    };
  }

  function berechneMiet() {
    var m = mietDatenSammeln();
    var o = _state.objekt || {};
    var spann = m.spann_pct / 100;
    var untere = m.spiegel * (1 - spann);
    var obere  = m.spiegel * (1 + spann);
    var zuschlag = (m.lage_pct || 0) + (m.aus_pct || 0) + (m.zst_pct || 0);
    var mieteQm = m.spiegel * (1 + zuschlag / 100);
    // Clamping: wenn außerhalb der Spanne, Hinweis erzeugen
    var ausserhalb = mieteQm < untere || mieteQm > obere;
    var monatsmiete = mieteQm * (o.wohnflaeche || 0);

    return {
      spiegel: m.spiegel,
      untere: untere,
      obere: obere,
      zuschlag_pct: zuschlag,
      mieteQm: mieteQm,
      monatsmiete: monatsmiete,
      ausserhalb_spanne: ausserhalb
    };
  }

  window.wgBerechneMiet = function() {
    _state.objekt = objektDatenSammeln();
    _state.mietwert = mietDatenSammeln();
    var e = berechneMiet();
    function setTxt(id, v) { var el = $(id); if (el) el.textContent = v; }
    setTxt('mw-spiegel-anz',    fmtEUR(e.spiegel) + '/m²');
    setTxt('mw-spann-anz',      fmtEUR(e.untere) + '/m²' + ' — ' + fmtEUR(e.obere) + '/m²');
    setTxt('mw-zuschlag-total', (e.zuschlag_pct >= 0 ? '+' : '') + fmtPct(e.zuschlag_pct));
    setTxt('mw-miete-qm',       fmtEUR(e.mieteQm) + '/m²' + (e.ausserhalb_spanne ? ' ⚠' : ''));
    setTxt('mw-miete-monat',    fmtEUR(e.monatsmiete) + ' / Monat');
    speichern();
  };

  /* ═══════════════════════════════════════════════════════════
     KI-MARKTANALYSE (Etappe 3)
     Liefert Hypothesen zu Lage/Markt im Konjunktiv II.
     DSGVO-pseudonymisiert, Halluzinationsverbot.
  ═══════════════════════════════════════════════════════════ */
  function pseudonymisieren(text) {
    if (!text) return '';
    var t = String(text);
    t = t.replace(/\b[A-Z]{2}\d{2}[A-Z0-9\s]{10,30}\b/gi, '[IBAN]');
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    t = t.replace(/\b(?:\+49|0)[\s\-/]?\d{2,5}[\s\-/]?\d{2,}[\s\-/]?\d{0,}\b/g, '[TELEFON]');
    return t;
  }

  var MARKT_PROMPT = [
    'Du bist Assistent eines ö.b.u.v. Sachverständigen für Immobilienwertermittlung.',
    '',
    'RECHTSRAHMEN (zu berücksichtigen, aber nicht zu zitieren):',
    '• Verkehrswert nach §§ 194-199 BauGB',
    '• Allgemeine Grundsätze nach § 1 ImmoWertV',
    '• Verfahrenswahl nach § 8 ImmoWertV',
    '• Bindung an § 407a ZPO (höchstpersönliche Erstattung durch SV)',
    '',
    'ABSOLUTE REGELN:',
    '1. HALLUZINATIONSVERBOT: Keine erfundenen Zahlen, Preise, Trends, Adressen oder Mikrolage-Details. Keine konkreten Bodenrichtwerte, keine €/m²-Prognosen. Nur STRUKTURELLE Marktüberlegungen aus allgemeinem Fachwissen zur Region/Objektart.',
    '2. Konjunktiv II für ALLE Einschätzungen: "könnte", "dürfte", "wäre zu erwarten", "ließe sich vermuten". Kein Indikativ bei Bewertungsaussagen.',
    '3. Lagewissen nur auf Ebene Bundesland/Region ("Ballungsraum", "ländlicher Raum", "A-Stadt vs. C-Lage"). Keine Straßennamen, keine konkreten Stadtteil-Preise.',
    '4. § 407a ZPO-Hinweis: Du lieferst Hypothesen als Gedanken-Anstöße — der SV prüft, recherchiert und entscheidet eigenhändig. Kennzeichne spekulative Aussagen explizit.',
    '5. Bei fehlenden Angaben: Ausdrücklich benennen, welche Information für eine Einschätzung fehlt.',
    '',
    'AUFGABE: Strukturiere relevante Marktüberlegungen zu Lage, Objektart und Zustand — auf dem Niveau eines erfahrenen SV, der sich in die Sache einliest.',
    '',
    'ANTWORTE ausschließlich mit JSON:',
    '{',
    '  "makrolage": "1–2 Sätze im Konjunktiv II zur Großraum-Einschätzung (regionstyp, wirtschaftliche Stellung)",',
    '  "mikrolage": "1–2 Sätze im Konjunktiv II zur unmittelbaren Umgebung (soweit aus SV-Lagebeschreibung ableitbar)",',
    '  "objekttyp_hinweise": ["string, strukturelle Hinweise zum Objekttyp, 2–4 Bulletpoints im Konjunktiv II"],',
    '  "zustand_implikationen": ["string, was der Modernisierungsgrad für Marktakzeptanz bedeuten könnte"],',
    '  "risiken_chancen": ["string, was im Gutachten besonders zu prüfen wäre"],',
    '  "offene_fragen": ["string, was der SV noch recherchieren könnte — z.B. BORIS-Abfrage, Gutachterausschuss-Daten, Vergleichsverkäufe"]',
    '}',
    'Keine Einleitung, keine Erklärung, kein Markdown.'
  ].join('\n');

  window.wgKIMarktanalyse = async function() {
    var btn = $('btn-ki-markt');
    var out = $('ki-markt-result');
    if (!out) return;

    var o = _state.objekt && _state.objekt.adresse ? _state.objekt : objektDatenSammeln();
    if (!o.adresse && !o.baujahr) {
      toast('Bitte Objektdaten in Schritt 1 ausfüllen', 'err');
      return;
    }

    var orig = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ analysiert…'; }
    out.innerHTML = '<div style="padding:8px;color:var(--text3);font-style:italic;">KI analysiert Marktumfeld…</div>';

    var kontext = [
      'Objektart: ' + (o.objektart || 'unbekannt'),
      'Adresse: ' + pseudonymisieren(o.adresse || ''),
      'Baujahr: ' + (o.baujahr || '—'),
      'Modernisierungsgrad: ' + (o.modernisierung || 'keine'),
      'Grundstücksfläche: ' + (o.grundstuecksflaeche || 0) + ' m²',
      'Bodenrichtwert: ' + (o.bodenrichtwert || 0) + ' €/m²',
      'Wohnfläche: ' + (o.wohnflaeche || 0) + ' m²',
      'BGF: ' + (o.bgf || 0) + ' m²',
      'Lagebeschreibung (SV): ' + pseudonymisieren(o.lage || '—')
    ].join('\n');

    try {
      var res = await fetch('/.netlify/functions/ki-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1400,
          temperature: 0.2,
          messages: [
            { role: 'system', content: MARKT_PROMPT },
            { role: 'user',   content: kontext }
          ]
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var raw = (data.content && data.content[0] && data.content[0].text) || '';
      raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) {
        var m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('Antwort war kein JSON');
        parsed = JSON.parse(m[0]);
      }

      _state.ki_markt = parsed;
      speichern();
      renderMarktAnalyse(parsed);
    } catch (e) {
      out.innerHTML = '<div style="padding:8px;color:var(--red);">Fehler: ' + (e.message || e) + '</div>';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = orig || '🧠 Analyse anfordern'; }
    }
  };

  function renderMarktAnalyse(a) {
    var out = $('ki-markt-result');
    if (!out || !a) return;
    function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

    var html = '<div style="background:var(--bg3);padding:14px 16px;border-radius:8px;">';
    if (a.makrolage) html += '<div style="margin-bottom:10px;"><strong style="color:var(--purple);font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Makrolage</strong><div style="margin-top:3px;">' + esc(a.makrolage) + '</div></div>';
    if (a.mikrolage) html += '<div style="margin-bottom:10px;"><strong style="color:var(--purple);font-size:11px;text-transform:uppercase;letter-spacing:.05em;">Mikrolage</strong><div style="margin-top:3px;">' + esc(a.mikrolage) + '</div></div>';

    function listSection(titel, arr) {
      if (!arr || !arr.length) return '';
      var s = '<div style="margin-bottom:10px;"><strong style="color:var(--purple);font-size:11px;text-transform:uppercase;letter-spacing:.05em;">' + titel + '</strong><ul style="margin:4px 0 0 18px;padding:0;">';
      arr.forEach(function(x){ s += '<li style="margin-bottom:2px;">' + esc(x) + '</li>'; });
      return s + '</ul></div>';
    }
    html += listSection('Objekttyp-Hinweise', a.objekttyp_hinweise);
    html += listSection('Zustands-Implikationen', a.zustand_implikationen);
    html += listSection('Risiken / Chancen', a.risiken_chancen);
    html += listSection('Offene Fragen für SV', a.offene_fragen);

    html += '<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:10px;color:var(--text3);font-style:italic;">§ 407a ZPO: Hypothesen zur Orientierung — SV prüft und entscheidet. Konjunktiv II · DSGVO-pseudonymisiert.</div>';
    html += '</div>';
    out.innerHTML = html;
  }

  // Rückwärts-Kompat: alter Name stays
  function escAttrOld(s) { return escAttr(s); }

  /* ═══════════════════════════════════════════════════════════
     ERGEBNIS-RENDER STEP 3
  ═══════════════════════════════════════════════════════════ */
  function renderErgebnis() {
    var o = _state.objekt;
    var e = _state.ergebnis;
    if (!e) return;

    var typLabel = { verkehrswert: 'Verkehrswertgutachten', beleihungswert: 'Beleihungswertgutachten', mietwert: 'Mietwertgutachten' }[_state.typ] || 'Wertgutachten';
    var empf = e.empfohlen || { verkehrswert: 0, begruendung: '—' };

    var html = ''
      + '<div style="background:var(--bg3);padding:14px 16px;border-radius:10px;margin-bottom:16px;">'
      +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px;">Objekt</div>'
      +   '<div style="font-size:13px;color:var(--text);line-height:1.7;">'
      +     '<strong>' + (o.adresse || '—') + '</strong><br>'
      +     'Baujahr: ' + (o.baujahr || '—') + ' · Objektart: ' + (o.objektart || '—') + '<br>'
      +     'Grundstück: ' + fmtM2(o.grundstuecksflaeche) + ' · BRW: ' + fmtEUR(o.bodenrichtwert) + '/m² · BGF: ' + fmtM2(o.bgf) + '<br>'
      +     'Stichtag: ' + (o.stichtag || '—') + ' · AZ: ' + (o.az || '—')
      +   '</div>'
      + '</div>';

    // ── Sachwert-Block ──
    if (e.sachwert) {
      var sw = e.sachwert;
      html += '<div class="ergebnis-box" style="margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--purple);margin-bottom:10px;">🏗️ Sachwertverfahren §§ 35–39 ImmoWertV</div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Bodenwert</span><span class="ergebnis-value">' + fmtEUR(sw.bodenwert) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Gebäude-Neubauwert</span><span class="ergebnis-value">' + fmtEUR(sw.neuwert) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">− Alterswertminderung (' + fmtPct(sw.awm_pct) + ')</span><span class="ergebnis-value">− ' + fmtEUR(sw.awm_abzug) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Gebäudesachwert</span><span class="ergebnis-value">' + fmtEUR(sw.gebaeudesachwert) + '</span></div>'
        +   (sw.zuschlag > 0 ? '<div class="ergebnis-zeile"><span class="ergebnis-label">+ Besondere Bauteile</span><span class="ergebnis-value">+ ' + fmtEUR(sw.zuschlag) + '</span></div>' : '')
        +   (sw.smf !== 1 ? '<div class="ergebnis-zeile"><span class="ergebnis-label">× Sachwert-Marktfaktor</span><span class="ergebnis-value">× ' + sw.smf.toFixed(2) + '</span></div>' : '')
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Sachwert-Ergebnis</span><span class="ergebnis-value">' + fmtEUR(sw.verkehrswert) + '</span></div>'
        + '</div>';
    }

    // ── Vergleichswert-Block ──
    if (e.vergleich) {
      var vg = e.vergleich;
      html += '<div class="ergebnis-box" style="margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--purple);margin-bottom:10px;">🔁 Vergleichswertverfahren §§ 24–26 ImmoWertV</div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Anzahl bereinigter Vergleichsobjekte</span><span class="ergebnis-value">' + vg.anzahl + (vg.anzahl < 3 ? ' (⚠ min. 3 empfohlen)' : '') + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Mittelwert (' + (vg.bezug === 'qm' ? '€/m²' : '€') + ')</span><span class="ergebnis-value">' + (vg.bezug === 'qm' ? fmtEUR(vg.mittel) + '/m²' : fmtEUR(vg.mittel)) + '</span></div>'
        +   (vg.anzahl > 1 ? '<div class="ergebnis-zeile"><span class="ergebnis-label">Streuung (Stdabw.)</span><span class="ergebnis-value">' + (vg.bezug === 'qm' ? fmtEUR(vg.streuung) + '/m²' : fmtEUR(vg.streuung)) + '</span></div>' : '')
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Vergleichswert-Ergebnis</span><span class="ergebnis-value">' + fmtEUR(vg.verkehrswert) + '</span></div>'
        + '</div>';
    }

    // ── Ertragswert-Block ──
    if (e.ertrag) {
      var ew = e.ertrag;
      html += '<div class="ergebnis-box" style="margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--purple);margin-bottom:10px;">💼 Ertragswertverfahren §§ 27–34 ImmoWertV</div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Jahresrohertrag</span><span class="ergebnis-value">' + fmtEUR(ew.rohertrag) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">− Bewirtschaftungskosten</span><span class="ergebnis-value">− ' + fmtEUR(ew.bwkAbzug) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">− Bodenwertverzinsung (' + fmtPct(ew.lzs_pct) + ')</span><span class="ergebnis-value">− ' + fmtEUR(ew.bodenwertVerzinsung) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Gebäudereinertrag</span><span class="ergebnis-value">' + fmtEUR(ew.gebaeudeReinertrag) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">× Vervielfältiger (RND ' + Math.round(ew.rnd) + 'J)</span><span class="ergebnis-value">× ' + (ew.vervielf || 0).toFixed(3) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Gebäudeertragswert</span><span class="ergebnis-value">' + fmtEUR(ew.gebaeudeErtragswert) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">+ Bodenwert</span><span class="ergebnis-value">+ ' + fmtEUR(ew.bodenwert) + '</span></div>'
        +   (ew.emf !== 1 ? '<div class="ergebnis-zeile"><span class="ergebnis-label">× Ertragswert-Marktfaktor</span><span class="ergebnis-value">× ' + ew.emf.toFixed(2) + '</span></div>' : '')
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Ertragswert-Ergebnis</span><span class="ergebnis-value">' + fmtEUR(ew.verkehrswert) + '</span></div>'
        + '</div>';
    }

    // ── Zusammenfassung/Empfehlung ──
    if (_state.verfahrenSet.length > 1) {
      html += '<div style="background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.02));border:1.5px solid rgba(16,185,129,.3);border-radius:12px;padding:16px 20px;margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--green);margin-bottom:10px;">📊 Verfahrensmix — Empfohlener Verkehrswert</div>';
      Object.keys(empf.gewichtung || {}).forEach(function(k) {
        var map = { sachwert: 'Sachwert', vergleich: 'Vergleich', ertrag: 'Ertrag' };
        var g = empf.gewichtung[k] || 0;
        if (g > 0) html += '<div style="font-size:11px;color:var(--text2);margin-bottom:3px;">' + map[k] + ': ' + fmtPct(g*100) + '</div>';
      });
      html += '<div style="font-size:11px;color:var(--text3);font-style:italic;margin-top:6px;line-height:1.5;">' + empf.begruendung + '</div>';
      if (empf.spread_warnung) {
        html += '<div style="margin-top:8px;padding:8px 10px;background:rgba(245,158,11,.15);border-radius:6px;font-size:11px;color:var(--warn);">⚠ Hohe Abweichung zwischen Verfahren (' + empf.spread_pct.toFixed(0) + ' %) — Eingaben prüfen</div>';
      }
      html += '<div style="margin-top:12px;padding-top:10px;border-top:2px solid rgba(16,185,129,.3);display:flex;justify-content:space-between;align-items:baseline;">'
        +   '<span style="font-size:13px;font-weight:600;color:var(--text);">Empfohlener Verkehrswert</span>'
        +   '<span style="font-size:26px;font-weight:800;color:var(--green);">' + fmtEUR(empf.verkehrswert) + '</span>'
        + '</div></div>';
    }

    // ── Beleihungswert-Block (Etappe 3, nur bei typ=beleihungswert) ──
    if (_state.typ === 'beleihungswert' && e.beleihung) {
      var bw = e.beleihung;
      html += '<div style="background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(99,102,241,.02));border:1.5px solid rgba(99,102,241,.35);border-radius:12px;padding:16px 20px;margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6366f1;margin-bottom:10px;">🏦 Beleihungswert nach § 16 BelWertV</div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Verkehrswert-Ausgang</span><span class="ergebnis-value">' + fmtEUR(bw.ausgang) + '</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">− Sicherheitsabschlag (' + fmtPct(bw.abschlag_pct) + ')</span><span class="ergebnis-value">− ' + fmtEUR(bw.abschlag) + '</span></div>'
        +   (bw.sonst_pct !== 0 ? '<div class="ergebnis-zeile"><span class="ergebnis-label">Besonderheits-Korrektur (' + fmtPct(bw.sonst_pct) + ')</span><span class="ergebnis-value">' + (bw.sonst >= 0 ? '+ ' : '− ') + fmtEUR(Math.abs(bw.sonst)) + '</span></div>' : '')
        +   '<div style="margin-top:12px;padding-top:10px;border-top:2px solid rgba(99,102,241,.4);display:flex;justify-content:space-between;align-items:baseline;">'
        +     '<span style="font-size:13px;font-weight:600;color:var(--text);">Beleihungswert</span>'
        +     '<span style="font-size:26px;font-weight:800;color:#6366f1;">' + fmtEUR(bw.beleihungswert) + '</span>'
        +   '</div></div>';
    }

    // ── Mietwert-Block (Etappe 3, nur bei typ=mietwert) ──
    if (_state.typ === 'mietwert' && e.mietwert) {
      var mw = e.mietwert;
      html += '<div style="background:linear-gradient(135deg,rgba(168,85,247,.1),rgba(168,85,247,.02));border:1.5px solid rgba(168,85,247,.35);border-radius:12px;padding:16px 20px;margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a855f7;margin-bottom:10px;">🔑 Mietwert nach § 558 BGB</div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Mietspiegel-Mittelwert</span><span class="ergebnis-value">' + fmtEUR(mw.spiegel) + '/m²</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Spannbreite</span><span class="ergebnis-value">' + fmtEUR(mw.untere) + ' — ' + fmtEUR(mw.obere) + '/m²</span></div>'
        +   '<div class="ergebnis-zeile"><span class="ergebnis-label">Wohnwert-Zuschlag</span><span class="ergebnis-value">' + (mw.zuschlag_pct >= 0 ? '+' : '') + fmtPct(mw.zuschlag_pct) + '</span></div>'
        +   (mw.ausserhalb_spanne ? '<div style="margin-top:6px;padding:6px 10px;background:rgba(245,158,11,.12);border-radius:6px;font-size:11px;color:var(--warn);">⚠ Ergebnis liegt außerhalb der Mietspiegel-Spanne — SV sollte Zuschläge prüfen/begründen.</div>' : '')
        +   '<div style="margin-top:12px;padding-top:10px;border-top:2px solid rgba(168,85,247,.4);">'
        +     '<div style="display:flex;justify-content:space-between;align-items:baseline;">'
        +       '<span style="font-size:13px;font-weight:600;color:var(--text);">Ortsübliche Vergleichsmiete</span>'
        +       '<span style="font-size:22px;font-weight:800;color:#a855f7;">' + fmtEUR(mw.mieteQm) + '/m²</span>'
        +     '</div>'
        +     (mw.monatsmiete > 0 ? '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;"><span style="font-size:11px;color:var(--text3);">Bei ' + (o.wohnflaeche || 0) + ' m² Wohnfläche</span><span style="font-size:14px;font-weight:700;color:var(--text);">' + fmtEUR(mw.monatsmiete) + ' / Monat netto</span></div>' : '')
        +   '</div>'
        + '</div>';
    }

    // ── KI-Marktanalyse (falls vorhanden) ──
    if (_state.ki_markt) {
      html += '<div style="background:rgba(139,92,246,.05);border:1px solid rgba(139,92,246,.2);border-radius:12px;padding:14px 18px;margin-bottom:14px;">'
        +   '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--purple);margin-bottom:8px;">✨ KI-Marktanalyse (Hypothesen im Konjunktiv II)</div>'
        +   '<div style="font-size:12px;color:var(--text2);line-height:1.6;">';
      if (_state.ki_markt.makrolage) html += '<p style="margin-bottom:6px;"><strong>Makrolage:</strong> ' + _state.ki_markt.makrolage + '</p>';
      if (_state.ki_markt.mikrolage) html += '<p style="margin-bottom:6px;"><strong>Mikrolage:</strong> ' + _state.ki_markt.mikrolage + '</p>';
      html += '</div></div>';
    }

    html += '<div style="margin-top:16px;padding:12px 14px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;font-size:11px;color:var(--text2);line-height:1.6;">'
      +   '<strong>§ 407a ZPO:</strong> Die dargestellten Werte sind rechnerische Ergebnisse aus den vom Sachverständigen erfassten Daten. Die finale Bewertung unter Würdigung aller Marktbesonderheiten und die Wahl/Gewichtung der Verfahren bleibt SV-Eigenleistung.'
      + '</div>';

    var box = $('ergebnis-render');
    if (box) box.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════
     PDF-VERSAND via Make K3-Webhook
  ═══════════════════════════════════════════════════════════ */
  window.wgPdfVersenden = async function() {
    var e = _state.ergebnis; if (!e) { toast('Zuerst Berechnung durchführen', 'err'); return; }
    var email = prompt('E-Mail des Empfängers:', '');
    if (!email) return;

    var svEmail = localStorage.getItem('prova_sv_email') || '';
    var svName  = localStorage.getItem('prova_sv_name')  || '';
    if (!svEmail) { toast('Keine SV-E-Mail hinterlegt', 'err'); return; }

    var o = _state.objekt;
    var typLabel = { verkehrswert: 'Verkehrswert', beleihungswert: 'Beleihungswert', mietwert: 'Mietwert' }[_state.typ] || 'Verkehrswert';
    var empf = e.empfohlen || {};
    var finalWert = empf.verkehrswert || (e.sachwert && e.sachwert.verkehrswert) || 0;

    var lines = [];
    lines.push(typLabel.toUpperCase() + 'GUTACHTEN nach §§ 194–199 BauGB · ImmoWertV 2022');
    lines.push('');
    lines.push('Aktenzeichen: ' + (o.az || '—'));
    lines.push('Wertermittlungsstichtag: ' + (o.stichtag || '—'));
    lines.push('Zweck: ' + (o.zweck || '—'));
    lines.push('Auftraggeber: ' + (o.auftraggeber || '—'));
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('OBJEKT');
    lines.push('─────────────────────────────────────');
    lines.push('Adresse: ' + (o.adresse || '—'));
    lines.push('Objektart: ' + (o.objektart || '—'));
    lines.push('Baujahr: ' + (o.baujahr || '—') + ' · Modernisierung: ' + (o.modernisierung || 'keine'));
    lines.push('Grundstücksfläche: ' + fmtM2(o.grundstuecksflaeche));
    lines.push('Bodenrichtwert: ' + fmtEUR(o.bodenrichtwert) + '/m²');
    lines.push('Bruttogrundfläche BGF: ' + fmtM2(o.bgf));
    if (o.wohnflaeche) lines.push('Wohnfläche: ' + fmtM2(o.wohnflaeche));
    lines.push('Gesamtnutzungsdauer: ' + fmtJahr(o.gesamtnutzungsdauer));
    if (o.lage) { lines.push(''); lines.push('Lagebeschreibung:'); lines.push(o.lage); }
    lines.push('');

    lines.push('─────────────────────────────────────');
    lines.push('GEWÄHLTE VERFAHREN: ' + _state.verfahrenSet.join(', '));
    lines.push('─────────────────────────────────────');

    // Sachwert-Block
    if (e.sachwert) {
      var sw = e.sachwert;
      lines.push('');
      lines.push('▪ SACHWERTVERFAHREN (§§ 35–39 ImmoWertV)');
      lines.push('Bodenwert:               ' + fmtEUR(sw.bodenwert));
      lines.push('Gebäude-Neubauwert:      ' + fmtEUR(sw.neuwert));
      lines.push('  (BGF × NHK × BPI × Regionalfaktor)');
      lines.push('− Alterswertminderung:   − ' + fmtEUR(sw.awm_abzug) + ' (' + fmtPct(sw.awm_pct) + ')');
      lines.push('Gebäudesachwert:         ' + fmtEUR(sw.gebaeudesachwert));
      if (sw.zuschlag > 0) lines.push('+ Besondere Bauteile:    + ' + fmtEUR(sw.zuschlag));
      if (sw.smf !== 1) lines.push('× Sachwert-Marktfaktor:  × ' + sw.smf.toFixed(2));
      lines.push('Sachwert-Ergebnis:       ' + fmtEUR(sw.verkehrswert));
    }

    // Vergleichswert-Block
    if (e.vergleich) {
      var vg = e.vergleich;
      lines.push('');
      lines.push('▪ VERGLEICHSWERTVERFAHREN (§§ 24–26 ImmoWertV)');
      lines.push('Anzahl bereinigter Vergleichsobjekte: ' + vg.anzahl);
      lines.push('Mittelwert: ' + (vg.bezug === 'qm' ? fmtEUR(vg.mittel) + '/m²' : fmtEUR(vg.mittel)));
      if (vg.anzahl > 1) lines.push('Streuung: ' + (vg.bezug === 'qm' ? fmtEUR(vg.streuung) + '/m²' : fmtEUR(vg.streuung)));
      lines.push('Vergleichswert-Ergebnis: ' + fmtEUR(vg.verkehrswert));
      lines.push('');
      lines.push('Verwendete Vergleichsobjekte:');
      (_state.vergleich.objekte || []).forEach(function(vo, i) {
        if (!vo.preis) return;
        lines.push('  ' + (i+1) + '. ' + (vo.beschreibung || '(ohne Beschreibung)'));
        lines.push('     Preis: ' + fmtEUR(vo.preis) + (vo.flaeche ? ' · ' + fmtM2(vo.flaeche) : '') + (vo.abweichung_pct ? ' · Bereinigung ' + vo.abweichung_pct + '%' : ''));
      });
    }

    // Ertragswert-Block
    if (e.ertrag) {
      var ew = e.ertrag;
      lines.push('');
      lines.push('▪ ERTRAGSWERTVERFAHREN (§§ 27–34 ImmoWertV)');
      lines.push('Jahresrohertrag:         ' + fmtEUR(ew.rohertrag));
      lines.push('− Bewirtschaftungskosten:− ' + fmtEUR(ew.bwkAbzug));
      lines.push('= Jahresreinertrag:      ' + fmtEUR(ew.reinertrag));
      lines.push('− Bodenwertverzinsung:   − ' + fmtEUR(ew.bodenwertVerzinsung) + ' (' + fmtPct(ew.lzs_pct) + ')');
      lines.push('= Gebäudereinertrag:     ' + fmtEUR(ew.gebaeudeReinertrag));
      lines.push('× Vervielfältiger (' + Math.round(ew.rnd) + 'J · ' + fmtPct(ew.lzs_pct) + '): ' + (ew.vervielf || 0).toFixed(3));
      lines.push('= Gebäudeertragswert:    ' + fmtEUR(ew.gebaeudeErtragswert));
      lines.push('+ Bodenwert:             + ' + fmtEUR(ew.bodenwert));
      if (ew.emf !== 1) lines.push('× Ertragswert-Marktfaktor: × ' + ew.emf.toFixed(2));
      lines.push('Ertragswert-Ergebnis:    ' + fmtEUR(ew.verkehrswert));
    }

    // Empfehlung
    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('EMPFOHLENER VERKEHRSWERT');
    lines.push('─────────────────────────────────────');
    if (_state.verfahrenSet.length > 1 && empf.gewichtung) {
      lines.push('Gewichtung nach § 8 ImmoWertV:');
      Object.keys(empf.gewichtung).forEach(function(k) {
        if (empf.gewichtung[k] > 0) {
          var map = { sachwert: 'Sachwertverfahren', vergleich: 'Vergleichswertverfahren', ertrag: 'Ertragswertverfahren' };
          lines.push('  ' + map[k] + ': ' + fmtPct(empf.gewichtung[k]*100));
        }
      });
      lines.push('');
      lines.push('Begründung: ' + empf.begruendung);
      if (empf.spread_warnung) lines.push('⚠ Hinweis: Spread zwischen Verfahren ' + empf.spread_pct.toFixed(0) + '% — SV prüft Plausibilität der Eingaben.');
      lines.push('');
    }
    lines.push('Verkehrswert:  ' + fmtEUR(finalWert));

    // Etappe 3: Beleihungswert
    if (_state.typ === 'beleihungswert' && e.beleihung) {
      lines.push('');
      lines.push('─────────────────────────────────────');
      lines.push('BELEIHUNGSWERT nach § 16 BelWertV');
      lines.push('─────────────────────────────────────');
      lines.push('Verkehrswert-Ausgang:    ' + fmtEUR(e.beleihung.ausgang));
      lines.push('− Sicherheitsabschlag:   − ' + fmtEUR(e.beleihung.abschlag) + ' (' + fmtPct(e.beleihung.abschlag_pct) + ')');
      if (e.beleihung.sonst_pct !== 0) {
        lines.push((e.beleihung.sonst >= 0 ? '+ ' : '− ') + 'Besonderheits-Korrektur: ' + fmtEUR(Math.abs(e.beleihung.sonst)) + ' (' + fmtPct(e.beleihung.sonst_pct) + ')');
      }
      lines.push('');
      lines.push('Beleihungswert:          ' + fmtEUR(e.beleihung.beleihungswert));
      finalWert = e.beleihung.beleihungswert;
    }

    // Etappe 3: Mietwert
    if (_state.typ === 'mietwert' && e.mietwert) {
      lines.push('');
      lines.push('─────────────────────────────────────');
      lines.push('MIETWERT nach § 558 BGB');
      lines.push('─────────────────────────────────────');
      lines.push('Mietspiegel-Mittelwert:  ' + fmtEUR(e.mietwert.spiegel) + '/m²');
      lines.push('Spannbreite:             ' + fmtEUR(e.mietwert.untere) + ' — ' + fmtEUR(e.mietwert.obere) + '/m²');
      lines.push('Wohnwert-Zuschlag:       ' + (e.mietwert.zuschlag_pct >= 0 ? '+' : '') + fmtPct(e.mietwert.zuschlag_pct));
      if (e.mietwert.ausserhalb_spanne) {
        lines.push('⚠ Ergebnis liegt außerhalb der Mietspiegel-Spanne — SV-Begründung erforderlich.');
      }
      lines.push('');
      lines.push('Ortsübliche Vergleichsmiete: ' + fmtEUR(e.mietwert.mieteQm) + '/m²');
      if (e.mietwert.monatsmiete > 0) {
        lines.push('Monatsmiete netto bei ' + (o.wohnflaeche || 0) + ' m²: ' + fmtEUR(e.mietwert.monatsmiete) + ' / Monat');
      }
      finalWert = e.mietwert.mieteQm;
    }

    // Etappe 3: KI-Marktanalyse falls vorhanden
    if (_state.ki_markt) {
      lines.push('');
      lines.push('─────────────────────────────────────');
      lines.push('KI-MARKTANALYSE (Hypothesen, Konjunktiv II)');
      lines.push('─────────────────────────────────────');
      if (_state.ki_markt.makrolage) lines.push('Makrolage: ' + _state.ki_markt.makrolage);
      if (_state.ki_markt.mikrolage) lines.push('Mikrolage: ' + _state.ki_markt.mikrolage);
      if (_state.ki_markt.objekttyp_hinweise && _state.ki_markt.objekttyp_hinweise.length) {
        lines.push('');
        lines.push('Objekttyp-Hinweise:');
        _state.ki_markt.objekttyp_hinweise.forEach(function(x){ lines.push('  • ' + x); });
      }
      if (_state.ki_markt.risiken_chancen && _state.ki_markt.risiken_chancen.length) {
        lines.push('');
        lines.push('Risiken / Chancen:');
        _state.ki_markt.risiken_chancen.forEach(function(x){ lines.push('  • ' + x); });
      }
      if (_state.ki_markt.offene_fragen && _state.ki_markt.offene_fragen.length) {
        lines.push('');
        lines.push('Offene Fragen für SV:');
        _state.ki_markt.offene_fragen.forEach(function(x){ lines.push('  ? ' + x); });
      }
      lines.push('');
      lines.push('(§ 407a ZPO: KI-Hypothesen zur Orientierung — SV prüft und entscheidet.)');
    }

    lines.push('');
    lines.push('─────────────────────────────────────');
    lines.push('RECHTLICHE HINWEISE');
    lines.push('─────────────────────────────────────');
    lines.push('Rechtsgrundlagen: §§ 194–199 BauGB · ImmoWertV 2022');
    lines.push('§ 407a ZPO: Die Bewertung basiert auf dem/den gewählten Verfahren. Finale Gutachten-');
    lines.push('Bewertung, Verfahrenswahl und Gewichtung bleiben SV-Eigenleistung.');
    lines.push('');
    lines.push('Erstellt mit PROVA Systems · Wertermittlungs-Assistenz');

    var payload = {
      vorlage_id:       'BRIEF-WERTGUTACHTEN',
      typ:              'wertgutachten_' + _state.typ,
      empfaenger_email: email,
      empfaenger_name:  o.auftraggeber || '',
      sv_email:         svEmail,
      sv_name:          svName,
      aktenzeichen:     o.az || '',
      betreff:          typLabel + 'gutachten — ' + (o.adresse || ''),
      inhalt_text:      lines.join('\n'),
      datum:            new Date().toISOString().slice(0,10),
      verkehrswert:     finalWert
    };

    try {
      var res = await fetch(K3_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      toast('✓ PDF-Erstellung gestartet — Zustellung per E-Mail', 'ok');

      // Airtable-Sync (non-blocking)
      try {
        fetch('/.netlify/functions/airtable', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            method:'POST',
            path:'/v0/appJ7bLlAHZoxENWE/tblSxV8bsXwd1pwa0',
            payload: { records:[{ fields: {
              Aktenzeichen: o.az || '',
              Flow: 'B',
              Auftragstyp: _state.typ,
              Phase: 'Gutachten erstellt',
              Status: typLabel + ' — ' + fmtEUR(finalWert),
              Auftraggeber_Name: o.auftraggeber || '',
              Schaden_Strasse:   o.adresse || '',
              Notizen:           _state.verfahrenSet.join('+') + ' · Baujahr ' + o.baujahr,
              sv_email: svEmail
            }}]}
          })
        }).catch(function(){});
      } catch(err) {}
    } catch(err) { toast('Fehler: ' + err.message, 'err'); }
  };

  /* ═══════════════════════════════════════════════════════════
     RESET
  ═══════════════════════════════════════════════════════════ */
  window.wgReset = function() {
    if (!confirm('Alle Eingaben löschen und neues Gutachten starten?')) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = 'wertgutachten.html' + (_state.typ ? '?typ=' + _state.typ : '');
  };

  /* ═══════════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════════ */
  function init() {
    // URL-Param typ auswerten
    try {
      var params = new URLSearchParams(window.location.search);
      var t = params.get('typ');
      if (t && ['verkehrswert','beleihungswert','mietwert'].indexOf(t) !== -1) _state.typ = t;
    } catch(e) {}

    var typLabel = { verkehrswert: 'Verkehrswertgutachten', beleihungswert: 'Beleihungswertgutachten', mietwert: 'Mietwertgutachten' }[_state.typ];
    var sub = $('wg-subtitle');
    if (sub) sub.textContent = typLabel + ' nach §§ 194–199 BauGB und ImmoWertV 2022. Etappe 1 von 3 — Sachwertverfahren.';

    // Vorherigen State wiederherstellen
    laden();

    // Default Stichtag = heute
    var stichtag = $('wg-stichtag');
    if (stichtag && !stichtag.value) stichtag.value = new Date().toISOString().slice(0,10);

    // Vorheriger Objekt-State ins Form eintragen
    var o = _state.objekt || {};
    Object.keys(o).forEach(function(k) {
      var mapping = {
        az: 'wg-az', stichtag: 'wg-stichtag', auftraggeber: 'wg-auftraggeber',
        zweck: 'wg-zweck', adresse: 'wg-adresse', objektart: 'wg-objektart',
        baujahr: 'wg-baujahr', modernisierung: 'wg-modern',
        grundstuecksflaeche: 'wg-gr-flaeche', bodenrichtwert: 'wg-brw',
        wohnflaeche: 'wg-wfl', bgf: 'wg-bgf', gesamtnutzungsdauer: 'wg-gnd',
        lage: 'wg-lage'
      };
      var id = mapping[k];
      var el = id ? $(id) : null;
      if (el && o[k] !== undefined && o[k] !== '') el.value = o[k];
    });

    // Sachwert-State
    var s = _state.sachwert || {};
    var swMap = { nhk:'sw-nhk', bpi:'sw-bpi', region:'sw-region', awm_pct:'sw-awm', zuschlag:'sw-zuschlag', smf:'sw-smf' };
    Object.keys(swMap).forEach(function(k) {
      var el = $(swMap[k]); if (el && s[k] !== undefined && s[k] !== 0) el.value = s[k];
    });

    // Ertrag-State rehydrieren
    var ert = _state.ertrag || {};
    var ewMap = { rohertrag:'ew-rohertrag', bwk_pct:'ew-bwk', lzs_pct:'ew-lzs', rnd:'ew-rnd', emf:'ew-emf' };
    Object.keys(ewMap).forEach(function(k) {
      var el = $(ewMap[k]); if (el && ert[k] !== undefined && ert[k] !== 0) el.value = ert[k];
    });

    // Verfahren-Auswahl rehydrieren (Cards + Formulare)
    if (_state.verfahrenSet && _state.verfahrenSet.length) {
      _state.verfahrenSet.forEach(function(v) {
        var card = document.querySelector('.verf-card[data-verf="' + v + '"]');
        if (card) card.classList.add('selected');
        var f = $(v + '-form'); if (f) f.hidden = false;
      });
      var btn = $('btn-zu-ergebnis');
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
    }

    // Vergleichs-Objekte rendern
    if (_state.verfahrenSet && _state.verfahrenSet.indexOf('vergleich') !== -1) {
      if (typeof wgVergleichRender === 'function') wgVergleichRender();
      var bezugEl = $('vg-bezug');
      if (bezugEl && _state.vergleich && _state.vergleich.bezug) bezugEl.value = _state.vergleich.bezug;
    }
    // Sachwert initial
    if (_state.verfahrenSet && _state.verfahrenSet.indexOf('sachwert') !== -1) wgBerechneSachwert();
    // Ertrag initial
    if (_state.verfahrenSet && _state.verfahrenSet.indexOf('ertrag') !== -1) wgBerechneErtrag();

    // Session 31 Sprint 6 Etappe 3: Typ-abhängige Panels einblenden
    var bwForm = $('beleihung-form');
    var mwForm = $('mietwert-form');
    if (bwForm) bwForm.hidden = (_state.typ !== 'beleihungswert');
    if (mwForm) mwForm.hidden = (_state.typ !== 'mietwert');

    // State rehydrieren: Beleihung
    if (_state.typ === 'beleihungswert' && _state.beleihung) {
      var bwMap = { abschlag_pct:'bw-abschlag', sonst_pct:'bw-sonst' };
      Object.keys(bwMap).forEach(function(k) {
        var el = $(bwMap[k]); if (el && _state.beleihung[k] !== undefined) el.value = _state.beleihung[k];
      });
      wgBerechneBeleihung();
    }
    // State rehydrieren: Mietwert
    if (_state.typ === 'mietwert' && _state.mietwert) {
      var mwMap = { spiegel:'mw-spiegel', spann_pct:'mw-spann', lage_pct:'mw-lage', aus_pct:'mw-aus', zst_pct:'mw-zst' };
      Object.keys(mwMap).forEach(function(k) {
        var el = $(mwMap[k]); if (el && _state.mietwert[k] !== undefined) el.value = _state.mietwert[k];
      });
      wgBerechneMiet();
    }
    // KI-Marktanalyse rehydrieren
    if (_state.ki_markt) renderMarktAnalyse(_state.ki_markt);
  }

  // ═══════════════════════════════════════════════════════
  // Sprint 4: Normen-Picker (Flow B)
  //
  // Ruft /normen-picker mit flow=B + zweck + objektart auf.
  // Keine Progressive Disclosure nötig — Flow B ist statisch schnell (~50ms).
  // Bei Backend-Ausfall: Block bleibt leer mit dezentem Fallback-Text.
  // ═══════════════════════════════════════════════════════
  async function ladeWertgutachtenNormen() {
    var el = $('wgNormenListe');
    if (!el) return;

    var zweck     = val('wg-zweck') || 'privat';
    var objektart = val('wg-objektart') || 'efh';

    // Spinner
    el.innerHTML = '<div style="padding:8px 10px;font-size:11px;color:var(--text3);display:flex;align-items:center;gap:6px;">'
      + '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid var(--accent);border-top-color:transparent;animation:spin .6s linear infinite;"></span>'
      + 'Lade Normen für ' + _zweckLabel(zweck) + ' / ' + _objektartLabel(objektart) + '…'
      + '</div>';

    try {
      var res = await fetch('/.netlify/functions/normen-picker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: 'B',
          zweck: zweck,
          objektart: objektart,
          max: 12
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      var normen = Array.isArray(data.normen) ? data.normen : [];

      if (!normen.length) {
        el.innerHTML = '<div style="padding:8px 10px;font-size:11px;color:var(--text3);font-style:italic;">Keine Normen geladen — Backend prüfen</div>';
        return;
      }

      el.innerHTML = normen.map(_renderWGNormItem).join('');
    } catch (e) {
      console.warn('[wertgutachten-normen] Fehler:', e.message);
      el.innerHTML = '<div style="padding:8px 10px;font-size:11px;color:var(--text3);font-style:italic;">Normen-Übersicht momentan nicht verfügbar (Offline-Modus)</div>';
    }
  }

  function _renderWGNormItem(n) {
    // Zusätzliche HTML-Escape-Sicherheit
    function esc(v) { return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    var nr    = esc(n.n || '');
    var titel = esc(n.t || '');
    var gw    = esc(n.g || '');
    return '<div style="padding:8px 10px;background:rgba(255,255,255,.02);border:1px solid rgba(59,130,246,.1);border-radius:6px;font-size:11px;line-height:1.5;">'
      +   '<div style="font-weight:700;color:var(--accent);">' + nr + '</div>'
      +   '<div style="color:var(--text2);margin-top:2px;">' + titel + '</div>'
      +   (gw ? '<div style="color:var(--text3);margin-top:3px;font-size:10px;">' + gw + '</div>' : '')
      + '</div>';
  }

  function _zweckLabel(z) {
    var map = { privat: 'Privatgutachten', gericht: 'Gerichtsgutachten', bank: 'Bankgutachten', versicherung: 'Versicherungsgutachten', steuer: 'Steuergutachten' };
    return map[z] || z;
  }

  function _objektartLabel(o) {
    var map = { efh: 'EFH', dhh: 'DHH', rh: 'Reihenhaus', mfh: 'MFH', etw: 'ETW', geh: 'Gewerbe', gru: 'Grundstück' };
    return map[o] || o;
  }

  // Re-trigger bei Zweck-/Objektart-Wechsel (wenn User Step 1 ändert und wieder in Step 2 geht)
  // Wird automatisch via wgNextStep(2) erneut aufgerufen.

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

})();
