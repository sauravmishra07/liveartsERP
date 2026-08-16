import { api, tokens, unwrap } from './client';

export async function login(email, password) {
  const d = await api.post('/auth/login', { email, password }).then(unwrap);
  tokens.set(d.accessToken, d.refreshToken);
  return d.user;
}

export const me = () => api.get('/auth/me').then(unwrap);

export const changePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then(unwrap);

export async function logout() {
  try {
    await api.post('/auth/logout', { refreshToken: tokens.refresh });
  } catch {
    /* best-effort */
  }
  tokens.clear();
}
