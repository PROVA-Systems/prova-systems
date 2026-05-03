/**
 * PROVA — Stripe-Checkout Body-Schema
 * MEGA-SKALIERUNG M2 (zod-Integration, 03.05.2026)
 *
 * Validiert Body fuer POST /.netlify/functions/stripe-checkout.
 * Pflicht-/Optional-Felder + Plan-Whitelist + URL-Validation.
 */
'use strict';

const { z, httpUrl, safeParse } = require('./_common');

const PLAN_VALUES = ['solo', 'team', 'addon-5', 'addon-10', 'addon-20'];

const stripeCheckoutSchema = z.object({
  plan: z.enum(PLAN_VALUES, {
    message: 'plan muss einer von: ' + PLAN_VALUES.join(', ')
  }).optional().default('solo'),

  coupon: z.literal('founding').optional(),

  pilot_program: z.boolean().optional(),

  successUrl: httpUrl.optional(),
  cancelUrl:  httpUrl.optional()
}).strict() // verhindert unbekannte Felder (z.B. price_id Injektion)
  .refine(
    (v) => !(v.pilot_program === true && v.plan && v.plan !== 'solo'),
    { message: 'Founding-Pilot ist nur fuer Solo-Plan verfuegbar', path: ['pilot_program'] }
  );

module.exports = {
  PLAN_VALUES,
  stripeCheckoutSchema,
  parseStripeCheckout: (input) => safeParse(stripeCheckoutSchema, input)
};
