/**
 * PROVA — admin-pseudonymisierung-audit.js (MEGA⁴¹ P9)
 *
 * GET /admin-pseudonymisierung-audit
 * → 200 {
 *     test_results: [{
 *       test_name, input_pii, expected_replacement, actual_output, passed
 *     }],
 *     pass_count, fail_count,
 *     total_pii_leaks
 *   }
 *
 * Pseudonymisierungs-Audit gegen synthetische PII (Namen/Adressen/Emails/IBAN).
 * Nutzt prova-pseudo.js (existing) und prüft dass keine PII durchläuft.
 *
 * Auth: requireAdmin + 2FA.
 */
'use strict';

const { withSentry } = require('./lib/sentry-wrap');
const { requireAdmin, jsonResponse } = require('./lib/admin-auth-guard');

let _provaPseudo = null;
function getProvaPseudo() {
  if (_provaPseudo) return _provaPseudo;
  try {
    _provaPseudo = require('./lib/prova-pseudo');
    return _provaPseudo;
  } catch (e) {
    return null;
  }
}

const SYNTHETIC_PII_TESTS = [
  {
    test_name: 'Vollständiger Name',
    input: 'Sehr geehrter Herr Max Mustermann, bezüglich Ihres Auftrags...',
    must_not_contain: ['Max Mustermann', 'Mustermann', 'Max ']
  },
  {
    test_name: 'E-Mail-Adresse',
    input: 'Bitte antworten Sie an max.mustermann@beispiel.de',
    must_not_contain: ['max.mustermann@beispiel.de']
  },
  {
    test_name: 'IBAN',
    input: 'Überweisung auf DE89370400440532013000',
    must_not_contain: ['DE89370400440532013000']
  },
  {
    test_name: 'Telefonnummer',
    input: 'Telefon: 089-123456789 oder mobil 0171-9876543',
    must_not_contain: ['089-123456789', '0171-9876543']
  },
  {
    test_name: 'Strasse + Hausnummer',
    input: 'Anschrift: Musterstraße 42, 80333 München',
    must_not_contain: ['Musterstraße 42', 'Musterstraße']
  },
  {
    test_name: 'Aktenzeichen (sollte erhalten bleiben — kein PII)',
    input: 'Az 12 O 345/24',
    must_contain: ['12 O 345/24']
  },
  {
    test_name: 'DIN-Norm (sollte erhalten bleiben — kein PII)',
    input: 'gemäß DIN 4108-2',
    must_contain: ['DIN 4108-2']
  }
];

function runPseudoTest(test, pseudoFn) {
  if (!pseudoFn) {
    return { ...test, actual_output: '(no pseudo-fn)', passed: false, error: 'prova-pseudo nicht verfügbar' };
  }
  let actualOutput;
  try {
    actualOutput = pseudoFn(test.input) || '';
  } catch (e) {
    return { ...test, actual_output: null, passed: false, error: e.message };
  }

  let passed = true;
  let failures = [];

  if (test.must_not_contain) {
    test.must_not_contain.forEach(pii => {
      if (actualOutput.indexOf(pii) >= 0) {
        passed = false;
        failures.push('PII durchgelassen: ' + pii);
      }
    });
  }
  if (test.must_contain) {
    test.must_contain.forEach(legit => {
      if (actualOutput.indexOf(legit) < 0) {
        passed = false;
        failures.push('Legit-Inhalt entfernt: ' + legit);
      }
    });
  }

  return {
    test_name: test.test_name,
    input: test.input,
    actual_output: actualOutput,
    passed: passed,
    failures: failures
  };
}

exports.handler = withSentry(requireAdmin(async function (event) {
  if (event.httpMethod !== 'GET') return jsonResponse(event, 405, { error: 'Method Not Allowed' });

  const pseudo = getProvaPseudo();
  // Probe verschiedene Funktionsnamen
  let pseudoFn = null;
  if (pseudo) {
    pseudoFn = pseudo.pseudonymize || pseudo.pseudonymisieren || pseudo.pseudo || pseudo.default || pseudo;
    if (typeof pseudoFn !== 'function' && pseudo.pseudonymize) pseudoFn = pseudo.pseudonymize;
  }

  const results = SYNTHETIC_PII_TESTS.map(t => runPseudoTest(t, pseudoFn));
  const pass_count = results.filter(r => r.passed).length;
  const fail_count = results.filter(r => !r.passed).length;
  const total_pii_leaks = results.reduce((s, r) => s + (r.failures || []).filter(f => /durchgelassen/.test(f)).length, 0);

  return jsonResponse(event, 200, {
    fetched_at: new Date().toISOString(),
    pseudo_lib_loaded: !!pseudoFn,
    test_results: results,
    pass_count,
    fail_count,
    total_pii_leaks,
    compliance: {
      passed: total_pii_leaks === 0 && fail_count === 0,
      dsgvo_compliant: total_pii_leaks === 0
    }
  });
}, { functionName: 'admin-pseudonymisierung-audit', rateLimit: { max: 10, windowSec: 60 }, require2FA: true }), { functionName: 'admin-pseudonymisierung-audit' });

module.exports.__internals = {
  SYNTHETIC_PII_TESTS,
  runPseudoTest
};
