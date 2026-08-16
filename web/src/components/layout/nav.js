import {
  BadgeIndianRupee,
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  History,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  PhoneCall,
  Presentation,
  ReceiptText,
  Settings,
  UserPlus,
  Wallet,
} from 'lucide-react';

// Grouped, role-aware navigation. `roles` (optional) restricts visibility.
export const NAV = [
  { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    label: 'Academics',
    items: [
      { to: '/students', label: 'Students', icon: GraduationCap },
      { to: '/batches', label: 'Batches', icon: CalendarDays },
      { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
      { to: '/fees', label: 'Fees', icon: Wallet },
    ],
  },
  {
    label: 'Staff & Finance',
    items: [
      { to: '/employees', label: 'Employees', icon: Briefcase },
      { to: '/payroll', label: 'Payroll', icon: BadgeIndianRupee },
      { to: '/expenses', label: 'Expenses', icon: ReceiptText },
    ],
  },
  {
    label: 'CRM',
    items: [
      { to: '/crm/enquiries', label: 'Enquiries', icon: UserPlus },
      { to: '/crm/demos', label: 'Demos', icon: Presentation },
      { to: '/crm/follow-ups', label: 'Follow-ups', icon: PhoneCall },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
      { to: '/audit', label: 'Audit History', icon: History },
    ],
  },
  {
    label: 'Administration',
    roles: ['SUPER_ADMIN'],
    items: [
      { to: '/branches', label: 'Branches', icon: Building2, roles: ['SUPER_ADMIN'] },
      { to: '/users', label: 'Users', icon: KeyRound, roles: ['SUPER_ADMIN'] },
    ],
  },
  { items: [{ to: '/settings', label: 'Settings', icon: Settings }] },
];
