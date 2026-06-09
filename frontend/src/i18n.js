import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      brandSub: 'Smart Kitchen Requests',
      navRequest: 'New Request',
      navKitchen: 'Kitchen',
      login: 'Sign in with Microsoft',
      logout: 'Sign out',
      loggedInAs: 'Signed in as',

      // login gate
      loginWelcome: 'Welcome to EFB Meals',
      loginSub: 'Sign in to order delicious meals for your team.',
      loginSecure: '🔒 Secured by your organization account',
      demoNote: 'Demo mode — enter your work email to continue.',
      enter: 'Enter',

      // hero
      eyebrow: '🍴 Fresh meals, made simple',
      heroTitlePre: 'Delicious meals for your team,',
      heroTitleAccent: 'just a tap away',
      heroText: 'Pick from a chef-crafted menu or describe exactly what you crave. Fresh, fast, and made for the whole team.',
      ctaOrder: 'Order now',
      ctaMenu: 'Browse menu',
      statMeals: 'Menu items',
      statFast: 'Fast & fresh',
      statBilingual: 'Arabic & English',

      // menu
      menuTitle: 'Today\'s Menu',
      menuSub: 'Pick a dish or switch to a special request',
      modeMenu: 'From the menu',
      modeSpecial: 'Special request',

      // form
      formTitle: 'Create your meal request',
      formSub: 'Tell us who it\'s for and how many people',
      nameLabel: 'Requester name',
      emailLabel: 'Email address',
      deptLabel: 'Department',
      deptPlaceholder: 'e.g. Operations',
      peopleLabel: 'Number of people',
      dateLabel: 'Needed on',
      selectedMeal: 'Selected meal',
      noMealSelected: 'No meal selected yet — pick one above',
      specialLabel: 'Describe your special request',
      specialPlaceholder: 'e.g. 20 mixed sandwiches, 2 vegetarian platters, no nuts...',
      submit: 'Send request',
      submitting: 'Sending...',
      requestSent: 'Request sent to the kitchen! 🎉',
      error: 'Something went wrong. Please try again.',
      pickMealOrSpecial: 'Pick a meal or write a special request.',

      // kitchen
      kitchenTitle: 'Kitchen Dashboard',
      kitchenSub: 'Every incoming request — prepare a budget, then send to SAP',
      kpiNew: 'New',
      kpiBudget: 'Budgeted',
      kpiReady: 'Ready / SAP',
      kpiAll: 'Total',
      refresh: 'Refresh',
      people: 'people',
      special: 'Special request',
      createBudget: 'Create budget',
      viewAttachment: 'View attachment',
      markReady: 'Mark ready → SAP',
      sendingSap: 'Sending to SAP...',
      noRequests: 'No requests yet',
      noRequestsSub: 'New meal requests will appear here instantly.',

      // budget modal
      budgetTitle: 'Create budget request',
      budgetSub: 'Amount and an attachment are required',
      amountLabel: 'Budget amount',
      currencyLabel: 'Currency',
      vendorLabel: 'Vendor (optional)',
      notesLabel: 'Notes (optional)',
      attachmentLabel: 'Attachment (required)',
      chooseFile: 'Click to upload a document',
      fileSelected: 'File ready',
      cancel: 'Cancel',
      save: 'Save budget',
      saving: 'Saving...',
      budgetSaved: 'Budget saved & requester notified',
      attachmentRequired: 'Please attach a document.',
      amountRequired: 'Please enter a valid amount.',

      // statuses
      status_requested: 'New',
      status_budget_requested: 'Budgeted',
      status_ready_for_sap: 'Ready · SAP',

      footer: 'EFB Meals · Designed for a fast, bilingual kitchen workflow.'
    }
  },
  ar: {
    translation: {
      brandSub: 'طلبات المطبخ الذكي',
      navRequest: 'طلب جديد',
      navKitchen: 'المطبخ',
      login: 'دخول بحساب مايكروسوفت',
      logout: 'تسجيل الخروج',
      loggedInAs: 'مسجّل دخول باسم',

      // login gate
      loginWelcome: 'أهلاً بك في EFB Meals',
      loginSub: 'سجّل الدخول عشان تطلب وجبات شهية لفريقك.',
      loginSecure: '🔒 مؤمَّن بحساب مؤسستك',
      demoNote: 'وضع تجريبي — اكتب إيميل العمل عشان تكمّل.',
      enter: 'دخول',

      eyebrow: '🍴 وجبات طازة وببساطة',
      heroTitlePre: 'وجبات شهية لفريقك،',
      heroTitleAccent: 'على بُعد ضغطة',
      heroText: 'اختر من منيو من إعداد الشيف، أو اكتب بالظبط اللي نفسك فيه. طازة، سريعة، ومتعملة للفريق كله.',
      ctaOrder: 'اطلب دلوقتي',
      ctaMenu: 'تصفّح المنيو',
      statMeals: 'صنف في المنيو',
      statFast: 'سريع وطازج',
      statBilingual: 'عربي وإنجليزي',

      menuTitle: 'منيو النهاردة',
      menuSub: 'اختر طبق أو حوّل لطلب خاص',
      modeMenu: 'من المنيو',
      modeSpecial: 'طلب خاص',

      formTitle: 'أنشئ طلب وجبتك',
      formSub: 'قولنا الطلب لمين وعدد كام فرد',
      nameLabel: 'اسم مقدّم الطلب',
      emailLabel: 'البريد الإلكتروني',
      deptLabel: 'الإدارة',
      deptPlaceholder: 'مثال: العمليات',
      peopleLabel: 'عدد الأفراد',
      dateLabel: 'التاريخ المطلوب',
      selectedMeal: 'الوجبة المختارة',
      noMealSelected: 'لسه ما اخترتش وجبة — اختر من فوق',
      specialLabel: 'اكتب طلبك الخاص',
      specialPlaceholder: 'مثال: ٢٠ ساندويتش متنوع، طبقين نباتي، من غير مكسرات...',
      submit: 'أرسل الطلب',
      submitting: 'جاري الإرسال...',
      requestSent: 'تم إرسال الطلب للمطبخ! 🎉',
      error: 'حصل خطأ. حاول تاني.',
      pickMealOrSpecial: 'اختر وجبة أو اكتب طلب خاص.',

      kitchenTitle: 'لوحة المطبخ',
      kitchenSub: 'كل الطلبات الواردة — جهّز الميزانية، وبعدين ابعت لـ SAP',
      kpiNew: 'جديد',
      kpiBudget: 'تم تسعيره',
      kpiReady: 'جاهز / SAP',
      kpiAll: 'الإجمالي',
      refresh: 'تحديث',
      people: 'فرد',
      special: 'طلب خاص',
      createBudget: 'إنشاء ميزانية',
      viewAttachment: 'عرض المرفق',
      markReady: 'تحديد كجاهز → SAP',
      sendingSap: 'جاري الإرسال لـ SAP...',
      noRequests: 'لا توجد طلبات بعد',
      noRequestsSub: 'الطلبات الجديدة هتظهر هنا فوراً.',

      budgetTitle: 'إنشاء طلب ميزانية',
      budgetSub: 'المبلغ والمرفق إجباريان',
      amountLabel: 'مبلغ الميزانية',
      currencyLabel: 'العملة',
      vendorLabel: 'المورّد (اختياري)',
      notesLabel: 'ملاحظات (اختياري)',
      attachmentLabel: 'المرفق (إجباري)',
      chooseFile: 'اضغط لرفع مستند',
      fileSelected: 'الملف جاهز',
      cancel: 'إلغاء',
      save: 'حفظ الميزانية',
      saving: 'جاري الحفظ...',
      budgetSaved: 'تم حفظ الميزانية وإخطار مقدّم الطلب',
      attachmentRequired: 'برجاء إرفاق مستند.',
      amountRequired: 'برجاء إدخال مبلغ صحيح.',

      status_requested: 'جديد',
      status_budget_requested: 'تم تسعيره',
      status_ready_for_sap: 'جاهز · SAP',

      footer: 'EFB Meals · مصمَّم لسير عمل مطبخ سريع وثنائي اللغة.'
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;
