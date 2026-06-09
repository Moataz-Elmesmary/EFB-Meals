// Branded, bilingual (AR + EN) HTML email templates for EFB Meals.
// Colours mirror the EFB Fleet design system: emerald + orange + gold.

const BRAND = {
  emerald: '#085648',
  emerald700: '#0a6a59',
  orange: '#FF6300',
  gold: '#D1B671',
  ink: '#0e1f1c',
  ink3: '#56706a',
  paper: '#ffffff',
  paper3: '#f5f7f5',
  border: '#e3e8e6'
};

function shell(title, bodyHtml) {
  return `<!doctype html>
<html dir="rtl" lang="ar">
<body style="margin:0;background:${BRAND.paper3};font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:${BRAND.ink};">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,${BRAND.emerald} 0%,${BRAND.emerald700} 100%);border-radius:20px 20px 0 0;padding:28px 28px 24px;text-align:center;">
      <div style="font-size:34px;line-height:1;margin-bottom:8px;">🍽️</div>
      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.3px;">EFB Meals</div>
      <div style="color:#d6ebe5;font-size:13px;margin-top:4px;">طلبات المطبخ الذكي · Smart Kitchen Requests</div>
    </div>
    <div style="background:${BRAND.paper};border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 20px 20px;padding:28px;">
      <h2 style="margin:0 0 16px;font-size:18px;color:${BRAND.emerald};">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:${BRAND.ink3};font-size:12px;margin:18px 0 0;">
      EFB Meals · هذه رسالة آلية، برجاء عدم الرد · This is an automated message
    </p>
  </div>
</body>
</html>`;
}

function pill(text, color) {
  return `<span style="display:inline-block;background:${color}1a;color:${color};border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;">${text}</span>`;
}

function detailRow(labelAr, labelEn, value) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.ink3};font-size:13px;width:42%;">${labelAr} <span style="opacity:.6">/ ${labelEn}</span></td>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;font-weight:700;">${value || '—'}</td>
  </tr>`;
}

function detailsTable(rows) {
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 4px;">${rows.join('')}</table>`;
}

function mealLabel(req) {
  if (req.is_special) return `طلب خاص / Special request`;
  return req.meal_name || `#${req.meal_id}`;
}

// 1) New request → sent to the kitchen
function newRequestTemplate(req) {
  const rows = [
    detailRow('رقم الطلب', 'Request #', `#${req.id}`),
    detailRow('مقدّم الطلب', 'Requester', `${req.requester_name} (${req.requester_email})`),
    detailRow('الإدارة', 'Department', req.department),
    detailRow('التليفون', 'Phone', req.phone),
    detailRow('الوجبة', 'Meal', mealLabel(req)),
    detailRow('عدد الأفراد', 'People', req.people),
    detailRow('التاريخ المطلوب', 'Needed on', req.needed_date),
    detailRow('طلب خاص', 'Special request', req.special_request)
  ];
  const body = `
    <p style="margin:0 0 14px;color:${BRAND.ink3};font-size:14px;">وصل طلب وجبة جديد ويحتاج إلى تجهيز ميزانية ومرفق من المطبخ.<br/>A new meal request arrived and needs a budget + attachment from the kitchen.</p>
    ${pill('طلب جديد · New', BRAND.orange)}
    ${detailsTable(rows)}`;
  return shell('طلب وجبة جديد · New Meal Request', body);
}

// 2) Budget created → sent to the requester
function budgetCreatedTemplate(req, budget) {
  const amount = budget && budget.amount != null ? `${budget.amount} ${budget.currency || 'EGP'}` : '—';
  const rows = [
    detailRow('رقم الطلب', 'Request #', `#${req.id}`),
    detailRow('الوجبة', 'Meal', mealLabel(req)),
    detailRow('عدد الأفراد', 'People', req.people),
    detailRow('الميزانية', 'Budget', amount),
    detailRow('المورّد', 'Vendor', budget && budget.vendor),
    detailRow('ملاحظات', 'Notes', budget && budget.notes)
  ];
  const body = `
    <p style="margin:0 0 14px;color:${BRAND.ink3};font-size:14px;">قام المطبخ بإنشاء ميزانية لطلبك وأرفق المستند المطلوب.<br/>The kitchen created a budget for your request and attached the required document.</p>
    ${pill('تم إنشاء الميزانية · Budget ready', BRAND.gold)}
    ${detailsTable(rows)}`;
  return shell('تم تجهيز الميزانية · Budget Prepared', body);
}

// 3) Request ready / pushed to SAP → sent to the requester
function readyTemplate(req) {
  const rows = [
    detailRow('رقم الطلب', 'Request #', `#${req.id}`),
    detailRow('الوجبة', 'Meal', mealLabel(req)),
    detailRow('عدد الأفراد', 'People', req.people)
  ];
  const body = `
    <p style="margin:0 0 14px;color:${BRAND.ink3};font-size:14px;">طلبك جاهز وتم تسجيله كـ Sales Order في نظام SAP.<br/>Your request is ready and has been recorded as a Sales Order in SAP.</p>
    ${pill('جاهز · Ready', BRAND.emerald)}
    ${detailsTable(rows)}`;
  return shell('طلبك جاهز · Your Request is Ready', body);
}

module.exports = { newRequestTemplate, budgetCreatedTemplate, readyTemplate };
