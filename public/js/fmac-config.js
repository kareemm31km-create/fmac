/* إعداد Firebase — مفاتيح الويب ليست أسراراً؛ الحماية الفعلية في قواعد الأمان */
export const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAQqHSpGF_KHGuHQSaN4b2QwBWjU1V-I4Y',
  authDomain:        'technical-7eb3a.firebaseapp.com',
  projectId:         'technical-7eb3a',
  storageBucket:     'technical-7eb3a.firebasestorage.app',
  messagingSenderId: '543894611109',
  appId:             '1:543894611109:web:2baf3b1da5f16215c1d94c',
  measurementId:     'G-6E5SS5BLD6',
};

/* خريطة التبويبات ← مجموعات Firestore.
   الاسم العربي يبقى مرجعاً للهجرة من جدول جوجل. */
export const COL = {
  users:      'users',        // المستخدمين
  plans:      'plans',        // الخطط
  ticks:      'ticks',        // سجل التقييم
  subs:       'subs',         // سجل التسليم
  settings:   'settings',     // الإعدادات
  cancels:    'cancels',      // سجل الإلغاء
  items:      'planItems',    // بنود الخطط
  attend:     'attendance',   // سجل الحضور
  replies:    'replies',      // ردود المدربين
  stages:     'stages',       // دورة الخطة
  versions:   'versions',     // نسخ الخطط
  segs:       'segments',     // زمن الأجزاء
  devs:       'deviations',   // سجل الانحراف
  acts:       'acts',         // حالة المهام
  sess:       'sessions',     // بصمة الحصص
  notes:      'notes',        // الملاحظات الفنية
  weeks:      'weeks',        // إغلاق الأسابيع
  results:    'results',      // نتائج البطولات
  shields:    'shields',      // دروع المواسم
  camps:      'camps',        // معسكرات المواسم
  national:   'national',     // لاعبو المنتخب
  agenda:     'agenda',       // أجندة القسم
  visits:     'visits',       // الزيارات الفنية
  calendar:   'calendar',     // كالندر الموسم
  audit:      'audit',        // سجل التدقيق
  monthly:    'monthlyPlans',   // الخطط الشهرية
  reviews:    'monthlyReviews', // تقييمات الخطط الشهرية
};

/* المجموعات التي يكتبها المدرب — ما عداها للإدارة وحدها */
export const COACH_WRITABLE = [
  COL.monthly, COL.reviews,
  COL.subs, COL.cancels, COL.attend, COL.replies,
  COL.segs, COL.devs, COL.acts, COL.sess, COL.stages, COL.versions,
];

export const BUILD = 7;

/* حساب الإدارة الأوّل — يُنشأ ملفّه تلقائياً عند أوّل دخول.
   ليس سرّاً: القواعد تعترف بهذا المعرّف وحده، ومن يملكه يملك الحساب أصلاً. */
export const BOOTSTRAP_UID = 'hHUCpTBk8eR5xIEXjzrB5mP3kk12';
