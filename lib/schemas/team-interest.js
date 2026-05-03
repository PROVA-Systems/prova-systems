/**
 * PROVA — Team-Interesse Body-Schema (Public-Endpoint, kein Auth!)
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * POST /.netlify/functions/team-interest
 *   Body: { name?, email, kanzlei_info?, svs_anzahl? }
 *
 * Public-Endpoint → strenge Limits gegen Spam/Stuffing.
 * email Pflicht, Rest optional aber max-len-begrenzt.
 */
'use strict';

const { z, emailStrict, safeParse } = require('./_common');

const teamInterestSchema = z.object({
  name: z.string().max(200, 'Name zu lang (max 200 Zeichen)').optional(),
  email: emailStrict,
  kanzlei_info: z.string().max(2000, 'Kanzlei-Info zu lang (max 2000 Zeichen)').optional(),
  svs_anzahl: z.string().max(20, 'SVs-Anzahl zu lang').optional()
}).strict();

module.exports = {
  teamInterestSchema,
  parseTeamInterest: (input) => safeParse(teamInterestSchema, input)
};
