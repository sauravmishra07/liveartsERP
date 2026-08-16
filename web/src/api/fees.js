import { api, unwrap } from './client';

export const listFees = (params) => api.get('/fees', { params }).then(unwrap);
export const getFee = (id) => api.get(`/fees/${id}`).then(unwrap);
export const getPendingFees = (params) => api.get('/fees/pending', { params }).then(unwrap);
export const getStudentFees = (studentId) => api.get(`/fees/student/${studentId}`).then(unwrap);
export const quoteFee = (body) => api.post('/fees/quote', body).then(unwrap);
export const collectFee = (body) => api.post('/fees', body).then(unwrap);
export const recomputeFees = (branchId) =>
  api.post('/fees/recompute', branchId ? { branchId } : {}).then(unwrap);
