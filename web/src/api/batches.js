import { api, unwrap } from './client';

// Returns { items, meta } (paginated).
export const listBatches = (params) => api.get('/batches', { params }).then(unwrap);
export const getBatch = (id) => api.get(`/batches/${id}`).then(unwrap);
export const createBatch = (body) => api.post('/batches', body).then(unwrap);
export const updateBatch = (id, body) => api.patch(`/batches/${id}`, body).then(unwrap);
