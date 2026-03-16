import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Главная' },
    { to: '/reports', label: 'Отчёты' },
    ...(user?.role === 'admin'
      ? [
          { to: '/admin/users', label: 'Сотрудники' },
          { to: '/admin/commission-tariffs', label: 'Тарифы' },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'hsl(186,20%,97%)' }}>
      {/* Header */}
      <header className="shrink-0 print:hidden" style={{ background: 'linear-gradient(90deg, #2d6b72 0%, #3d848c 60%, #4a9da6 100%)', boxShadow: '0 2px 12px rgba(45,107,114,0.25)' }}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center">

          {/* Logo */}
          <div className="flex items-center gap-2 mr-8">
            <img src="/favicon.png" alt="logo" className="w-7 h-7 object-contain" />
            <span className="text-white font-bold text-sm tracking-wide">QuikReports</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 flex-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-[#3d848c] shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User info + logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                {(user?.displayName || user?.login || '?')[0].toUpperCase()}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white text-xs font-semibold">
                  {user?.displayName || user?.login}
                </span>
                <span className="text-white/55 text-[10px]">
                  {user?.role}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 text-white/80 hover:text-white hover:bg-white/15"
            >
              <LogOut size={14} />
              <span>Выход</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-[1200px]">{children}</div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 print:hidden border-t border-[#3d848c]/15" style={{ background: 'hsl(186,20%,97%)' }}>
        <div className="mx-auto max-w-[1200px] flex items-center justify-center h-10">
          <span className="text-[11px] text-gray-400">
            © {new Date().getFullYear()} ЗАО «Кыргызская Фондовая Биржа». Все права защищены.
          </span>
        </div>
      </footer>
    </div>
  );
}
