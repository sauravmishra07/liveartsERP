import { Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('la_sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = () =>
    setCollapsed((c) => {
      const n = !c;
      localStorage.setItem('la_sidebar', n ? '1' : '0');
      return n;
    });

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sidebar-gradient text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-40 hidden border-r transition-[width] duration-200 md:flex md:flex-col',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('border-sidebar-border flex h-14 shrink-0 items-center border-b px-4', collapsed && 'justify-center px-0')}>
          <span className="text-sidebar-primary font-display text-lg font-bold tracking-tight">
            {collapsed ? 'LA' : 'Live Arts'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Sidebar collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="sidebar-gradient text-sidebar-foreground border-sidebar-border w-64 p-0">
          <SheetHeader className="border-sidebar-border h-14 justify-center border-b px-4">
            <SheetTitle className="text-sidebar-primary font-display text-lg font-bold">Live Arts</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto">
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-200', collapsed ? 'md:pl-16' : 'md:pl-60')}>
        <Topbar onToggleSidebar={toggle} onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<div className="text-muted-foreground flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
