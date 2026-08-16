import { Badge } from '@/components/ui/badge';

// Central status → color mapping, consistent across the whole ERP.
const MAP = {
  // student status
  Regular: 'success',
  New: 'info',
  Demo: 'default',
  'Demo But Not Joined': 'muted',
  Rejoined: 'info',
  'On Break': 'warning',
  Left: 'muted',
  'Temporarily Left': 'muted',
  'Fee Arrears': 'destructive',
  Blacklist: 'destructive',
  Absent: 'destructive',
  'Leaving This Month': 'warning',
  // active / batch / employee status
  Active: 'success',
  Inactive: 'muted',
  // payment
  Paid: 'success',
  Balance: 'warning',
  Unpaid: 'destructive',
  // overdue-this-month
  Yes: 'warning',
  No: 'success',
  Cleared: 'success',
  // attendance
  Present: 'success',
  // CRM enquiry / demo / follow-up
  Converted: 'success',
  Negotiating: 'warning',
  Lost: 'muted',
  'Time not suitable': 'muted',
  'Follow-up': 'default',
  'Call Follow-up': 'default',
  'Demo Scheduled': 'default',
  'Demo Attended': 'info',
  Scheduled: 'default',
  Attended: 'success',
  Missed: 'destructive',
  Cancelled: 'muted',
  // whatsapp
  sent: 'success',
  queued: 'warning',
  failed: 'destructive',
};

function toneFor(v) {
  const s = String(v);
  if (MAP[s]) return MAP[s];
  if (s.startsWith('Overdue')) return 'destructive';
  return 'default';
}

export function StatusBadge({ value, className }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Badge variant={toneFor(value)} className={className}>
      {value}
    </Badge>
  );
}
