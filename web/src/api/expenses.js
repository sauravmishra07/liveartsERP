import { api, unwrap } from './client';

export const listExpenses = (params) => api.get('/expenses', { params }).then(unwrap);
export const getExpense = (id) => api.get(`/expenses/${id}`).then(unwrap);
export const createExpense = (body) => api.post('/expenses', body).then(unwrap);
export const updateExpense = (id, body) => api.patch(`/expenses/${id}`, body).then(unwrap);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`).then(unwrap);
export const generateRecurring = (branchId) =>
  api.post('/expenses/generate-recurring', branchId ? { branchId } : {}).then(unwrap);
