import { api, unwrap } from './client';

export const listAudit = (params) => api.get('/audit', { params }).then(unwrap);
export const getAuditFields = (params) => api.get('/audit/fields', { params }).then(unwrap);
