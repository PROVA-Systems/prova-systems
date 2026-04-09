// ══════════════════════════════════════════════════════════════════════════════
// PROVA Systems — Stripe Webhook Handler
// Netlify Function: stripe-webhook
//
// Events:
//   checkout.session.completed    → Abo aktivieren (Status: Aktiv)
//   invoice.payment_succeeded     → Zahlung bestätigt
//   customer.subscription.deleted → Abo gekündigt (Status: Gekündigt)
//   invoice.payment_failed        → Zahlung fehlgeschlagen
//
// Env-Vars:
//   STRIPE_SECRET_KEY       — Stripe Secret Key
//   STRIPE_WEBHOOK_SECRET   — Stripe Webhook Signing Secret (aus Stripe Dashboard)
//   AIRTABLE_PAT            — Airtable Personal Access Token
//   MAKE_S3_WEBHOOK         — Make.com Szenario 3: Aktivierung
//   MAKE_S4_WEBHOOK         — Make.com Szenario 4: Kündigung
//   URL                     — Netlify Site URL (automatisch gesetzt)
//
// Stripe Dashboard: Webhook URL = https://[your-site].netlify.app/.netlify/functions/stripe-webhook
// Events auswählen: checkout.session.completed, invoice.payment_succeeded,
//                   customer.subscription.deleted, invoice.payment_failed
// ══════════════════════════════════════════════════════════════════════════════

const AT_BASE     = 'appJ7bLlAHZoxENWE';
const AT_SV_TABLE = 'tbladqEQT3tmx4DIB';

exports.handler = async (event) => {
  // ── CORS Preflight ──────────────────────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = { 'Content-Type': 'application/json' };

  // ── Stripe Initialisierung ──────────────────────────────────────────────────
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_SECRET_KEY oder STRIPE_WEBHOOK_SECRET fehlt');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe nicht konfiguriert' }) };
  }

  const stripe = require('stripe')(stripeKey);

  // ── Webhook-Signatur prüfen (verhindert gefälschte Events) ─────────────────
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,     // Raw body (nicht geparstes JSON!)
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('[Stripe] Ungültige Signatur:', err.message);
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Webhook Signatur ungültig: ${err.message}` }) };
  }

  console.log(`[Stripe] Event empfangen: ${stripeEvent.type} (ID: ${stripeEvent.id})`);

  try {
    switch (stripeEvent.type) {

      // ── ✅ Zahlung erfolgreich: Abo aktivieren ───────────────────────────────
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const email   = session.customer_email || session.metadata?.email;
        const typ     = session.metadata?.typ || 'abo';

        if (!email) {
          console.warn('[Stripe] checkout.session.completed: Keine E-Mail gefunden');
          break;
        }

        // ── Add-on Einmalkauf ────────────────────────────────────────────────
        if (typ === 'addon') {
          const menge    = parseInt(session.metadata?.menge || '0', 10);
          const addonTyp = session.metadata?.addon_typ || '';

          console.log(`[Stripe] Add-on Kauf: ${email} → +${menge} Fälle (${addonTyp})`);

          if (menge > 0) {
            await aktualisiereZusatzFaelle(email, menge);
          }
          break;
        }

        // ── Abo-Kauf (Standard) ──────────────────────────────────────────────
        const paket = session.metadata?.paket || 'Solo';
        const subId = session.subscription;
        const custId = session.customer;

        console.log(`[Stripe] Checkout abgeschlossen: ${email} → ${paket}`);

        await aktualisiereAirtableStatus(email, 'Aktiv', paket, subId);

        await triggereWebhook(process.env.MAKE_S3_WEBHOOK, {
          email,
          paket,
          status: 'Aktiv',
          stripe_subscription_id: subId || '',
          stripe_customer_id: custId || '',
          event_type: stripeEvent.type,
          datum: new Date().toISOString(),
        }, 'S3');

        break;
      }

      // ── ✅ Monatliche Zahlung bestätigt ──────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object;

        // Nur bei echten Abo-Verlängerungen (nicht bei erster Zahlung)
        if (invoice.billing_reason !== 'subscription_cycle') break;

        const custId  = invoice.customer;
        const subId   = invoice.subscription;
        const customer = await stripe.customers.retrieve(custId).catch(() => null);
        const email    = customer?.email;

        if (!email) break;

        console.log(`[Stripe] Monatliche Zahlung: ${email}`);

        // Airtable: Status auf Aktiv sicherstellen (kann nach Zahlungsfehler auf Pause sein)
        await aktualisiereAirtableStatus(email, 'Aktiv', null, subId);

        break;
      }

      // ── ❌ Abo gekündigt ────────────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = stripeEvent.data.object;
        const custId = sub.customer;
        const customer = await stripe.customers.retrieve(custId).catch(() => null);
        const email  = customer?.email;

        if (!email) {
          console.warn('[Stripe] subscription.deleted: Kein Customer gefunden');
          break;
        }

        const paket = sub.metadata?.paket || 'Solo';
        console.log(`[Stripe] Kündigung: ${email}`);

        // Airtable: Status auf Gekündigt setzen
        await aktualisiereAirtableStatus(email, 'Gekündigt', paket, sub.id);

        // Make.com S4: Kündigungs-Ablauf (Offboarding, Retention-Mail)
        await triggereWebhook(process.env.MAKE_S4_WEBHOOK, {
          email,
          paket,
          status: 'Gekündigt',
          stripe_subscription_id: sub.id,
          stripe_customer_id: custId,
          event_type: stripeEvent.type,
          canceled_at: new Date(sub.canceled_at * 1000).toISOString(),
          datum: new Date().toISOString(),
        }, 'S4');

        break;
      }

      // ── ⚠️ Zahlung fehlgeschlagen ────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object;
        const custId  = invoice.customer;
        const customer = await stripe.customers.retrieve(custId).catch(() => null);
        const email   = customer?.email;

        if (!email) break;

        const versuche = invoice.attempt_count || 1;
        console.log(`[Stripe] Zahlung fehlgeschlagen: ${email} (Versuch ${versuche})`);

        // Erst nach 3 fehlgeschlagenen Versuchen den Status ändern
        if (versuche >= 3) {
          await aktualisiereAirtableStatus(email, 'Zahlung_Fehlgeschlagen', null, invoice.subscription);
        }

        // Make.com S4: Mahnungs-E-Mail (sanft bei Versuch 1, dringend bei 3)
        await triggereWebhook(process.env.MAKE_S4_WEBHOOK, {
          email,
          status: 'Zahlung_Fehlgeschlagen',
          event_type: stripeEvent.type,
          versuch: versuche,
          naechster_versuch: invoice.next_payment_attempt 
            ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
            : null,
          datum: new Date().toISOString(),
        }, 'S4');

        break;
      }

      default:
        console.log(`[Stripe] Ignoriertes Event: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, type: stripeEvent.type })
    };

  } catch (err) {
    console.error('[Stripe Webhook] Verarbeitungsfehler:', err);
    // Professionell: 500 → Stripe wiederholt das Event (idempotent verarbeiten!)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'WEBHOOK_PROCESSING_FAILED' })
    };
  }
};

// ── Airtable SV-Status aktualisieren ────────────────────────────────────────
async function aktualisiereAirtableStatus(email, status, paket, subscriptionId) {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) {
    console.warn('[Airtable] AIRTABLE_PAT fehlt — Status nicht aktualisiert');
    return;
  }

  try {
    // SV-Record anhand E-Mail suchen
    const searchUrl = `https://api.airtable.com/v0/${AT_BASE}/${AT_SV_TABLE}`
      + `?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`;

    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${pat}` }
    });

    if (!searchRes.ok) {
      console.error('[Airtable] Suche fehlgeschlagen:', searchRes.status);
      return;
    }

    const searchData = await searchRes.json();
    const records = searchData.records || [];

    if (records.length === 0) {
      console.warn(`[Airtable] Kein SV-Record für ${email} gefunden`);
      return;
    }

    const recordId = records[0].id;

    // Felder zum Update zusammenstellen
    const fields = { Status: status };
    if (paket) fields.Paket = paket;
    if (subscriptionId) fields.stripe_subscription_id = subscriptionId;
    if (status === 'Aktiv') fields.aktiviert_am = new Date().toISOString().split('T')[0];
    if (status === 'Gekündigt') fields.gekuendigt_am = new Date().toISOString().split('T')[0];

    // PATCH: Status updaten
    const patchRes = await fetch(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_SV_TABLE}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${pat}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );

    if (patchRes.ok) {
      console.log(`[Airtable] ${email} → Status: ${status}${paket ? `, Paket: ${paket}` : ''}`);
    } else {
      const err = await patchRes.text();
      console.error('[Airtable] PATCH fehlgeschlagen:', patchRes.status, err);
    }

  } catch (e) {
    console.error('[Airtable] Exception:', e.message);
  }
}

// ── Make.com Webhook triggern (non-blocking für kritische Aktionen) ───────────
async function triggereWebhook(url, payload, szenario) {
  if (!url) {
    console.warn(`[Make] Webhook S${szenario} nicht konfiguriert (MAKE_S${szenario}_WEBHOOK fehlt)`);
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`[Make] S${szenario} erfolgreich getriggert`);
    } else {
      console.warn(`[Make] S${szenario} Fehler:`, res.status);
    }
  } catch (e) {
    console.error(`[Make] S${szenario} Exception:`, e.message);
  }
}
// ── Add-on: Faelle_Zusatz in Airtable inkrementieren ────────────────────────
async function aktualisiereZusatzFaelle(email, menge) {
  const pat = process.env.AIRTABLE_PAT;
  if (!pat) { console.warn('[Addon] AIRTABLE_PAT fehlt'); return; }

  const AT_BASE     = 'appJ7bLlAHZoxENWE';
  const AT_SV_TABLE = 'tbladqEQT3tmx4DIB';

  try {
    // SV-Record suchen
    const searchRes = await fetch(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_SV_TABLE}` +
      `?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}&maxRecords=1`,
      { headers: { 'Authorization': `Bearer ${pat}` } }
    );
    const searchData = await searchRes.json();
    const record     = searchData.records?.[0];

    if (!record) {
      console.warn(`[Addon] Kein SV-Record für ${email}`);
      return;
    }

    // Aktueller Wert + neue Menge addieren
    const aktuell = parseInt(record.fields.Faelle_Zusatz || '0', 10);
    const neu     = aktuell + menge;

    const patchRes = await fetch(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_SV_TABLE}/${record.id}`,
      {
        method:  'PATCH',
        headers: {
          'Authorization':  `Bearer ${pat}`,
          'Content-Type':   'application/json',
        },
        body: JSON.stringify({ fields: { Faelle_Zusatz: neu } }),
      }
    );

    if (patchRes.ok) {
      console.log(`[Addon] ${email}: Faelle_Zusatz ${aktuell} → ${neu}`);
    } else {
      const err = await patchRes.text();
      console.error('[Addon] PATCH fehlgeschlagen:', patchRes.status, err);
    }
  } catch (e) {
    console.error('[Addon] Exception:', e.message);
  }
}
