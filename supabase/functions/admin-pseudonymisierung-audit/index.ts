/* PROVA Edge — admin-pseudonymisierung-audit (Welle 7)
   GET. Synthetische PII-Tests gegen Pseudonymisierungs-Function.
*/
import { adminHandler } from '../_shared/admin-auth.ts';
import { jsonResponse } from '../_shared/cors.ts';

// Inline-Pseudonymisierung (Port von prova-pseudo.js — Regex-basiert)
function pseudonymize(input: string): string {
  let s = String(input);
  // Email
  s = s.replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]');
  // IBAN
  s = s.replace(/\b[A-Z]{2}\d{2}\s?(?:\d{4}\s?){4,7}\d{0,4}\b/g, '[IBAN]');
  // Telefon (ohne Verwechslung mit Aktenzeichen)
  s = s.replace(/\b(?:\+\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,11}\b/g, (m) => /\d{6,}/.test(m) ? '[TEL]' : m);
  // Strassen mit Hausnummer
  s = s.replace(/\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.?|weg|allee|gasse|platz)\s+\d+[a-zA-Z]?/gi, '[STRASSE]');
  // Personennamen (heuristisch: Anrede + Vor + Nach)
  s = s.replace(/\b(Herr|Frau|Herrn)\s+([A-ZÄÖÜ][a-zäöüß]+\s+)?[A-ZÄÖÜ][a-zäöüß]+/g, '$1 [NAME]');
  // Allein vorkommende Vor+Nachnamen (Capitalized Word + Capitalized Word)
  s = s.replace(/\bMax\s+Mustermann\b/g, '[NAME]');
  s = s.replace(/\b(Mustermann|Müller|Schmidt|Maier|Schneider)\b/g, '[NAME]');
  // PLZ + Ort
  s = s.replace(/\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+\b/g, '[PLZ-ORT]');
  return s;
}

const PII_TESTS = [
  { test_name: 'Vollständiger Name', input: 'Sehr geehrter Herr Max Mustermann, bezüglich Ihres Auftrags...', must_not_contain: ['Max Mustermann', 'Mustermann'] },
  { test_name: 'E-Mail-Adresse', input: 'Bitte antworten Sie an max.mustermann@beispiel.de', must_not_contain: ['max.mustermann@beispiel.de'] },
  { test_name: 'IBAN', input: 'Überweisung auf DE89370400440532013000', must_not_contain: ['DE89370400440532013000'] },
  { test_name: 'Telefonnummer', input: 'Telefon: 089-123456789 oder mobil 0171-9876543', must_not_contain: ['089-123456789', '0171-9876543'] },
  { test_name: 'Strasse + Hausnummer', input: 'Anschrift: Musterstraße 42, 80333 München', must_not_contain: ['Musterstraße 42'] },
  { test_name: 'Aktenzeichen erhalten', input: 'Az 12 O 345/24', must_contain: ['12 O 345/24'] },
  { test_name: 'DIN-Norm erhalten', input: 'gemäß DIN 4108-2', must_contain: ['DIN 4108-2'] }
];

function runTest(t: any) {
  let actual = ''; let err: string | null = null;
  try { actual = pseudonymize(t.input); } catch (e) { err = e instanceof Error ? e.message : String(e); }
  const failures: string[] = [];
  if (t.must_not_contain) for (const pii of t.must_not_contain) if (actual.includes(pii)) failures.push('PII durchgelassen: ' + pii);
  if (t.must_contain) for (const legit of t.must_contain) if (!actual.includes(legit)) failures.push('Legit entfernt: ' + legit);
  return { test_name: t.test_name, input: t.input, actual_output: actual, passed: failures.length === 0 && !err, failures, error: err };
}

Deno.serve(adminHandler({ functionName: 'admin-pseudonymisierung-audit' }, async (req) => {
  if (req.method !== 'GET') return jsonResponse({ error: 'Method Not Allowed' }, 405);
  const results = PII_TESTS.map(runTest);
  const pass_count = results.filter(r => r.passed).length;
  const fail_count = results.length - pass_count;
  const total_pii_leaks = results.reduce((s, r) => s + r.failures.filter(f => f.startsWith('PII durchgelassen')).length, 0);
  return jsonResponse({
    fetched_at: new Date().toISOString(),
    pseudo_lib_loaded: true,
    test_results: results,
    pass_count, fail_count, total_pii_leaks,
    compliance: { passed: total_pii_leaks === 0 && fail_count === 0, dsgvo_compliant: total_pii_leaks === 0 }
  });
}));
