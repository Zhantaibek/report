import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { login } from '../api/auth.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Alert, AlertDescription } from '../components/ui/alert.tsx';
import { CandleBackdrop } from '../components/CandleBackdrop.tsx';

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
    <div className="login-page relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <style>{`
        .login-page {
          background: linear-gradient(145deg, #57b6c0 0%, #3d848c 42%, #1a5c63 78%, #0f3b40 100%);
        }
        @keyframes loginFormIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginBrandIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-form-panel { animation: loginFormIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .login-brand { animation: loginBrandIn 0.55s ease 0.08s both; }
      `}</style>

      <CandleBackdrop variant="onDark" />

      <div className="login-form-panel relative w-full max-w-[400px] z-10">
        <div className="login-brand mb-7 text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <img src="/favicon.png" alt="" className="w-12 h-12 object-contain drop-shadow-md" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            QuikReports
          </h1>
          <p className="mt-2 text-sm text-white/70">
            Система формирования отчётов по торговым сделкам
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-2xl shadow-black/25 px-6 sm:px-8 py-12 sm:py-14 min-h-[420px] flex flex-col justify-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-8 text-center">
            Вход в систему
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1.5">
                Логин
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[18px] text-gray-400" aria-hidden />
                <input
                  id="login"
                  type="text"
                  placeholder="Введите логин"
                  value={loginVal}
                  onChange={(e) => setLogin(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 text-sm outline-none transition focus:border-[#3d848c] focus:bg-white focus:ring-2 focus:ring-[#3d848c]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[18px] text-gray-400" aria-hidden />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 text-sm outline-none transition focus:border-[#3d848c] focus:bg-white focus:ring-2 focus:ring-[#3d848c]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl text-white font-semibold text-sm tracking-wide shadow-md transition disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: loading ? '#57b6c0' : 'linear-gradient(135deg, #3d848c, #4a9da6)' }}
            >
              {loading ? 'Выполняется вход...' : 'Войти'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-white/40">
          © {new Date().getFullYear()} ЗАО «Кыргызская Фондовая Биржа»
        </p>
      </div>
    </div>
  );
}
