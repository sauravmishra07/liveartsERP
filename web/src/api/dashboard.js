import { api, unwrap } from './client';

export const getOverview = (params) => api.get('/dashboard/overview', { params }).then(unwrap);
export const getStatusDistribution = (params) =>
  api.get('/dashboard/status-distribution', { params }).then(unwrap);
export const getRecent = (params) => api.get('/dashboard/recent', { params }).then(unwrap);
export const getBatchSummary = (params) => api.get('/dashboard/batch-summary', { params }).then(unwrap);
export const getAnalytics = (params) => api.get('/dashboard/analytics', { params }).then(unwrap);
