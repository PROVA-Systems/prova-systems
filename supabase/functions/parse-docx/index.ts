/* PROVA Edge — parse-docx (Welle 7)
   DEFERRED: mammoth ist Node-spezifisch. Migration nach Pilot-Start.
*/
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  return J({
    error: 'DOCX-Parse-Funktion temporär deaktiviert',
    code: 'DEFERRED',
    detail: 'mammoth ist Node-spezifisch. In Deno Edge nicht direkt nutzbar. Migration auf @std/* DOCX-Parser oder Filebrowser-Conversion geplant.',
    fallback: 'Bitte Word-Dokument als reinen Text einfügen oder PDF exportieren.'
  }, 501);
});
