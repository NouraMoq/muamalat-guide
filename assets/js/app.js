/* =============================================================
   الدليل التفاعلي لنظام معاملات — منطق الواجهة
   يعتمد على GUIDE (data.js) و MAP (map.js)
   ============================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)');
  var HOVERS = matchMedia('(hover: hover) and (pointer: fine)');
  var NARROW = matchMedia('(max-width: 820px)');
  var NS = 'http://www.w3.org/2000/svg';

  /* rAF متوقّف في التبويب المخفيّ — لذا نتراجع إلى مؤقّت حتى يبقى الرسم صحيحًا */
  function soon(fn) { if (document.hidden) setTimeout(fn, 0); else requestAnimationFrame(fn); }
  function still() { return REDUCE.matches || document.hidden; }

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }
  function sv(t, a) { var n = document.createElementNS(NS, t); Object.keys(a).forEach(function (k) { n.setAttribute(k, a[k]); }); return n; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* ==========================================================
     حالة الخط — لا يُضمَّن أي ملف خط، ولا يُطلب شيء من الشبكة.
     نقيس عرض نصّ عربي بعائلتين أساسيّتين: إن غيّرت "Diodrum Arabic"
     العرض فهي متاحة فعلًا، وإلا فالمعروض بديل ⇒ تُضاف nofd.
     وإن تساوى الوزن ٥٠٠ مع ٤٠٠ فالعائلة البديلة بلا وزن متوسط ⇒ nomid.
     ========================================================== */
  function fontState() {
    var cx = document.createElement('canvas').getContext('2d');
    var S = 'معاملات نظام الإجراءات', root = document.documentElement;
    function q(f) { return /^(system-ui|sans-serif|serif)$/.test(f) ? f : '"' + f + '"'; }
    function w(fam, wt) { cx.font = (wt || 400) + ' 64px ' + fam; return cx.measureText(S).width; }
    /* عائلة متاحة = وجودها يغيّر العرض مقابل الأساس وحده */
    function usable(f) {
      return ['monospace', 'serif'].some(function (b) {
        return Math.abs(w(q(f) + ',' + b) - w(b)) > 0.5;
      });
    }
    /* الترتيب نفسه المكتوب في --font، فنعرف أيّ عائلة ستُعرض فعلًا */
    var CAND = ['Diodrum Arabic', 'Dubai', 'Segoe UI', 'Noto Sans Arabic',
                'system-ui', 'Tahoma', 'Arial'], shown = null;
    for (var i = 0; i < CAND.length && !shown; i++) if (usable(CAND[i])) shown = CAND[i];
    root.classList.toggle('nofd', shown !== 'Diodrum Arabic');
    /* هل للعائلة المعروضة وزن متوسط حقيقي؟
       عرض السطر لا يصلح مقياسًا: عروض Diodrum تكاد لا تتغيّر بين أوزانه
       (٦٣٨٫٩ عند ٤٠٠ مقابل ٦٣٨٫٥ عند ٥٠٠). فيُقاس الحبر نفسه:
       نرسم النصّ ونعدّ البكسلات الداكنة. المقيس هنا:
       Diodrum ‎+٣٢٪ وخط النظام ‎+١٥٪ عند ٥٠٠، بينما Tahoma وArial صفر بالضبط. */
    var f = q(shown || 'sans-serif');
    function ink(wt) {
      var cn = document.createElement('canvas'); cn.width = 300; cn.height = 52;
      var g = cn.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, 300, 52);
      g.fillStyle = '#000'; g.font = wt + ' 34px ' + f; g.textBaseline = 'middle';
      g.fillText('معاملات نظام', 8, 28);
      var d, n = 0, i;
      try { d = g.getImageData(0, 0, 300, 52).data; } catch (e) { return -1; }
      for (i = 0; i < d.length; i += 4) if (d[i] < 128) n++;
      return n;
    }
    var i4 = ink(400), i5 = ink(500), i6 = ink(600);
    root.classList.toggle('nomid',
      i4 > 0 && (i5 - i4) / i4 < 0.05 && (i6 - i4) / i4 > 0.15);
    return shown;
  }
  fontState();

  /* مقاسات اللقطات — لحجز المساحة قبل التحميل. عند إضافة لقطة، أضف سطرها. */
  var IMG_SIZE = {
    'login.png':[1213,475], 'home.png':[1559,757], 'internal-form.png':[1174,588],
    'incoming-form.png':[1383,692], 'outgoing-form.png':[1383,692], 'attachments.png':[1386,694],
    'action.png':[1600,802], 'referral-log.png':[1387,694], 'link.png':[1373,688],
    'delivery-screen.png':[1600,802], 'delivery-print.jpg':[1125,501], 'global-search.png':[1600,802],
    'advanced-search.png':[1600,803], 'sent.png':[1385,695], 'follow-up.png':[1385,694],
    'delegation.png':[1387,695]
  };
  function sizeOf(s) { return IMG_SIZE[String(s).split('/').pop()] || null; }

  /* ------------------------ فهرسة المحتوى ------------------------ */
  var TASKS = {}, OWNER = {}, ORDER = [];
  GUIDE.groups.forEach(function (g) {
    g.tasks.forEach(function (t) { TASKS[t.id] = t; OWNER[t.id] = g; ORDER.push(t.id); });
  });
  function blocksOf(t) { return t.mode === 'steps' ? (t.steps || []) : (t.blocks || []); }
  function firstShot(t) { return blocksOf(t).filter(function (b) { return b.img; })[0] || null; }

  /* --------------------------- البحث --------------------------- */
  function norm(s) {
    return String(s || '').replace(/[ً-ْٰـ]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[«»"'،؛.,:()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  var INDEX = {};
  ORDER.forEach(function (id) {
    var t = TASKS[id], strong = [t.title].concat(t.keywords || []);
    var weak = [t.when || '', t.definition || '', t.info || '', t.warn || ''];
    blocksOf(t).forEach(function (b) {
      weak.push(b.text || '', b.heading || '', b.caption || '');
      (b.list || []).forEach(function (i) { weak.push(i); });
    });
    INDEX[id] = { s: norm(strong.join(' ')), w: norm(weak.join(' ')) };
  });
  function search(q) {
    var terms = norm(q).split(' ').filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    ORDER.forEach(function (id) {
      var h = INDEX[id], sc = 0, all = true;
      terms.forEach(function (t) {
        if (h.s.indexOf(t) !== -1) sc += 10;
        else if (h.w.indexOf(t) !== -1) sc += 3;
        else all = false;
      });
      if (all) out.push({ id: id, sc: sc });
    });
    out.sort(function (a, b) { return b.sc - a.sc || ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
    return out.map(function (r) { return r.id; });
  }

  /* ==========================================================
     خريطة سطح المكتب — سلسلة هندسة الشعار
     ========================================================== */
  var VX = CHAIN.viewBox[0], VY = CHAIN.viewBox[1];
  var VW = CHAIN.viewBox[2], VH = CHAIN.viewBox[3];
  var net = $('#net'), nodesL = $('#nodes'), token = $('#token');
  var mapBox = $('#map'), stage = $('#stage'), layer = $('#linklayer');

  var CH = walk();                       /* نقاط السلسلة والمنافذ */
  var PORTAL_AT = {}, TASKPOS = {}, GROUP_ORDER = [];
  var activeGroup = null, activeId = null;
  var routeEl = null, leadPath = null, connector = null, built = false;

  function buildMap() {
    net.setAttribute('viewBox', CHAIN.viewBox.join(' '));
    net.appendChild(sv('path', { class: 'ln',
      d: 'M' + CH.pts.map(function (p) { return p.x + ',' + p.y; }).join(' L') }));

    Object.keys(CH.portals).forEach(function (gid) {
      var p = CH.portals[gid];
      for (var i = 0; i < CH.pts.length; i++)
        if (Math.abs(CH.pts[i].x - p.x) < .01 && Math.abs(CH.pts[i].y - p.y) < .01) { PORTAL_AT[gid] = i; break; }
    });

    /* امتداد كل مجموعة: الساق نفسها تستمرّ فتُفتح الإجراءات عليها */
    Object.keys(CH.portals).forEach(function (gid) {
      var p = CH.portals[gid], dir = CH.dir[gid];
      var g = GUIDE.groups.filter(function (x) { return x.id === gid; })[0];
      if (!g) return;
      GROUP_ORDER.push(gid);
      var last = CHAIN.taskLead + (g.tasks.length - 1) * CHAIN.taskGap;
      net.appendChild(sv('path', { class: 'ln ln--ext', 'data-ext': gid,
        d: 'M' + p.x + ',' + p.y + ' L' + p.x + ',' + (p.y + dir * last) }));
      g.tasks.forEach(function (t, k) {
        TASKPOS[t.id] = { x: p.x, y: p.y + dir * (CHAIN.taskLead + k * CHAIN.taskGap) };
      });
    });

    Object.keys(CH.portals).forEach(function (gid) {
      var g = GUIDE.groups.filter(function (x) { return x.id === gid; })[0];
      if (!g) return;
      var wrap = el('div', 'grp'); wrap.dataset.grp = gid;
      g.tasks.forEach(function (t) {
        var q = TASKPOS[t.id];
        var b = el('button', 'n'); b.type = 'button'; b.dataset.node = t.id; b.dataset.grp = gid;
        b.style.left = ((q.x - VX) / VW * 100) + '%'; b.style.top = ((q.y - VY) / VH * 100) + '%';
        b.appendChild(el('span', 'n__d'));
        b.appendChild(el('span', 'n__t', t.title));
        b.setAttribute('aria-label', t.title + (t.when ? ' — ' + t.when : ''));
        wrap.appendChild(b);
      });
      var p = CH.portals[gid];
      var c = el('button', 'cap cap--' + (CH.dir[gid] > 0 ? 'down' : 'up') + (p.origin ? ' cap--origin' : ''));
      c.type = 'button'; c.dataset.grp = gid;
      c.style.left = ((p.x - VX) / VW * 100) + '%'; c.style.top = ((p.y - VY) / VH * 100) + '%';
      c.appendChild(el('span', 'cap__d'));
      c.appendChild(el('span', 'cap__t', p.label || g.title));
      c.setAttribute('aria-label', (p.label || g.title) + ' — ' + g.tasks.length + ' إجراءات');
      wrap.appendChild(c);
      nodesL.appendChild(wrap);
    });

    $$('.ln', net).forEach(function (p) { p.style.setProperty('--len', p.getTotalLength()); });
    built = true;
  }

  /* ==========================================================
     محرّك الملاءمة — يشتقّ مقاس التكوين من المحتوى المرئي فعلًا
     لا من أبعاد مصمَّمة لمقاس واحد.

     صندوق الإحاطة يضمّ: المسارات · منافذ المجموعات · تسمياتها ·
     أسماء الإجراءات · رمز المعاملة · المسار النشط. وتُقاس تسميات
     الإجراءات كلها ولو كانت مخفيّة — فالمقاس محسوب لأسوأ حالة،
     ومن ثمّ لا يتغيّر شيء حين تُفتح مجموعة: لا قفزة ولا إعادة حساب.

     التسميات نصّ بمقاس ثابت لا يصغر مع الخريطة، فالعلاقة بين
     الارتفاع والعرض المطلوب ليست خطّية ⇒ نُكرّر حتى الاستقرار.
     والنسبة 337:616 ثابتة، فلا تتبدّل الهندسة ولا أطوال السيقان.
     ========================================================== */
  var FIT_MAX = 840, FIT_MIN = 330;     /* سقف التكوين الطبيعي وأرضيّته */
  var ASPECT  = VW / VH;                /* نسبة التكوين — لا تتغيّر */
  var INK = 10;                         /* فائض الحبر: سماكة الحدّ، تكبير العقدة
                                           عند التحويم، الرمز، وانزياح التسمية */

  /* الحدّ الأدنى الذي طُلب: ٢٤–٣٢ على سطح المكتب، ١٦–٢٠ على الأصغر.
     يُؤخذ أدنى النطاق حفاظًا على مقاس التكوين المعتمد. */
  function safePad() { return innerWidth < 900 ? 18 : 24; }

  /* المساحة المتاحة للخريطة: مسارها في الشبكة عرضًا، والمنظور ارتفاعًا */
  function cellBox() {
    var r = stage.getBoundingClientRect(), cs = getComputedStyle(stage);
    var pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
    var pt = parseFloat(cs.paddingTop) || 0, pb = parseFloat(cs.paddingBottom) || 0;
    var tracks = cs.gridTemplateColumns.split(' ').map(parseFloat)
                   .filter(function (n) { return !isNaN(n); });
    var gap = parseFloat(cs.columnGap) || 0;
    var two = tracks.length > 1;
    var i = two ? 1 : 0;                /* الخريطة في المسار الثاني عند عمودين */
    var x = r.right - pr;               /* اتجاه RTL: المسار الأول يبدأ من اليمين */
    for (var j = 0; j < i; j++) x -= tracks[j] + gap;
    var left = tracks.length ? x - tracks[i] : r.left + pl;
    var top, bot;
    /* الارتفاع يُقاس على المنظور لا على الساحة: ارتفاع الساحة يتبع الخريطة،
       فلو قِيس عليه لتغذّى الحساب من نفسه وكبرت الخريطة بلا حدّ. */
    if (two) { top = pt; bot = innerHeight - pb; }
    else {                              /* عمود واحد: نافذة بمقاس المنظور تحت الترويسة */
      var hd = $('.top'); top = hd ? hd.getBoundingClientRect().bottom : 0; bot = innerHeight;
    }
    return { left: left, right: x, top: top, bottom: bot };
  }

  /* صندوق إحاطة كل ما يُرى — بإحداثيات المنظور */
  function contentBox() {
    var b = null;
    function add(r) {
      if (!r || (!r.width && !r.height)) return;
      b = b ? { l: Math.min(b.l, r.left), t: Math.min(b.t, r.top),
                r: Math.max(b.r, r.right), b: Math.max(b.b, r.bottom) }
            : { l: r.left, t: r.top, r: r.right, b: r.bottom };
    }
    add(net.getBoundingClientRect());
    $$('.cap__d,.cap__t,.n__d,.n__t', nodesL).forEach(function (e) { add(e.getBoundingClientRect()); });
    return b;
  }

  function fitMap() {
    if (!built || !mapBox.getClientRects().length) return;
    var pad = safePad(), i, h;
    for (i = 0; i < 5; i++) {
      var box = cellBox(), c = contentBox(), m = mapBox.getBoundingClientRect();
      if (!c || !m.width || !m.height) return;
      var oL = (m.left - c.l) + INK, oR = (c.r - m.right) + INK;   /* فائض التسميات */
      var oT = (m.top - c.t) + INK,  oB = (c.b - m.bottom) + INK;  /* ثابت لا يصغر */
      var aW = (box.right - box.left) - 2 * pad;
      var aH = (box.bottom - box.top) - 2 * pad;
      h = Math.max(FIT_MIN, Math.min(FIT_MAX, (aW - oL - oR) / ASPECT, aH - oT - oB));
      if (Math.abs(h - m.height) < 0.5) break;
      mapBox.style.setProperty('--mh', h.toFixed(1) + 'px');
    }
    /* وإن بقي طرفٌ يلامس حافة البداية، أُزيح الكتلة دون مسّ مقاسها */
    mapBox.style.marginInlineStart = '0px';
    var bx = cellBox(), cc = contentBox();
    if (!cc) return;
    var over = Math.max(0, (cc.r + INK) - (bx.right - pad));
    if (over > 0.5) mapBox.style.marginInlineStart = over.toFixed(1) + 'px';
  }

  function toStage(x, y) {
    var g = mapBox.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = g.width / VW;
    return { x: g.left - s.left + (x - VX) * k, y: g.top - s.top + (y - VY) * k };
  }
  function place(x, y) { token.style.left = x + 'px'; token.style.top = y + 'px'; }
  function sizeLayer() {
    var s = stage.getBoundingClientRect();
    layer.setAttribute('width', s.width); layer.setAttribute('height', s.height);
    layer.setAttribute('viewBox', '0 0 ' + s.width + ' ' + s.height);
    return s;
  }

  function routeTo(gid, taskId) {
    var pts = CH.pts.slice(0, PORTAL_AT[gid] + 1).map(function (p) { return { x: p.x, y: p.y }; });
    if (taskId) pts.push({ x: TASKPOS[taskId].x, y: TASKPOS[taskId].y });
    return pts;
  }
  function polyLen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i-1].x, p[i].y - p[i-1].y); return L; }
  function ptAt(p, d) {
    for (var i = 1; i < p.length; i++) {
      var s = Math.hypot(p[i].x - p[i-1].x, p[i].y - p[i-1].y);
      if (d <= s) { var t = s ? d / s : 0; return { x: p[i-1].x + (p[i].x - p[i-1].x) * t, y: p[i-1].y + (p[i].y - p[i-1].y) * t }; }
      d -= s;
    }
    return p[p.length - 1];
  }
  /* holdToken: إضاءة الطريق دون تحريك «المعاملة» — حركتها محجوزة لاختيار إجراء */
  function drawRoute(pts, onDone, holdToken) {
    if (routeEl) routeEl.remove();
    routeEl = sv('path', { class: 'route', d: 'M' + pts.map(function (p) { return p.x + ',' + p.y; }).join(' L') });
    net.appendChild(routeEl);
    var L = polyLen(pts);
    if (still()) {
      routeEl.setAttribute('stroke-dasharray', L + ' ' + L);
      if (!holdToken) { var e = pts[pts.length - 1], q = toStage(e.x, e.y); place(q.x, q.y); }
      if (onDone) onDone(); return;
    }
    if (holdToken) {
      routeEl.setAttribute('stroke-dasharray', '0 ' + L);
      var t1 = performance.now(), D1 = 620;
      (function g(now) {
        var k = Math.min(1, (now - t1) / D1), e = 1 - Math.pow(1 - k, 3);
        routeEl.setAttribute('stroke-dasharray', (L * e) + ' ' + L);
        if (k < 1) requestAnimationFrame(g);
      })(performance.now());
      return;
    }
    routeEl.setAttribute('stroke-dasharray', '0 ' + L);
    token.classList.add('moving');
    var t0 = performance.now(), DUR = 900;
    (function frame(now) {
      var k = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - k, 3), d = L * e;
      routeEl.setAttribute('stroke-dasharray', d + ' ' + L);
      var p = ptAt(pts, d), q = toStage(p.x, p.y);
      place(q.x, q.y);
      if (k < 1) requestAnimationFrame(frame);
      else { token.classList.remove('moving'); if (onDone) onDone(); }
    })(performance.now());
  }

  /* ---------------------- المعاينة وخيط الوصل ---------------------- */
  var lede = $('#lede'), peek = $('#peek'), pshot = $('#pshot'), pimg = $('#pimg');

  function connect(id) {
    var s = sizeLayer();
    var n = $('.n[data-node="' + id + '"]'); if (!n) return;
    var nr = n.querySelector('.n__d').getBoundingClientRect();
    var ir = pshot.getBoundingClientRect();
    var from = { x: nr.left + nr.width / 2 - s.left, y: nr.top + nr.height / 2 - s.top };
    var toX = ir.left - s.left;
    var toY = Math.min(Math.max(from.y, ir.top - s.top + 26), ir.bottom - s.top - 26);
    var dy = toY - from.y, run = Math.abs(dy) / Math.tan(35 * Math.PI / 180);
    var ex = from.x + Math.min(run, Math.max(0, toX - from.x));
    var ey = from.y + Math.sign(dy) * (ex - from.x) * Math.tan(35 * Math.PI / 180);
    if (connector) connector.remove();
    connector = sv('path', { d: 'M' + from.x + ',' + from.y + ' L' + ex + ',' + ey + ' L' + toX + ',' + toY });
    layer.appendChild(connector);
    pshot.style.setProperty('--ox', '0%');
    pshot.style.setProperty('--oy', ((toY - (ir.top - s.top)) / ir.height * 100) + '%');
  }

  function markExt(gid) {
    $$('.ln--ext', net).forEach(function (p) {
      p.style.opacity = (p.getAttribute('data-ext') === gid) ? '.24' : '0';
    });
  }

  function openGroup(gid) {
    activeGroup = gid; activeId = null;
    $$('.grp').forEach(function (w) { w.classList.toggle('grp-on', w.dataset.grp === gid); });
    markExt(gid);
    $$('.cap').forEach(function (c) { c.classList.toggle('on', c.dataset.grp === gid); });
    $$('.n').forEach(function (n) { n.classList.remove('on'); });
    if (connector) { connector.remove(); connector = null; }
    lede.hidden = false; peek.hidden = true;
    if (leadPath) { leadPath.remove(); leadPath = null; }
    drawRoute(routeTo(gid, null), null, true);
  }

  function showPeek(id) {
    var t = TASKS[id]; if (!t) return;
    var gid = OWNER[id].id;
    activeGroup = gid; activeId = id;
    $$('.grp').forEach(function (w) { w.classList.toggle('grp-on', w.dataset.grp === gid); });
    markExt(gid);
    $$('.cap').forEach(function (c) { c.classList.toggle('on', c.dataset.grp === gid); });
    $$('.n').forEach(function (n) { n.classList.toggle('on', n.dataset.node === id); });

    $('#pkind').textContent = OWNER[id].title;
    $('#ptitle').textContent = t.title;
    $('#pline').textContent = t.when || '';
    $('#pgo').href = '#/task/' + id;
    var b = firstShot(t);
    if (b) { pshot.hidden = false;
      if (pimg.getAttribute('src') !== b.img) { pimg.src = b.img; pimg.alt = b.alt || ''; } }
    else pshot.hidden = true;
    lede.hidden = true; peek.hidden = false;
    if (leadPath) { leadPath.remove(); leadPath = null; }

    drawRoute(routeTo(gid, id), function () {
      soon(function () {
        connect(id);
        if (b && !REDUCE.matches) { pshot.classList.remove('reveal'); void pshot.offsetWidth; pshot.classList.add('reveal'); }
      });
    });
  }

  function clearPeek() {
    activeGroup = null; activeId = null;
    $$('.grp').forEach(function (w) { w.classList.remove('grp-on'); });
    $$('.ln--ext', net).forEach(function (p) { p.style.opacity = '0'; });
    $$('.cap,.n').forEach(function (n) { n.classList.remove('on'); });
    if (routeEl) { routeEl.remove(); routeEl = null; }
    if (connector) { connector.remove(); connector = null; }
    lede.hidden = false; peek.hidden = true;
    if (!built) return;
    var s = toStage(CHAIN.start.x, CHAIN.start.y); place(s.x, s.y);
  }

  function buildLead() {
    var w = $('#word').getBoundingClientRect(), s = sizeLayer();
    var a = { x: w.left - s.left + 12, y: w.bottom - s.top - w.height * 0.36 };
    var o = toStage(CHAIN.start.x, CHAIN.start.y);
    var dy = a.y - o.y, run = Math.abs(dy) / Math.tan(35 * Math.PI / 180);
    var ex = Math.min(a.x, o.x + run);
    if (leadPath) leadPath.remove();
    leadPath = sv('path', { class: 'lead',
      d: 'M' + a.x + ',' + a.y + ' L' + ex + ',' + (o.y + Math.sign(dy) * (ex - o.x) * Math.tan(35 * Math.PI / 180)) +
         ' L' + o.x + ',' + o.y });
    layer.appendChild(leadPath);
    return { a: a, o: o };
  }

  /* ==================== الجوال — نافذة الإجراءات ==================== */
  var JOURNEY = MAP.journey, mi = 4;
  function drawMobile(anim) {
    var id = JOURNEY[mi], t = TASKS[id], b = firstShot(t);
    $('#nowK').textContent = OWNER[id].title;
    $('#nowT').textContent = t.title;
    $('#nowL').textContent = t.when || '';
    $('#mgo').href = '#/task/' + id;
    var ms = $('#mshot'), mimg = $('#mimg');
    if (b) {
      ms.hidden = false;
      if (mimg.getAttribute('src') !== b.img) { mimg.src = b.img; mimg.alt = b.alt || ''; }
      ms.style.setProperty('--ox', '0%'); ms.style.setProperty('--oy', '50%');
      if (anim && !REDUCE.matches) { ms.classList.remove('reveal'); void ms.offsetWidth; ms.classList.add('reveal'); }
    } else ms.hidden = true;
    var p = JOURNEY[mi - 1], n = JOURNEY[mi + 1];
    $('#prev').hidden = !p; $('#next').hidden = !n;
    if (p) $('#prevT').textContent = TASKS[p].title;
    if (n) $('#nextT').textContent = TASKS[n].title;
    $('#mUp').disabled = !p; $('#mDn').disabled = !n;
    $('#counter').textContent = 'الإجراء ' + (mi + 1) + ' من ' + JOURNEY.length;
  }
  function mstep(d) { var n = mi + d; if (n < 0 || n >= JOURNEY.length) return; mi = n; drawMobile(true); }

  /* ==========================================================
     شاشة المهمة
     ========================================================== */
  var body = $('#task-body'), crumb = $('#crumb'), rail = $('#rail');
  var cur = { id: null, i: 0 };

  function noteBox(kind, text) {
    var n = el('div', 'note note--' + (kind === 'warn' ? 'warn' : 'info'));
    n.appendChild(el('b', null, kind === 'warn' ? 'تنبيه' : 'معلومة مهمة'));
    n.appendChild(el('span', null, text));
    return n;
  }

  function renderRail(id) {
    rail.innerHTML = '';
    var mine = OWNER[id] ? OWNER[id].id : null;
    GROUP_ORDER.forEach(function (gid, i) {
      var g = GUIDE.groups.filter(function (x) { return x.id === gid; })[0];
      if (!g) return;
      if (i) rail.appendChild(el('span', 'rail__gap'));
      var name = (CH.portals[gid] && CH.portals[gid].label) || g.title;
      var b = el('button', 'rail__dot'); b.type = 'button';
      b.appendChild(el('span', 'rail__tip', name));
      b.setAttribute('aria-label', name);
      if (gid === mine) { b.classList.add('on'); b.setAttribute('aria-current', 'true'); }
      b.addEventListener('click', function () { location.hash = '#/'; });
      rail.appendChild(b);
    });
  }

  function renderCrumb(t) {
    crumb.innerHTML = '';
    var a = el('a', null, 'خريطة النظام'); a.href = '#/';
    crumb.appendChild(a);
    crumb.appendChild(el('span', null, '—'));
    crumb.appendChild(el('span', null, OWNER[t.id].title));
    crumb.appendChild(el('span', null, '—'));
    var c = el('span', null, t.title); c.setAttribute('aria-current', 'page');
    crumb.appendChild(c);
  }

  /* الترتيب: العنوان ← التعليمة ← اللقطة ← ملاحظة الخطوة ← التفاصيل */
  function buildTask(id) {
    var t = TASKS[id];
    cur.id = id; cur.i = 0;
    body.innerHTML = '';
    renderCrumb(t); renderRail(id);

    var head = el('header', 'thead');
    var h1 = el('h1', null, t.title); h1.id = 'task-title'; h1.tabIndex = -1;
    head.appendChild(h1);
    if (t.when) head.appendChild(el('p', 'thead__when', t.when));
    body.appendChild(head);

    if (t.mode === 'steps') buildSteps(t); else buildInfo(t);

    /* التفاصيل التعريفية والتنبيهات العامة — بعد الجزء العملي */
    if (t.definition || t.warn || t.info) {
      var a = el('aside', 'aside');
      a.appendChild(el('p', 'aside__h', 'تفاصيل'));
      if (t.definition) a.appendChild(el('p', 'aside__t', t.definition));
      if (t.warn) a.appendChild(noteBox('warn', t.warn));
      if (t.info) a.appendChild(noteBox('info', t.info));
      body.appendChild(a);
    }
  }

  /* ---------------------- وضع الخطوات ---------------------- */
  function buildSteps(t) {
    var steps = t.steps;
    var scene = el('section', 'scene');
    var wire = sv('svg', { class: 'scene__wire', 'aria-hidden': 'true' });
    scene.appendChild(wire);
    var lead = el('div', 'scene__lead');
    var of = el('p', 'scene__of');
    var doIt = el('p', 'scene__do');
    lead.appendChild(of); lead.appendChild(doIt);
    var no = el('div', 'scene__no');
    var shotwrap = el('div', 'shotwrap');
    scene.appendChild(lead); scene.appendChild(no); scene.appendChild(shotwrap);
    body.appendChild(scene);

    var after = el('div');           /* ملاحظة الخطوة + الاكتمال */
    body.appendChild(after);

    var nav = el('div', 'nav');
    var prev = el('button', 'btn btn--line'); prev.type = 'button';
    prev.innerHTML = '<span aria-hidden="true">→</span><span>السابق</span>';
    var next = el('button', 'btn btn--go'); next.type = 'button';
    next.innerHTML = '<span>التالي</span><span aria-hidden="true">←</span>';
    var back = el('a', 'btn btn--bare', 'العودة إلى الخريطة'); back.href = '#/';
    nav.appendChild(prev); nav.appendChild(next);
    nav.appendChild(el('span', 'nav__sp')); nav.appendChild(back);
    body.appendChild(nav);

    var lastImg = null, figure = null;

    function drawWire() {
      if (NARROW.matches) { wire.innerHTML = ''; return; }
      var sc = scene.getBoundingClientRect();
      var spot = $('.spot', scene) || $('.mark', scene);
      wire.setAttribute('width', sc.width); wire.setAttribute('height', sc.height);
      wire.setAttribute('viewBox', '0 0 ' + sc.width + ' ' + sc.height);
      wire.innerHTML = '';
      if (!spot) return;
      var nr = no.getBoundingClientRect(), sr = spot.getBoundingClientRect();
      /* الرقم في الطرف الأيسر والصورة يمينه: الخط يمتد من حافة الرقم إلى حافة البؤرة */
      var from = { x: nr.right - sc.left, y: nr.top + nr.height * 0.58 - sc.top };
      var to = { x: sr.left - sc.left, y: sr.top + sr.height / 2 - sc.top };
      if (to.x < from.x + 8) return;
      var mid = (from.x + to.x) / 2;
      wire.appendChild(sv('path', { d: 'M' + from.x + ',' + from.y + ' C' + mid + ',' + from.y + ' ' + mid + ',' + to.y + ' ' + to.x + ',' + to.y }));
    }

    function draw(moved) {
      var i = cur.i, s = steps[i], same = (lastImg && s.img === lastImg);
      no.textContent = pad2(i + 1);
      of.textContent = 'الخطوة ' + (i + 1) + ' من ' + steps.length;
      doIt.textContent = s.text;

      $$('.scene__list', scene).forEach(function (n) { n.remove(); });
      if (s.list) {
        var ul = el('ul', 'scene__list');
        s.list.forEach(function (x, k) {
          var li = el('li');
          li.appendChild(el('b', null, pad2(k + 1)));
          li.appendChild(document.createTextNode(x));
          ul.appendChild(li);
        });
        lead.appendChild(ul);
      }

      if (s.img && same && figure) {
        /* الصورة نفسها: تتحرّك البؤرة ويتحدّث التعليق، دون إعادة بناء المشهد */
        applyFocus($('.shot__frame', figure), cur.id + ':' + (i + 1), s);
        var cap = $('.shot__cap', figure);
        if (s.caption) {
          if (!cap) { cap = el('p', 'shot__cap'); figure.appendChild(cap); }
          cap.textContent = s.caption;
        } else if (cap) cap.remove();
      } else {
        shotwrap.innerHTML = '';
        figure = s.img ? shotFor(s, cur.id + ':' + (i + 1), !same) : null;
        if (figure) shotwrap.appendChild(figure);
      }
      lastImg = s.img || null;

      after.innerHTML = '';
      if (s.note) after.appendChild(noteBox(s.note.type, s.note.text));
      if (i === steps.length - 1) after.appendChild(doneBlock(t));

      prev.disabled = (i === 0);
      next.disabled = (i === steps.length - 1);

      var img = $('.shot__img', scene);
      var settle = function () { drawWire(); if (moved) reveal(); };
      if (img && !img.complete) img.addEventListener('load', settle, { once: true });
      else soon(settle);
    }
    function reveal() {
      var spot = $('.spot', scene) || $('.mark', scene); if (!spot) return;
      var r = spot.getBoundingClientRect();
      if (r.bottom > innerHeight - 8 || r.top < 64)
        spot.scrollIntoView({ block: 'center', behavior: REDUCE.matches ? 'auto' : 'smooth' });
    }

    prev.addEventListener('click', function () { if (cur.i > 0) { cur.i--; draw(true); } });
    next.addEventListener('click', function () { if (cur.i < steps.length - 1) { cur.i++; draw(true); } });
    scene._redraw = drawWire;
    draw(false);
  }

  function doneBlock(t) {
    var d = el('div', 'done');
    d.appendChild(el('div', 'done__line'));
    d.appendChild(el('p', 'done__t', 'اكتمل الشرح'));
    d.appendChild(el('p', 'done__s', 'أنهيت خطوات «' + t.title + '».'));
    var acts = el('div', 'done__acts');
    var m = el('a', 'btn btn--go', 'العودة إلى خريطة معاملات'); m.href = '#/';
    acts.appendChild(m);
    if (t.next && TASKS[t.next]) {
      var n = el('a', 'btn btn--line', 'التالي: ' + TASKS[t.next].title);
      n.href = '#/task/' + t.next; acts.appendChild(n);
    }
    d.appendChild(acts);
    return d;
  }

  /* ---------------------- وضع الشرح المتصل ---------------------- */
  function buildInfo(t) {
    t.blocks.forEach(function (b, i) {
      var sec = el('section', 'info');
      sec.appendChild(el('div', 'info__no', pad2(i + 1)));
      if (b.heading) sec.appendChild(el('h2', 'info__h', b.heading));
      if (b.text) sec.appendChild(el('p', 'info__t', b.text));
      if (b.list) {
        var ul = el('ul', 'scene__list info__x');
        b.list.forEach(function (x, k) {
          var li = el('li');
          li.appendChild(el('b', null, pad2(k + 1)));
          li.appendChild(document.createTextNode(x));
          ul.appendChild(li);
        });
        sec.appendChild(ul);
      }
      if (b.img) {
        var w = el('div', 'info__x');
        w.appendChild(shotFor(b, t.id + ':' + (i + 1), false));
        sec.appendChild(w);
      }
      if (b.note) { var n = noteBox(b.note.type, b.note.text); n.classList.add('info__x'); sec.appendChild(n); }
      body.appendChild(sec);
    });
    var nav = el('div', 'nav');
    var back = el('a', 'btn btn--go', 'العودة إلى الخريطة'); back.href = '#/';
    nav.appendChild(back);
    if (t.next && TASKS[t.next]) {
      var n2 = el('a', 'btn btn--line', 'التالي: ' + TASKS[t.next].title);
      n2.href = '#/task/' + t.next; nav.appendChild(n2);
    }
    body.appendChild(nav);
  }

  /* ------------------------ اللقطة والتركيز ------------------------ */
  function applyFocus(fig, key, b) {
    var f = MAP.focus[key], sz = sizeOf(b.img);
    /* على الصورة نفسها يُعاد استخدام عنصر البؤرة فتنتقل بحركة بدل أن تقفز */
    var keep = (f && !f.marks) ? $('.spot', fig) : null;
    $$('.mark', fig).forEach(function (n) { n.remove(); });
    $$('.spot', fig).forEach(function (n) { if (n !== keep) n.remove(); });
    if (!f || !sz) { if (keep) keep.remove(); return; }
    var W = sz[0], H = sz[1];
    if (f.marks) {
      if (keep) keep.remove();
      f.marks.forEach(function (m) {
        var d = el('span', 'mark');
        d.style.right = ((W - m.x2) / W * 100) + '%';
        d.style.top = (m.y1 / H * 100) + '%';
        d.style.width = ((m.x2 - m.x1) / W * 100) + '%';
        d.style.height = ((m.y2 - m.y1) / H * 100) + '%';
        d.appendChild(el('span', 'mark__n', String(m.n)));
        fig.appendChild(d);
      });
    } else {
      var sp = keep || el('span', 'spot');
      sp.style.right = ((W - f.x2) / W * 100) + '%';
      sp.style.top = (f.y1 / H * 100) + '%';
      sp.style.width = ((f.x2 - f.x1) / W * 100) + '%';
      sp.style.height = ((f.y2 - f.y1) / H * 100) + '%';
      sp.innerHTML = '';
      if (f.label) {
        var tag = el('span', 'spot__tag', f.label);
        if ((W - f.x2) / W > 0.78) tag.classList.add('spot__tag--left');
        sp.appendChild(tag);
      }
      if (!keep) fig.appendChild(sp);
    }
  }

  function shotFor(b, key, arc) {
    var fig = el('figure', 'shot');
    var frame = el('span', 'shot__frame');
    fig.appendChild(frame);
    var img = el('img', 'shot__img');
    img.src = b.img; img.alt = b.alt || ''; img.loading = 'lazy'; img.decoding = 'async';
    var sz = sizeOf(b.img); if (sz) { img.width = sz[0]; img.height = sz[1]; }
    frame.appendChild(img);
    if (arc && !REDUCE.matches) {
      frame.style.setProperty('--ox', '0%'); frame.style.setProperty('--oy', '50%');
      frame.classList.add('revealing');
      setTimeout(function () { frame.classList.remove('revealing'); }, 620);
    }
    applyFocus(frame, key, b);

    var zoom = el('button', 'shot__zoom'); zoom.type = 'button';
    zoom.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle>' +
      '<path d="M20 20l-3.8-3.8M11 8v6M8 11h6"></path></svg><span>تكبير اللقطة</span>';
    zoom.addEventListener('click', function () { openLB(img.src, b.caption || b.alt || '', img.alt, zoom); });
    frame.appendChild(zoom);

    if (!b.caption) return fig;
    var wrap = el('div');
    wrap.appendChild(fig);
    wrap.appendChild(el('p', 'shot__cap', b.caption));
    return wrap;
  }

  /* =========================== عارض الصور =========================== */
  var lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap'), lbBack = null;
  function openLB(src, cap, alt, trigger) {
    lbBack = trigger || document.activeElement;
    lbImg.src = src; lbImg.alt = alt || ''; lbCap.textContent = cap || '';
    lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lb-x').focus();
  }
  function closeLB() {
    lb.hidden = true; lbImg.removeAttribute('src'); document.body.style.overflow = '';
    if (lbBack && lbBack.focus) lbBack.focus();
  }
  $('#lb-x').addEventListener('click', closeLB);
  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb__stage')) closeLB();
  });

  /* =========================== لوحة الأوامر =========================== */
  var pal = $('#pal'), palIn = $('#pal-input'), palList = $('#pal-list');
  var palBack = null, palSel = -1, palIds = [];
  function openPal() {
    palBack = document.activeElement;
    pal.hidden = false; document.body.style.overflow = 'hidden';
    palIn.value = ''; renderPal(''); palIn.focus();
  }
  function closePal() {
    pal.hidden = true; document.body.style.overflow = '';
    if (palBack && palBack.focus) palBack.focus();
  }
  function renderPal(q) {
    palList.innerHTML = '';
    palIds = q.trim() ? search(q) : GUIDE.quickAccess.filter(function (i) { return TASKS[i]; });
    palSel = palIds.length ? 0 : -1;
    if (!palIds.length) {
      var e = el('div', 'pal__empty');
      e.appendChild(el('p', null, 'لم نجد إجراءً مطابقًا لبحثك.'));
      e.appendChild(el('p', null, 'جرّب كلمة واحدة: مرفق · إحالة · وارد · صادر · بحث · متابعة · توقيع'));
      palList.appendChild(e);
      palIn.setAttribute('aria-expanded', 'false');
      return;
    }
    palIn.setAttribute('aria-expanded', 'true');
    palIds.forEach(function (id, i) {
      var t = TASKS[id], b = el('button', 'pal__item' + (i === palSel ? ' on' : ''));
      b.type = 'button'; b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', i === palSel ? 'true' : 'false');
      b.appendChild(el('b', null, t.title));
      b.appendChild(el('i', null, t.when || ''));
      b.appendChild(el('em', null, OWNER[id].title));
      b.addEventListener('click', function () { closePal(); location.hash = '#/task/' + id; });
      palList.appendChild(b);
    });
  }
  function palMove(d) {
    if (!palIds.length) return;
    palSel = (palSel + d + palIds.length) % palIds.length;
    $$('.pal__item', palList).forEach(function (n, i) {
      n.classList.toggle('on', i === palSel);
      n.setAttribute('aria-selected', i === palSel ? 'true' : 'false');
      if (i === palSel) n.scrollIntoView({ block: 'nearest' });
    });
  }
  $('#open-pal').addEventListener('click', openPal);
  $('#m-all').addEventListener('click', openPal);
  $('#pal-veil').addEventListener('click', closePal);
  palIn.addEventListener('input', function () { renderPal(palIn.value); });
  palIn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); }
    else if (e.key === 'Enter' && palSel >= 0) { e.preventDefault(); closePal(); location.hash = '#/task/' + palIds[palSel]; }
  });

  /* ======================== لوحة المفاتيح العامة ======================== */
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); if (pal.hidden) openPal(); else closePal(); return;
    }
    if (e.key === 'Escape') {
      if (!lb.hidden) { closeLB(); return; }
      if (!pal.hidden) { closePal(); return; }
      if (!$('#screen-task').hidden) { location.hash = '#/'; return; }
      if (!peek.hidden) { clearPeek(); return; }
    }
    if (!lb.hidden && e.key === 'Tab') { e.preventDefault(); $('#lb-x').focus(); }
    if (!$('#screen-task').hidden && pal.hidden && lb.hidden) {
      var t = TASKS[cur.id];
      if (t && t.mode === 'steps') {
        if (e.key === 'ArrowLeft') { var n = $('.nav .btn--go'); if (n && !n.disabled) n.click(); }
        if (e.key === 'ArrowRight') { var p = $('.nav .btn--line'); if (p && !p.disabled) p.click(); }
      }
    }
  });

  /* ============================= التوجيه ============================= */
  var scMap = $('#screen-map'), scTask = $('#screen-task');
  function route() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (parts[0] === 'task' && TASKS[parts[1]]) {
      buildTask(parts[1]);
      scMap.hidden = true; scTask.hidden = false;
      scrollTo(0, 0);
      var h = $('#task-title'); if (h) h.focus({ preventScroll: true });
      return;
    }
    scTask.hidden = true; scMap.hidden = false;
    clearPeek(); scrollTo(0, 0);
  }
  addEventListener('hashchange', route);

  /* ============================== الربط ============================== */
  buildMap();
  fitMap();
  drawMobile(false);
  route();
  var lead = buildLead();

  nodesL.addEventListener('mouseover', function (e) {
    if (!HOVERS.matches) return;
    var n = e.target.closest('.n');
    if (n && n.dataset.grp === activeGroup) { showPeek(n.dataset.node); return; }
    var c = e.target.closest('.cap');
    if (c && c.dataset.grp !== activeGroup) openGroup(c.dataset.grp);
  });
  nodesL.addEventListener('focusin', function (e) {
    var n = e.target.closest('.n');
    if (n) { showPeek(n.dataset.node); return; }
    var c = e.target.closest('.cap');
    if (c) openGroup(c.dataset.grp);
  });
  nodesL.addEventListener('click', function (e) {
    var n = e.target.closest('.n');
    if (n) {
      if (!HOVERS.matches && activeId !== n.dataset.node) { showPeek(n.dataset.node); return; }
      location.hash = '#/task/' + n.dataset.node; return;
    }
    var c = e.target.closest('.cap');
    if (c) openGroup(c.dataset.grp);
  });
  mapBox.addEventListener('mouseleave', function () { if (HOVERS.matches) clearPeek(); });

  $('#mUp').addEventListener('click', function () { mstep(-1); });
  $('#mDn').addEventListener('click', function () { mstep(1); });
  $('#prev').addEventListener('click', function () { mstep(-1); });
  $('#next').addEventListener('click', function () { mstep(1); });
  var ty = null;
  $('#win').addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  $('#win').addEventListener('touchend', function (e) {
    if (ty == null) return;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dy) > 46) mstep(dy < 0 ? 1 : -1);
    ty = null;
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    var sc = $('.scene'); if (sc && sc._redraw) sc._redraw();
    if (!scMap.hidden && built) {
      fitMap();
      if (activeId) { connect(activeId); var g = TASKPOS[activeId], q = toStage(g.x, g.y); place(q.x, q.y); }
      else { var r = toStage(CHAIN.start.x, CHAIN.start.y); place(r.x, r.y); }
      token.classList.add('in');
    }
  });

  addEventListener('resize', function () {
    var sc = $('.scene'); if (sc && sc._redraw) sc._redraw();
    if (scMap.hidden) return;
    fitMap();
    if (activeId) { connect(activeId); var g = TASKPOS[activeId], q = toStage(g.x, g.y); place(q.x, q.y); }
    else { var r = toStage(CHAIN.start.x, CHAIN.start.y); place(r.x, r.y); }
  });

  /* عرض التسميات يتبع الخط المستقرّ، فتُعاد الملاءمة مرّة بعد جاهزيته */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      fontState(); fitMap();
      if (!scMap.hidden && built) {
        if (activeId) { connect(activeId); var g = TASKPOS[activeId], q = toStage(g.x, g.y); place(q.x, q.y); }
        else { var r = toStage(CHAIN.start.x, CHAIN.start.y); place(r.x, r.y); }
      }
    });
  }

  /* الإقلاع: يُرسم المسار، ثم تظهر المعاملة عند العنوان وتنساب إلى بدايته */
  if (!still()) {
    mapBox.classList.add('map--intro');
    place(lead.a.x, lead.a.y);
    setTimeout(function () { token.classList.add('in'); }, 420);
    setTimeout(function () {
      if (!leadPath) return;                       /* أُزيل لأن المستخدم تفاعل مبكرًا */
      token.classList.add('moving');
      var L = leadPath.getTotalLength(), t0 = performance.now(), D = 760;
      (function f(now) {
        if (!leadPath) { token.classList.remove('moving'); return; }
        var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
        var p = leadPath.getPointAtLength(e * L);
        place(p.x, p.y);
        if (k < 1) requestAnimationFrame(f);
        else { token.classList.remove('moving'); if (leadPath) { leadPath.remove(); leadPath = null; } }
      })(performance.now());
    }, 760);
    setTimeout(function () { mapBox.classList.remove('map--intro'); }, 1700);
  } else {
    if (leadPath) { leadPath.remove(); leadPath = null; }
    var q0 = toStage(CHAIN.start.x, CHAIN.start.y);
    place(q0.x, q0.y); token.classList.add('in');
  }
})();
