/**
 * PROVA — Schema-Common-Helpers
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * Shared zod-Refinements + Helpers fuer alle Schemas.
 * Backend-only (require('zod')).
 */
'use strict';

const { z } = require('zod');

/**
 * Email-Format strikt: RFC-5322-Subset, KEINE CRLF/Komma/Semikolon
 * (Header-Injection-Schutz).
 * Strikter als z.email() weil wir Multi-Recipient-Smuggling verhindern.
 */
const emailStrict = z.string()
  .min(3, 'Email zu kurz')
  .max(254, 'Email zu lang (max 254 Zeichen)')
  .refine(
    (v) => !v.includes('\r') && !v.includes('\n'),
    { message: 'CRLF in Email verboten (Header-Injection-Schutz)' }
  )
  .refine(
    (v) => !v.includes(',') && !v.includes(';'),
    { message: 'Multi-Recipient (Komma/Semikolon) verboten' }
  )
  .refine(
    (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    { message: 'Email-Format ungueltig' }
  );

/**
 * Beliebiger String OHNE CRLF (Header-Injection-Schutz fuer SMTP-Header).
 */
const noCrlfString = (maxLen = 1000) => z.string()
  .max(maxLen, 'Text zu lang (max ' + maxLen + ' Zeichen)')
  .refine(
    (v) => !v.includes('\r') && !v.includes('\n'),
    { message: 'CRLF im Text verboten' }
  );

/**
 * Aktenzeichen — alphanumerisch + Trennzeichen, max 100 Zeichen.
 */
const aktenzeichen = z.string()
  .min(1, 'Aktenzeichen erforderlich')
  .max(100, 'Aktenzeichen zu lang')
  .regex(/^[A-Za-z0-9\-\/\._ ]+$/, 'Aktenzeichen enthaelt ungueltige Zeichen');

/**
 * URL — http(s)-only, max 2048 Zeichen.
 */
const httpUrl = z.string()
  .max(2048, 'URL zu lang')
  .refine(
    (v) => /^https?:\/\//.test(v),
    { message: 'URL muss http(s) sein' }
  );

/**
 * Wraps a Schema-parse-Resultat zu { ok, data, error: { message, fields } }.
 * Erleichtert einheitliches 400-Response-Format in Functions.
 */
function safeParse(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  // zod v4: result.error.issues
  const issues = (result.error && result.error.issues) || [];
  const fields = {};
  const messages = [];
  for (const iss of issues) {
    const path = (iss.path || []).join('.') || '(root)';
    fields[path] = iss.message;
    messages.push(path + ': ' + iss.message);
  }
  return {
    ok: false,
    error: {
      message: messages.join(' | ') || 'Validation failed',
      fields: fields
    }
  };
}

module.exports = {
  z,
  emailStrict,
  noCrlfString,
  aktenzeichen,
  httpUrl,
  safeParse
};
