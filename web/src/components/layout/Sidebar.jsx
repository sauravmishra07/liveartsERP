import { NavLink } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { NAV } from './nav';

export function Sidebar({ collapsed = false, onNavigate }) {
  const { user } = useAuth();
  const canSee = (roles) => !roles || roles.includes(user?.role);

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.filter((s) => canSee(s.roles)).map((section, si) => {
        const items = section.items.filter((it) => canSee(it.roles));
        if (!items.length) return null;
        return (
          <div key={si} className="mb-1">
            {section.label && !collapsed && (
              <div className="px-3 pt-3 pb-1 text-[9.5px] font-bold tracking-[1.4px] text-[#6d6e80] uppercase">
                {section.label}
              </div>
            )}
            {section.label && collapsed && si > 0 && <div className="bg-sidebar-border mx-2 my-2 h-px" />}
            {items.map((it) => {
              const link = (
                <NavLink
                  to={it.to}
                  end={it.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-[9px] px-3 py-1.5 text-[13.2px] font-medium transition-all',
                      collapsed && 'justify-center px-0',
                      isActive
                        // Left rule + accent-tinted sweep, as in the reference rail.
                        ? 'from-sidebar-primary/16 to-sidebar-primary/[0.03] before:bg-sidebar-primary text-white bg-gradient-to-r font-semibold before:absolute before:top-1.5 before:bottom-1.5 before:-left-1 before:w-[3px] before:rounded-r-[3px] before:content-[""]'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:translate-x-0.5 hover:text-white',
                    )
                  }
                >
                  <it.icon className={cn('size-[17px] shrink-0 opacity-75 transition-opacity group-hover:opacity-100', 'group-aria-[current=page]:text-sidebar-primary group-aria-[current=page]:opacity-100')} />
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={it.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{it.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={it.to}>{link}</div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
