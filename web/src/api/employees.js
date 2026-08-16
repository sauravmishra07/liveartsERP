import { api, unwrap } from './client';

export const listEmployees = (params) => api.get('/employees', { params }).then(unwrap);
export const getEmployee = (id) => api.get(`/employees/${id}`).then(unwrap);
export const createEmployee = (body) => api.post('/employees', body).then(unwrap);
export const updateEmployee = (id, body) => api.patch(`/employees/${id}`, body).then(unwrap);
