import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './app/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './features/auth/LoginPage';

// Lazy-loaded per-route (code-splitting — keeps the initial bundle small).
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const StudentsPage = lazy(() => import('./features/students/StudentsPage'));
const StudentDetailPage = lazy(() => import('./features/students/StudentDetailPage'));
const BatchesPage = lazy(() => import('./features/batches/BatchesPage'));
const EmployeesPage = lazy(() => import('./features/employees/EmployeesPage'));
const BranchesPage = lazy(() => import('./features/branches/BranchesPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const AttendancePage = lazy(() => import('./features/attendance/AttendancePage'));
const FeesPage = lazy(() => import('./features/fees/FeesPage'));
const ExpensesPage = lazy(() => import('./features/expenses/ExpensesPage'));
const PayrollPage = lazy(() => import('./features/payroll/PayrollPage'));
const EnquiriesPage = lazy(() => import('./features/crm/EnquiriesPage'));
const DemosPage = lazy(() => import('./features/crm/DemosPage'));
const FollowUpsPage = lazy(() => import('./features/crm/FollowUpsPage'));
const WhatsAppPage = lazy(() => import('./features/whatsapp/WhatsAppPage'));
const ReportsPage = lazy(() => import('./features/reports/ReportsPage'));
const AuditPage = lazy(() => import('./features/audit/AuditPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/branches" element={<BranchesPage />} />
          <Route path="/users" element={<UsersPage />} />

          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/fees" element={<FeesPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/crm/enquiries" element={<EnquiriesPage />} />
          <Route path="/crm/demos" element={<DemosPage />} />
          <Route path="/crm/follow-ups" element={<FollowUpsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
