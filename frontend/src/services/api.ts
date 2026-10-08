import axios from 'axios';
import { User, Executive, Customer, PlanDetail, ValidationReport } from '../types';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getDemoExecutives: async () => {
    const res = await api.get('/auth/demo-executives');
    return res.data;
  }
};

export const dataService = {
  getTodayData: async (date?: string) => {
    const res = await api.get('/data/today', { params: { date } });
    return res.data;
  },
  getValidation: async (date?: string): Promise<ValidationReport> => {
    const res = await api.get('/data/validation', { params: { date } });
    return res.data.data;
  },
  createSnapshot: async (date?: string) => {
    const res = await api.post('/data/snapshot', null, { params: { date } });
    return res.data;
  },
  importExecutivesCsv: async (file: File, date?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/data/import/executives', formData, {
      params: { date },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  importCustomersCsv: async (file: File, date?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/data/import/customers', formData, {
      params: { date },
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};

export const customerService = {
  list: async (params?: { area?: string; ptp_today?: number; search?: string; date?: string }) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  create: async (data: Customer) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id: string, data: Customer) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  }
};

export const executiveService = {
  list: async (params?: { status?: string; date?: string }) => {
    const res = await api.get('/executives', { params });
    return res.data;
  },
  get: async (id: string) => {
    const res = await api.get(`/executives/${id}`);
    return res.data;
  },
  update: async (id: string, data: Executive) => {
    const res = await api.put(`/executives/${id}`, data);
    return res.data;
  },
  create: async (data: Executive) => {
    const res = await api.post('/executives', data);
    return res.data;
  }
};

export const planningService = {
  startOptimization: async (params: { algorithm?: string; lambda_param?: number; plan_date?: string; operational_date?: string }) => {
    const res = await api.post('/optimization/run', params);
    return res.data;
  },
  getOptimizationStatus: async (runId: string) => {
    const res = await api.get(`/optimization/${runId}/status`);
    return res.data;
  },
  listPlans: async (plan_date?: string) => {
    const res = await api.get('/plans', { params: { plan_date } });
    return res.data;
  },
  getPlan: async (id: number, version?: number): Promise<PlanDetail> => {
    const res = await api.get(`/plans/${id}`, { params: { version } });
    return res.data.data;
  },
  reoptimize: async (id: number, params: { lambda_param?: number; algorithm?: string; removed_customer_ids?: string[]; unavailable_executive_ids?: string[] }) => {
    const res = await api.post(`/plans/${id}/reoptimize`, params);
    return res.data;
  },
  publish: async (id: number) => {
    const res = await api.post(`/plans/${id}/publish`);
    return res.data;
  }
};

export const demoService = {
  launch: async () => {
    const res = await api.post('/demo/launch');
    return res.data;
  }
};

export const executivePortalService = {
  getToday: async (execId?: string) => {
    const res = await api.get('/executive/today', { params: { executive_id: execId } });
    return res.data;
  },
  startVisit: async (id: number) => {
    const res = await api.post(`/executive/visits/${id}/start`);
    return res.data;
  },
  completeVisit: async (id: number, payload?: any) => {
    const res = await api.post(`/executive/visits/${id}/complete`, payload);
    return res.data;
  },
  failedVisit: async (id: number, reason: string, payload?: any) => {
    const res = await api.post(`/executive/visits/${id}/failed`, payload, { params: { reason } });
    return res.data;
  }
};

export const adminService = {
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  createUser: async (data: any) => {
    const res = await api.post('/admin/users', data);
    return res.data;
  },
  toggleActive: async (id: number) => {
    const res = await api.put(`/admin/users/${id}/toggle-active`);
    return res.data;
  },
  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs');
    return res.data;
  },
  getSettings: async () => {
    const res = await api.get('/admin/settings');
    return res.data;
  },
  updateSetting: async (key: string, value: string) => {
    const res = await api.post('/admin/settings', null, { params: { key, value } });
    return res.data;
  }
};

export const analyticsService = {
  getSummary: async (days: number = 7) => {
    const res = await api.get('/analytics/summary', { params: { days } });
    return res.data;
  },
  getHistorical: async (days: number = 7) => {
    const res = await api.get('/analytics/historical', { params: { days } });
    return res.data;
  },
  getWorkload: async () => {
    const res = await api.get('/analytics/workload');
    return res.data;
  }
};

export const systemService = {
  getTime: async () => {
    const res = await api.get('/system/time');
    return res.data;
  }
};
