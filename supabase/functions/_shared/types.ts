/* ============================================================
   PROVA Edge Functions — Shared Types
   Sprint K-1.2.B1
   ============================================================ */

// ─── ki-proxy ────────────────────────────────────────────────
export interface KiProxyRequest {
    prompt: string;
    context?: string;
    purpose?:
        | 'diktat_strukturierung' | 'plausibilitaets_check'
        | 'norm_vorschlag'        | 'konjunktiv_korrektur'
        | 'befund_generierung'    | 'sonstiges';
    model?: 'gpt_4o' | 'gpt_4o_mini' | 'gpt_4_turbo';
    max_tokens?: number;
    temperature?: number;
    auftrag_id?: string;
    eintrag_id?: string;
}

export interface KiProxyResponse {
    text: string;
    konjunktiv_check_passed?: boolean;
    halluzinations_check_passed?: boolean;
    ki_protokoll_id?: string;
}

// ─── whisper-diktat ──────────────────────────────────────────
export interface WhisperRequest {
    audio_storage_path: string;       // workspace-scoped Pfad in Storage
    auftrag_id?: string;
    eintrag_id?: string;
}

export interface WhisperResponse {
    audio_id: string;
    transcript_pseudo: string;
    transcript_text: string;
    duration_seconds?: number;
}

// ─── pdf-generate ────────────────────────────────────────────
export interface PdfGenerateRequest {
    template_key: string;             // siehe lib/template-registry.js
    payload: Record<string, unknown>;
    auftrag_id?: string;
    kontakt_id?: string;
    typ:
        | 'gutachten_pdf' | 'kurzstellungnahme_pdf'
        | 'wertgutachten_pdf' | 'beweissicherung_pdf'
        | 'gerichtsgutachten_pdf' | 'schiedsgutachten_pdf'
        | 'beratung_protokoll' | 'baubegleitung_bericht'
        | 'rechnung' | 'rechnung_jveg' | 'rechnung_stunden'
        | 'mahnung_1' | 'mahnung_2' | 'brief';
    betreff?: string;
}

export interface PdfGenerateResponse {
    dokument_id: string;
    pdfmonkey_document_id?: string;
    storage_path?: string;
    pdf_url?: string;
    bytes?: number;
}

// ─── send-email ──────────────────────────────────────────────
export interface SendEmailRequest {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: Array<{
        filename: string;
        content_base64?: string;
        storage_path?: string;
    }>;
    auftrag_id?: string;
    dokument_id?: string;
    zweck?: string;                   // z.B. 'gutachten_versand', 'mahnung_1', 'lifecycle_welcome'
}

export interface SendEmailResponse {
    message_id: string;
    queued: boolean;
}

// ─── stripe-webhook ──────────────────────────────────────────
export interface StripeWebhookEvent {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
}

// ─── lifecycle-trigger ───────────────────────────────────────
export type LifecycleTrigger =
    | 'trial_start'
    | 'trial_ending_in_3_days'
    | 'trial_ended'
    | 'abo_renewed'
    | 'abo_canceled'
    | 'cron_daily';                   // pg_cron-Daily-Sweep

export interface LifecycleRequest {
    trigger: LifecycleTrigger;
    workspace_id?: string;            // bei manual trigger
}

// ─── audit-write ─────────────────────────────────────────────
export interface AuditWriteRequest {
    action: string;                   // s. AuditAction
    entity_typ?: string;
    entity_id?: string;
    payload?: Record<string, unknown>;
    feature_event?: {
        typ: string;
        feature_key: string;
        value?: Record<string, unknown>;
    };
}

// ─── ical-feed ───────────────────────────────────────────────
export interface IcalFeedQuery {
    token: string;                    // pro-Workspace-Token, in users.ical_token
}
