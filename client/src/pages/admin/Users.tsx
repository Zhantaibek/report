import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Eye } from 'lucide-react';

interface UserRow {
  id: number;
  login: string;
  role: string;
  display_name: string | null;
  email: string | null;
  position: string | null;
  phone: string | null;
  department_name: string | null;
  organization: string | null;
}

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  employee: 'Сотрудник',
};

const ROLES: Array<'admin' | 'employee'> = ['admin', 'employee'];

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value?.trim() || '—'}</span>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [roleSuccess, setRoleSuccess] = useState('');

  const loadUsers = () => {
    api.get<UserRow[]>('/users').then(setList).catch(() => {});
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openUser = (u: UserRow) => {
    setSelectedUser(u);
    setEditRole((u.role as 'admin' | 'employee') || 'employee');
    setRoleError('');
    setRoleSuccess('');
  };

  const closeUser = () => {
    setSelectedUser(null);
    setRoleError('');
    setRoleSuccess('');
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setRoleError('');
    setRoleSuccess('');
    setRoleSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}/role`, { role: editRole });
      const updated = { ...selectedUser, role: editRole };
      setSelectedUser(updated);
      setList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setRoleSuccess('Роль сохранена');
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setRoleSaving(false);
    }
  };

  const isSelf = selectedUser?.id === currentUser?.id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.login.toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.position ?? '').toLowerCase().includes(q) ||
        (u.department_name ?? '').toLowerCase().includes(q) ||
        (u.organization ?? '').toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q)
    );
  }, [list, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Сотрудники</CardTitle>
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
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Список пользователей, авторизовавшихся через LDAP.
          </p>

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет сотрудников</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Логин</TableHead>
                    <TableHead>Имя</TableHead>
                    <TableHead>Должность</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead className="w-16 text-right" />
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
                        <TableCell className="font-medium">{u.login}</TableCell>
                        <TableCell>{u.display_name ?? '—'}</TableCell>
                        <TableCell>{u.position ?? '—'}</TableCell>
                        <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openUser(u)}
                            title="Подробнее"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      <Modal
        open={selectedUser !== null}
        onClose={closeUser}
        closeOnBackdropClick
        title={selectedUser ? selectedUser.display_name || selectedUser.login : undefined}
      >
        {selectedUser && (
          <div>
            <DetailRow label="Логин" value={selectedUser.login} />
            <DetailRow label="Имя" value={selectedUser.display_name} />
            <DetailRow label="Email" value={selectedUser.email} />
            <DetailRow label="Должность" value={selectedUser.position} />
            <DetailRow label="Телефон" value={selectedUser.phone} />
            <DetailRow label="Подразделение" value={selectedUser.department_name} />
            <DetailRow label="Организация" value={selectedUser.organization} />
            <div className="grid grid-cols-[140px_1fr] gap-2 py-2 items-center">
              <span className="text-sm text-muted-foreground">Роль</span>
              {isSelf ? (
                <span className="text-sm font-medium">{ROLE_LABELS[selectedUser.role] ?? selectedUser.role}</span>
              ) : (
                <div className="flex flex-col gap-2">
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'employee')}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveRole}
                    disabled={roleSaving || editRole === selectedUser.role}
                    className="self-start"
                  >
                    {roleSaving ? 'Сохранение...' : 'Сохранить роль'}
                  </Button>
                </div>
              )}
            </div>
            {isSelf && (
              <p className="text-xs text-muted-foreground mt-2">Свою роль изменить нельзя.</p>
            )}
            {roleError && <p className="text-sm text-destructive mt-2">{roleError}</p>}
            {roleSuccess && <p className="text-sm text-emerald-600 mt-2">{roleSuccess}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
