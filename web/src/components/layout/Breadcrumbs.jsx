import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const LABELS = {
  students: 'Students',
  batches: 'Batches',
  attendance: 'Attendance',
  fees: 'Fees',
  employees: 'Employees',
  payroll: 'Payroll',
  expenses: 'Expenses',
  crm: 'CRM',
  enquiries: 'Enquiries',
  demos: 'Demos',
  'follow-ups': 'Follow-ups',
  reports: 'Reports',
  whatsapp: 'WhatsApp',
  audit: 'Audit History',
  branches: 'Branches',
  users: 'Users',
  settings: 'Settings',
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  if (pathname === '/') {
    return <span className="text-sm font-medium">Dashboard</span>;
  }
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [{ to: '/', label: 'Dashboard' }];
  let acc = '';
  parts.forEach((p) => {
    acc += `/${p}`;
    const label = LABELS[p] || (p.length > 10 ? `${p.slice(0, 8)}…` : p);
    crumbs.push({ to: acc, label });
  });

  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />}
          {i < crumbs.length - 1 ? (
            <Link to={c.to} className="text-muted-foreground hover:text-foreground truncate">
              {c.label}
            </Link>
          ) : (
            <span className="truncate font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
