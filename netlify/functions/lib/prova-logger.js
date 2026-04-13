/**
 * PROVA Logger — Structured JSON Logging
 * ═══════════════════════════════════════
 * Standard bei Stripe, Linear, Notion und allen professionellen SaaS.
 * JSON-Logs sind in Netlify/Datadog/Papertrail filterbar und durchsuchbar.
 * Anonymisiert automatisch E-Mails und IBANs (DSGVO).
 */
'use strict';

function anonymize(str) {
  if (!str) return str;
  str = String(str);
  // E-Mail: user@domain.de → u***@d***.de
  str = str.replace(/\b([\w.+-])([\w.+-]*)@([\w-])([\w.-]*)(\.[a-z]{2,})\b/gi,
    function(m, a, b, c, d, e) {
      return a + '***@' + c + '***' + e;
    });
  // IBAN: DE89370400440532013000 → DE89***3000
  str = str.replace(/\bDE\d{2}\s?[\d\s]{15,30}\b/g, function(m) {
    return m.slice(0,4) + '***' + m.slice(-4);
  });
  return str;
}

function log(level, data) {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    service: 'prova',
    ...data,
  };
  // Sensitive Felder anonymisieren
  if (entry.userId) entry.userId = anonymize(entry.userId);
  if (entry.email)  entry.email  = anonymize(entry.email);

  console.log(JSON.stringify(entry));
}

module.exports = {
  info:  (data) => log('info',  data),
  warn:  (data) => log('warn',  data),
  error: (data) => log('error', data),
  debug: (data) => log('debug', data),
};
