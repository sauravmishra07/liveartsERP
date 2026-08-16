// Small display helpers.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Join a PersonName subdoc ({ prefix, first, last, suffix }) into a display string. */
export function fullName(name) {
  if (!name) return '—';
  if (typeof name === 'string') return name;
  return [name.prefix, name.first, name.last, name.suffix].filter(Boolean).join(' ').trim() || '—';
}

/** dd-MMM-yyyy (the academy's convention). */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

/** For <input type="date"> value binding (yyyy-MM-dd). */
export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function currency(n) {
  const v = Number(n || 0);
  return `₹${v.toLocaleString('en-IN')}`;
}

/** Compact currency for axis ticks / dense cards: ₹1.2L, ₹24.5k, ₹900. */
export function currencyShort(n) {
  const v = Number(n || 0);
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(a % 1e7 === 0 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(a % 1e5 === 0 ? 0 : 1)}L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(a % 1e3 === 0 ? 0 : 1)}k`;
  return `${sign}₹${a}`;
}

/** Human label for a role constant. */
export function roleLabel(role) {
  return (role || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
