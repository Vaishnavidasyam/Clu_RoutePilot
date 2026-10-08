# RoutePilot — AI-Powered Daily Field Visit Planning Platform
> **Enterprise Multi-Vehicle Route Optimization (m-VRPTW) & Real-Time Field Execution System**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com)
[![Vite](https://img.shields.io/badge/Vite-6.4-purple.svg)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Pytest-22%2F22_Passed-emerald.svg)]()
[![Location](https://img.shields.io/badge/Operations-Hyderabad%2C_India-orange.svg)]()
[![Timezone](https://img.shields.io/badge/Timezone-Asia%2FKolkata_(IST)-123A55.svg)]()

<p align="center">
  <img src="frontend/public/app-icon.png" width="128" height="128" alt="RoutePilot Official App Icon" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);" />
</p>

---

## Executive Overview

**RoutePilot** is a production-ready, mathematical daily field visit planning and execution platform developed specifically for debt collections, banking recovery, and field services in **Hyderabad, Telangana, India**.

It formulates and solves the **Multi-Vehicle Routing Problem with Time Windows and Priority Commitments (m-VRPTW-P)**. RoutePilot deterministically ingests raw daily CSV datasets, validates coordinate integrity and operating feasibility, builds optimal turn-by-turn routes respecting vehicle capacities, and delivers real-time two-way synchronization between operations leadership and mobile field executives.

---

## Key Highlights & Core Capabilities

* **Dynamic CSV as Single Source of Truth**:
  * Uploading `executives.csv` and `customers.csv` immediately replaces the active working dataset for the operational date.
  * Zero stale/mock data fallbacks (`mockCustomers`, `mockExecutives`, `sampleCustomers` completely eradicated).
  * Automatically handles pre-flight schema audits, coordinate bounding, and non-blocking notifications.
  * Verified on real-world benchmark datasets: **6 Executives (`E01`–`E06`)** and **200 Customers (`C001`–`C200`)**.

* **Smart Greedy + 2-Opt Optimization Engine**:
  * **100% PTP Protection**: All Promise-to-Pay delinquent accounts are prioritized in Pass 1, ensuring zero SLA breaches.
  * **$\lambda$-Balanced Scoring**: Evaluates candidate visits using marginal gain $\Delta Z = \text{Priority}(c) - \lambda \times \Delta\text{km}$.
  * **2-Opt Edge-Exchange Search**: Iterative sequence inversion that reduces road travel distance while strictly verifying all 13 physical constraints.
  * **Verified Performance**: **74 visits** scheduled across 6 executives, **447.4 km** total fleet transit, **49/49 PTP accounts protected**, and **0 constraint violations**.

* **Dynamic Executive Authentication & Role Isolation**:
  * Dynamic demo executive switcher on `/login` derived in real-time from the active roster.
  * Displays live executive information (ID, name, shift hours, assigned stops, home coordinates, roster verification status).
  * **Strict Authorization Guard**: Unapproved or non-roster accounts (e.g. `E07`, `E99`) are rejected with **`403 Forbidden`**.

* **Unified Executive Profile Navbar**:
  * Field executives have an integrated profile dropdown menu in the header (identical in elegance to Manager/Admin).
  * Features initial avatar badge, executive name, corporate email, role pill, 1-click navigation to profile, and clean session sign-out redirecting to `/login`.

* **Real-Time Field $\leftrightarrow$ Operations Manager Replication**:
  * Mobile visit lifecycle events (`VISIT_STARTED`, `VISIT_COMPLETED`, `VISIT_FAILED`) update backend audit logs and stop states.
  * Operations Manager route cards and detailed timelines instantly reflect live visit progress (`✓ Completed`, `● In Progress`, `✕ Unsuccessful`) along with collected UPI payments.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT WORKSPACES                              │
│   Operations Manager (/manager/*)       │     Field Executive (/executive/*)│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Axios HTTP / REST (Scoped JWT Bearer)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI BACKEND ENGINE                            │
│                                                                             │
│   /api/auth              /api/data               /api/optimization          │
│   - JWT Login & Auth     - CSV Ingestion Engine  - Smart Greedy + 2-Opt     │
│   - Dynamic Demo Roster  - Schema Pre-Flight     - 13 Constraint Validator  │
│   - Role Access Control  - Daily Snapshots       - Real-time Route Audit    │
│                                                                             │
│   /api/executive         /api/admin              /api/analytics             │
│   - Field Cockpit API    - User Management       - Fleet MIS & Summaries    │
│   - Visit Lifecycle      - System Settings       - Historic Benchmarks      │
├─────────────────────────────────────────────────────────────────────────────┤
│                          OPTIMIZATION & ALGORITHMS                          │
│                                                                             │
│   ┌──────────────────────────┐               ┌───────────────────────────┐  │
│   │ Distance Matrix Cache    │               │ Central Route Validator   │  │
│   │ (Haversine x 1.3 Factor) │               │ (13 Hard Physical Checks) │  │
│   └────────────┬─────────────┘               └─────────────▲─────────────┘  │
│                │                                           │                │
│                ▼                                           │                │
│   ┌──────────────────────────┐               ┌─────────────┴─────────────┐  │
│   │ Pass 1: Mandatory PTP    │──────────────►│ 2-Opt Edge-Exchange Swap  │  │
│   │ Pass 2: Marginal Profit  │               │ Feasible Sequence Tuning  │  │
│   └──────────────────────────┘               └───────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                         SQLITE / SQLALCHEMY ORM                             │
│   executives │ customers │ daily_snapshots │ plans │ plan_versions │ routes │
│   route_stops │ audit_logs │ users │ system_settings │ optimization_runs    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Constraint Enforcement Matrix (13/13 Hard Constraints)

Every candidate stop sequence passes through the Central Route Validator (`backend/app/validators/route_validator.py`):

| # | Constraint Name | Validation Rule | Impact of Violation |
|:-:|:---|:---|:---|
| **1** | **Global Unique Visit** | Each customer account ID visited at most once across the fleet | Customer visited by multiple executives (Blocked) |
| **2** | **Executive Visit Capacity** | Stop count per route $\le \text{max\_visits}$ (e.g. 15 stops) | Executive fatigue / shift overflow (Blocked) |
| **3** | **Depot Departure Origin** | Route start coordinates $== (\text{home\_lat}, \text{home\_lon})$ | Invalid journey start (Blocked) |
| **4** | **Depot Return Terminus** | Route finish coordinates $== (\text{home\_lat}, \text{home\_lon})$ | Stranded executive / incomplete shift (Blocked) |
| **5** | **Executive Range Cap** | Total cumulative route km $\le \text{max\_km}$ (e.g. 80.0 km) | Fuel exhaustion / two-wheeler range exceed (Blocked) |
| **6** | **Time Window Arrival** | Executive arrival $\le \text{customer.window\_end}$ | Customer unavailable / missed window (Blocked) |
| **7** | **Early Arrival Waiting** | Arrival before `window_start` waits on-site; waiting time counted in shift | Prevents early knocking; honors borrower convenience |
| **8** | **Service Completion** | $\text{service\_start} + \text{service\_min} \le \text{customer.window\_end}$ | Incomplete collection conversation (Blocked) |
| **9** | **Shift Return Deadline** | Final return time at depot $\le \text{executive.shift\_end}$ | Labor overtime breach (Blocked) |
| **10** | **PTP Protection SLA** | All `ptp_today == 1` accounts prioritized for scheduling | High-risk delinquent loss (Strict Priority 1) |
| **11** | **Deterministic Exclusion** | Every unscheduled account receives an explainable diagnostic reason | Clear exception visibility for manager replanning |
| **12** | **Intra-Route Uniqueness** | Zero duplicate customer IDs inside an executive itinerary | Redundant double-visit on same day (Blocked) |
| **13** | **Continuous Clock Sim** | All calculations conducted in integer minutes $[0, 1440]$ | Eliminates AM/PM string parsing discrepancies |

---

## Operational Workspaces

### 1. Operations Manager Workspace (`/manager/*`)
* **Daily Operations Cockpit (`/manager/overview`)**: Fleet health KPI tiles, real-time executive progress bars, and high-visibility exception alerts.
* **Operational Date Selector**: Calendar picker with month navigation and day stepping, bound to `?date=YYYY-MM-DD`.
* **Data Center & CSV Ingestion (`/manager/data`)**: Single source of truth upload center with pre-flight schema auditing and coordinate bounds checks.
* **Planning Setup & Re-Optimization (`/manager/plan`)**: One-click algorithm execution comparing Baseline Sequential vs Smart Greedy + 2-Opt.
* **Interactive Leaflet Route Map (`/manager/routes/map`)**: Full Hyderabad street map with color-coded executive paths, sequence numbers, and depot pins.
* **Route Details (`/manager/routes/:id`)**: Stop-by-stop timeline with live completion badges, navigation links, and customer balance cards.
* **Exceptions Queue (`/manager/exceptions`)**: Diagnostic catalog of unscheduled accounts with reasons (e.g., *Shift Capacity Exceeded*, *Infeasible Window*).
* **MIS & Compliance Reports (`/manager/reports`)**: One-click exports of official `plan.csv`, `skipped_customers.csv`, `metrics.csv`, and full JSON plan dumps.

### 2. Field Executive Cockpit (`/executive/*`)
* **Real-Time Home Tab (`/executive/home`)**: Next Stop card, countdown timers, customer phone trigger, and 1-tap Google Maps turn-by-turn navigation.
* **Guided Visit State Machine**: Guided flow: `En Route` $\to$ `Arrived` $\to$ `In Visit` $\to$ `Outcome Modal` $\to$ `Completed`.
* **Collection Outcome Modal**: Record cash/UPI collection amount, confirm Promise-to-Pay extension, or document door locked / dispute reasons.
* **Sequential Itinerary (`/executive/route`)**: Full timeline of today's stops with PTP badges, expected arrival times, and waiting intervals.
* **Customer Roster (`/executive/customers`)**: Search and filter assigned customers by PTP status, area, or pending/completed state.
* **Executive Profile (`/executive/profile`)**: Shift hours, vehicle info, cumulative distance, performance metrics, and sign-out action.

### 3. System Administrator Console (`/manager/admin`)
* **User Management**: Manage corporate accounts, roles (`ADMIN`, `OPERATIONS_MANAGER`, `EXECUTIVE`), and account active toggles.
* **Audit Trail**: Full system audit log recording logins, CSV uploads, plan runs, visit outcomes, and exports.
* **System Settings**: Tune optimization hyperparameters ($\lambda$, average travel speed, service buffers).

---

## Tech Stack

| Layer | Component | Specification |
|:---|:---|:---|
| **Backend Framework** | FastAPI | Python 3.10+, Asynchronous REST endpoints |
| **Database & ORM** | SQLAlchemy 2.0 | SQLite embedded database with full relational constraints |
| **Optimization Core** | Python Custom Engine | Smart Greedy + 2-Opt Local Search ($O(N^2)$ sequence tuning) |
| **Geodesic Math** | Haversine + Circuitry | Road multiplier factor 1.3, average urban speed 25 km/h |
| **Authentication** | PyJWT & Passlib | Scoped JWT Bearer tokens with Bcrypt salted hashing |
| **Frontend Framework** | React 18 | TypeScript, Functional components & Custom hooks |
| **Build & Tooling** | Vite 6 | Instant HMR, production minification, 5.9s clean builds |
| **Styling & Theme** | Tailwind CSS 3 | Bespoke RoutePilot theme (Deep Navy `#123A55`, Bright Orange `#FF7A18`) |
| **Mapping Engine** | Leaflet & React-Leaflet | OpenStreetMap tiles, custom marker icons, polyline route paths |
| **Landing Visuals** | Three.js | Interactive 3D WebGL route simulation with Catmull-Rom curves |

---

## Directory Structure

```
clu_daily_visit_planner/
├── backend/
│   ├── app/
│   │   ├── api/                  # REST endpoints (auth, data, optimization, executives, etc.)
│   │   ├── auth/                 # JWT creation, Bcrypt password hashing, token validation
│   │   ├── database/             # SQLAlchemy engine & session maker
│   │   ├── models/               # Relational models (User, Executive, Customer, Plan, Route, etc.)
│   │   ├── optimization/         # Distance matrix cache, Smart Greedy, 2-Opt local search
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Authoritative IST datetime clock, CSV exporters
│   │   ├── validators/           # Pre-flight data validator & Central 13-constraint route validator
│   │   ├── main.py               # FastAPI entrypoint with CORS & SPA static mount
│   │   └── seed.py               # Database seeder
│   ├── data/sample/              # Official sample CSV datasets
│   └── tests/                    # Pytest automated test suite
├── frontend/
│   ├── public/
│   │   ├── app-icon.png          # RoutePilot official application icon
│   │   ├── favicon.ico           # Browser tab favicon
│   │   └── routepilot-auth-bg.png# Auth layout city background illustration
│   ├── src/
│   │   ├── components/           # Navbar, Sidebar, DateSelector, NotificationCenter, Leaflet maps
│   │   ├── components/auth/      # AuthCard, DemoAccountSelector, AuthLayout
│   │   ├── components/field/     # FieldHeader, NextStopCard, ItineraryList, OutcomeModal
│   │   ├── context/              # AuthContext, DateTimeContext, PlanContext
│   │   ├── pages/                # Workspace views (Dashboard, Routes, Exceptions, ExecutivePortal)
│   │   ├── services/             # Axios API client services
│   │   ├── utils/                # 12-hour IST formatters, INR currency formatters
│   │   ├── App.tsx               # Master router with auth guards
│   │   └── main.tsx              # Application root
│   ├── package.json
│   └── vite.config.ts
├── README.md                     # Project documentation (this file)
└── PROJECT_REPORT.md             # Formal Technical & Operational Audit Report
```

---

## Installation & Setup

### Prerequisites
* **Python**: 3.10 or higher
* **Node.js**: v18 or higher (with `npm`)

### 1. Backend Setup
```bash
# Navigate to project root
cd clu_daily_visit_planner

# Create and activate Python virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations and seed operational data
python -m backend.app.seed

# Start FastAPI backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* Backend API documentation available at: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
* Frontend application accessible at: `http://localhost:3000`

---

## Demo Credentials & Accounts

| Role | Email / Identifier | Password | Access Scope |
|:---|:---|:---|:---|
| **Operations Manager** | `manager@routepilot.io` | `manager123` | Full operations workspace, CSV upload, solver execution, exports |
| **System Administrator**| `admin@routepilot.io` | `admin123` | Manager permissions + User management, settings, audit logs |
| **Field Executive (E01)**| `e01@routepilot.io` or `E01` | `exec123` | Scoped to E01 daily shift, route stops, and collection logging |
| **Field Executive (E02)**| `e02@routepilot.io` or `E02` | `exec123` | Scoped to E02 daily shift (09:00–18:00, 14 visits) |
| **Field Executive (E03)**| `e03@routepilot.io` or `E03` | `exec123` | Scoped to E03 daily shift (08:30–17:30, 14 visits) |
| **Field Executive (E04)**| `e04@routepilot.io` or `E04` | `exec123` | Scoped to E04 daily shift (09:00–18:00, 13 visits) |
| **Field Executive (E05)**| `e05@routepilot.io` or `E05` | `exec123` | Scoped to E05 daily shift (08:30–17:30, 11 visits) |
| **Field Executive (E06)**| `e06@routepilot.io` or `E06` | `exec123` | Scoped to E06 daily shift (09:00–18:00, 10 visits) |

> [!NOTE]
> All executives (`E01`–`E06`) can be selected via the **1-Click Demo Account Selector** on the login page. Attempting to log in as unapproved reps (e.g. `E07`) correctly triggers a **`403 Forbidden`** rejection.

---

## Test Suite Execution

Run the backend pytest test suite verifying all 13 physical constraints and worked regression examples:
```bash
python -m pytest backend/tests/ -v
```

### Verified Test Cases:
* `test_api_health`: Verifies API uptime and active constraints engine status.
* `test_api_login`: Verifies JWT issuance and user role validation.
* `test_api_today_data`: Verifies snapshot loading and customer counts.
* `test_api_validation`: Verifies zero blocking errors on active datasets.
* `test_haversine_and_road_distance`: Verifies $\text{Haversine} \times 1.3$ road factor.
* `test_travel_time`: Verifies 25 km/h transit speed conversion.
* `test_time_conversions`: Verifies integer minute conversions.
* `test_challenge_worked_example_regression`: Verifies exact worked regression scenario.
* `test_route_validator_max_km_violation`: Verifies 80 km limit detection.
* `test_route_validator_time_window_violation`: Verifies arrival window violation detection.
* `test_waiting_time_accounting`: Verifies early arrival waiting accounting.
* `test_optimizers_execution`: Verifies Smart Greedy superiority over baseline.

---

## Project Documentation & Academic PDF Reports

RoutePilot includes comprehensive technical and academic evaluation reports:
* **Academic Project Report (PDF)**: [`RoutePilot_Academic_Project_Report.pdf`](file:///c:/Users/D%20Vaishnavi/Documents/project%20k/projects/clu_daily_visit_planner/RoutePilot_Academic_Project_Report.pdf) (13 Chapters, Certificate of Approval, Mathematical Formulation, Benchmark Matrix, 678 KB).
* **Technical Audit Report (PDF)**: [`RoutePilot_Technical_Audit_Report.pdf`](file:///c:/Users/D%20Vaishnavi/Documents/project%20k/projects/clu_daily_visit_planner/RoutePilot_Technical_Audit_Report.pdf) (Operational Audit, 288 KB).
* **Source Markdown Files**: [`ACADEMIC_PROJECT_REPORT.md`](file:///c:/Users/D%20Vaishnavi/Documents/project%20k/projects/clu_daily_visit_planner/ACADEMIC_PROJECT_REPORT.md) & [`PROJECT_REPORT.md`](file:///c:/Users/D%20Vaishnavi/Documents/project%20k/projects/clu_daily_visit_planner/PROJECT_REPORT.md).

To re-generate the PDF reports at any time using Microsoft Edge / Chrome headless:
```bash
python tools/export_pdf.py
```

---

## License

Developed for the **Daily Visit Planner Challenge**. Built with strict mathematical compliance, high-performance optimization, and enterprise reliability.
