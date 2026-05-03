/**
 * PROVA — SMTP-Senden Body-Schema
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * POST /.netlify/functions/smtp-senden
 *   Body: { to, subject, text?, html?, az? }
 *
 * Sicherheits-Refinements:
 *  - to: Email-Format + KEIN CRLF + KEIN Komma/Semikolon (Multi-Recipient-Smuggling)
 *  - subject: max 200 Zeichen + KEIN CRLF (Header-Injection)
 *  - text/html: mindestens eines erforderlich, kombiniert max 100k Zeichen
 *  - az: Aktenzeichen-Format (alphanumerisch + Trennzeichen)
 */
'use strict';

const { z, emailStrict, noCrlfString, aktenzeichen, safeParse } = require('./_common');

const MAX_BODY_LEN = 100000;

const smtpSendenSchema = z.object({
  to: emailStrict,
  subject: noCrlfString(200),
  text: z.string().max(MAX_BODY_LEN, 'Text-Body zu gross').optional(),
  html: z.string().max(MAX_BODY_LEN, 'HTML-Body zu gross').optional(),
  az: aktenzeichen.optional()
})
  .refine(
    (v) => !!v.text || !!v.html,
    { message: 'text oder html erforderlich', path: ['text'] }
  )
  .refine(
    (v) => ((v.text || '').length + (v.html || '').length) <= MAX_BODY_LEN,
    { message: 'text + html zusammen max ' + MAX_BODY_LEN + ' Zeichen', path: ['text'] }
  );

module.exports = {
  MAX_BODY_LEN,
  smtpSendenSchema,
  parseSmtpSenden: (input) => safeParse(smtpSendenSchema, input)
};
