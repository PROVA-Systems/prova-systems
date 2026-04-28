/* ============================================================
   PROVA Migrations-Pipeline — ENV-Loader (Side-Effect Modul)
   Sprint K-1.1.A5

   Lädt .env.local aus Repo-Root in process.env.
   Import als Side-Effect am Top jedes Migration-Skripts:
     import './lib/env.js';
   ============================================================ */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { config } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(here, '..', '..', '..', '.env.local');

config({ path: envPath });

// Sanity-Hint falls keine erwarteten Keys vorhanden
const expected = ['AIRTABLE_PAT', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = expected.filter(k => !process.env[k]);

if (missing.length === expected.length) {
    // alle fehlen → vermutlich falscher Pfad oder Datei nicht angelegt
    console.warn(`[env] .env.local nicht gefunden oder leer (gesucht: ${envPath})`);
    console.warn(`[env] Bitte ${expected.join(', ')} setzen.`);
}
