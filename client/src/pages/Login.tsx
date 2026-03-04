import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../api/auth.ts';
import { useAuth } from '../context/AuthContext.tsx';

// Palette: #3d848c (dark teal), #4a9da6 (mid teal), #57b6c0 (light teal)

export default function Login() {
  const [loginVal, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user: u } = await login(loginVal, password);
      setUser(u);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #2d6b72 0%, #3d848c 50%, #4a9da6 100%)' }}>
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute top-1/3 -right-10 w-64 h-64 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <svg className="absolute top-16 right-24 opacity-30" width="60" height="60" viewBox="0 0 60 60">
          <rect x="5" y="5" width="50" height="50" fill="none" stroke="#a8e6eb" strokeWidth="3" transform="rotate(15 30 30)" />
        </svg>
        <svg className="absolute bottom-24 left-1/4 opacity-30" width="40" height="40" viewBox="0 0 40 40">
          <polygon points="20,2 38,38 2,38" fill="none" stroke="#a8e6eb" strokeWidth="2.5" />
        </svg>
        <svg className="absolute top-1/4 left-16 opacity-25" width="30" height="30" viewBox="0 0 30 30">
          <circle cx="15" cy="15" r="12" fill="none" stroke="white" strokeWidth="2" />
        </svg>
        <div className="absolute bottom-16 right-32 w-4 h-4 rounded-full bg-white opacity-50" />
        <div className="absolute top-20 right-1/3 w-3 h-3 rounded-full opacity-50" style={{ background: '#a8e6eb' }} />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex min-h-[520px]">

        {/* Left — Form (50%) */}
        <div className="w-1/2 min-w-0 flex-shrink-0 flex flex-col justify-center px-10 py-12">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <img src="/favicon.png" alt="logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg tracking-tight" style={{ color: '#3d848c' }}>QuikReports</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-8">Авторизация в системе</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Login field */}
            <div>
              <label htmlFor="login" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Логин
              </label>
              <input
                id="login"
                type="text"
                placeholder="Введите логин"
                value={loginVal}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 text-sm focus:outline-none transition"
                onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px rgba(61,132,140,0.25)'; e.target.style.borderColor = '#3d848c'; }}
                onBlur={(e) => { e.target.style.boxShadow = ''; e.target.style.borderColor = '#e5e7eb'; }}
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 text-sm focus:outline-none transition"
                  onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px rgba(61,132,140,0.25)'; e.target.style.borderColor = '#3d848c'; }}
                  onBlur={(e) => { e.target.style.boxShadow = ''; e.target.style.borderColor = '#e5e7eb'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm tracking-wide transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              style={{ background: loading ? '#57b6c0' : 'linear-gradient(135deg, #3d848c, #4a9da6)' }}
              onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #2d6b72, #3d848c)'; }}
              onMouseLeave={(e) => { if (!loading) (e.target as HTMLButtonElement).style.background = 'linear-gradient(135deg, #3d848c, #4a9da6)'; }}
            >
              {loading ? 'Выполняется вход...' : 'Войти'}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-10 text-xs text-gray-400 text-center">
            © {new Date().getFullYear()} ЗАО «Кыргызская Фондовая Биржа». Все права защищены.
          </p>
        </div>

        {/* Right — Animated Chart (50%) */}
        <div className="hidden md:flex w-1/2 min-w-0 flex-shrink-0 items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0f3b40 0%, #1a5c63 50%, #2d6b72 100%)' }}>

          <style>{`
            @keyframes growBar {
              from { transform: scaleY(0); }
              to   { transform: scaleY(1); }
            }
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(10px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .bar { transform-origin: bottom; animation: growBar 0.65s cubic-bezier(.22,.97,.58,1) both; }
            .bar1 { animation-delay: 0.1s; }
            .bar2 { animation-delay: 0.2s; }
            .bar3 { animation-delay: 0.3s; }
            .bar4 { animation-delay: 0.4s; }
            .bar5 { animation-delay: 0.5s; }
            .bar6 { animation-delay: 0.6s; }
            .bar7 { animation-delay: 0.7s; }
            .chart-label { opacity: 0; animation: fadeUp 0.6s ease 0.2s forwards; }
          `}</style>

          {/* Subtle background grid */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
            {[80, 160, 240, 320, 400].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
          </svg>

          <div className="relative w-full flex flex-col items-center justify-center px-8 py-8 gap-5">

            {/* Title */}
            <div className="chart-label text-center">
              <p className="text-sm font-medium" style={{ color: 'rgba(168,230,235,0.8)', letterSpacing: '0.02em' }}>
              Система формирования отчёта по торговым сделкам
              </p>
            </div>

            {/* Chart */}
            <svg viewBox="0 0 340 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#57b6c0" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#3d848c" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              {/* Grid */}
              {[40, 88, 136, 184, 232].map((y) => (
                <line key={y} x1="28" y1={y} x2="330" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="4 4" />
              ))}

              {/* Bars: плавный рост снизу вверх */}
              {[
                { x: 34,  h: 44,  d: 'bar1' },
                { x: 80,  h: 78,  d: 'bar2' },
                { x: 126, h: 110, d: 'bar3' },
                { x: 172, h: 148, d: 'bar4' },
                { x: 218, h: 174, d: 'bar5' },
                { x: 264, h: 206, d: 'bar6' },
                { x: 310, h: 232, d: 'bar7' },
              ].map(({ x, h, d }) => (
                <rect key={x} className={`bar ${d}`} x={x} y={232 - h} width="32" height={h} rx="5" fill="url(#barGrad)" />
              ))}

              {/* Baseline */}
              <line x1="28" y1="232" x2="330" y2="232" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

              {/* X-axis */}
              {['Янв','Фев','Мар','Апр','Май','Июн','Июл'].map((lbl, i) => (
                <text key={lbl} x={50 + i * 46} y="248" fill="rgba(255,255,255,0.28)" fontSize="8" textAnchor="middle">{lbl}</text>
              ))}

            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
