/**
 * PROVA — DSGVO-Loeschen Body-Schema
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * POST /.netlify/functions/dsgvo-loeschen
 *   Body: { confirm: true, reason?: string }
 *   confirm MUSS exakt true sein (Tippfehler-Schutz).
 */
'use strict';

const { z, safeParse } = require('./_common');

const dsgvoLoeschenSchema = z.object({
  confirm: z.literal(true, {
    message: 'confirm muss exakt true sein (Bestaetigung der unwiderruflichen Loeschung)'
  }),
  reason: z.string()
    .max(500, 'Begruendung zu lang (max 500 Zeichen)')
    .optional()
}).strict();

module.exports = {
  dsgvoLoeschenSchema,
  parseDsgvoLoeschen: (input) => safeParse(dsgvoLoeschenSchema, input)
};
