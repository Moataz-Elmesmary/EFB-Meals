<!-- ============================ HEADER ============================ -->
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:085648,50:0d8068,100:FF6300&height=200&section=header&text=EFB%20Meals&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Smart%20Kitchen%20Requests%20%E2%80%A2%20%D8%B7%D9%84%D8%A8%D8%A7%D8%AA%20%D8%A7%D9%84%D9%85%D8%B7%D8%A8%D8%AE%20%D8%A7%D9%84%D8%B0%D9%83%D9%8A&descSize=18&descAlignY=58" alt="EFB Meals" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Cairo&weight=800&size=22&duration=3000&pause=800&color=085648&center=true&vCenter=true&width=700&lines=Order+meals+for+you+%26+your+team+%F0%9F%8D%BD%EF%B8%8F;Menu+cart+%2B+special+requests+with+quantities;Budget+upload+%E2%86%92+kitchen+approve%2Freject;Microsoft+SSO+%E2%80%A2+Graph+email+%E2%80%A2+SAP+sync" alt="typing" />
</p>

<!-- ============================ BADGES ============================ -->
<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Knex-SQLite%20%7C%20SQL%20Server-D26B38?style=for-the-badge&logo=database&logoColor=white" />
  <img src="https://img.shields.io/badge/Microsoft-Graph%20%2B%20SSO-0078D4?style=for-the-badge&logo=microsoft&logoColor=white" />
  <img src="https://img.shields.io/badge/SAP-Sales%20Order-0FAAFF?style=for-the-badge&logo=sap&logoColor=white" />
  <img src="https://img.shields.io/badge/i18n-AR%20%2F%20EN-085648?style=for-the-badge&logo=googletranslate&logoColor=white" />
</p>

<p align="center">
  <b>A fancy, animated, bilingual meal-ordering platform for the Egyptian Food Bank.</b><br/>
  Employees order from a chef-crafted menu (or send a special request); the kitchen handles budgets,
  approvals and delivery — with branded automated emails and a SAP Sales-Order sync.
</p>

---

## ✨ Highlights

| | |
|---|---|
| 🛒 **Cart ordering** | Add multiple meals with per-item quantities, plus free-text special-request lines |
| 🔐 **Mandatory Microsoft SSO** | Identity (name, email, department, phone) auto-read from Active Directory via Graph |
| 💸 **Budget workflow** | Kitchen requests a budget → employee uploads the PDF → kitchen **approves / rejects (with reason)** — from the app **or straight from the email** |
| 📧 **Branded automated emails** | Sent from `efb.apps@efb.eg` via Microsoft Graph, bilingual, with item tables & PDF attachments |
| 🧾 **My Requests** | Live status timeline, reorder in one tap, kitchen notes & rejection reasons |
| 📊 **Reports** | Searchable/filterable table, total budget, attachment download, CSV export |
| 🔗 **SAP sync** | Each approved order is pushed to a SQL Server Sales-Order table (with retry) |
| 🎨 **Premium UI** | Aurora background, cinematic login, parallax hero, smooth-scroll, EFB brand palette |
| 🌍 **Arabic + English** | Full RTL/LTR with one-tap switch |

---

## 🖼️ Screens

> Drop your captures into `docs/` and they'll render here.

| Login | Order (cart) | Kitchen | Reports |
|:--:|:--:|:--:|:--:|
| ![login](docs/login.gif) | ![order](docs/order.gif) | ![kitchen](docs/kitchen.gif) | ![reports](docs/reports.gif) |

---

## 🔄 The order → budget → SAP flow

```mermaid
flowchart LR
    A([👤 Employee<br/>builds a cart]) --> B[🍽️ Order created]
    B --> C{{📧 Kitchen notified}}
    C --> D[👨‍🍳 Kitchen:<br/>Request budget]
    D --> E([📧 Employee asked<br/>to upload budget PDF])
    E --> F[⬆️ Employee uploads<br/>PDF + amount]
    F --> G{{📧 Kitchen gets PDF<br/>+ Approve / Reject}}
    G -->|✅ Approve| H[🎉 Approved]
    G -->|❌ Reject + reason| E
    H --> I[(🔗 SAP Sales Order)]
    H --> J([📧 Employee:<br/>order is ready])
```

Approve / Reject works **inside the app** and **from the email** (signed, 72-hour action links).

---

## 🏗️ Architecture

```mermaid
flowchart TB
  subgraph Client["🖥️ Frontend — React + Vite (:5173)"]
    UI[Login · Cart · My Requests · Kitchen · Reports]
  end
  subgraph API["⚙️ Backend — Express (:4000)"]
    R[REST API]
    DAO[Knex DAO]
    MAIL[Graph mailer]
    SAPS[SAP service]
  end
  subgraph Ext["☁️ External"]
    AAD[(Microsoft Entra ID<br/>SSO + Graph)]
    DB[(SQLite dev / SQL Server prod)]
    SAP[(SAP SQL Server<br/>Sales Order)]
  end
  UI -->|axios + Bearer| R
  R --> DAO --> DB
  R --> MAIL --> AAD
  UI -->|MSAL| AAD
  R --> SAPS --> SAP
```

---

## 🚀 Getting started

> Runs on a **different port** from the Fleet app (which uses `3000`).

**1) Backend — port `4000`**
```powershell
cd backend
npm install
npm run dev
```

**2) Frontend — port `5173`**
```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** 🎉

- No Azure configured? The app falls back to a **demo sign-in** (just enter an email).
- With Azure configured, it switches to real **Microsoft sign-in** automatically.

---

## ⚙️ Configuration (`backend/.env`)

| Key | What it does |
|---|---|
| `PORT` | Backend port (default `4000`) |
| `DB_TYPE` | `sqlite` (dev) or `mssql` (prod) |
| `MSSQL_HOST` / `MSSQL_USER` / `MSSQL_PASSWORD` / `MSSQL_DATABASE` | SQL Server connection (when `DB_TYPE=mssql`) |
| `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` | Microsoft SSO (login) |
| `AZURE_CLIENT_SECRET` | Enables Graph email + AD profile read |
| `MAIL_FROM` | Shared mailbox that sends mail (`efb.apps@efb.eg`) |
| `KITCHEN_EMAIL` | Mailbox that receives new orders |
| `MAIL_REDIRECT` | **Test mode** — reroute every email to one tester |
| `SAP_MSSQL_*` / `SAP_SALESORDER_TABLE` | SAP Sales-Order target |

---

## 🔐 Microsoft setup (one-time, by an admin)

1. **App registration** → SPA redirect URI `http://localhost:5173`.
2. **API permissions → Microsoft Graph → Application**: `Mail.Send`, `User.Read.All` → **Grant admin consent** (+ delegated `User.Read` for login).
3. **Certificates & secrets** → new client secret → put the **Value** in `AZURE_CLIENT_SECRET`.

Diagnostics:
```powershell
cd backend
node scripts/check-db.js     # verify SQL Server + create the DB
node scripts/test-graph.js   # verify token, profile read & mail send
```

---

## 🧱 Tech stack

- **Frontend:** React 18, Vite 5, Framer Motion, Lenis (smooth scroll), i18next, MSAL Browser
- **Backend:** Node.js, Express, Knex (SQLite / SQL Server), Multer, Nodemailer, Microsoft Graph
- **Auth:** Microsoft Entra ID (MSAL + JWT validation via JWKS)
- **Email:** Microsoft Graph `sendMail` (with attachments), branded bilingual templates

---

## 📁 Project structure

```
EFB-Meals/
├── backend/
│   ├── src/
│   │   ├── index.js            # app entry, route mounting, DB init
│   │   ├── db/                 # knex.js · migrate.js · seed.js · index.js (DAO)
│   │   ├── routes/             # auth · requests · budget · kitchen · sap
│   │   ├── budgetService.js    # request/approve/reject/note (app + email)
│   │   ├── sapService.js       # build & push Sales Orders (+ retry)
│   │   ├── graph.js            # Graph token, sendMail, getUser
│   │   ├── email.js            # Graph → SMTP → simulate (+ test redirect)
│   │   ├── actionToken.js      # signed approve/reject email links
│   │   └── templates/          # branded bilingual email templates
│   └── sql/sap_salesorder.sql  # SAP landing table DDL
└── frontend/
    └── src/
        ├── App.jsx
        ├── components/         # LoginGate · Aurora · Marquee · MenuCard · Kitchen · Reports · MyRequests
        ├── RequestForm.jsx     # the cart
        ├── auth.js · api.js · i18n.js · styles.css
```

---

## 🗺️ Roadmap

- [x] Cart with quantities + special lines
- [x] Budget upload → approve/reject (app + email)
- [x] Branded bilingual Graph emails
- [x] SAP Sales-Order sync
- [ ] Cost centers with monthly budgets + consumption reports
- [ ] Post-delivery rating (stars + comment, 12h after delivery)
- [ ] Recurring / scheduled orders

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:FF6300,100:085648&height=120&section=footer" alt="footer" />
</p>
<p align="center"><sub>Built for the Egyptian Food Bank 🧡 · EFB Meals</sub></p>
