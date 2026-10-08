export const ROUTES = {
  // Public & Authentication
  landing: '/',
  login: '/login',
  register: '/register',
  workspace: '/get-started',

  // Manager / Admin Workspace (Canonical /manager/...)
  overview: '/manager/overview',
  data: '/manager/data',
  plan: '/manager/plan',
  routes: '/manager/routes',
  routeMap: '/manager/routes/map',
  routeDetail: (routeId: string) => `/manager/routes/${routeId}`,
  exceptions: '/manager/exceptions',
  customers: '/manager/customers',
  customerDetail: (customerId: string) => `/manager/customers/${customerId}`,
  executives: '/manager/executives',
  executiveDetail: (executiveId: string) => `/manager/executives/${executiveId}`,
  analytics: '/manager/analytics',
  history: '/manager/history',
  reports: '/manager/reports',
  settings: '/manager/settings',
  admin: '/manager/admin',

  // Field Executive Workspace (Canonical /executive/...)
  fieldHome: '/executive/home',
  fieldRoute: '/executive/route',
  fieldCustomers: '/executive/customers',
  fieldCustomerDetail: (customerId: string) => `/executive/customers/${customerId}`,
  fieldActivity: '/executive/activity',
  fieldProfile: '/executive/profile',

  // Data helpers
  dataImport: '/manager/data/import',
  dataValidation: '/manager/data/validation',
  planningRunning: (runId: string) => `/manager/planning/running/${runId}`
} as const;
