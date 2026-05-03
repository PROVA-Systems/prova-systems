/**
 * PROVA — Schema fuer Flow C Beratung
 * MEGA⁴ Q4 (04.05.2026)
 *
 * Validiert Beratungs-Faelle (Solo + Team Plan).
 * Workflow: Auftragsannahme -> Beratungstermin -> Abschluss + Protokoll
 */
'use strict';

const { z } = require('zod');
const { emailStrict } = require('./_common');

const beratungstyp = z.enum([
  'telefon',
  'vor-ort',
  'online',
  'schriftlich'
]);

const beratungsthemenkategorie = z.enum([
  'bauschaden',
  'kaufberatung',
  'sanierung',
  'mangelbewertung',
  'wertermittlung',
  'streitfall',
  'sonstiges'
]);

const beratungsstatus = z.enum([
  'angefragt',
  'angenommen',
  'in_bearbeitung',
  'protokoll_erstellt',
  'abgeschlossen',
  'storniert'
]);

const beratungAuftragSchema = z.object({
  workspace_id: z.string().uuid(),
  // Auftraggeber
  auftraggeber_name: z.string().min(2).max(200),
  auftraggeber_email: emailStrict.optional(),
  auftraggeber_telefon: z.string().min(5).max(50).optional(),
  // Beratungs-Spec
  typ: beratungstyp,
  thema: beratungsthemenkategorie,
  thema_freitext: z.string().min(10).max(2000),
  beratungs_objekt_adresse: z.string().max(300).optional(),
  // Termin
  termin_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
  termin_uhrzeit: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM').optional(),
  termin_dauer_min: z.number().int().min(15).max(480).optional(),
  // Honorar
  stundensatz_eur: z.number().min(50).max(500).optional(),
  pauschal_eur: z.number().min(0).max(99999).optional(),
  // Status
  status: beratungsstatus.default('angefragt'),
  notizen: z.string().max(10000).optional()
});

const beratungProtokollSchema = z.object({
  beratung_id: z.string().uuid(),
  // Protokoll-Inhalt
  termin_realdauer_min: z.number().int().min(1).max(480),
  besprochene_punkte: z.array(z.object({
    nr: z.number().int().optional(),
    titel: z.string().min(2).max(200),
    text: z.string().min(5).max(2000)
  })).min(1, 'Mindestens 1 besprochener Punkt erforderlich'),
  empfehlungen: z.array(z.object({
    titel: z.string().min(2).max(200),
    text: z.string().min(5).max(2000),
    prioritaet: z.enum(['hoch', 'mittel', 'niedrig']).optional()
  })).optional(),
  // Folge-Aktionen
  folge_aktionen: z.array(z.object({
    text: z.string().min(2).max(500),
    verantwortlich: z.string().max(100).optional(),
    bis_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })).optional(),
  // Eigenleistung
  ki_eingesetzt: z.boolean().default(false),
  ki_aufgaben: z.array(z.string().max(200)).optional()
});

const beratungAbschlussSchema = z.object({
  beratung_id: z.string().uuid(),
  rechnung_betrag_brutto: z.number().min(0),
  rechnung_id: z.string().uuid().optional(),
  pdf_url: z.string().url().optional(),
  abschluss_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bewertung_sv: z.number().int().min(1).max(5).optional(),
  notizen_intern: z.string().max(2000).optional()
});

module.exports = {
  beratungstyp,
  beratungsthemenkategorie,
  beratungsstatus,
  beratungAuftragSchema,
  beratungProtokollSchema,
  beratungAbschlussSchema
};
