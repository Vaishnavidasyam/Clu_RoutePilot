import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlanProvider } from './context/PlanContext';
import { DateTimeProvider } from './context/DateTimeContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { GetStartedPage } from './pages/GetStartedPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DataCenterPage } from './pages/DataCenterPage';
import { DataImportPage } from './pages/DataImportPage';
import { ValidationPage } from './pages/ValidationPage';
import { PlanningSetupPage } from './pages/PlanningSetupPage';
import { OptimizationRunningPage } from './pages/OptimizationRunningPage';
import { RouteMapPage } from './pages/RouteMapPage';
import { ExecutiveRoutesPage } from './pages/ExecutiveRoutesPage';
import { ExecutiveRouteDetailPage } from './pages/ExecutiveRouteDetailPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ExecutivesPage } from './pages/ExecutivesPage';
import { SkippedCustomersPage } from './pages/SkippedCustomersPage';
import { BaselineComparisonPage } from './pages/BaselineComparisonPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReoptimizePage } from './pages/ReoptimizePage';
import { PublishPage } from './pages/PublishPage';
import { ExecutivePortalPage } from './pages/ExecutivePortalPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DateTimeProvider>
          <PlanProvider>
            <Routes>
            {/* =========================================================
                1. PUBLIC & AUTHENTICATION
               ========================================================= */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/get-started" element={<GetStartedPage />} />

            {/* =========================================================
                2. FIELD EXECUTIVE WORKSPACE (Canonical /executive/...)
               ========================================================= */}
            <Route path="/executive/home" element={<ExecutivePortalPage defaultTab="home" />} />
            <Route path="/executive/route" element={<ExecutivePortalPage defaultTab="route" />} />
            <Route path="/executive/customers" element={<ExecutivePortalPage defaultTab="customers" />} />
            <Route path="/executive/customers/:customerId" element={<ExecutivePortalPage defaultTab="customers" />} />
            <Route path="/executive/activity" element={<ExecutivePortalPage defaultTab="activity" />} />
            <Route path="/executive/profile" element={<ExecutivePortalPage defaultTab="profile" />} />

            {/* Backwards Compatibility: /field/... -> /executive/... */}
            <Route path="/field/home" element={<Navigate to="/executive/home" replace />} />
            <Route path="/field/route" element={<Navigate to="/executive/route" replace />} />
            <Route path="/field/customers" element={<Navigate to="/executive/customers" replace />} />
            <Route path="/field/customers/:customerId" element={<Navigate to="/executive/customers" replace />} />
            <Route path="/field/activity" element={<Navigate to="/executive/activity" replace />} />
            <Route path="/field/profile" element={<Navigate to="/executive/profile" replace />} />
            <Route path="/field" element={<Navigate to="/executive/home" replace />} />
            <Route path="/portal" element={<Navigate to="/executive/home" replace />} />
            <Route path="/field-app" element={<Navigate to="/executive/home" replace />} />

            {/* =========================================================
                3. OPERATIONS MANAGER / ADMIN WORKSPACE (Canonical /manager/...)
               ========================================================= */}
            <Route element={<Layout />}>
              {/* Canonical Manager / Admin Pages */}
              <Route path="/manager/overview" element={<DashboardPage />} />
              <Route path="/manager/data" element={<DataCenterPage />} />
              <Route path="/manager/data/import" element={<DataImportPage />} />
              <Route path="/manager/data/validation" element={<ValidationPage />} />
              <Route path="/manager/plan" element={<PlanningSetupPage />} />
              <Route path="/manager/planning/running/:runId" element={<OptimizationRunningPage />} />
              <Route path="/manager/routes" element={<ExecutiveRoutesPage />} />
              <Route path="/manager/routes/map" element={<RouteMapPage />} />
              <Route path="/manager/routes/:routeId" element={<ExecutiveRouteDetailPage />} />
              <Route path="/manager/exceptions" element={<SkippedCustomersPage />} />
              <Route path="/manager/customers" element={<CustomersPage />} />
              <Route path="/manager/customers/:customerId" element={<CustomerDetailPage />} />
              <Route path="/manager/executives" element={<ExecutivesPage />} />
              <Route path="/manager/executives/:executiveId" element={<ExecutiveRouteDetailPage />} />
              <Route path="/manager/analytics" element={<AnalyticsPage />} />
              <Route path="/manager/history" element={<HistoryPage />} />
              <Route path="/manager/reports" element={<ReportsPage />} />
              <Route path="/manager/settings" element={<SettingsPage />} />
              <Route path="/manager/admin" element={<AdminPage />} />

              {/* Backwards Compatibility: /app/... -> /manager/... */}
              <Route path="/app/overview" element={<Navigate to="/manager/overview" replace />} />
              <Route path="/app/data" element={<Navigate to="/manager/data" replace />} />
              <Route path="/app/data/import" element={<Navigate to="/manager/data/import" replace />} />
              <Route path="/app/data/validation" element={<Navigate to="/manager/data/validation" replace />} />
              <Route path="/app/plan" element={<Navigate to="/manager/plan" replace />} />
              <Route path="/app/routes" element={<Navigate to="/manager/routes" replace />} />
              <Route path="/app/routes/map" element={<Navigate to="/manager/routes/map" replace />} />
              <Route path="/app/routes/:routeId" element={<ExecutiveRouteDetailPage />} />
              <Route path="/app/exceptions" element={<Navigate to="/manager/exceptions" replace />} />
              <Route path="/app/customers" element={<Navigate to="/manager/customers" replace />} />
              <Route path="/app/customers/:customerId" element={<Navigate to="/manager/customers" replace />} />
              <Route path="/app/executives" element={<Navigate to="/manager/executives" replace />} />
              <Route path="/app/executives/:executiveId" element={<Navigate to="/manager/executives" replace />} />
              <Route path="/app/analytics" element={<Navigate to="/manager/analytics" replace />} />
              <Route path="/app/history" element={<Navigate to="/manager/history" replace />} />
              <Route path="/app/reports" element={<Navigate to="/manager/reports" replace />} />
              <Route path="/app/settings" element={<Navigate to="/manager/settings" replace />} />
              <Route path="/app/admin" element={<Navigate to="/manager/admin" replace />} />
              <Route path="/app" element={<Navigate to="/manager/overview" replace />} />

              {/* Legacy Route Aliases & Redirects */}
              <Route path="/dashboard" element={<Navigate to="/manager/overview" replace />} />
              <Route path="/overview" element={<Navigate to="/manager/overview" replace />} />
              <Route path="/today/data" element={<Navigate to="/manager/data" replace />} />
              <Route path="/data" element={<Navigate to="/manager/data" replace />} />
              <Route path="/data/import" element={<Navigate to="/manager/data/import" replace />} />
              <Route path="/data/validation" element={<Navigate to="/manager/data/validation" replace />} />
              <Route path="/today/plan" element={<Navigate to="/manager/plan" replace />} />
              <Route path="/planning" element={<Navigate to="/manager/plan" replace />} />
              <Route path="/planning/running/:runId" element={<OptimizationRunningPage />} />
              <Route path="/routes" element={<Navigate to="/manager/routes" replace />} />
              <Route path="/routes/map" element={<Navigate to="/manager/routes/map" replace />} />
              <Route path="/routes/:execId" element={<ExecutiveRouteDetailPage />} />
              <Route path="/exceptions" element={<Navigate to="/manager/exceptions" replace />} />
              <Route path="/customers" element={<Navigate to="/manager/customers" replace />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/executives" element={<Navigate to="/manager/executives" replace />} />
              <Route path="/executives/:id" element={<ExecutiveRouteDetailPage />} />
              <Route path="/analytics" element={<Navigate to="/manager/analytics" replace />} />
              <Route path="/history" element={<Navigate to="/manager/history" replace />} />
              <Route path="/plan-history" element={<Navigate to="/manager/history" replace />} />
              <Route path="/plan-history/:id" element={<HistoryPage />} />
              <Route path="/reports" element={<Navigate to="/manager/reports" replace />} />
              <Route path="/settings" element={<Navigate to="/manager/settings" replace />} />
              <Route path="/admin" element={<Navigate to="/manager/admin" replace />} />

              {/* Deep link redirects */}
              <Route path="/plans/:id/results" element={<Navigate to="/manager/plan" replace />} />
              <Route path="/plans/:id/map" element={<Navigate to="/manager/routes/map" replace />} />
              <Route path="/plans/:id/executives" element={<Navigate to="/manager/routes" replace />} />
              <Route path="/plans/:id/executives/:execId" element={<ExecutiveRouteDetailPage />} />
              <Route path="/plans/:id/skipped" element={<Navigate to="/manager/exceptions" replace />} />
              <Route path="/plans/:id/baseline" element={<BaselineComparisonPage />} />
              <Route path="/plans/:id/reoptimize" element={<ReoptimizePage />} />
              <Route path="/plans/:id/publish" element={<PublishPage />} />
              <Route path="/plans/:id/reports" element={<Navigate to="/manager/reports" replace />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </PlanProvider>
        </DateTimeProvider>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
