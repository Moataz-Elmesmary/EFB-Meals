# EFB Meals — Project Worklog (End-to-End)

A complete, step-by-step account of the project for Teamflect tasks/goals and performance review.
**Repo:** https://github.com/Moataz-Elmesmary/EFB-Meals · branch `main`.

**What it is:** a bilingual (AR/EN) meal-ordering platform for the Egyptian Food Bank. Employees suggest meals; the kitchen records the final order and budget; budgets are uploaded and approved; approved orders are pushed to SAP. Microsoft SSO, automated emails, and a SAP reference-data sync run throughout.

**Stack:** React 18 + Vite · Node/Express · Knex (SQL Server / SQLite) · Microsoft Entra ID (MSAL + Graph) · SAP Service Layer · i18next.

---

## Workstream 1 — SQL Database & Schema

A SQL Server database (`EFBMeals`) with an idempotent migration that runs on every boot (works on SQLite for dev too).

**Application tables (linked by request id):**
| Table | Role | Links |
|---|---|---|
| `main_requests` | Order header — requester, type, classification, department(+code), location, people, status, `costcenter1..5`, SAP tracking fields | parent |
| `order_request_items` | Order lines — one row per item; `kind` = `suggested` (requester) or `requested` (kitchen, recorded) | → `main_requests` |
| `request_budget` | Budget per request — amount, currency, vendor, notes, the uploaded PDF (on disk + base64 in DB) | → `main_requests` |
| `sap_sales_orders` | Local staging/audit of what was pushed to SAP | → `main_requests` |

**SAP reference tables (mirrored from SAP — see Workstream 2):**
`Items`, `Item_Prices`, `ProductTree` (recipe header), `ProductTree_Lines` (recipe lines), `CostCenters` (departments).

**Steps delivered**
1. Designed the schema to mirror SAP's real model (verified by inspecting the production SQL Server).
2. Built an **idempotent migration** — creates tables/columns only if missing; safe to re-run.
3. Added SAP tracking columns to the header: `sap_document_number` (0 = not pushed), `sap_integration_feedback`, `sap_number_of_try`, plus `costcenter1..5`.
4. **Renamed** legacy tables to the agreed names with **zero data loss** (`meal_requests→main_requests`, etc.) via a rename migration.
5. Wrote a thin Knex **DAO** so the same code runs on SQLite (dev) and SQL Server (prod).

---

## Workstream 2 — SAP Reference-Data Integration (Inbound)

Keeps the app's menu/recipes/departments identical to SAP.

**Steps delivered**
1. Read-only connection to the `EFB_DB` SAP mirror (`sapSource.js`).
2. Scheduled sync job (`sync.js`) running **every 10 minutes**.
3. **Create/update by code**: for each record, look up the code → `UPDATE` if it exists, `INSERT` if new (items, prices, recipes, cost-centers).
4. Set each item's default price from the configured price list.
5. **Verified live:** 1,247 items · 12,469 prices · 273 recipes · 245 cost-centers.

---

### Data source map — where each table comes from

> Source: `EFB_DB` (the SAP mirror, kept in sync with SAP by the org's IntegrationUser).

**Synced FROM SAP (every 10 min):**
| Our table (EFBMeals) | Source (EFB_DB) | Filter | Mode |
|---|---|---|---|
| `Items` | `dbo.Items` (ItemCode, ItemName, MainItemClassificationType, Weight, UOM, QuantityOnStock, IsActive) | `ItemCode IS NOT NULL` + de-dupe | upsert by `item_code` |
| `Item_Prices` | `dbo.Items_ItemPrices` ⋈ `dbo.Items` on `_id` (PriceList, Price) | `Items.ItemCode IS NOT NULL` | full refresh |
| `ProductTree` | `dbo.ProductTree` (TreeCode, ProductDescription, Quantity, TreeType) | `TreeCode IS NOT NULL` | upsert by `tree_code` |
| `ProductTree_Lines` | `dbo.ProductTree_ProductTreeLines` (ParentItem, ChildNum, ItemCode, ItemName, Quantity) | rows with a parent tree | full refresh |
| `CostCenters` | `sap_efb.CostCenter` (PrcCode, PrcName, U_Division, U_Platform, U_Programme, CCTypeCode, Active) | rows with PrcCode; `active = Active in (Y,1)` | upsert by `code` |

- `Items.price` is set from `Item_Prices` for price list `SAP_DEFAULT_PRICE_LIST` (default 1).
- `classification` 4 = Hot, 5 = Ready (used to filter the menu).

**Created IN-APP (not from SAP):**
| Table | Created by | Pulls values from |
|---|---|---|
| `main_requests` | website (requester submits, kitchen updates) | department/code from `CostCenters`; SAP tracking fields written by the outbound middleware |
| `order_request_items` | website — `suggested` (requester), `requested` (kitchen) | `item_code` references `Items` |
| `request_budget` | kitchen (amount) + requester (PDF) | — |
| `sap_sales_orders` | outbound middleware (staging/audit) | — |
| `meals` | legacy seed (unused since `Items` drives the menu) | — |

**Outbound:** `main_requests` + `order_request_items (requested)` + `request_budget` → mapped → posted to the **SAP API** as a document; off-menu specials are create/update-by-code on SAP.

---

## Workstream 3 — Authentication (Microsoft SSO)

**Steps delivered**
1. Mandatory **Microsoft sign-in** (MSAL) — no anonymous access.
2. Identity auto-read from Active Directory via Graph (name, email, department, phone).
3. Backend validates the Microsoft ID token (JWKS) on every API call.
4. **Demo fallback** for environments without Azure (email-only sign-in).
5. Token auto-refresh interceptor so sessions never silently fail.

---

## Workstream 4 — Backend / REST API

Express API on **port 4000** (separate from the Fleet app).

**Endpoints**
- `GET /api/items?classification=` · `GET /api/cost-centers` — menu & departments from the synced tables.
- `POST /api/request` — create a request with the requester's suggested items.
- `GET /api/kitchen/requests` · `POST /api/kitchen/set-budget/:id` — kitchen records final items + budget.
- `POST /api/kitchen/approve/:id` · `/reject/:id` · `/reject-order/:id` · `/note/:id`.
- `POST /api/budget/upload/:id` — requester uploads the PDF · `GET /api/budget/action` — approve/reject from email.
- `GET /api/sap/orders` · `POST /api/sap/sync` — SAP staging + manual sync trigger.

**Steps delivered:** clean DAO-backed routes; file upload (Multer); signed action tokens (72h) for email links; status state-machine (`requested → budget_set → budget_uploaded → ready_for_sap`, plus reject paths).

---

## Workstream 5 — Email Automation

Branded, bilingual emails sent from `efb.apps@efb.eg` via Microsoft Graph (SMTP fallback; simulate-and-log if unconfigured). **Test mode** reroutes every email to one tester.

**Automated emails (one per flow event):**
1. `newRequestTemplate` → kitchen, on a new request (suggested items + details).
2. `requestConfirmationTemplate` → requester, confirms receipt.
3. `budgetSetTemplate` → requester, the kitchen's final items + budget + "upload PDF" CTA.
4. `budgetUploadedTemplate` → kitchen, the PDF + **approve/reject** action buttons.
5. `budgetApprovedTemplate` → requester, final items + budget ("order confirmed").
6. `budgetRejectedTemplate` / `orderRejectedTemplate` / `kitchenNoteTemplate` → reasons & notes.

**Steps delivered:** Graph token + `sendMail` with attachments; shared branded layout (logo, EFB palette, item tables); signed in-email approve/reject links; test-mode redirect.

---

## Workstream 6 — Website / Frontend

React + Vite on **port 5173**, premium animated UI (aurora background, cinematic login, smooth-scroll), full AR/EN with RTL/LTR.

**Screens & steps**
1. **Login gate** + boot splash; Microsoft sign-in.
2. **Request form** — order details (type, classification, **searchable department**, location, people) + suggested items (searchable menu popup) + 3-field special request.
3. **My Requests** — status timeline, budget upload, reorder, suggestion-vs-final items side by side.
4. **Kitchen dashboard** — KPI cards, filter chips, sort; modal to record final items + budget.
5. **Reports** — searchable/filterable table, total budget, attachment download, CSV export.

---

## Workstream 7 — SAP Outbound Integration (Middleware)

The integration step that sends approved orders to SAP.

**Pattern (`sapOut.js` + `sapClient.js`):**
1. **GET** approved requests where `sap_document_number = 0` (with items + budget).
2. **MAP** each to a SAP document (lines = kitchen's recorded items, quantities, budget, `costcenter1..5`, PDF).
3. **PUSH** via the SAP API (Service Layer, **user/password** auth, auto re-login); off-menu special items are **create/update by code** on SAP first.
4. **UPDATE by request id** — document number on success, feedback always, `number_of_try += 1` each attempt; failures stay at `doc = 0` and retry next sweep.

**Steps delivered:** config-driven client; `SAP_DRY_RUN` simulation mode; **verified end-to-end** in dry-run (pending → mapped → doc number written, try counted, no duplicates). **Pending:** live SAP URL/user/password/company-DB/document-type from IT.

---

## Workstream 8 — UI Revisions & Fixes (iterative)

1. Removed clutter; compact, calmer palette; uniform button sizes.
2. Fixed number-input scroll bug (typing 5000 then scrolling became 4999.98).
3. Newest-first ordering across Kitchen & My Requests.
4. Two-column item layout (suggestion vs final) on both Kitchen and My Requests.
5. Scrollable modals; consistent dropdown carets; searchable department selector.

---

## Workstream 9 — DevOps & Docs

1. Git repository with **continuous pushes** after each piece.
2. `.env` / `.env.example` for all config (DB, Azure, mail, sync, SAP).
3. Diagnostic scripts: `check-db.js`, `test-graph.js`, `inspect-sap.js`.
4. Fancy README with architecture & flow diagrams; this worklog.

---

## Status summary
| Workstream | Status |
|---|---|
| 1 Database & schema | ✅ Done |
| 2 Inbound SAP sync | ✅ Done (live-verified) |
| 3 Microsoft SSO | ✅ Done |
| 4 Backend API | ✅ Done |
| 5 Email automation | ✅ Done |
| 6 Frontend | ✅ Done |
| 7 SAP outbound middleware | ✅ Built & dry-run verified · ⏳ needs live credentials |
| 8 UI revisions | ✅ Done (ongoing polish) |
| 9 DevOps & docs | ✅ Done |

---

<sub>End-to-end worklog for Teamflect tasks/goals & performance review · EFB Meals.</sub>
