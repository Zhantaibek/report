import { NavLink, Outlet } from 'react-router-dom';
import { Percent, Coins, Layers, Building2, Users, Mail, Calculator } from 'lucide-react';

const TABS = [
  { to: '/admin/reference/tariffs', label: 'Тарифы', icon: Percent },
  { to: '/admin/reference/currency-rates', label: 'Курсы валют', icon: Coins },
  { to: '/admin/reference/trade-classes', label: 'Классификация рынка', icon: Layers },
  { to: '/admin/reference/emitents', label: 'Эмитенты', icon: Building2 },
  { to: '/admin/reference/brokers', label: 'Брокеры', icon: Users },
  { to: '/admin/reference/email-reports', label: 'Рассылка', icon: Mail },
  { to: '/admin/reference/calculator', label: 'Калькулятор', icon: Calculator },
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
      <h1 className="text-2xl font-semibold tracking-tight print:hidden">Справочник</h1>

      <div className="border-b border-border print:hidden">
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
