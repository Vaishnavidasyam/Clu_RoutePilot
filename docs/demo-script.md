# Hackathon Demonstration Script (20-Step Story)

This script outlines the exact live demonstration flow:

1. **Step 1 — Landing Page (`/`)**: Open root landing page. Scroll to run through the 3D Three.js bike rider navigating the 4-stop urban collection shift.
2. **Step 2 — Launch Demo**: Click **"Launch Demo"** button on the hero or top bar.
3. **Step 3 — Progress View (`/planning/running/:id`)**: Watch real live status progression: Loading $\rightarrow$ Distance Matrix $\rightarrow$ Baseline $\rightarrow$ Routing $\rightarrow$ 2-Opt $\rightarrow$ Validation $\rightarrow$ Metrics.
4. **Step 4 — Optimization Results (`/plans/:id/results`)**: Review KPI cards, objective score, and honest baseline comparison metrics.
5. **Step 5 — Route Map (`/plans/:id/map`)**: Explore the interactive Leaflet map. Filter by executive and inspect stop sequence pins.
6. **Step 6 — Executive Routes (`/plans/:id/executives`)**: Review executive cards showing distance and shift utilization.
7. **Step 7 — Route Detail (`/plans/:id/executives/E01`)**: Inspect granular stop timeline from Home $\rightarrow$ Stops $\rightarrow$ Return Home with arrival, waiting, and service intervals.
8. **Step 8 — Skipped Accounts (`/plans/:id/skipped`)**: Review truthful explainability justifications for why unassigned accounts were skipped.
9. **Step 9 — Baseline Comparison (`/plans/:id/baseline`)**: Inspect head-to-head metrics proving distance reduction and priority gain.
10. **Step 10 — Re-Optimization (`/plans/:id/reoptimize`)**: Simulate an executive becoming unavailable (breakdown) and re-optimize to generate Version v2.
11. **Step 11 — Pre-Flight Checklist (`/plans/:id/publish`)**: Validate all 5 checklist items and click **"Authorize & Broadcast Routes"**.
12. **Step 12 — Field Executive Portal (`/portal`)**: Switch to Executive role or view mobile-friendly stop navigation and mark visits as Started/Completed.
13. **Step 13 — Export Center (`/plans/:id/reports`)**: Download official `plan.csv`, `skipped_customers.csv`, and `metrics.csv`.
