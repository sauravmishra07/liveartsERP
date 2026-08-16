import { api, unwrap } from './client';

// NOTE: /branches returns a PLAIN ARRAY (not paginated).
export const listBranches = () => api.get('/branches').then(unwrap);
export const getBranch = (id) => api.get(`/branches/${id}`).then(unwrap);
export const createBranch = (body) => api.post('/branches', body).then(unwrap);
export const updateBranch = (id, body) => api.patch(`/branches/${id}`, body).then(unwrap);
