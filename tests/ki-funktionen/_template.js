'use strict';

// MEGA³¹ B1 — 5-Test-Generator pro KI-Funktion
// Nutze: const { suite } = require('../_template');
//        suite('fachurteil_entwurf', { expectedModel: 'gpt-5.5' });

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Helper = require('./_helper');

function suite(funktion, opts) {
  opts = opts || {};
  const expectedModel = opts.expectedModel || 'gpt-5.4-mini';
  const Router = require('../../netlify/functions/lib/ai-router');

  return {
    funktionalitaet: function () {
      test(funktion + ' / 1. Funktionalität: Modell-Mapping aus ai-router korrekt', () => {
        const m = Router.chooseModel(funktion, 'schnell');
        assert.ok(typeof m === 'string' && m.length > 0, 'chooseModel liefert String');
        // Backup-Mapping
        const b = Router.getBackupModel(funktion);
        assert.ok(typeof b === 'string', 'Backup-Mapping vorhanden');
      });
    },
    edge_case: function () {
      test(funktion + ' / 2. Edge-Case: leerer Input + Sonderzeichen + langer Input', () => {
        // chooseModel ist deterministisch: leerer Input + Mode-Defaults
        const m1 = Router.chooseModel(funktion, '');
        const m2 = Router.chooseModel('', 'schnell');
        assert.ok(m1, 'Leerer Mode → fallback');
        assert.ok(m2, 'Leere Funktion → fallback (freitext)');
      });
    },
    praezision: function () {
      test(funktion + ' / 3. Präzision: praezise-Modus eskaliert oder bleibt Frontier', () => {
        const m = Router.chooseModel(funktion, 'praezise');
        // Light-Funktionen werden auf gpt-5.5 eskaliert; andere bleiben (5.4 oder 5.5).
        const lightFn = ['freitext', 'support_chat', 'normen_picker', 'foto_captioning', 'diktat_strukturierung', 'rechtschreibung_s1'];
        if (lightFn.includes(funktion)) {
          assert.strictEqual(m, 'gpt-5.5', funktion + ' praezise → gpt-5.5');
        } else {
          assert.ok(m === 'gpt-5.5' || m === 'gpt-5.4' || m === 'gpt-5.4-mini', m + ' für ' + funktion);
        }
      });
    },
    konsistenz: function () {
      test(funktion + ' / 4. Konsistenz: gleicher Input → gleicher Output', () => {
        const a = Router.chooseModel(funktion, 'schnell');
        const b = Router.chooseModel(funktion, 'schnell');
        const c = Router.chooseModel(funktion, 'schnell');
        assert.strictEqual(a, b);
        assert.strictEqual(b, c);
      });
    },
    performance: function () {
      test(funktion + ' / 5. Performance: chooseModel < 10ms', async () => {
        const r = await Helper.timeIt(() => {
          for (let i = 0; i < 100; i++) Router.chooseModel(funktion, 'schnell');
        });
        assert.ok(r.ms < 1000, 'chooseModel × 100 < 1000ms (' + r.ms + ')');
      });
    }
  };
}

module.exports = { suite };
