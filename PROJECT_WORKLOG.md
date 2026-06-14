# EFB Meals — Project Worklog (for Teamflect tasks / goals & appraisal)

> Ready-to-paste breakdown of the project, how it was delivered, and the value.
> Each **Task** can be added to Teamflect as a task; each **Goal** as a goal/OKR.

---

## 1) Project summary — ملخص المشروع

**EFB Meals** — تطبيق ويب ثنائي اللغة (عربي/إنجليزي) لطلب الوجبات داخل بنك الطعام المصري.
- الموظف يقترح وجبات (من قائمة من الساب أو طلب خاص) ويحدّد تفاصيل الطلب.
- المطبخ يسجّل **الأصناف الفعلية + الكميات + الموازنة** (دي اللي بتتسجّل وتروح للساب).
- الموظف يرفع مستند الموازنة (PDF) → المطبخ يوافق/يرفض من **التطبيق أو الإيميل**.
- ربط كامل مع **SAP** (سحب الأصناف/الوصفات/مراكز التكلفة + رفع الطلبات المعتمدة) و **Microsoft SSO + Graph email**.

**Stack:** React 18 + Vite · Node/Express · Knex (SQL Server) · Microsoft Entra ID (MSAL + Graph) · SAP Service Layer · i18next (AR/EN).
**Repo:** https://github.com/Moataz-Elmesmary/EFB-Meals (branch `main`).

---

## 2) How we worked — منهجية الشغل

- **Phased delivery (4 مراحل بالترتيب)** — كل مرحلة مبنية على اللي قبلها.
- **Push after every piece** — كل جزء يتعمله commit + push على GitHub أول بأول.
- **Reverse-engineered the real SAP data model** — اتصلنا بالـSQL Server الإنتاجي وفهمنا الموديل الحقيقي (الأصناف/الوصفات/مراكز التكلفة) وبنينا عليه.
- **Test-driven against live data + dry-run** — كل مرحلة اتجرّبت على الداتا الفعلية، والربط مع الساب اتجرّب end-to-end بوضع simulation قبل الـcredentials الحقيقية.
- **Iterative UI tuning** — جولات تحسين على الواجهة حسب الـfeedback (كثافة/ألوان/تنسيق).

---

## 3) Delivery breakdown — التفصيل كـ Tasks / Goals

### 🟩 Phase 0 — Foundation & brand (✅ Done)
- **Task:** Scaffold the app (Express API on :4000, React/Vite on :5173) on a port separate from Fleet.
- **Task:** Brand system mirroring EFB Fleet (emerald/orange/gold, Cairo font), aurora background, cinematic login, smooth-scroll.
- **Task:** Bilingual AR/EN with full RTL/LTR switch (i18next).
- **Task:** Microsoft SSO (MSAL) + Graph email from `efb.apps@efb.eg`; **test mode** that reroutes all mail to one tester.

### 🟩 Phase 1 — SAP data model mirror + inbound sync (✅ Done)
- **Goal:** The app reads its reference data from the same model as SAP so the two stay in sync.
- **Task:** Created mirror tables — `Items`, `Item_Prices`, `ProductTree`, `ProductTree_Lines`, `CostCenters`.
- **Task:** Read-only connection to the `EFB_DB` mirror; scheduled sync every 10 min.
- **Task:** **Create/update by code** — look up each item code; insert if new, update if exists (same for prices, recipes, cost-centers).
- **Verified live:** 1,247 items · 12,469 prices · 273 recipes · 245 cost-centers.

### 🟩 Phase 2 — Requester experience (✅ Done)
- **Task:** Order details form — type (supervisors/event/meeting), classification (hot/ready), **searchable department**, location, number of people.
- **Task:** Suggested items from a searchable menu popup (filtered by classification), pulled from the synced SAP items.
- **Task:** Off-menu special request as **3 fields** (name · description · quantity).
- **Task:** Confirmation email to the requester + new-order email to the kitchen (bilingual, item tables).

### 🟩 Phase 3 — Kitchen records the final order + budget (✅ Done)
- **Goal:** What gets recorded & billed is the kitchen's decision, not the raw request.
- **Task:** Kitchen form to enter the **final (recorded) items + quantities + notes + budget**.
- **Task:** Status flow — `requested → budget_set → budget_uploaded → ready_for_sap` (+ reject paths).
- **Task:** Employee uploads the budget PDF; kitchen approves/rejects **from the app or the email** (signed 72-hour links).
- **Task:** Branded emails for every step with the correct items + budget + PDF attachment.
- **Task:** Kitchen dashboard — KPI cards, filter chips (new/budget/review/completed/rejected), sort (newest/oldest/urgent).

### 🟩 Phase 4 — SAP outbound integration middleware (✅ Built, dry-run verified)
- **Goal:** Every approved request reaches SAP automatically and reliably, with full traceability.
- **Task:** Tracking fields per request — `sap_document_number` (0 until pushed), `sap_integration_feedback`, `sap_number_of_try`.
- **Task:** Middleware job (`sapOut`) — **GET** pending (doc = 0) → **MAP** to a SAP document (items, quantities, budget, costcenter1..5, PDF) → **PUSH** via the SAP API → **UPDATE by id** (document number on success, feedback always, try += 1; failures retry next sweep).
- **Task:** SAP API client (`sapClient`) — Service Layer style, **user/password** auth, auto re-login, plus **create/update item by code** for off-menu specials.
- **Task:** `SAP_DRY_RUN` mode — simulates SAP to test the whole loop without credentials. **Verified end-to-end.**
- **Pending (needs IT):** real SAP API URL / user / password / company DB / document type + final field mapping.

### 🟦 Cross-cutting (✅ Done)
- **Task:** Renamed tables to the agreed model with **zero data loss** (`main_requests`, `order_request_items`, `request_budget`, `sap_sales_orders`).
- **Task:** Reports — searchable/filterable table, total budget, attachment download, CSV export, department filter.
- **Task:** UI density & accessibility pass — uniform button sizes, calmer palette, fixed number-input scroll bug, newest-first ordering, two-column item layout (suggestion vs final).
- **Task:** Fancy bilingual README + architecture/flow diagrams; continuous GitHub pushes.

---

## 4) Outcome & value — الناتج والقيمة

- **End-to-end flow working** (المراحل 1→4) on production SQL Server with live SAP reference data.
- **Reliable integration pattern** (idempotent, retrying, fully audited via try-count + feedback).
- **Zero manual re-keying** — items/recipes/cost-centers flow from SAP; approved orders flow back to SAP.
- **Self-service + governance** — employees self-serve; the kitchen controls the recorded order and budget.

## 5) Next — المتبقّي
- Plug live SAP API credentials + confirm document type/fields → switch off dry-run.
- (Optional) Recipe explosion to ingredients on push; cost-center monthly budgets; post-delivery rating.

---

<sub>Generated as a worklog for Teamflect tasks/goals & performance review · EFB Meals.</sub>
