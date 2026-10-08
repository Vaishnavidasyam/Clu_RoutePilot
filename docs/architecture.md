# Architecture & Technical Design

## High-Level Architecture

RoutePilot is organized as a decoupled, layered full-stack application:

```
┌─────────────────────────────────────────────────────────────────┐
│               Frontend: React + Vite + Tailwind CSS             │
│  - 3D Three.js Storytelling Landing Page                        │
│  - 24 Dedicated Enterprise Views (Dashboard, Map, Routes, etc.) │
│  - Leaflet Dynamic Route Mapping with Stop Sequencing            │
│  - Recharts Workload & KPI Analytics                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST JSON / Form-Data
┌───────────────────────────────▼─────────────────────────────────┐
│                    Backend: FastAPI Engine                      │
│  - JWT & Password Hashing RBAC Service                          │
│  - Central Route Validator (13 Hard Constraints)                │
│  - Optimization Engine (Baseline, Smart Greedy, 2-Opt)          │
│  - Data Ingestion & Snapshotting Manager                        │
│  - CSV / JSON / Reporting Exporter                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │ SQLAlchemy ORM
┌───────────────────────────────▼─────────────────────────────────┐
│                  Relational Database (SQLite)                   │
│  - Users, Roles, Audit Logs                                     │
│  - Executives, Customers, Daily Snapshots                       │
│  - Plans, Plan Versions, Routes, Route Stops, Skipped Accounts  │
└─────────────────────────────────────────────────────────────────┘
```

## Central Route Validator Architecture

All optimization algorithms and manual modifications feed through `validate_route()`:

1. **Capacity Audit**: Route visit count $\le \text{max\_visits}$.
2. **Global Uniqueness**: Customer ID present at most once in the plan.
3. **Home Depot Anchor**: Start at Executive Home $\rightarrow$ Stops $\rightarrow$ End at Executive Home.
4. **Distance Limit**: Total route KM $\le \text{max\_km}$.
5. **Time Window Arrival**: Arrival time $\le \text{window\_end}$.
6. **Waiting Logic**: If Arrival < Window Start, executive waits on-site; waiting counts toward working shift duration, not road distance.
7. **Service Window Compliance**: Service finishes before $\text{window\_end}$.
8. **Shift End Feasibility**: Final return home leg completes before executive's $\text{shift\_end}$.
