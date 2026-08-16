import { api, unwrap } from './client';

export const listEnquiries = (params) => api.get('/enquiries', { params }).then(unwrap);
export const getEnquiry = (id) => api.get(`/enquiries/${id}`).then(unwrap);
export const createEnquiry = (body) => api.post('/enquiries', body).then(unwrap);
export const updateEnquiry = (id, body) => api.patch(`/enquiries/${id}`, body).then(unwrap);
export const addDemo = (id, body) => api.post(`/enquiries/${id}/demos`, body).then(unwrap);
export const addFollowUp = (id, body) => api.post(`/enquiries/${id}/follow-ups`, body).then(unwrap);
export const convertEnquiry = (id, body) => api.post(`/enquiries/${id}/convert`, body).then(unwrap);
export const listDemos = (params) => api.get('/demos', { params }).then(unwrap);
export const listFollowUps = (params) => api.get('/follow-ups', { params }).then(unwrap);
