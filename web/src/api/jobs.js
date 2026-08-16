import { api, unwrap } from './client';

export const getJobsStatus = () => api.get('/jobs/status').then(unwrap);
export const runDailyRecompute = (branchId) =>
  api.post('/jobs/run/daily-recompute', branchId ? { branchId } : {}).then(unwrap);
export const runMonthlyJobs = (branchId) =>
  api.post('/jobs/run/monthly', branchId ? { branchId } : {}).then(unwrap);
