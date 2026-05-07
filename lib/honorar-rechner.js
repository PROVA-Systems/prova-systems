/**
 * lib/honorar-rechner.js — MEGA³² D2 Honorar-Rechner Multi-Modus
 *
 * 3 Modi für ö.b.u.v. Bausachverständige in DE:
 *
 * 1. JVEG (Justizvergütungs- und -entschädigungsgesetz):
 *    Gerichts-Aufträge nach § 9 JVEG
 *    Sachgebiete + Honorargruppen M1-M3 (M2 = Standard für Bauwesen):
 *    Stundensatz 75-125€ je nach Gruppe
 *    + Auslagen § 7 + Schreibauslagen § 12
 *
 * 2. BVS (Bundesverband öffentl. best. + verei. Sachverständiger):
 *    Empfohlene Stundensätze für freie Privat-Aufträge
 *    Standard: 130-180€/h (Stand 2024 Tarif-Empfehlung)
 *    + Schreibgebühr je angef. 1000 Anschläge
 *    + Reisekosten 0,42€/km
 *
 * 3. Streitwert (HOAI / Versicherungs-üblich):
 *    Pauschal-Honorar nach Tabelle/Streitwert
 *    Beispiel: bis 5.000€ Streitwert → 800€ Festhonorar
 *    Tabelle aus pilot-versicherer-Empfehlungen
 *
 * UMD-Pattern für Browser + Node-Tests.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HonorarRechner = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ─── 1. JVEG Honorargruppen (Stand 2021 Reform) ───
  const JVEG_GRUPPEN = {
    M1: { satz: 75,  bezeichnung: 'M1 — einfache Sachverhalte' },
    M2: { satz: 100, bezeichnung: 'M2 — Bauwesen Standard (Bausachverständige)' },
    M3: { satz: 125, bezeichnung: 'M3 — komplexe + spezielle Sachgebiete' },
  };

  const JVEG_AUSLAGEN = {
    schreibauslagen_pro_zeile: 0.90, // § 7 Abs. 2 Anlage 1 Nr. 9001
    schreibauslagen_pro_seite: 1.50, // ca. (50 Zeilen × 0.90 / 30 = 1.50€/Seite)
    fahrtkosten_pro_km: 0.42,        // § 5 Abs. 1 JVEG (Stand 2021)
    pauschal_porto: 0.20,
  };

  // ─── 2. BVS Empfehlung (Stand 2024 Tarif) ───
  const BVS_TARIF = {
    standard_h: 150,             // Bauwesen-Bausachverstand
    erschwert_h: 180,            // Bauschäden + Statik
    schreibgebuehr_pro_1000: 12, // pro 1000 Anschläge
    fahrtkosten_pro_km: 0.42,
    nebenkosten_pauschal_eur: 25, // Telefonat/Porto/Kopien (typ. Regelung)
  };

  // ─── 3. Streitwert-Tabelle (Pauschal-Honorar bei Privat-Aufträgen) ───
  const STREITWERT_TABELLE = [
    { bis_eur: 5000,    pauschal_eur: 800  },
    { bis_eur: 10000,   pauschal_eur: 1200 },
    { bis_eur: 25000,   pauschal_eur: 1800 },
    { bis_eur: 50000,   pauschal_eur: 2500 },
    { bis_eur: 100000,  pauschal_eur: 3500 },
    { bis_eur: 250000,  pauschal_eur: 5000 },
    { bis_eur: 500000,  pauschal_eur: 7500 },
    { bis_eur: Infinity, pauschal_eur: 10000 }, // ab 500.001€ → individuell, default 10.000€
  ];

  /**
   * berechneJVEG(opts): { brutto, netto, mwst, breakdown }
   * Pflicht: stunden, gruppe ('M1'/'M2'/'M3')
   * Optional: km (Anfahrt), seiten (Schreibauslagen), porto
   */
  function berechneJVEG(opts) {
    const { stunden = 0, gruppe = 'M2', km = 0, seiten = 0, porto = 0 } = opts || {};
    const G = JVEG_GRUPPEN[gruppe] || JVEG_GRUPPEN.M2;
    const honorar = stunden * G.satz;
    const fahrtkosten = km * JVEG_AUSLAGEN.fahrtkosten_pro_km;
    const schreibauslagen = seiten * JVEG_AUSLAGEN.schreibauslagen_pro_seite;
    const portoBetrag = porto || 0;
    const netto = honorar + fahrtkosten + schreibauslagen + portoBetrag;
    const mwst = netto * 0.19;
    const brutto = netto + mwst;
    return {
      modus: 'JVEG',
      gruppe: gruppe,
      gruppe_bezeichnung: G.bezeichnung,
      stundensatz_eur: G.satz,
      breakdown: {
        honorar_eur: round2(honorar),
        fahrtkosten_eur: round2(fahrtkosten),
        schreibauslagen_eur: round2(schreibauslagen),
        porto_eur: round2(portoBetrag),
      },
      netto_eur: round2(netto),
      mwst_eur: round2(mwst),
      brutto_eur: round2(brutto),
    };
  }

  /**
   * berechneBVS(opts): {brutto, netto, mwst, breakdown}
   * Pflicht: stunden
   * Optional: tarif ('standard'|'erschwert'), km, anschlaege (Schreibgebühr), nebenkosten_extra
   */
  function berechneBVS(opts) {
    const { stunden = 0, tarif = 'standard', km = 0, anschlaege = 0, nebenkosten_extra = 0 } = opts || {};
    const stundensatz = tarif === 'erschwert' ? BVS_TARIF.erschwert_h : BVS_TARIF.standard_h;
    const honorar = stunden * stundensatz;
    const schreibgebuehr = (anschlaege / 1000) * BVS_TARIF.schreibgebuehr_pro_1000;
    const fahrtkosten = km * BVS_TARIF.fahrtkosten_pro_km;
    const nebenkosten = BVS_TARIF.nebenkosten_pauschal_eur + nebenkosten_extra;
    const netto = honorar + schreibgebuehr + fahrtkosten + nebenkosten;
    const mwst = netto * 0.19;
    const brutto = netto + mwst;
    return {
      modus: 'BVS',
      tarif: tarif,
      stundensatz_eur: stundensatz,
      breakdown: {
        honorar_eur: round2(honorar),
        schreibgebuehr_eur: round2(schreibgebuehr),
        fahrtkosten_eur: round2(fahrtkosten),
        nebenkosten_eur: round2(nebenkosten),
      },
      netto_eur: round2(netto),
      mwst_eur: round2(mwst),
      brutto_eur: round2(brutto),
    };
  }

  /**
   * berechneStreitwert(opts): {brutto, netto, mwst, pauschal}
   * Pflicht: streitwert_eur
   */
  function berechneStreitwert(opts) {
    const { streitwert_eur = 0 } = opts || {};
    const stufe = STREITWERT_TABELLE.find(s => streitwert_eur <= s.bis_eur) || STREITWERT_TABELLE[STREITWERT_TABELLE.length - 1];
    const netto = stufe.pauschal_eur;
    const mwst = netto * 0.19;
    const brutto = netto + mwst;
    return {
      modus: 'Streitwert',
      streitwert_eur: streitwert_eur,
      stufe_bis_eur: stufe.bis_eur === Infinity ? null : stufe.bis_eur,
      pauschal_eur: stufe.pauschal_eur,
      netto_eur: round2(netto),
      mwst_eur: round2(mwst),
      brutto_eur: round2(brutto),
    };
  }

  /**
   * vergleicheModi(opts): liefert alle 3 Modi für UI-Vergleichstabelle.
   */
  function vergleicheModi(opts) {
    return {
      jveg: berechneJVEG(opts),
      bvs: berechneBVS(opts),
      streitwert: berechneStreitwert(opts),
    };
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  return {
    JVEG_GRUPPEN,
    JVEG_AUSLAGEN,
    BVS_TARIF,
    STREITWERT_TABELLE,
    berechneJVEG,
    berechneBVS,
    berechneStreitwert,
    vergleicheModi,
  };
});
