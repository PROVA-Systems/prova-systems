/**
 * PROVA Systems — dashboard-kalender.js
 * ══════════════════════════════════════════════════════════════════════
 * Category 3 Performance Fix — Dashboard Kalender Modul (4/5)
 * Abhängigkeit: dashboard-core.js
 * ══════════════════════════════════════════════════════════════════════
 */
'use strict';

var DASH = window.DASH = window.DASH || {};
var _calDate        = new Date();
var _calSelectedDay = _calDate.getDate();

/* ══ Kalender rendern ════════════════════════════════════════════════ */
DASH.renderCal = function(termineRecords) {
  var y = _calDate.getFullYear(), m = _calDate.getMonth();
  var label = _calDate.toLocaleString('de-DE', {month:'long', year:'numeric'});
  var labelEl = document.getElementById('cal-month-label');
  if (labelEl) labelEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);

  var firstDay     = new Date(y, m, 1).getDay();
  var firstMo      = firstDay === 0 ? 6 : firstDay - 1;
  var daysInMonth  = new Date(y, m+1, 0).getDate();
  var daysInPrev   = new Date(y, m, 0).getDate();
  var today        = new Date();

  /* Termin-Map aus Airtable-Daten */
  var termineMap = {};
  (termineRecords || []).forEach(function(r) {
    var d = r.fields.termin_datum; if (!d) return;
    try {
      var dt = new Date(d);
      if (dt.getFullYear() === y && dt.getMonth() === m) {
        var k = dt.getDate();
        if (!termineMap[k]) termineMap[k] = [];
        termineMap[k].push(r.fields);
      }
    } catch(e) {}
  });

  /* Auch aus localStorage */
  try {
    JSON.parse(localStorage.getItem('prova_termine') || '[]').forEach(function(t) {
      if (!t.datum) return;
      try {
        var dt = new Date(t.datum);
        if (dt.getFullYear() === y && dt.getMonth() === m) {
          var k = dt.getDate();
          if (!termineMap[k]) termineMap[k] = [];
          termineMap[k].push(t);
        }
      } catch(e) {}
    });
  } catch(e) {}

  var html = '';
  for (var i = 0; i < 42; i++) {
    var day, cls = '', other = false;
    if (i < firstMo) {
      day = daysInPrev - firstMo + i + 1; cls = 'other-month'; other = true;
    } else if (i >= firstMo + daysInMonth) {
      day = i - firstMo - daysInMonth + 1; cls = 'other-month'; other = true;
    } else {
      day = i - firstMo + 1;
      if (today.getFullYear()===y && today.getMonth()===m && today.getDate()===day) cls = 'today';
    }
    var dots = '';
    if (!other && termineMap[day]) {
      termineMap[day].forEach(function(t) {
        var dc = (t.termin_typ||t.typ)==='Frist' ? 'frist' : (t.termin_typ||t.typ)==='Gerichtstermin' ? 'gericht' : 'termin';
        dots += '<div class="day-dot '+dc+'"></div>';
      });
    }
    html += '<div class="cal-day '+cls+'" onclick="window.calSelectDay('+day+','+(other?1:0)+')">'
      + '<div class="day-num">'+day+'</div>'
      + (dots ? '<div class="day-dots">'+dots+'</div>' : '')
      + '</div>';
  }

  var calDays = document.getElementById('cal-days');
  if (calDays) calDays.innerHTML = html;

  window._calTermineMap = termineMap;
  _calShowDay(_calSelectedDay, termineMap);
};

/* ══ Tag-Detail anzeigen ════════════════════════════════════════════ */
function _calShowDay(day, map) {
  var label  = document.getElementById('cal-detail-label');
  var evList = document.getElementById('cal-events-list');
  if (!label || !evList) return;
  var today = new Date();
  var isToday = today.getFullYear()===_calDate.getFullYear() && today.getMonth()===_calDate.getMonth() && today.getDate()===day;
  label.textContent = isToday ? 'Heute, '+day+'.' : day+'. '+_calDate.toLocaleString('de-DE', {month:'long'});
  if (map && map[day] && map[day].length > 0) {
    evList.innerHTML = map[day].map(function(t) {
      var typ = t.termin_typ || t.typ || 'Termin';
      var dc  = typ==='Frist' ? 'var(--danger)' : typ==='Gerichtstermin' ? 'var(--purple)' : 'var(--accent)';
      return '<div class="cal-event">'
        + '<div class="cal-event-dot" style="background:'+dc+';"></div>'
        + '<span class="cal-event-time">'+(t.uhrzeit||'—')+'</span>'
        + '<span class="cal-event-name">'+(t.titel||typ)+'</span>'
        + '</div>';
    }).join('');
  } else {
    evList.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:6px 0;">Keine Termine an diesem Tag.</div>';
  }
}

/* ══ Globale Kalender-Hilfsfunktionen (Kompatibilität) ══════════════ */
window.calSelectDay = function(day, isOther) {
  if (isOther) return;
  _calSelectedDay = day;
  _calShowDay(day, window._calTermineMap || {});
};

window.calNav = function(dir) {
  _calDate.setMonth(_calDate.getMonth() + dir);
  _calSelectedDay = 1;
  DASH.renderCal(window._lastTermine || []);
};

/* Rückwärtskompatibilität */
window.renderCal = function(t) { DASH.renderCal(t); };

console.log('[DashKalender] Geladen ✓');