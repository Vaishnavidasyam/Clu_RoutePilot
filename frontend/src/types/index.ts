export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'OPERATIONS_MANAGER' | 'EXECUTIVE';
  executive_id?: string | null;
  is_active?: boolean;
}

export interface Executive {
  id: string;
  name: string;
  home_lat: number;
  home_lon: number;
  shift_start: string;
  shift_end: string;
  max_visits: number;
  max_km: number;
  status: 'active' | 'unavailable';
}

export interface Customer {
  id: string;
  name?: string;
  area: string;
  lat: number;
  lon: number;
  dpd: number;
  overdue_amount: number;
  priority_score: number;
  ptp_today: number;
  window_start: string;
  window_end: string;
  service_min: number;
  status?: string;
}

export interface RouteStop {
  seq: number;
  stop_id?: number;
  customer_id: string;
  customer_name?: string;
  area?: string;
  lat: number;
  lon: number;
  arrival_time: string;
  arrival_minutes?: number;
  waiting_min: number;
  service_start: string;
  service_end: string;
  departure_time: string;
  departure_minutes?: number;
  km_from_prev: number;
  cumulative_km: number;
  priority_score: number;
  ptp_today: number;
  overdue_amount: number;
  window_start?: string;
  window_end?: string;
  service_min?: number;
  explainability_json?: {
    assigned_executive?: string;
    position?: number;
    incremental_km?: number;
    is_ptp?: boolean;
    reason?: string;
  };
  navigation_url?: string;
  status?: string;
}

export interface RouteData {
  executive_id: string;
  executive_name?: string;
  valid: boolean;
  violations: Array<{ type: string; message: string; customer_id?: string; executive_id?: string }>;
  metrics: {
    total_km: number;
    total_travel_minutes: number;
    total_waiting_minutes: number;
    total_service_minutes: number;
    total_duration_minutes: number;
    visit_count: number;
    return_time: string;
    return_home_km?: number;
  };
  start_lat?: number;
  start_lon?: number;
  home_lat?: number;
  home_lon?: number;
  shift_start?: string;
  shift_end?: string;
  timeline: RouteStop[];
}

export interface SkippedCustomer {
  customer_id: string;
  customer_name?: string;
  area?: string;
  lat: number;
  lon: number;
  ptp_today: number;
  priority_score: number;
  overdue_amount: number;
  window_start?: string;
  window_end?: string;
  reason: string;
  details?: any;
  nearest_executive_id?: string;
  distance_to_nearest_km?: number;
}

export interface PlanMetrics {
  total_distance_km: number;
  total_priority_score: number;
  total_score: number;
  ptp_scheduled: number;
  ptp_total: number;
  ptp_coverage_pct: number;
  customers_visited: number;
  customers_skipped: number;
  violations_count: number;
  runtime_ms: number;
  avg_km_per_visit?: number;
  workload_spread_km?: number;
}

export interface PlanDetail {
  id: number;
  name: string;
  plan_date: string;
  current_version: number;
  selected_version: number;
  status: string;
  is_published: boolean;
  algorithm: string;
  lambda_param: number;
  created_at?: string;
  created_by?: string;
  versions: Array<{ version_number: number; score: number; km: number; created_at: string }>;
  metrics: PlanMetrics;
  routes: Record<string, RouteData>;
  skipped: SkippedCustomer[];
  comparison?: {
    baseline: any;
    optimized: any;
    diff: any;
  };
}

export interface ValidationReport {
  is_valid: boolean;
  blocking_error_count: number;
  warning_count: number;
  executive_valid_count: number;
  customer_valid_count: number;
  executive_total: number;
  customer_total: number;
  issues: Array<{
    type: 'ERROR' | 'WARNING' | 'VALID';
    category: string;
    record_id?: string;
    field?: string;
    message: string;
    fixable?: boolean;
  }>;
}
