import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { api } from '../../api/client.ts';

interface UserRow {
  id: number;
  login: string;
  role: string;
  display_name: string | null;
}

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  broker: 'Брокер',
  exchange: 'Биржа',
};

export default function Users() {
  const [list, setList] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get<UserRow[]>('/users').then(setList).catch(() => {});
  }, []);

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

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Сотрудники</CardTitle>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Поиск по логину, имени, роли..."
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d848c]/30 focus:border-[#3d848c] transition"
          />
        </CardHeader>
        <CardContent>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
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
