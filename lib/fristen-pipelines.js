/**
 * PROVA — Fristen-Pipelines (MEGA³⁰ W10b-I6)
 *
 * 5 Pipeline-Templates: bei Schadensfall-Anlage werden alle Fristen
 * mit relativen Tagen-Offsets gegen Stichtag automatisch erstellt.
 *
 * Quellen: § 411 Abs. 1 ZPO (Gericht-Frist), § 195/199/638 BGB (Verjährung),
 *          VOB/B § 13 Abs. 5 (Bau-Mängel), § 1029 ZPO (Schiedsgutachten).
 *
 * UMD-Pattern: Browser (window.FristenPipelines) + Node (module.exports).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FristenPipelines = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Pipelines: Liste von Frist-Vorlagen mit Offset in Tagen vom Stichtag.
  // Stichtag = Auftragseingang oder Beweisbeschluss-Eingang oder Ortstermin.
  const PIPELINES = {
    schadensgutachten: {
      label: 'Schadensgutachten',
      stichtag_quelle: 'auftragseingang',
      fristen: [
        { typ: 'akteneinsicht', offset_tage: 14, rechtsgrundlage: '§ 299 ZPO', notiz: 'Akteneinsicht beim Gericht beantragen' },
        { typ: 'ortstermin', offset_tage: 21, rechtsgrundlage: 'sachgemäße Zeitfolge', notiz: 'Ortstermin durchführen' },
        { typ: 'zeugen', offset_tage: 28, rechtsgrundlage: '§ 357 ZPO', notiz: 'Zeugen-Anhörung dokumentieren' },
        { typ: 'gutachten-erstattung', offset_tage: 56, rechtsgrundlage: '§ 411 Abs. 1 ZPO', notiz: 'Gutachten-Erstattung beim Gericht' },
        { typ: 'honorar', offset_tage: 70, rechtsgrundlage: 'JVEG § 8 Abs. 1', notiz: 'Honorar-Antrag stellen' }
      ]
    },
    wertgutachten: {
      label: 'Wertgutachten / Verkehrswert',
      stichtag_quelle: 'auftragseingang',
      fristen: [
        { typ: 'akteneinsicht', offset_tage: 7, rechtsgrundlage: 'ImmoWertV § 9', notiz: 'Bauakte anfordern' },
        { typ: 'ortstermin', offset_tage: 14, rechtsgrundlage: 'sachgemäße Zeitfolge', notiz: 'Objekt-Begehung' },
        { typ: 'gutachten-erstattung', offset_tage: 42, rechtsgrundlage: 'IHK-SVO § 8', notiz: 'Wertgutachten-Erstattung' },
        { typ: 'honorar', offset_tage: 56, rechtsgrundlage: 'HOAI / freie Vereinbarung', notiz: 'Honorar-Rechnung' }
      ]
    },
    bauabnahme: {
      label: 'Bauabnahme (VOB/B)',
      stichtag_quelle: 'ortstermin',
      fristen: [
        { typ: 'gutachten-erstattung', offset_tage: 14, rechtsgrundlage: 'VOB/B § 12 Abs. 1', notiz: 'Abnahme-Protokoll erstellen' },
        { typ: 'widerspruch', offset_tage: 30, rechtsgrundlage: 'VOB/B § 4 Abs. 7', notiz: 'Nachbesserungsfrist Bau-Mängel' },
        { typ: 'gutachten-erstattung', offset_tage: 365 * 5, rechtsgrundlage: 'BGB § 638 Abs. 1', notiz: 'Mängelansprüche-Verjährung 5J Bauwerk' }
      ]
    },
    schiedsgutachten: {
      label: 'Schiedsgutachten (§ 1029 ZPO)',
      stichtag_quelle: 'auftragseingang',
      fristen: [
        { typ: 'parteien', offset_tage: 14, rechtsgrundlage: '§ 1042 ZPO', notiz: 'Anhörung beider Parteien' },
        { typ: 'ortstermin', offset_tage: 28, rechtsgrundlage: '§ 1042 ZPO', notiz: 'Ortstermin mit Parteien' },
        { typ: 'gutachten-erstattung', offset_tage: 70, rechtsgrundlage: '§ 1029 ZPO + § 317 BGB', notiz: 'Schiedsgutachten + Bindungswirkung-Hinweis' },
        { typ: 'honorar', offset_tage: 84, rechtsgrundlage: 'freie Vereinbarung', notiz: 'Honorar (kein JVEG)' }
      ]
    },
    beweissicherung: {
      label: 'Beweissicherung (§ 485 ZPO)',
      stichtag_quelle: 'beweisbeschluss',
      fristen: [
        { typ: 'akteneinsicht', offset_tage: 7, rechtsgrundlage: '§ 299 ZPO', notiz: 'Beweisbeschluss + Akte' },
        { typ: 'ortstermin', offset_tage: 14, rechtsgrundlage: '§ 491 ZPO', notiz: 'Beweissicherungs-Ortstermin' },
        { typ: 'gutachten-erstattung', offset_tage: 42, rechtsgrundlage: '§ 411 Abs. 1 ZPO', notiz: 'Sicherungs-Gutachten' },
        { typ: 'honorar', offset_tage: 56, rechtsgrundlage: 'JVEG § 8', notiz: 'Honorar-Antrag' }
      ]
    }
  };

  function listPipelines() {
    return Object.keys(PIPELINES).map(function (k) {
      return { key: k, label: PIPELINES[k].label, stichtag_quelle: PIPELINES[k].stichtag_quelle, count: PIPELINES[k].fristen.length };
    });
  }

  function getPipeline(key) { return PIPELINES[key] || null; }

  function applyPipeline(key, opts) {
    const pl = PIPELINES[key];
    if (!pl) return null;
    const stichtag = opts && opts.stichtag ? new Date(opts.stichtag) : new Date();
    if (isNaN(stichtag.getTime())) return null;
    return pl.fristen.map(function (f) {
      const d = new Date(stichtag.getTime());
      d.setDate(d.getDate() + f.offset_tage);
      return {
        frist_typ: f.typ,
        pipeline: key,
        datum_soll: d.toISOString().slice(0, 10),
        notiz: f.notiz,
        rechtsgrundlage: f.rechtsgrundlage,
        erinnerung_tage_vor: opts && opts.reminder_pattern ? opts.reminder_pattern : [14, 7, 3, 1],
        status: 'offen'
      };
    });
  }

  return {
    PIPELINES: PIPELINES,
    listPipelines: listPipelines,
    getPipeline: getPipeline,
    applyPipeline: applyPipeline
  };
}));
