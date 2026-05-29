import { NavLink, useNavigate } from 'react-router-dom';
import { Home, FileText, Users, BookOpen, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme, type Theme } from '../context/ThemeContext.tsx';

const THEMES: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: 'light',  icon: <Sun size={15} />,     label: 'Светлая' },
  { value: 'dark',   icon: <Moon size={15} />,    label: 'Тёмная'  },
  { value: 'system', icon: <Monitor size={15} />, label: 'Системная' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
    isActive
      ? 'bg-white text-[#3d848c] shadow-sm'
      : 'text-white/80 hover:text-white hover:bg-white/15'
  }`;

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const cycleTheme = () => {
    const idx = THEMES.findIndex(t => t.value === theme);
    setTheme(THEMES[(idx + 1) % THEMES.length].value);
  };

  const currentTheme = THEMES.find(t => t.value === theme) ?? THEMES[2];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Главная', icon: Home },
    { to: '/reports', label: 'Отчёты', icon: FileText },
    ...(isAdmin
      ? [
          { to: '/admin/users', label: 'Сотрудники', icon: Users },
          { to: '/admin/reference', label: 'Справочник', icon: BookOpen },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 print:hidden" style={{ background: 'linear-gradient(90deg, #2d6b72 0%, #3d848c 60%, #4a9da6 100%)', boxShadow: '0 2px 12px rgba(45,107,114,0.25)' }}>
        <div className="mx-auto grid h-14 max-w-[1200px] grid-cols-3 items-center px-4">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="logo" className="w-7 h-7 object-contain" />
            <span className="text-white font-bold text-sm tracking-wide">QuikReports</span>
          </div>

          {/* Nav — centered */}
          <nav className="flex items-center justify-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={linkClass}
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User info + logout */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={cycleTheme}
              title={currentTheme.label}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 text-white/80 hover:text-white hover:bg-white/15"
            >
              {currentTheme.icon}
            </button>

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
      <footer className="shrink-0 print:hidden border-t border-[#3d848c]/15 bg-background">
        <div className="mx-auto max-w-[1200px] flex items-center justify-center h-10">
          <span className="text-[11px] text-gray-400">
            © {new Date().getFullYear()} ЗАО «Кыргызская Фондовая Биржа». Все права защищены.
          </span>
        </div>
      </footer>
    </div>
  );
}
