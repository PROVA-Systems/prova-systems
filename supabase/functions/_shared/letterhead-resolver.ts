/* ============================================================
   PROVA Edge Functions — Letterhead-Resolver (Shared)
   Sprint K-FIX

   DRY-Helper für pdf-generate + brief-generate.
   Lädt users.letterhead_config + erzeugt Signed URLs für
   Storage-Pfade (stempel/unterschrift/logo).

   Result-Object wird mit den User-Variables gemerged und
   an PDFMonkey-Payload weitergegeben.
   ============================================================ */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.105.0';

const LETTERHEADS_BUCKET = 'letterheads';
const SIGNED_URL_TTL_SECONDS = 3600;  // 1h — reicht für PDFMonkey-Render-Zyklus

export interface LetterheadVariables {
    sv_name?: string;
    sv_titel?: string;
    sv_qualifikation?: string;
    sv_sachgebiet?: string;
    sv_bestellungsstelle?: string;
    sv_strasse?: string;
    sv_plz?: string;
    sv_ort?: string;
    sv_telefon?: string;
    sv_mobil?: string;
    sv_email?: string;
    sv_briefkopf_1?: string;
    sv_briefkopf_2?: string;
    sv_briefkopf_3?: string;
    sv_iban?: string;
    sv_bic?: string;
    sv_bank?: string;
    sv_bank_inhaber?: string;
    sv_ust_id?: string;
    sv_steuernummer?: string;
    sv_logo_url?: string | null;
    sv_stempel_url?: string | null;
    sv_unterschrift_url?: string | null;
}

interface UserRow {
    id: string;
    email?: string | null;
    name?: string | null;
    titel?: string | null;
    qualifikation?: string | null;
    sachgebiet?: string | null;
    bestellungsstelle?: string | null;
    anschrift?: string | null;
    plz?: string | null;
    ort?: string | null;
    telefon?: string | null;
    mobil?: string | null;
    letterhead_config?: Record<string, unknown> | null;
}

/**
 * Helper: erzeugt Signed URL für Storage-Pfad oder null.
 * Akzeptiert auch bereits öffentliche URLs (http/https) und gibt sie unverändert zurück.
 */
async function signOrPassThrough(client: SupabaseClient, urlOrPath: string | null | undefined): Promise<string | null> {
    if (!urlOrPath) return null;
    if (typeof urlOrPath !== 'string') return null;
    // Schon eine Public/Signed URL? Pass-Through.
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
        return urlOrPath;
    }
    // Storage-Pfad → Signed URL
    const { data, error } = await client.storage
        .from(LETTERHEADS_BUCKET)
        .createSignedUrl(urlOrPath, SIGNED_URL_TTL_SECONDS);
    if (error) {
        console.warn('[letterhead-resolver] createSignedUrl failed for', urlOrPath, error.message);
        return null;
    }
    return data?.signedUrl ?? null;
}

/**
 * Lädt User-Profile + letterhead_config und erzeugt Variables-Block.
 *
 * @param client    Supabase-Client (mit Service-Role oder User-JWT — User-JWT
 *                  reicht solange RLS auf users self-select erlaubt; sonst
 *                  Service-Client nötig).
 * @param userId    auth.uid() des einloggten Users
 * @returns         Variables zum Mergen mit dem PDFMonkey-Payload
 */
export async function resolveLetterhead(
    client: SupabaseClient,
    userId: string
): Promise<LetterheadVariables> {
    if (!userId) return {};

    const { data, error } = await client
        .from('users')
        .select('id, email, name, titel, qualifikation, sachgebiet, bestellungsstelle, anschrift, plz, ort, telefon, mobil, letterhead_config')
        .eq('id', userId)
        .maybeSingle<UserRow>();

    if (error) {
        console.warn('[letterhead-resolver] users select failed:', error.message);
        return {};
    }
    if (!data) return {};

    const lh = (data.letterhead_config ?? {}) as Record<string, unknown>;

    const stempelUrl     = await signOrPassThrough(client, (lh.stempel_url as string) ?? null);
    const unterschriftUrl = await signOrPassThrough(client, (lh.unterschrift_url as string) ?? null);
    const logoUrl        = await signOrPassThrough(client, (lh.logo_url as string) ?? null);

    return {
        sv_name:              data.name ?? undefined,
        sv_titel:             data.titel ?? undefined,
        sv_qualifikation:     data.qualifikation ?? undefined,
        sv_sachgebiet:        data.sachgebiet ?? undefined,
        sv_bestellungsstelle: data.bestellungsstelle ?? undefined,
        sv_strasse:           data.anschrift ?? undefined,
        sv_plz:               data.plz ?? undefined,
        sv_ort:               data.ort ?? undefined,
        sv_telefon:           data.telefon ?? undefined,
        sv_mobil:             data.mobil ?? undefined,
        sv_email:             data.email ?? undefined,

        // Briefkopf-Zeilen
        sv_briefkopf_1: (lh.briefkopf_zeile_1 as string) ?? '',
        sv_briefkopf_2: (lh.briefkopf_zeile_2 as string) ?? '',
        sv_briefkopf_3: (lh.briefkopf_zeile_3 as string) ?? '',

        // Bank
        sv_iban:         (lh.bank_iban as string) ?? '',
        sv_bic:          (lh.bank_bic as string) ?? '',
        sv_bank:         (lh.bank_name as string) ?? '',
        sv_bank_inhaber: (lh.bank_inhaber as string) ?? '',

        // Steuer
        sv_ust_id:       (lh.ust_id as string) ?? '',
        sv_steuernummer: (lh.steuernummer as string) ?? '',

        // Bild-URLs (Signed, 1h)
        sv_logo_url:         logoUrl,
        sv_stempel_url:      stempelUrl,
        sv_unterschrift_url: unterschriftUrl
    };
}

/**
 * Merge-Helper: bestehende Variables (Frontend-Payload) + Letterhead.
 * Frontend-Variables haben Vorrang (lokale Override pro Brief möglich),
 * außer bei Bild-URLs — die werden immer aus Letterhead überschrieben
 * weil das Frontend keine Storage-Pfade kennt.
 */
export function mergeLetterheadIntoVariables<T extends Record<string, unknown>>(
    variables: T,
    letterhead: LetterheadVariables
): T & LetterheadVariables {
    // SV-Stammdaten: Frontend gewinnt (wenn explizit gesetzt), sonst Letterhead
    const merged: Record<string, unknown> = { ...letterhead, ...variables };
    // Bild-URLs IMMER aus Letterhead (Frontend kennt keine Signed URLs)
    if (letterhead.sv_logo_url !== undefined)         merged.sv_logo_url = letterhead.sv_logo_url;
    if (letterhead.sv_stempel_url !== undefined)      merged.sv_stempel_url = letterhead.sv_stempel_url;
    if (letterhead.sv_unterschrift_url !== undefined) merged.sv_unterschrift_url = letterhead.sv_unterschrift_url;
    return merged as T & LetterheadVariables;
}
