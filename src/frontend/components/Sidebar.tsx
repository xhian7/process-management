import { Link, useLocation } from 'react-router-dom';
import { Package, Box } from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    name: 'Equipment',
    path: '/app/equipments',
    icon: <Package className="w-5 h-5" />,
  },
  {
    name: 'Material',
    path: '/app/materials',
    icon: <Box className="w-5 h-5" />,
  },
];

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className={cn('w-64 border-r border-border bg-sidebar', className)}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <h1 className="text-xl font-semibold text-sidebar-foreground">
            Process Management
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors',
                  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground'
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground text-center">
            v1.0.0
          </div>
        </div>
      </div>
    </aside>
  );
}
