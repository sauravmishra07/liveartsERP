import { api, unwrap } from './client';

export const computePayroll = (params) => api.get('/payroll', { params }).then(unwrap);
export const postPayroll = (body) => api.post('/payroll/post', body).then(unwrap);
