const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type'
};
const J = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const sentryEnabled = Deno.env.get('PROVA_SENTRY_TEST_ENABLED') === 'true';
  if (!sentryEnabled) return J({ error: 'sentry-test disabled. Set PROVA_SENTRY_TEST_ENABLED=true.' }, 403);

  const url = new URL(req.url);
  const provided = url.searchParams.get('secret') || '';
  const expected = Deno.env.get('PROVA_SENTRY_TEST_SECRET') || '';
  if (!expected || provided !== expected) return J({ error: 'Set ?secret=<PROVA_SENTRY_TEST_SECRET>' }, 401);

  throw new Error('PROVA Sentry-Test (' + new Date().toISOString() + ')');
});
