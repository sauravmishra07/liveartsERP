import { api, unwrap } from './client';

export const listStudents = (params) => api.get('/students', { params }).then(unwrap);
export const getStudent = (id) => api.get(`/students/${id}`).then(unwrap);
export const createStudent = (body) => api.post('/students', body).then(unwrap);
export const updateStudent = (id, body) => api.patch(`/students/${id}`, body).then(unwrap);
export const updateStudentStatus = (id, body) =>
  api.patch(`/students/${id}/status`, body).then(unwrap);
export const changeStudentBatch = (id, batchId) =>
  api.patch(`/students/${id}/batch`, { batchId }).then(unwrap);
export const setStudentBreak = (id, onBreak, remarks) =>
  api.patch(`/students/${id}/break`, { onBreak, remarks }).then(unwrap);
export const getStudentChangeHistory = (id) =>
  api.get(`/students/${id}/change-history`).then(unwrap);
export const recomputeStudentStatus = (branchId) =>
  api.post('/students/recompute-status', branchId ? { branchId } : {}).then(unwrap);
