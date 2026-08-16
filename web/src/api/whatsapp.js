import { api, unwrap } from './client';

export const sendWhatsApp = (body) => api.post('/whatsapp/send', body).then(unwrap);
export const listWhatsAppMessages = (params) => api.get('/whatsapp/messages', { params }).then(unwrap);
export const listTemplates = () => api.get('/whatsapp/templates').then(unwrap);
export const createTemplate = (body) => api.post('/whatsapp/templates', body).then(unwrap);
