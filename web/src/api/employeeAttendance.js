import { api, unwrap } from './client';

export const getEmployeeRoster = (date) =>
  api.get('/employee-attendance/roster', { params: { date } }).then(unwrap);
export const markEmployeeBulk = (date, records) =>
  api.post('/employee-attendance/mark-bulk', { date, records }).then(unwrap);
