import { api, unwrap } from './client';

// SUPER_ADMIN only.
export const listUsers = () => api.get('/users').then(unwrap);
export const createUser = (body) => api.post('/users', body).then(unwrap);
