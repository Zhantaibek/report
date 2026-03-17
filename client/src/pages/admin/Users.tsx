import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Plus, Pencil, Trash2, Eye, EyeOff, KeyRound, UserRound, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert.tsx';

const LOGIN_REGEX = /^[a-z0-9_]{3,}$/;
function isLoginValid(value: string): boolean {
  return value.length >= 3 && LOGIN_REGEX.test(value);
}

const BROKER_NICKNAMES: string[] = [
  'broker_pro',
  'market_maker',
  'deal_master',
  'trade_wizard',
  'floor_broker',
  'limit_keeper',
  'order_runner',
  'bid_ask_pro',
  'volume_tracker',
  'exchange_agent',
];

function generateBrokerLogin(): string {
  const idx = Math.floor(Math.random() * BROKER_NICKNAMES.length);
  return BROKER_NICKNAMES[idx];
}

function generatePasswordFromLogin(_loginValue: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 7;
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx];
  }
  return result;
}

interface UserRow {
  id: number;
  login: string;
  role: string;
  display_name: string | null;
}

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  employee: 'Сотрудник',
};

const ROLES: Array<'admin' | 'employee'> = ['admin', 'employee'];

export default function Users() {
  const { user: currentUser } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [confirmState, setConfirmState] = useState<
    | { type: 'delete'; user: UserRow }
    | { type: 'reset'; user: UserRow }
    | null
  >(null);

  const loadUsers = () => {
    api.get<UserRow[]>('/users').then(setList).catch(() => {});
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!submitSuccess && !resetMessage) return;
    const id = window.setTimeout(() => {
      setSubmitSuccess('');
      setResetMessage('');
    }, 10_000);
    return () => {
      window.clearTimeout(id);
    };
  }, [submitSuccess, resetMessage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.login.toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q)
    );
  }, [list, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreate = () => {
    setEditingId(null);
    setLogin('');
    setPassword('');
    setDisplayName('');
    setRole('employee');
    setSubmitError('');
    setSubmitSuccess('');
    setLoginError('');
    setFormOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setLogin(u.login);
    setPassword('');
    setDisplayName(u.display_name ?? '');
    setRole((u.role as 'admin' | 'employee') || 'employee');
    setSubmitError('');
    setLoginError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setSubmitError('');
    setLoginError('');
  };

  const handleLoginChange = (value: string) => {
    setLogin(value);
    if (value && !isLoginValid(value)) {
      setLoginError('Только латинские буквы (a–z), цифры и символ _; минимум 3 символа');
    } else {
      setLoginError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    if (!isLoginValid(login)) {
      setLoginError('Только латинские буквы (a–z), цифры и символ _; минимум 3 символа');
      return;
    }
    setLoginError('');
    setLoading(true);
    try {
      if (editingId !== null) {
        const body: { login: string; role: string; displayName: string; password?: string } = {
          login,
          role,
          displayName: displayName || '',
        };
        if (password.trim()) body.password = password;
        await api.put(`/users/${editingId}`, body);
        setSubmitSuccess('Изменения сохранены');
      } else {
        if (!password.trim()) {
          setSubmitError('Укажите пароль');
          setLoading(false);
          return;
        }
        await api.post('/users', { login, password, role, displayName: displayName || null });
        setSubmitSuccess('Пользователь успешно создан');
      }
      loadUsers();
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, loginName: string) => {
    const user = list.find((u) => u.id === id);
    if (!user) return;
    setConfirmState({ type: 'delete', user });
  };

  const performDelete = async (user: UserRow) => {
    setLoading(true);
    try {
      await api.delete(`/users/${user.id}`);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: UserRow) => {
    setConfirmState({ type: 'reset', user });
  };

  const performResetPassword = async (user: UserRow) => {
    const newPassword = generatePasswordFromLogin(user.login);
    setResetMessage('');
    setLoading(true);
    try {
      await api.put(`/users/${user.id}`, {
        login: user.login,
        role: user.role,
        displayName: user.display_name ?? '',
        password: newPassword,
      });
      loadUsers();
      setResetMessage(`Новый пароль для «${user.login}»: ${newPassword}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Сотрудники</CardTitle>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по логину, имени, роли..."
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d848c]/30 focus:border-[#3d848c] transition"
            />
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {submitSuccess && (
            <div className="mb-3">
              <Alert variant="success" className="relative pr-10">
                <AlertDescription>{submitSuccess}</AlertDescription>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-800/70 hover:text-emerald-900"
                  aria-label="Закрыть уведомление"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            </div>
          )}
          {resetMessage && (
            <div className="mb-3">
              <Alert variant="success" className="relative pr-10">
                <AlertDescription>{resetMessage}</AlertDescription>
                <button
                  type="button"
                  onClick={() => setResetMessage('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-800/70 hover:text-emerald-900"
                  aria-label="Закрыть уведомление"
                >
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            </div>
          )}
          <Modal
            open={formOpen}
            onClose={closeForm}
            closeOnBackdropClick={false}
            title={editingId !== null ? 'Редактирование пользователя' : 'Новый пользователь'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Логин</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => handleLoginChange(e.target.value)}
                    required
                    className={`w-full h-9 rounded-md border bg-background px-3 pr-20 text-sm ${
                      loginError ? 'border-destructive' : 'border-input'
                    }`}
                    autoComplete="username"
                  />
                  <button
                    type="button"
                    onClick={() => handleLoginChange(generateBrokerLogin())}
                    className="absolute right-1 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    title="Сгенерировать логин маклера"
                  >
                    <UserRound size={18} />
                  </button>
                </div>
                {loginError && <p className="text-xs text-destructive mt-1">{loginError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Пароль {editingId !== null && '(оставьте пустым, чтобы не менять)'}
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={editingId === null}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 pr-20 text-sm"
                    autoComplete={editingId === null ? 'new-password' : 'off'}
                  />
                  <div className="absolute right-1 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setPassword(generatePasswordFromLogin(login));
                        setShowPassword(true);
                      }}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      title="Сгенерировать пароль"
                    >
                      <KeyRound size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="p-1.5 rounded text-muted-foreground hover:text-foreground transition"
                      tabIndex={-1}
                      title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Имя</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Отображаемое имя"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Роль</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'employee')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading}>
                  {editingId !== null ? 'Сохранить' : 'Создать'}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={loading}>
                  Отмена
                </Button>
              </div>
            </form>
          </Modal>

          {confirmState && (
            <Modal
              open={true}
              onClose={() => setConfirmState(null)}
              closeOnBackdropClick={false}
              title={confirmState.type === 'delete' ? 'Удалить пользователя' : 'Сброс пароля'}
            >
              <div className="space-y-4">
                <p className="text-sm">
                  {confirmState.type === 'delete'
                    ? `Удалить пользователя «${confirmState.user.login}»?`
                    : `Сбросить пароль пользователя «${confirmState.user.login}»?`}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmState(null)}
                    disabled={loading}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="button"
                    variant={confirmState.type === 'delete' ? 'destructive' : 'default'}
                    onClick={async () => {
                      const state = confirmState;
                      if (!state) return;
                      setConfirmState(null);
                      if (state.type === 'delete') {
                        await performDelete(state.user);
                      } else {
                        await performResetPassword(state.user);
                      }
                    }}
                    disabled={loading}
                  >
                    {confirmState.type === 'delete' ? 'Удалить' : 'Сбросить'}
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет сотрудников</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead className="w-32 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Ничего не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-muted-foreground">{u.id}</TableCell>
                        <TableCell className="font-medium">{u.login}</TableCell>
                        <TableCell>{u.display_name ?? '—'}</TableCell>
                        <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEdit(u)}
                              disabled={loading}
                              title="Изменить"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleResetPassword(u)}
                              disabled={loading}
                              title="Сбросить пароль"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(u.id, u.login)}
                              disabled={loading || currentUser?.id === u.id}
                              title={currentUser?.id === u.id ? 'Нельзя удалить себя' : 'Удалить'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {filtered.length} записей, стр. {currentPage} из {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ‹
                    </button>
                    <span className="px-3 py-1 rounded bg-muted font-medium text-foreground">
                      {currentPage}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      »
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
