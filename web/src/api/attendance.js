import { api, unwrap } from './client';

export const listAttendance = (params) => api.get('/attendance', { params }).then(unwrap);
export const getBatchRoster = (batchId, date) =>
  api.get(`/attendance/batch/${batchId}`, { params: { date } }).then(unwrap);
export const getAttendanceBatchSummary = (params) =>
  api.get('/attendance/batch-summary', { params }).then(unwrap);
export const getStudentAttendance = (studentId) =>
  api.get(`/attendance/student/${studentId}`).then(unwrap);
export const markAttendance = (body) => api.post('/attendance/mark', body).then(unwrap);
export const markBatchAttendance = (batchId, date, records) =>
  api.post(`/attendance/batch/${batchId}/mark`, { date, records }).then(unwrap);
export const recomputeStrip = (branchId) =>
  api.post('/attendance/recompute-strip', branchId ? { branchId } : {}).then(unwrap);
