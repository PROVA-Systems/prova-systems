/**
 * PROVA — Akte-Export Body-Schema
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * POST /.netlify/functions/akte-export
 *   Body: { az, sv_email, sv_name?, fall?, gutachten?: [], briefe?: [] }
 *
 * Strenge Pflicht-Felder: az + sv_email.
 * fall, gutachten, briefe sind grosse Daten-Strukturen — wir validieren
 * nur Top-Level-Typ + Array-Length-Limits (RTF-Body soll nicht endlos sein).
 */
'use strict';

const { z, emailStrict, aktenzeichen, safeParse } = require('./_common');

const akteExportSchema = z.object({
  az: aktenzeichen,
  sv_email: emailStrict,
  sv_name: z.string().max(200).optional(),
  fall: z.record(z.string(), z.unknown()).optional(),
  gutachten: z.array(z.record(z.string(), z.unknown())).max(200, 'Max 200 Gutachten').optional(),
  briefe: z.array(z.record(z.string(), z.unknown())).max(500, 'Max 500 Briefe').optional()
}); // bewusst NICHT strict — Frontend sendet manchmal Extra-Felder im fall-Objekt

module.exports = {
  akteExportSchema,
  parseAkteExport: (input) => safeParse(akteExportSchema, input)
};
