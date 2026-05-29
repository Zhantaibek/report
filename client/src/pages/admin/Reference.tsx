import { NavLink, Outlet } from 'react-router-dom';
import { Percent, Coins, Landmark } from 'lucide-react';

const TABS = [
  { to: '/admin/reference/tariffs', label: 'Тарифы', icon: Percent },
  { to: '/admin/reference/currency-rates', label: 'Курсы валют', icon: Coins },
  { to: '/admin/reference/securities', label: 'Ценные бумаги', icon: Landmark },
] as const;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
    isActive
      ? 'border-[#3d848c] text-[#3d848c]'
      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
  }`;

export default function Reference() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Справочник</h1>

      <div className="border-b border-border">
        <nav className="flex gap-1">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={tabClass}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
