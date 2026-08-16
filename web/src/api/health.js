import { api, unwrap } from './client';

export const getHealth = () => api.get('/health').then(unwrap);
