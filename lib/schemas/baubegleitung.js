/**
 * PROVA — Schema fuer Flow D Baubegleitung
 * MEGA⁴ Q5 (04.05.2026)
 *
 * Validiert Baubegleitungs-Projekte (nur Team-Plan).
 * Workflow: Projekt -> periodische Begehungen -> Maengelmgmt -> Abnahme
 */
'use strict';

const { z } = require('zod');

const projektstatus = z.enum([
  'angelegt',
  'aktiv',
  'abnahme_geplant',
  'abgenommen',
  'abgeschlossen',
  'storniert'
]);

const begehungstyp = z.enum([
  'roh-begehung',
  'wochen-begehung',
  'gewerk-abnahme',
  'mangel-begehung',
  'final-abnahme'
]);

const mangelschwere = z.enum([
  'optisch',
  'technisch',
  'wesentlich',
  'kritisch'
]);

const baubegleitungProjektSchema = z.object({
  workspace_id: z.string().uuid(),
  // Bauherr
  bauherr_name: z.string().min(2).max(200),
  bauherr_anschrift: z.string().min(5).max(500),
  bauherr_email: z.string().email().optional(),
  // Bau-Spec
  baustellen_adresse: z.string().min(5).max(500),
  baustellen_typ: z.enum(['neubau', 'umbau', 'sanierung', 'anbau']),
  bauunternehmen_name: z.string().max(200).optional(),
  bauleitung_name: z.string().max(200).optional(),
  bauleitung_email: z.string().email().optional(),
  // Termine
  baubeginn_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  geplante_fertigstellung: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // Honorar
  honorar_typ: z.enum(['stundensatz', 'pauschal', 'prozent_bausumme']),
  stundensatz_eur: z.number().min(50).max(500).optional(),
  pauschal_eur: z.number().min(0).max(99999).optional(),
  prozent_satz: z.number().min(0.1).max(10).optional(),
  bausumme_eur: z.number().min(0).max(9999999).optional(),
  // Status
  status: projektstatus.default('angelegt'),
  notizen: z.string().max(10000).optional()
});

const baubegleitungBegehungSchema = z.object({
  projekt_id: z.string().uuid(),
  // Termin
  typ: begehungstyp,
  termin_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  termin_uhrzeit: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dauer_min: z.number().int().min(15).max(480),
  // Anwesende
  anwesende: z.array(z.string().min(2).max(200)).max(20),
  // Bautagebuch
  bautagebuch: z.string().max(10000).optional(),
  wetter: z.string().max(200).optional(),
  // Befunde
  befunde: z.array(z.object({
    nr: z.string().max(20).optional(),
    titel: z.string().min(2).max(300),
    text: z.string().min(2).max(5000),
    foto_refs: z.array(z.string()).optional()
  })).optional(),
  // Maengel
  maengel: z.array(z.object({
    nr: z.string().max(20).optional(),
    titel: z.string().min(2).max(300),
    beschreibung: z.string().min(2).max(2000),
    schwere: mangelschwere,
    gewerk: z.string().max(100).optional(),
    foto_refs: z.array(z.string()).optional(),
    frist_behebung: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    behoben: z.boolean().default(false)
  })).optional(),
  // Naechste Schritte
  naechste_schritte: z.array(z.string().max(500)).optional(),
  ki_eingesetzt: z.boolean().default(false)
});

const baubegleitungAbnahmeSchema = z.object({
  projekt_id: z.string().uuid(),
  // Abnahme-Doku
  abnahme_datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  abnahme_typ: z.enum(['gesamt', 'teil', 'nachabnahme']),
  abnahme_status: z.enum([
    'voll_angenommen',
    'angenommen_unter_vorbehalt',
    'verweigert'
  ]),
  // Restmaengel zur Abnahme
  restmaengel: z.array(z.object({
    nr: z.string().max(20).optional(),
    titel: z.string().min(2).max(300),
    beschreibung: z.string().min(2).max(2000),
    schwere: mangelschwere,
    frist_behebung: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sicherheitseinbehalt_eur: z.number().min(0).max(99999).optional()
  })).optional(),
  // Sicherheitseinbehalt
  sicherheitseinbehalt_summe_eur: z.number().min(0).max(99999).optional(),
  // Anwesende
  abnahme_anwesende: z.array(z.string().min(2).max(200)),
  // Erklaerungen
  bauherr_erklaert: z.string().max(2000).optional(),
  unternehmen_erklaert: z.string().max(2000).optional(),
  sv_bewertung: z.string().min(10).max(5000)
});

module.exports = {
  projektstatus,
  begehungstyp,
  mangelschwere,
  baubegleitungProjektSchema,
  baubegleitungBegehungSchema,
  baubegleitungAbnahmeSchema
};
