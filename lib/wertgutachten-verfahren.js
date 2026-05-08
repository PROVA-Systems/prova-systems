/**
 * PROVA — Wertgutachten Multi-Verfahren (MEGA³² A2)
 *
 * 3 Verfahren nach ImmoWertV 2021:
 * - Sachwertverfahren §§35-39 (Boden + Gebäude + NHK)
 * - Vergleichswertverfahren §§22-28 (Vergleichspreise)
 * - Ertragswertverfahren §§29-34 (Reinertrag + Liegenschaftszinssatz)
 *
 * Public API:
 *   ProvaWertVerfahren.berechneSachwert(opts)
 *   ProvaWertVerfahren.berechneVergleich(opts)
 *   ProvaWertVerfahren.berechneErtrag(opts)
 *   ProvaWertVerfahren.empfehleVerfahren(objekt_typ)
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProvaWertVerfahren = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  // ── Sachwertverfahren §§35-39 ImmoWertV ────────────────────────────────
  function berechneSachwert(opts) {
    // Boden: bodenrichtwert €/m² × grundstücksflaeche m² × marktanpassung
    const bodenwert = (parseFloat(opts.bodenrichtwert_eur_qm) || 0)
                    * (parseFloat(opts.grundstuecksflaeche_qm) || 0)
                    * (parseFloat(opts.boden_marktanpassung) || 1.0);

    // Gebäude: NHK €/m² × bgf m² × marktanpassung × (1 - alterswertminderung)
    const nhk = parseFloat(opts.nhk_eur_qm) || 0;       // Normalherstellungskosten
    const bgf = parseFloat(opts.bgf_qm) || 0;           // Brutto-Grundfläche
    const altersminderung = parseFloat(opts.alterswertminderung_pct) || 0;
    const gebaeude_marktanpassung = parseFloat(opts.gebaeude_marktanpassung) || 1.0;
    const gebaeudewert = nhk * bgf * gebaeude_marktanpassung * (1 - altersminderung / 100);

    const vorlaeufiger_sachwert = bodenwert + gebaeudewert;
    const marktanpassungsfaktor = parseFloat(opts.marktanpassung_gesamt) || 1.0;
    const verkehrswert = Math.round(vorlaeufiger_sachwert * marktanpassungsfaktor);

    return {
      verfahren: 'sachwert',
      bodenwert: Math.round(bodenwert),
      gebaeudewert: Math.round(gebaeudewert),
      vorlaeufiger_sachwert: Math.round(vorlaeufiger_sachwert),
      marktanpassungsfaktor: marktanpassungsfaktor,
      verkehrswert: verkehrswert,
      rechtsgrundlage: 'ImmoWertV §§35-39'
    };
  }

  // ── Vergleichswertverfahren §§22-28 ImmoWertV ──────────────────────────
  function berechneVergleich(opts) {
    const vergleichspreise = Array.isArray(opts.vergleichspreise) ? opts.vergleichspreise : [];
    if (!vergleichspreise.length) return { verfahren: 'vergleich', error: 'Keine Vergleichspreise' };

    // Mittelwert (defensiv: trimmed mean falls > 5 Vergleiche)
    const sortiert = vergleichspreise.map(p => parseFloat(p.preis_eur) || 0).sort((a, b) => a - b);
    let durchschnitt;
    if (sortiert.length > 5) {
      // Trim 10% top + 10% bottom
      const trim = Math.floor(sortiert.length * 0.1);
      const trimmed = sortiert.slice(trim, sortiert.length - trim);
      durchschnitt = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    } else {
      durchschnitt = sortiert.reduce((a, b) => a + b, 0) / sortiert.length;
    }

    const anpassungen = parseFloat(opts.anpassungen_pct) || 0; // z.B. -5% für Lage-Defekt
    const verkehrswert = Math.round(durchschnitt * (1 + anpassungen / 100));

    return {
      verfahren: 'vergleich',
      anzahl_vergleiche: vergleichspreise.length,
      durchschnitt: Math.round(durchschnitt),
      anpassungen_pct: anpassungen,
      verkehrswert: verkehrswert,
      rechtsgrundlage: 'ImmoWertV §§22-28'
    };
  }

  // ── Ertragswertverfahren §§29-34 ImmoWertV ─────────────────────────────
  function berechneErtrag(opts) {
    const jahres_rohertrag = parseFloat(opts.jahres_rohertrag_eur) || 0;
    const bewirtschaftungskosten = parseFloat(opts.bewirtschaftungskosten_eur) || 0;
    const reinertrag = jahres_rohertrag - bewirtschaftungskosten;

    const liegenschaftszins = parseFloat(opts.liegenschaftszins_pct) || 0; // z.B. 4.5%
    const restnutzungsdauer = parseInt(opts.restnutzungsdauer_jahre) || 0; // z.B. 60

    // Vervielfältiger nach Anlage 1 ImmoWertV (Barwertfaktor)
    // V = (q^n - 1) / (q^n × (q - 1)) wobei q = 1 + i/100
    const q = 1 + liegenschaftszins / 100;
    const qn = Math.pow(q, restnutzungsdauer);
    const vervielfaeltiger = restnutzungsdauer > 0 && liegenschaftszins > 0
      ? (qn - 1) / (qn * (q - 1)) : 0;

    const gebaeudeertragswert = reinertrag * vervielfaeltiger;
    const bodenwert = parseFloat(opts.bodenwert_eur) || 0;
    const verkehrswert = Math.round(bodenwert + gebaeudeertragswert);

    return {
      verfahren: 'ertrag',
      reinertrag: Math.round(reinertrag),
      liegenschaftszins_pct: liegenschaftszins,
      restnutzungsdauer_jahre: restnutzungsdauer,
      vervielfaeltiger: Math.round(vervielfaeltiger * 100) / 100,
      gebaeudeertragswert: Math.round(gebaeudeertragswert),
      bodenwert: Math.round(bodenwert),
      verkehrswert: verkehrswert,
      rechtsgrundlage: 'ImmoWertV §§29-34'
    };
  }

  // Verfahren-Empfehlung basierend auf Objekt-Typ
  function empfehleVerfahren(objekt_typ) {
    const map = {
      efh: 'sachwert', rh: 'sachwert', dhh: 'sachwert',
      etw: 'vergleich', wohnung: 'vergleich',
      mfh: 'ertrag', renditeobjekt: 'ertrag', mehrfamilienhaus: 'ertrag',
      neubau: 'sachwert',
      sonderbau: 'kombiniert', hotel: 'kombiniert', klinik: 'kombiniert'
    };
    return map[String(objekt_typ || '').toLowerCase()] || 'sachwert';
  }

  return {
    berechneSachwert: berechneSachwert,
    berechneVergleich: berechneVergleich,
    berechneErtrag: berechneErtrag,
    empfehleVerfahren: empfehleVerfahren
  };
}));
