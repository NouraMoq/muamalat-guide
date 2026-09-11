/* =============================================================
   هندسة الخريطة ومواضع التركيز — طبقة عرض، لا محتوى.
   المحتوى كله في data.js.

   قواعد الشعار — مستخرجة من ملف الهوية لا مرسومة من الذاكرة
   المصدر: DGA_Template_Ar_compressed.pptx → ppt/media/image1.svg
   رمز الشعار = 7 مسارات متدرّجة، مربع إحاطته 96.8 × 139.8

   إحصاء زوايا كل مقطع مستقيم داخل الرمز:
     90° → 10 مرّات · 35° → 13 مرّة · 145° (مرآة 35°) → 4 مرّات
     ولا زاوية أخرى إطلاقًا.
   سماكة الحدّ 6.30 من ارتفاع 139.8 ⇒ 4.5% من ارتفاع التكوين.
   والنهايات كلها مدوّرة وتُقرأ كعُقد.

   وتلوين الأجزاء السبعة كشف البنية: الرمز ليس مروحة تتفرّع من محور،
   بل وحدات «ساق رأسية + قطر 35°» منفصلة متداخلة، مزاحة قطريًّا.
   الساق أقصر من القطر ⇒ كتلة مضغوطة، ونسبتها العامة 0.69.

   ⇒ تُترجم البنية هنا إلى سلسلة واحدة متعرّجة:
       ساق → قطر → ساق → قطر … ومنافذ المجموعات عند أطراف السيقان.
     كل مقطع فيها وظيفته تنقّل، ولا خط زخرفي واحد.
   ============================================================= */

const A = 35, RAD = A * Math.PI / 180;
const COS = Math.cos(RAD), SIN = Math.sin(RAD);

const CHAIN = {
  viewBox: [367, 152, 337, 616],   /* قصٌّ أضيق ⇒ تكبير الكتلة داخل المساحة نفسها */
  start: { x: 660, y: 260 },        /* المنشأ = «ابدأ»، ومنه تبدأ البنية */

  taskGap:  32,   /* تباعد الإجراءات على امتداد الساق */
  taskLead: 46,   /* فجوة أوضح بين اسم المجموعة وأول إجراء */

  /* المنشأ منفذ أيضًا لكنه ليس مجموعة نِدًّا للبقية: نقطة صغيرة وتسمية خفيفة.
     المجموعات الوظيفية الأربع هي بطلة الخريطة. */
  origin: { group: 'start', label: 'ابدأ', dir: -1 },

  moves: [
    { stem:  120 },
    { diag: 'DL', run: 76 },
    { stem:  200, portal: 'create', label: 'إنشاء المعاملة' },
    { diag: 'UL', run: 76 },
    { stem: -200, portal: 'work',   label: 'العمل على المعاملة' },
    { diag: 'DL', run: 76 },
    { stem:  200, portal: 'find',   label: 'العثور والمتابعة' },
    { diag: 'UL', run: 76 },
    { stem: -120, portal: 'other',  label: 'إجراءات أخرى' }
  ]
};

/* يبني نقاط السلسلة ومواضع المنافذ */
function walk() {
  var p = { x: CHAIN.start.x, y: CHAIN.start.y };
  var pts = [{ x: p.x, y: p.y }], portals = {}, dirAt = {};
  portals[CHAIN.origin.group] = { x: p.x, y: p.y, label: CHAIN.origin.label, origin: true };
  dirAt[CHAIN.origin.group] = CHAIN.origin.dir;
  CHAIN.moves.forEach(function (m) {
    if (m.stem != null) {
      p = { x: p.x, y: p.y + m.stem };
      pts.push({ x: p.x, y: p.y });
      if (m.portal) {
        portals[m.portal] = { x: p.x, y: p.y, label: m.label };
        dirAt[m.portal] = m.stem > 0 ? 1 : -1;
      }
    } else {
      var dx = -m.run * COS, dy = (m.diag === 'DL' ? 1 : -1) * m.run * SIN;
      p = { x: p.x + dx, y: p.y + dy };
      pts.push({ x: p.x, y: p.y });
    }
  });
  return { pts: pts, portals: portals, dir: dirAt };
}

const MAP = {

  /* ---------------------------------------------------------
     ترتيب الاستكشاف على الجوال: تُعرض ثلاث محطات فقط في كل مرة
     (السابقة · الحالية · التالية). ترتيبٌ للتصفّح لا تسلسلٌ إلزامي.
     --------------------------------------------------------- */
  journey: [
    'about', 'login', 'home', 'delegation',
    'internal', 'incoming', 'outgoing',
    'attachments', 'link', 'action', 'sent', 'referral-log',
    'follow-up', 'delivery', 'global-search', 'advanced-search'
  ],

  /* ---------------------------------------------------------
     مستطيلات التركيز — بإحداثيات بكسل اللقطة الأصلية.
     المفتاح: "معرّف المهمة:رقم الخطوة" (الخطوة تبدأ من 1).
     كل مستطيل هنا تم التحقق من موضعه على الصورة المصدر.
     --------------------------------------------------------- */
  focus: {
    'login:2':      { img:'login.png',          x1:596,  y1:294,  x2:716,  y2:312,  label:'تسجيل الدخول' },

    'internal:1':   { img:'home.png',           x1:1408, y1:54,   x2:1558, y2:80,   label:'إنشاء معاملة داخلية جديدة' },
    'internal:2':   { img:'internal-form.png',  x1:1043, y1:40,   x2:1172, y2:74,   label:'معلومات المعاملة الداخلية' },
    'internal:3':   { img:'internal-form.png',  x1:94,   y1:563,  x2:135,  y2:585,  label:'حفظ' },

    'incoming:1':   { img:'home.png',           x1:1275, y1:54,   x2:1409, y2:80,   label:'إنشاء معاملة وارد جديدة' },
    'incoming:2':   { img:'incoming-form.png',  x1:1237, y1:44,   x2:1381, y2:80,   label:'معلومات المعاملة الواردة' },
    'incoming:3':   { img:'incoming-form.png',  x1:112,  y1:662,  x2:159,  y2:687,  label:'حفظ' },

    'outgoing:1':   { img:'home.png',           x1:1143, y1:54,   x2:1277, y2:80,   label:'إنشاء معاملة صادر جديدة' },
    'outgoing:2':   { img:'outgoing-form.png',  x1:1233, y1:46,   x2:1383, y2:80,   label:'معلومات المعاملة الصادرة' },
    'outgoing:3':   { img:'outgoing-form.png',  x1:112,  y1:662,  x2:159,  y2:687,  label:'حفظ' },

    'attachments:1':{ img:'attachments.png',    x1:1069, y1:46,   x2:1172, y2:80,   label:'المرفقات الإلكترونية' },
    'attachments:2':{ img:'attachments.png',    x1:1041, y1:78,   x2:1372, y2:105,  label:'طرق إضافة المرفقات',
                      marks:[ {n:1, x1:1295, y1:81, x2:1370, y2:103, label:'إضافة وثيقة'},
                              {n:2, x1:1122, y1:81, x2:1194, y2:103, label:'مسح ضوئي'},
                              {n:3, x1:1202, y1:81, x2:1287, y2:103, label:'سحب وإسقاط'},
                              {n:4, x1:1043, y1:81, x2:1113, y2:103, label:'محرر النص'} ] },

    'action:1':     { img:'action.png',         x1:1349, y1:50,   x2:1423, y2:98,   label:'الإجراء' },
    'action:2':     { img:'action.png',         x1:1088, y1:108,  x2:1326, y2:138,  label:'الأولوية' },
    'action:3':     { img:'action.png',         x1:18,   y1:184,  x2:1582, y2:288,  label:'الإحالة' },
    'action:4':     { img:'action.png',         x1:18,   y1:295,  x2:1582, y2:478,  label:'التوجيهات' },
    'action:5':     { img:'action.png',         x1:71,   y1:767,  x2:129,  y2:796,  label:'إرسال' },

    'link:3':       { img:'link.png',           x1:11,   y1:296,  x2:110,  y2:322,  label:'ربط المعاملة' },

    'global-search:2': { img:'global-search.png', x1:1045, y1:128, x2:1485, y2:154, label:'شريط البحث' },
    'global-search:3': { img:'global-search.png', x1:1027, y1:158, x2:1553, y2:184, label:'الفلاتر' },

    'advanced-search:3': { img:'advanced-search.png', x1:1422, y1:552, x2:1497, y2:581, label:'بحث' },

    'delegation:3': { img:'delegation.png',     x1:57,   y1:127,  x2:110,  y2:153,  label:'إضافة' }
  }
};
