// ============================================================
// EFB Meals — branded HTML email templates.
// Table-based layout (renders in Outlook/iOS), inline base64 logo, EFB palette
// with a warm, appetizing food accent band.
// ============================================================
const fs = require('fs');
const path = require('path');

const BRAND = {
  emerald: '#085648',
  emerald700: '#0a6a59',
  sapling: '#70C16F',
  orange: '#FF6300',
  orangeDark: '#d65300',
  gold: '#D1B671',
  goldLight: '#f0e2bf',
  melon: '#CC4948',
  ink: '#0e1f1c',
  inkSoft: '#56706a',
  paper: '#ffffff',
  paperSoft: '#f5f7f5',
  greige: '#e3e8e6'
};

// Embed the logo once so it renders without VPN / hosted assets.
const LOGO_DATA_URI = (() => {
  for (const name of ['logo.jpg', 'logo.png']) {
    const p = path.join(__dirname, '..', 'assets', name);
    if (fs.existsSync(p)) {
      const mime = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
    }
  }
  return '';
})();

// ── shared layout ──────────────────────────────────────────
function layout({ emoji, accent = BRAND.orange, chip, chipColor = BRAND.emerald, title, intro, content, footerNote = 'بريد تلقائي · لا ترد عليه · Automated message' }) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
</head>
<body style="margin:0;padding:0;background:${BRAND.paperSoft};font-family:'Segoe UI','Segoe UI Arabic',Tahoma,Arial,sans-serif;color:${BRAND.ink};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.paperSoft};">
<tr><td style="padding:36px 16px;" align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${BRAND.paper};border-radius:18px;overflow:hidden;border:1px solid ${BRAND.greige};box-shadow:0 12px 40px rgba(8,30,28,.08);">

  <!-- Header: emerald with logo -->
  <tr><td bgcolor="${BRAND.emerald}" style="background:${BRAND.emerald};padding:20px 28px;" dir="rtl">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="vertical-align:middle;width:56px;">
        <img src="${LOGO_DATA_URI}" alt="بنك الطعام المصري" width="44" height="44" style="display:block;border:0;background:#fff;border-radius:10px;padding:4px;object-fit:contain;">
      </td>
      <td style="vertical-align:middle;padding-inline-start:14px;">
        <div style="font-size:16px;font-weight:800;color:#fff;">بنك الطعام المصري · EFB Meals</div>
        <div style="font-size:11px;color:#cfe3dc;letter-spacing:1px;margin-top:3px;">طلبات المطبخ الذكي · Smart Kitchen</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Appetizing accent band with the email's food emoji -->
  <tr><td align="center" style="background:linear-gradient(135deg,${accent},${BRAND.gold});padding:24px;font-size:46px;line-height:1;">${emoji}</td></tr>

  <!-- Chip + title -->
  <tr><td style="padding:24px 30px 4px 30px;" dir="rtl" align="center">
    <div style="display:inline-block;background:${chipColor};padding:6px 14px;border-radius:99px;font-size:11px;font-weight:800;color:#fff;letter-spacing:.6px;">${chip}</div>
    <h2 style="margin:14px 0 0 0;font-size:20px;font-weight:900;color:${BRAND.emerald};line-height:1.4;">${title}</h2>
  </td></tr>

  <!-- Intro -->
  ${intro ? `<tr><td style="padding:10px 30px 4px 30px;color:${BRAND.inkSoft};font-size:14px;line-height:1.8;" dir="rtl" align="center">${intro}</td></tr>` : ''}

  <!-- Body -->
  <tr><td style="padding:16px 30px 26px 30px;" dir="rtl">${content}</td></tr>

  <!-- Footer -->
  <tr><td style="background:${BRAND.paperSoft};padding:16px 30px;border-top:1px solid ${BRAND.greige};" dir="rtl">
    <span style="font-size:11px;font-weight:800;color:${BRAND.emerald};">بنك الطعام المصري — EFB Meals</span>
    <span style="font-size:11px;color:#9aa8a3;"> · ${footerNote}</span>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

function detailsTable(rows) {
  const body = rows
    .filter((r) => r && r[2] != null && r[2] !== '')
    .map(
      ([ar, en, val]) => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid ${BRAND.greige};color:${BRAND.inkSoft};font-size:13px;width:42%;">${ar}&nbsp;&nbsp;<span style="opacity:.5;font-size:12px;">·&nbsp;${en}</span></td>
        <td style="padding:11px 14px;border-bottom:1px solid ${BRAND.greige};font-size:14px;font-weight:700;color:${BRAND.ink};">${val}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BRAND.greige};border-radius:12px;overflow:hidden;background:${BRAND.paper};">${body}</table>`;
}

// Cart line items: meal + quantity (the precise order).
function itemsTable(items) {
  if (!items || !items.length) return '';
  const rows = items
    .map(
      (it) => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid ${BRAND.greige};font-size:14px;color:${BRAND.ink};">${it.special ? '📝 ' : (it.emoji ? it.emoji + ' ' : '')}${it.meal_name}${it.description ? `<br><span style="color:${BRAND.inkSoft};font-size:12px;">${it.description}</span>` : ''}</td>
        <td style="padding:11px 14px;border-bottom:1px solid ${BRAND.greige};font-size:15px;font-weight:900;color:${BRAND.orangeDark};text-align:center;width:80px;">× ${it.quantity}</td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BRAND.greige};border-radius:12px;overflow:hidden;background:${BRAND.paper};">
    <tr><td style="background:${BRAND.paperSoft};padding:10px 14px;font-size:12px;font-weight:800;color:${BRAND.inkSoft};">الصنف · Item</td>
        <td style="background:${BRAND.paperSoft};padding:10px 14px;font-size:12px;font-weight:800;color:${BRAND.inkSoft};text-align:center;">الكمية · Qty</td></tr>
    ${rows}
  </table>`;
}

function totalBox(label, value) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
    <td style="background:${BRAND.goldLight};border-radius:12px;padding:14px 18px;" dir="rtl">
      <span style="font-size:13px;color:${BRAND.orangeDark};font-weight:700;">${label}</span>
      <span style="float:left;font-size:18px;font-weight:900;color:${BRAND.orangeDark};">${value}</span>
    </td></tr></table>`;
}

const money = (v) => (v == null ? '—' : `${Number(v).toLocaleString()} EGP`);
const mealLabel = (r) => (r.is_special ? 'طلب خاص / Special request' : r.meal_name || `#${r.meal_id}`);
const classLabel = (c) => (c === 'hot' ? 'وجبة ساخنة · Hot meal' : c === 'ready' ? 'جاهزة · Ready-to-eat' : '');

// shared order-detail rows (requester + order meta)
function orderRows(req) {
  return [
    ['رقم الطلب', 'Request #', `#${req.id}`],
    ['مقدّم الطلب', 'Requester', `${req.requester_name}<br><span style="color:#56706a;font-weight:400;font-size:12px;">${req.requester_email}</span>`],
    ['الإدارة', 'Department', req.department],
    ['التليفون', 'Phone', req.phone],
    ['نوع الطلب', 'Type', req.type],
    ['التصنيف', 'Classification', classLabel(req.classification)],
    ['المكان', 'Location', req.location],
    ['عدد الأشخاص', 'People', req.people],
    ['التاريخ المطلوب', 'Needed on', req.needed_date || 'في أقرب وقت / ASAP'],
    ['وقت الاستلام', 'Delivery time', req.needed_time],
    ['ملاحظات', 'Notes', req.notes]
  ];
}

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

function ctaButton(text, url, bg = BRAND.emerald) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;"><tr><td align="center">
    <a href="${url}" style="display:inline-block;background:${bg};color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 34px;border-radius:10px;">${text}</a>
  </td></tr></table>`;
}

// Two side-by-side approve/reject buttons for in-email decisions.
function approveRejectButtons(approveUrl, rejectUrl) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;table-layout:fixed;"><tr>
    <td width="50%" style="padding-inline-end:6px;"><a href="${approveUrl}" style="display:block;background:${BRAND.sapling};color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:15px;border-radius:10px;text-align:center;">✓ موافقة · Approve</a></td>
    <td width="50%" style="padding-inline-start:6px;"><a href="${rejectUrl}" style="display:block;background:${BRAND.melon};color:#fff;font-size:14px;font-weight:800;text-decoration:none;padding:15px;border-radius:10px;text-align:center;">✕ رفض · Reject</a></td>
  </tr></table>
  <div style="text-align:center;font-size:11px;color:#9aa8a3;margin-top:10px;">القرار يُنفّذ فوراً · الرابط صالح 72 ساعة</div>`;
}

// To employee: the kitchen set the items + required budget → please upload the PDF.
function budgetSetTemplate(req, budget) {
  const amount = budget && budget.amount != null ? `${Number(budget.amount).toLocaleString()} ${budget.currency || 'EGP'}` : '—';
  const requested = (req.items || []).filter((i) => i.kind === 'requested');
  const notesBox = budget && budget.notes
    ? `<div style="background:${BRAND.paperSoft};border-inline-start:4px solid ${BRAND.orange};border-radius:12px;padding:12px 16px;margin-top:12px;color:${BRAND.ink};">📝 ${budget.notes}</div>`
    : '';
  return layout({
    emoji: '💰',
    accent: BRAND.gold,
    chip: 'موازنة مطلوبة · Budget required',
    chipColor: BRAND.gold,
    title: 'تمت الموافقة على طلبك',
    intro: 'وافق المطبخ على طلبك وحدّد الأصناف والموازنة المطلوبة. من فضلك ارفع مستند الموازنة (PDF) من «طلباتي».<br>Your order is approved — here are the items & required budget. Please upload the budget PDF from “My Requests”.',
    content:
      (requested.length ? itemsTable(requested) + '<div style="height:12px"></div>' : '') +
      totalBox('الموازنة المطلوبة · Required budget', amount) +
      notesBox +
      ctaButton('⬆️ رفع مستند الموازنة · Upload budget', APP_URL, BRAND.orange)
  });
}

// To kitchen: employee uploaded the PDF → approve/reject (in app or email).
function budgetUploadedTemplate(req, budget, links) {
  const amount = budget && budget.amount != null ? `${Number(budget.amount).toLocaleString()} ${budget.currency || 'EGP'}` : '—';
  const rows = [
    ['رقم الطلب', 'Request #', `#${req.id}`],
    ['مقدّم الطلب', 'Requester', req.requester_name],
    ['الإدارة', 'Department', req.department],
    ['الوجبة', 'Meal', mealLabel(req)],
    ['عدد الأفراد', 'People', req.people],
    ['المورّد', 'Vendor', budget && budget.vendor]
  ];
  return layout({
    emoji: '🧾',
    accent: BRAND.emerald700,
    chip: 'مراجعة موازنة · Review budget',
    chipColor: BRAND.emerald,
    title: 'موازنة مرفوعة في انتظار اعتمادك',
    intro: 'الموظف رفع ملف الموازنة (مرفق بالإيميل). راجعه ووافق أو ارفض.<br>The requester uploaded the budget PDF (attached). Approve or reject.',
    content: detailsTable(rows) + totalBox('الموازنة · Budget', amount) + approveRejectButtons(links.approve, links.reject)
  });
}

function budgetApprovedTemplate(req, budget) {
  const requested = (req.items || []).filter((i) => i.kind === 'requested');
  const amount = budget && budget.amount != null ? `${Number(budget.amount).toLocaleString()} ${budget.currency || 'EGP'}` : null;
  return layout({
    emoji: '🎉',
    accent: BRAND.sapling,
    chip: 'تم الاعتماد · Approved',
    chipColor: BRAND.emerald,
    title: 'تم اعتماد طلبك',
    intro: 'اعتُمدت الموازنة والمطبخ بدأ تجهيز طلبك. ده اللي هيوصلك: 🧑‍🍳<br>Your order is approved. Here is what you will get:',
    content: itemsTable(requested) + (amount ? totalBox('الموازنة · Budget', amount) : '')
  });
}

// To employee: the kitchen declined the whole order.
function orderRejectedTemplate(req, reason) {
  const rows = [
    ['رقم الطلب', 'Request #', `#${req.id}`],
    ['سبب الرفض', 'Reason', reason]
  ];
  return layout({
    emoji: '❌',
    accent: BRAND.melon,
    chip: 'مرفوض · Declined',
    chipColor: BRAND.melon,
    title: 'تم رفض الطلب',
    intro: 'للأسف المطبخ رفض الطلب الحالي. تقدر تعمل طلب جديد في أي وقت.<br>The kitchen declined this order. You can place a new one anytime.',
    content: detailsTable(rows)
  });
}

function budgetRejectedTemplate(req, reason) {
  const rows = [
    ['رقم الطلب', 'Request #', `#${req.id}`],
    ['الوجبة', 'Meal', mealLabel(req)],
    ['سبب الرفض', 'Reason', reason]
  ];
  return layout({
    emoji: '⚠️',
    accent: BRAND.melon,
    chip: 'مرفوضة · Rejected',
    chipColor: BRAND.melon,
    title: 'الموازنة محتاجة تعديل',
    intro: 'تم رفض الموازنة الحالية. ممكن ترفع موازنة جديدة من الأبليكيشن.<br>The budget was rejected. You can upload a new one from the app.',
    content: detailsTable(rows) + ctaButton('⬆️ رفع موازنة جديدة · Re-upload', APP_URL, BRAND.orange)
  });
}

function kitchenNoteTemplate(req, note) {
  return layout({
    emoji: '💬',
    accent: BRAND.cyan || '#1AC8BF',
    chip: 'ملاحظة من المطبخ · Kitchen note',
    chipColor: BRAND.emerald,
    title: `تحديث على طلبك #${req.id}`,
    intro: '',
    content: `<div style="background:${BRAND.paperSoft};border-inline-start:4px solid ${BRAND.orange};border-radius:12px;padding:16px 18px;color:${BRAND.ink};font-size:15px;line-height:1.8;">${note}</div>`
  });
}

// 1) New request → kitchen
function newRequestTemplate(req) {
  const rows = orderRows(req);
  const urgentBanner = req.urgent
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;"><tr>
         <td style="background:#fdecec;border:1px solid ${BRAND.melon};border-radius:12px;padding:12px 16px;color:${BRAND.melon};font-weight:800;font-size:14px;" dir="rtl" align="center">
           🚨 طلب عاجل — مطلوب اليوم · URGENT — needed today
         </td></tr></table>`
    : '';
  return layout({
    emoji: req.urgent ? '🚨' : '🍽️',
    accent: req.urgent ? BRAND.melon : BRAND.orange,
    chip: req.urgent ? 'عاجل · Urgent' : 'طلب جديد · New order',
    chipColor: req.urgent ? BRAND.melon : BRAND.orange,
    title: 'طلب وجبة جديد للمطبخ',
    intro: 'وصل طلب جديد بالأصناف والكميات التالية. افتح الأبليكيشن للموافقة وتحديد الموازنة أو الرفض.<br>A new order — open the app to approve & set the budget, or reject.',
    content:
      urgentBanner +
      itemsTable((req.items || []).filter((i) => i.kind !== 'requested')) +
      `<div style="height:14px"></div>` +
      detailsTable(rows) +
      ctaButton('🍳 افتح الأبليكيشن · Open the app', APP_URL, BRAND.emerald)
  });
}

// 2) Confirmation → requester
function requestConfirmationTemplate(req) {
  const rows = orderRows(req);
  const waitNote = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
    <td style="background:${BRAND.goldLight};border-radius:12px;padding:14px 16px;color:#8a6d1f;" dir="rtl">
      <b>الخطوة الجاية:</b> المطبخ بيراجع طلبك وهيجهّزلك الموازنة المطلوبة — هنبعتلك تحديث قريب.<br>
      <span style="opacity:.85">Next: the kitchen will review your order and prepare the required budget. We'll email you shortly.</span>
    </td></tr></table>`;
  return layout({
    emoji: '✅',
    accent: BRAND.sapling,
    chip: 'تم الاستلام · Received',
    chipColor: BRAND.emerald,
    title: 'تأكيد طلبك',
    intro: `أهلاً ${req.requester_name || ''}، استلمنا طلبك 🧑‍🍳<br>We got your order — here's what you asked for.`,
    content: itemsTable((req.items || []).filter((i) => i.kind !== 'requested')) + `<div style="height:12px"></div>` + detailsTable(rows) + waitNote
  });
}

// 3) Budget created → requester
function budgetCreatedTemplate(req, budget) {
  const amount = budget && budget.amount != null ? `${Number(budget.amount).toLocaleString()} ${budget.currency || 'EGP'}` : '—';
  const rows = [
    ['رقم الطلب', 'Request #', `#${req.id}`],
    ['الوجبة', 'Meal', mealLabel(req)],
    ['عدد الأفراد', 'People', req.people],
    ['المورّد', 'Vendor', budget && budget.vendor],
    ['ملاحظات', 'Notes', budget && budget.notes]
  ];
  return layout({
    emoji: '💰',
    accent: BRAND.gold,
    chip: 'تم تجهيز الميزانية · Budget ready',
    chipColor: BRAND.gold,
    title: 'تم تجهيز ميزانية طلبك',
    intro: 'جهّز المطبخ الميزانية وأرفق المستند المطلوب.<br>The kitchen prepared the budget and attached the document.',
    content: detailsTable(rows) + totalBox('الميزانية · Budget', amount)
  });
}

// 4) Ready / pushed to SAP → requester
function readyTemplate(req) {
  const rows = [
    ['رقم الطلب', 'Request #', `#${req.id}`],
    ['الوجبة', 'Meal', mealLabel(req)],
    ['عدد الأفراد', 'People', req.people]
  ];
  return layout({
    emoji: '🎉',
    accent: BRAND.emerald700,
    chip: 'جاهز · Ready',
    chipColor: BRAND.emerald,
    title: 'طلبك جاهز!',
    intro: 'طلبك اتجهّز. بالهنا والشفا! 🍽️<br>Your order is ready. Enjoy!',
    content: detailsTable(rows)
  });
}

module.exports = {
  newRequestTemplate,
  requestConfirmationTemplate,
  budgetSetTemplate,
  budgetUploadedTemplate,
  budgetApprovedTemplate,
  budgetRejectedTemplate,
  orderRejectedTemplate,
  kitchenNoteTemplate
};
