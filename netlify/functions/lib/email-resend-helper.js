/**
 * PROVA — Email-Resend-Helper (MEGA³² W11-I5)
 *
 * Compact wrapper für Resend API. Liquid-Variable-Substitution + HTML-Send.
 * ENV: PROVA_RESEND_API_KEY || RESEND_API_KEY (defensive Fallback)
 */
'use strict';

const fs = require('fs');
const path = require('path');

function getResendKey() {
  return process.env.PROVA_RESEND_API_KEY || process.env.RESEND_API_KEY || null;
}

function getFromAddress() {
  return process.env.PROVA_RESEND_FROM || process.env.RESEND_FROM || 'noreply@prova-systems.de';
}

// Mini-Liquid-Substitution (kein NPM-Dep). Unterstützt:
// {{ var }}, {{ var | default: "x" }}, {% if var %}...{% endif %}
function renderLiquid(tpl, vars) {
  let out = tpl;
  // {% if var %}...{% endif %} (nicht-greedy, single-level)
  out = out.replace(/\{%\s*if\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, function (_, name, body) {
    const v = vars[name];
    return v ? body : '';
  });
  // {{ var | default: "fallback" }}
  out = out.replace(/\{\{\s*(\w+)\s*\|\s*default:\s*"([^"]*)"\s*\}\}/g, function (_, name, fb) {
    const v = vars[name];
    return v != null && v !== '' ? String(v) : fb;
  });
  // {{ var }}
  out = out.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, name) {
    const v = vars[name];
    return v == null ? '' : String(v);
  });
  return out;
}

function loadTemplate(templateName) {
  const filepath = path.join(__dirname, '..', '..', '..', 'docs', 'templates-goldstandard', '05-emails', templateName + '.liquid.template.html');
  if (fs.existsSync(filepath)) return fs.readFileSync(filepath, 'utf8');
  return null;
}

async function sendEmail(opts) {
  const apiKey = getResendKey();
  if (!apiKey) return { sent: false, reason: 'no-resend-key' };
  const fetch = global.fetch;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: opts.from || getFromAddress(),
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.reply_to || 'kontakt@prova-systems.de'
      })
    });
    return { sent: res.ok, status: res.status };
  } catch (e) { return { sent: false, reason: e.message }; }
}

module.exports = { renderLiquid, loadTemplate, sendEmail, getResendKey, getFromAddress };
