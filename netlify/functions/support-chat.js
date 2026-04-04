/* ============================================================
   PROVA — Support-Chat Widget (support-chat.js)
   Einbinden auf jeder Seite:  <script src="support-chat.js"></script>
   
   Features:
   - FAQ-Katalog mit 10 vorprogrammierten Antworten
   - Freitext-Nachricht → Make.com Webhook → Airtable
   - Floating Action Button (💬)
   - ESC zum Schließen
   ============================================================ */
(function() {
  'use strict';

  /* ── FAQ-Katalog ── */
  var FAQ = [
    {
      q: 'Wie starte ich ein neues Gutachten?',
      keywords: ['neues gutachten', 'gutachten erstellen', 'neuer fall', 'anfangen', 'starten'],
      a: 'Klicken Sie in der Sidebar auf <strong>„+ Neuer Fall"</strong> oder öffnen Sie die <a href="app-starter.html" style="color:#4f8ef7;">Gutachten-Seite</a>. Dort geben Sie Stammdaten ein, diktieren Ihren Befund und PROVA erstellt den KI-Entwurf.'
    },
    {
      q: 'Wie funktioniert das Diktat?',
      keywords: ['diktat', 'diktieren', 'sprache', 'mikrofon', 'aufnahme', 'sprechen'],
      a: 'In Schritt 2 „Diktat & Fotos" tippen Sie auf den Mikrofon-Button. PROVA wandelt Ihre Sprache in Text um. Sie können auch manuell tippen. Der Text wird automatisch in den KI-Entwurf übernommen.'
    },
    {
      q: 'Kann ich Gutachten offline erstellen?',
      keywords: ['offline', 'internet', 'baustelle', 'kein netz', 'verbindung'],
      a: 'Ja! PROVA speichert Ihre Eingaben lokal. Diktate und Fotos werden zwischengespeichert und automatisch synchronisiert sobald Sie wieder online sind. Die KI-Analyse benötigt allerdings eine Internetverbindung.'
    },
    {
      q: 'Wie lade ich Fotos hoch?',
      keywords: ['foto', 'fotos', 'bild', 'bilder', 'hochladen', 'kamera', 'upload'],
      a: 'In Schritt 2 können Sie Fotos per Drag & Drop hochladen, aus der Galerie wählen oder direkt mit der Kamera aufnehmen. PROVA beschriftet die Fotos automatisch per KI. Sie können die Beschriftung jederzeit anpassen.'
    },
    {
      q: 'Was bedeutet §407a?',
      keywords: ['407a', '§407', 'verantwortung', 'persönlich', 'zpo'],
      a: '§407a ZPO regelt die persönliche Verantwortung des Sachverständigen. Vor jeder Freigabe bestätigen Sie per Checkbox, dass Sie das Gutachten persönlich geprüft haben. Der KI-Offenlegungstext wird automatisch ins PDF eingefügt.'
    },
    {
      q: 'Wie erstelle ich eine JVEG-Abrechnung?',
      keywords: ['jveg', 'abrechnung', 'vergütung', 'gericht', 'honorar', 'stundensatz'],
      a: 'Öffnen Sie den <a href="jveg.html" style="color:#4f8ef7;">JVEG-Rechner</a> in der Sidebar. Dort können Sie Stunden, Fahrtkosten und Auslagen eingeben. PROVA berechnet den Gesamtbetrag nach JVEG-Sätzen automatisch.'
    },
    {
      q: 'Wie ändere ich mein Paket?',
      keywords: ['paket', 'upgrade', 'wechseln', 'solo', 'team', 'abo', 'kündigen'],
      a: 'Unter <a href="einstellungen.html" style="color:#4f8ef7;">Einstellungen → Paket & Features</a> sehen Sie Ihr aktuelles Paket und können upgraden. Für Kündigung oder Rückfragen schreiben Sie uns eine Nachricht.'
    },
    {
      q: 'Wo finde ich Normen und Textbausteine?',
      keywords: ['normen', 'textbausteine', 'din', 'nachschlagen', 'bibliothek', 'baustein'],
      a: 'In der Sidebar unter <strong>Werkzeuge</strong> finden Sie Normen, Textbausteine und Positionen. Während der Gutachten-Erstellung schlägt PROVA automatisch passende Normen vor. Sie können auch das Slide-in-Panel öffnen.'
    },
    {
      q: 'Wie exportiere ich mein Gutachten als PDF?',
      keywords: ['pdf', 'export', 'download', 'drucken', 'herunterladen'],
      a: 'Nach der Freigabe auf der <a href="freigabe.html" style="color:#4f8ef7;">Freigabe-Seite</a> wird das PDF automatisch generiert und an die hinterlegte E-Mail gesendet. Sie können es dort auch als Word-Datei herunterladen.'
    },
    {
      q: 'Wer kann mir bei technischen Problemen helfen?',
      keywords: ['problem', 'fehler', 'hilfe', 'support', 'bug', 'funktioniert nicht', 'kaputt'],
      a: 'Beschreiben Sie Ihr Problem in diesem Chat — wir melden uns werktags innerhalb von 24 Stunden. Sie können auch direkt an <a href="mailto:kontakt@prova-systems.de" style="color:#4f8ef7;">kontakt@prova-systems.de</a> schreiben.'
    }
  ];

  /* ── Webhook URL ── */
  var WEBHOOK_URL = 'https://hook.eu1.make.com/lktuhugwcg5v37ib6bdaxjb1uiplnu8v';

  /* ── CSS ── */
  if (!document.getElementById('prova-support-css')) {
    var s = document.createElement('style');
    s.id = 'prova-support-css';
    s.textContent = ''
      + '.sup-fab{position:fixed;bottom:24px;right:24px;z-index:800;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#4f8ef7,#3a7be0);box-shadow:0 4px 16px rgba(79,142,247,.4);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;border:none;color:#fff;transition:all .2s;}'
      + '.sup-fab:hover{transform:scale(1.08);box-shadow:0 6px 22px rgba(79,142,247,.5);}'
      + '.support-fab{display:none!important;}'
      + '.sup-panel{display:none;position:fixed;bottom:84px;right:24px;width:380px;max-width:calc(100vw - 32px);max-height:520px;background:var(--bg2,#13161d);border:1px solid var(--border2,rgba(255,255,255,.12));border-radius:16px;z-index:801;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.5);overflow:hidden;}'
      + '.sup-panel.open{display:flex;}'
      + '.sup-head{padding:14px 18px;border-bottom:1px solid var(--border,rgba(255,255,255,.07));display:flex;align-items:center;justify-content:space-between;}'
      + '.sup-head-title{font-size:15px;font-weight:700;color:var(--text,#eaecf4);}'
      + '.sup-head-close{background:none;border:none;color:var(--text3,#6b7280);font-size:18px;cursor:pointer;padding:4px 8px;border-radius:6px;}'
      + '.sup-head-close:hover{color:var(--text,#eaecf4);background:rgba(255,255,255,.05);}'
      + '.sup-body{flex:1;overflow-y:auto;padding:14px 16px;}'
      + '.sup-body::-webkit-scrollbar{width:4px;}'
      + '.sup-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:10px;}'
      + '.sup-msg{margin-bottom:10px;max-width:88%;}'
      + '.sup-msg.bot{margin-right:auto;}'
      + '.sup-msg.user{margin-left:auto;}'
      + '.sup-bubble{padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.55;}'
      + '.sup-msg.bot .sup-bubble{background:var(--bg3,#181b24);color:var(--text2,#9da3b4);border-bottom-left-radius:4px;}'
      + '.sup-msg.user .sup-bubble{background:rgba(79,142,247,.15);color:var(--text,#eaecf4);border-bottom-right-radius:4px;}'
      + '.sup-bubble a{color:#4f8ef7;text-decoration:none;}'
      + '.sup-bubble a:hover{text-decoration:underline;}'
      + '.sup-faq-list{display:flex;flex-direction:column;gap:4px;margin-top:8px;}'
      + '.sup-faq-btn{text-align:left;padding:8px 12px;border-radius:8px;background:rgba(79,142,247,.06);border:1px solid rgba(79,142,247,.12);color:var(--text2,#9da3b4);font-size:12px;cursor:pointer;transition:all .12s;font-family:inherit;}'
      + '.sup-faq-btn:hover{background:rgba(79,142,247,.12);color:var(--text,#eaecf4);border-color:rgba(79,142,247,.25);}'
      + '.sup-input-wrap{padding:10px 14px;border-top:1px solid var(--border,rgba(255,255,255,.07));display:flex;gap:8px;}'
      + '.sup-input{flex:1;background:var(--bg3,#181b24);border:1px solid var(--border2,rgba(255,255,255,.12));border-radius:8px;padding:9px 12px;color:var(--text,#eaecf4);font-size:13px;font-family:inherit;outline:none;resize:none;min-height:38px;max-height:80px;}'
      + '.sup-input:focus{border-color:var(--accent,#4f8ef7);}'
      + '.sup-input::placeholder{color:var(--text3,#6b7280);}'
      + '.sup-send{background:var(--accent,#4f8ef7);border:none;border-radius:8px;padding:0 14px;color:#fff;font-size:14px;cursor:pointer;transition:all .12s;flex-shrink:0;}'
      + '.sup-send:hover{background:#3a7be0;}'
      + '.sup-send:disabled{opacity:.4;cursor:not-allowed;}'
      + '@media(max-width:480px){.sup-panel{bottom:0;right:0;width:100%;max-width:100%;max-height:100vh;border-radius:16px 16px 0 0;}.sup-fab{bottom:16px;right:16px;}}'
    ;
    document.head.appendChild(s);
  }

  /* ── DOM ── */
  var chatOpen = false;
  var messages = [];
  var bodyEl, inputEl;

  function createChat() {
    if (document.getElementById('sup-fab')) return;

    // FAB
    var fab = document.createElement('button');
    fab.className = 'sup-fab';
    fab.id = 'sup-fab';
    fab.title = 'Support & Hilfe';
    fab.textContent = '💬';
    fab.onclick = toggleChat;

    // Panel
    var panel = document.createElement('div');
    panel.className = 'sup-panel';
    panel.id = 'sup-panel';
    panel.innerHTML = ''
      + '<div class="sup-head">'
      +   '<div class="sup-head-title">💬 Hilfe & Support</div>'
      +   '<button class="sup-head-close" onclick="document.getElementById(\'sup-panel\').classList.remove(\'open\')">✕</button>'
      + '</div>'
      + '<div class="sup-body" id="sup-body"></div>'
      + '<div class="sup-input-wrap">'
      +   '<textarea class="sup-input" id="sup-input" placeholder="Ihre Frage…" rows="1" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();window._supSend();}"></textarea>'
      +   '<button class="sup-send" id="sup-send-btn" onclick="window._supSend()">→</button>'
      + '</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    bodyEl = document.getElementById('sup-body');
    inputEl = document.getElementById('sup-input');

    // Welcome + FAQ
    addBotMsg('Willkommen beim PROVA Support! Wählen Sie eine Frage oder schreiben Sie uns direkt.');
    showFaqList();
  }

  function toggleChat() {
    var panel = document.getElementById('sup-panel');
    if (!panel) return;
    chatOpen = !chatOpen;
    panel.classList.toggle('open', chatOpen);
    if (chatOpen && inputEl) setTimeout(function() { inputEl.focus(); }, 200);
  }

  /* ── Messages ── */
  function addBotMsg(html) {
    messages.push({ type: 'bot', html: html });
    renderMessages();
  }
  function addUserMsg(text) {
    messages.push({ type: 'user', html: escHtml(text) });
    renderMessages();
  }
  function renderMessages() {
    if (!bodyEl) return;
    bodyEl.innerHTML = messages.map(function(m) {
      return '<div class="sup-msg ' + m.type + '"><div class="sup-bubble">' + m.html + '</div></div>';
    }).join('');
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  /* ── FAQ Liste ── */
  function showFaqList() {
    var html = '<div class="sup-faq-list">';
    FAQ.forEach(function(f, i) {
      html += '<button class="sup-faq-btn" onclick="window._supFaq(' + i + ')">' + escHtml(f.q) + '</button>';
    });
    html += '</div>';
    messages.push({ type: 'bot', html: html });
    renderMessages();
  }

  /* ── FAQ beantworten ── */
  window._supFaq = function(idx) {
    var faq = FAQ[idx];
    if (!faq) return;
    addUserMsg(faq.q);
    addBotMsg(faq.a);
    // "Weitere Fragen?" anbieten
    setTimeout(function() {
      addBotMsg('Hat das geholfen? <button class="sup-faq-btn" onclick="window._supShowMore()" style="margin-top:6px;display:block;">📋 Weitere Fragen anzeigen</button><button class="sup-faq-btn" onclick="window._supShowContact()" style="margin-top:4px;display:block;">✉️ Persönliche Nachricht schreiben</button>');
    }, 300);
  };

  window._supShowMore = function() {
    showFaqList();
  };

  window._supShowContact = function() {
    addBotMsg('Schreiben Sie Ihre Nachricht unten ins Textfeld. Wir melden uns werktags innerhalb von 24 Stunden.');
    if (inputEl) inputEl.focus();
  };

  /* ── Freitext senden ── */
  window._supSend = function() {
    if (!inputEl) return;
    var text = inputEl.value.trim();
    if (!text) return;

    // Erst FAQ-Match versuchen
    var match = findFaqMatch(text);
    if (match) {
      addUserMsg(text);
      addBotMsg(match.a);
      inputEl.value = '';
      setTimeout(function() {
        addBotMsg('Hat das geholfen? <button class="sup-faq-btn" onclick="window._supShowContact()" style="margin-top:6px;display:block;">✉️ Nein — persönliche Nachricht schreiben</button>');
      }, 300);
      return;
    }

    // Kein FAQ-Match → erst KI fragen, dann Ticket wenn gewünscht
    addUserMsg(text);
    inputEl.value = '';
    var btn = document.getElementById('sup-send-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }

    // Thinking-Indikator
    addBotMsg('<span id="sup-ki-thinking" style="opacity:.6;">PROVA KI denkt…</span>');

    var kiPayload = {
      aufgabe: 'support_chat',
      frage: text,
      seite: window.location.pathname,
      paket: localStorage.getItem('prova_paket') || 'Solo',
      kontext: 'Sachverständiger nutzt PROVA Systems (SaaS für Gutachten-Erstellung). Frage aus Support-Chat.'
    };

    fetch('/.netlify/functions/ki-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kiPayload)
    }).then(function(res) { return res.json(); })
    .then(function(data) {
      var kiAntwort = data.antwort || data.vorschlag || data.text || '';
      var denkEl = document.getElementById('sup-ki-thinking');
      if (denkEl) denkEl.parentElement.remove();

      if (kiAntwort && kiAntwort.length > 20) {
        // KI hat geantwortet
        addBotMsg(kiAntwort);
        setTimeout(function() {
          addBotMsg('War das hilfreich? '
            + '<button class="sup-faq-btn" onclick="window._supShowContact()" '
            + 'style="margin-top:6px;margin-right:6px;display:inline-block;">✉️ Nein — Ticket schreiben</button>'
            + '<button class="sup-faq-btn" onclick="this.parentElement.parentElement.remove()" '
            + 'style="margin-top:6px;display:inline-block;background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);color:#10b981;">✓ Ja, danke!</button>');
        }, 400);
      } else {
        // KI hat keine gute Antwort → direkt Ticket
        addBotMsg('Ich konnte Ihre Frage nicht vollständig beantworten. Ich leite sie an unser Team weiter.');
        _supSendeTicket(text);
      }
    })
    .catch(function() {
      var denkEl = document.getElementById('sup-ki-thinking');
      if (denkEl) denkEl.parentElement.remove();
      // Fallback: direkt Ticket
      addBotMsg('KI momentan nicht verfügbar — Ihre Frage wird als Ticket weitergeleitet.');
      _supSendeTicket(text);
    })
    .finally(function() {
      if (btn) { btn.disabled = false; btn.textContent = '→'; }
    });
  };

  /* ── FAQ Keyword-Match ── */
  function findFaqMatch(text) {
    var lower = text.toLowerCase();
    var best = null, bestScore = 0;
    FAQ.forEach(function(f) {
      var score = 0;
      f.keywords.forEach(function(kw) {
        if (lower.indexOf(kw) >= 0) score++;
      });
      if (score >= 2 && score > bestScore) {
        best = f;
        bestScore = score;
      }
    });
    return best;
  }

  /* ── ESC schließt Chat ── */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var panel = document.getElementById('sup-panel');
      if (panel && panel.classList.contains('open')) {
        panel.classList.remove('open');
        chatOpen = false;
      }
    }
  });

  /* ── HTML escaping ── */
  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Init ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChat);
  } else {
    createChat();
  }

})();
