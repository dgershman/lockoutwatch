(function () {
  'use strict';
  var EXPIRY_DAY = Date.UTC(2026, 11, 1); // CBA expires Dec 1, 2026 at 11:59 p.m. ET
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function parse(s) { if (!s) return null; var p = String(s).slice(0, 10).split('-'); return p.length === 3 ? { y: +p[0], m: +p[1] - 1, d: +p[2] } : null; }
  function fmtDate(s) { var a = parse(s); return a ? MONTHS[a.m] + ' ' + a.d + ', ' + a.y : ''; }
  function fmtRange(s, e) {
    var a = parse(s), b = parse(e);
    if (!a) return '';
    if (!b) return fmtDate(s);
    if (a.m === b.m && a.y === b.y) return MONTHS[a.m] + ' ' + a.d + '-' + b.d + ', ' + a.y;
    return MONTHS[a.m] + ' ' + a.d + ' to ' + MONTHS[b.m] + ' ' + b.d + ', ' + b.y;
  }
  function safeUrl(u) { return typeof u === 'string' && /^https:\/\//.test(u) ? u : null; }
  function sideColor(side) { return side === 'MLB' ? 'var(--mlb)' : side === 'MLBPA' ? 'var(--mlbpa)' : 'var(--neutral)'; }
  function setText(id, v) { var n = $(id); if (n) { n.textContent = v == null ? '' : String(v); n.classList.remove('skel'); } }
  function load(name) {
    return fetch('/data/' + name + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); });
  }

  function bars(container, rows, fmt, colorFn) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0) || 1;
    container.replaceChildren.apply(container, rows.map(function (r) {
      var row = el('div', 'bar-row');
      row.appendChild(el('div', 'bar-lab', r.label));
      var track = el('div', 'bar-track');
      var bar = el('div', 'bar');
      bar.style.width = 'calc(' + (r.value / max * 100).toFixed(2) + '% - 70px)';
      bar.style.background = colorFn(r);
      track.append(bar, el('span', 'bar-val', fmt(r.value)));
      row.appendChild(track);
      return row;
    }));
  }

  function renderStatus(rows) {
    var s = rows[0] || {};
    setText('headline', s.headline);
    setText('asof', fmtDate(s.as_of));
    setText('phase', s.phase);
    setText('phase_detail', s.phase_detail);
    var locked = s.lockout_day != null && s.lockout_day !== '';
    $('tile-pre').hidden = locked;
    $('tile-post').hidden = !locked;
    if (locked) setText('lockday', s.lockout_day);
    else {
      var today = parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()));
      var days = today ? Math.max(0, Math.round((EXPIRY_DAY - Date.UTC(today.y, today.m, today.d)) / 86400000)) : s.days_until_expiry;
      setText('days', days);
    }
    var lvl = +s.watch_level || 0;
    setText('level', lvl || '');
    var cls = lvl >= 4 ? 'on-bad' : lvl === 3 ? 'on-warn' : 'on-ok';
    Array.prototype.forEach.call($('meter').children, function (sp, i) { sp.className = i < lvl ? cls : ''; });
    setText('watch_label', s.watch_label);
    setText('next_date', fmtDate(s.next_milestone_date));
    setText('next_event', s.next_milestone);
    setText('latest_date', fmtDate(s.latest_date));
    setText('latest', s.latest);
    if (s.headline) document.title = 'Lockout Watch: ' + (s.phase || 'MLB lockout tracker') + ' (' + fmtDate(s.as_of) + ')';
  }

  function renderMoney(rows) {
    var money = function (v) { return '$' + (Math.round(v * 10) / 10) + 'M'; };
    var minFmt = function (v) { return v < 1 ? '$' + Math.round(v * 1000) + 'K' : '$' + (Math.round(v * 100) / 100) + 'M'; };
    var color = function (r) { return sideColor(r.side); };
    bars($('payroll'), rows.filter(function (r) { return r.metric === 'payroll'; }).map(function (r) { return { label: r.label, side: r.side, value: +r.value }; }), money, color);
    bars($('minimum'), rows.filter(function (r) { return r.metric === 'minimum'; }).map(function (r) { return { label: r.label, side: r.side, value: +r.value }; }), minFmt, color);
  }

  function gapClass(g) {
    var t = String(g || '').toLowerCase();
    if (t.indexOf('wide') === 0) return 'g-wide';
    if (t.indexOf('moderate') === 0) return 'g-moderate';
    if (t.indexOf('agreed') === 0) return 'g-agreed';
    if (t.indexOf('overlap') >= 0 || t.indexOf('common') >= 0) return 'g-overlap';
    return 'g-open';
  }

  function renderIssues(rows) {
    var body = $('issues-body');
    body.replaceChildren.apply(body, rows.map(function (r) {
      var tr = el('tr');
      ['issue', 'mlb', 'mlbpa'].forEach(function (k) { tr.appendChild(el('td', null, r[k])); });
      var td = el('td');
      td.appendChild(el('span', 'pill ' + gapClass(r.gap), r.gap));
      tr.appendChild(td);
      return tr;
    }));
  }

  function renderDates(rows) {
    var list = $('dates');
    var sorted = rows.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    list.replaceChildren.apply(list, sorted.map(function (r) {
      var li = el('li', r.state === 'done' ? 'is-done' : null);
      li.appendChild(el('div', 'when', fmtRange(r.date, r.end)));
      var what = el('div', 'what');
      var b = el('b', null, r.event);
      if (r.state === 'next' || r.state === 'done') b.appendChild(el('span', 'badge' + (r.state === 'done' ? ' done' : ''), r.state === 'next' ? 'Next up' : 'Done'));
      what.append(b, el('span', null, r.note));
      li.appendChild(what);
      return li;
    }));
  }

  var timelineRows = [];
  var side = 'All';
  function renderTimeline() {
    var list = $('timeline-list');
    var rows = timelineRows.filter(function (r) { return side === 'All' || r.side === side; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    list.replaceChildren.apply(list, rows.map(function (r) {
      var li = el('li');
      li.appendChild(el('div', 'when', fmtDate(r.date)));
      var what = el('div', 'what');
      var chip = el('span', 'chip');
      var dot = el('i'); dot.style.background = sideColor(r.side);
      chip.append(dot, r.side || '');
      what.append(chip, el('b', null, r.title), el('span', null, r.detail));
      var href = safeUrl(r.url);
      if (href) { var a = el('a', 'src', r.source || 'Source'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; what.appendChild(a); }
      li.appendChild(what);
      return li;
    }));
  }
  document.querySelectorAll('.filters button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      side = btn.getAttribute('data-side');
      document.querySelectorAll('.filters button').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      renderTimeline();
    });
  });

  function renderStoppages(rows) {
    var data = rows.map(function (s) {
      var days = Math.round((Date.parse(s.end) - Date.parse(s.start)) / 86400000) + 1;
      return { label: s.label + ' ' + String(s.type).toLowerCase(), type: s.type, value: days };
    });
    bars($('stoppages'), data, function (v) { return v + (v === 1 ? ' day' : ' days'); }, function (r) { return r.type === 'Lockout' ? 'var(--mlb)' : 'var(--mlbpa)'; });
  }

  function renderNews(rows) {
    var list = $('news');
    var sorted = rows.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    list.replaceChildren.apply(list, sorted.map(function (r) {
      var li = el('li');
      li.appendChild(el('div', 'when', fmtDate(r.date)));
      var what = el('div', 'what');
      what.appendChild(el('span', null, r.outlet));
      var href = safeUrl(r.url);
      var head;
      if (href) { head = el('a', null, r.headline); head.href = href; head.target = '_blank'; head.rel = 'noopener'; head.style.fontWeight = '600'; }
      else head = el('b', null, r.headline);
      what.append(head, el('span', null, r.summary));
      li.appendChild(what);
      return li;
    }));
  }

  function renderConfig(cfg) {
    var nl = safeUrl(cfg.newsletter_url);
    if (nl) { $('signup-link').href = nl; $('signup').hidden = false; }
    var offers = (cfg.offers || []).filter(function (o) { return safeUrl(o.url); });
    if (!offers.length) return;
    var box = $('offers');
    box.replaceChildren.apply(box, offers.map(function (o) {
      var card = el('div', 'card offer');
      card.append(el('p', 'tile-label', o.label), el('h2', null, o.title), el('p', 'small', o.body));
      var a = el('a', 'btn', o.cta + (o.partner ? ' at ' + o.partner : ''));
      a.href = safeUrl(o.url); a.target = '_blank'; a.rel = 'sponsored noopener';
      a.addEventListener('click', function () { if (typeof window.gtag === 'function') window.gtag('event', 'affiliate_click', { partner: o.partner || o.id, offer: o.id }); });
      card.appendChild(a);
      return card;
    }));
    $('offers-wrap').hidden = false;
  }

  function fail(id) { var n = $(id); if (n) { n.classList.remove('skel'); n.textContent = 'Could not load this section. Try refreshing.'; } }

  load('status').then(renderStatus).catch(function () { fail('headline'); });
  load('money').then(renderMoney).catch(function () { fail('payroll'); });
  load('issues').then(renderIssues).catch(function () {});
  load('key_dates').then(renderDates).catch(function () { fail('dates'); });
  load('timeline').then(function (r) { timelineRows = r; renderTimeline(); }).catch(function () { fail('timeline-list'); });
  load('stoppages').then(renderStoppages).catch(function () { fail('stoppages'); });
  load('news').then(renderNews).catch(function () { fail('news'); });
  fetch('/config.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(renderConfig).catch(function () {});
})();
