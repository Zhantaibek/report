import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { SelectWithSearch } from '../../components/ui/select.tsx';
import { getSecurities, getClasses, type SecurityItem, type ClassItem } from '../../api/reports.ts';

const PAGE_SIZE = 25;

function groupByClass(items: SecurityItem[]): Map<string, SecurityItem[]> {
  const map = new Map<string, SecurityItem[]>();
  for (const item of items) {
    const key = item.classCode || '—';
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.secFullName.localeCompare(b.secFullName, 'ru'));
  }
  return map;
}

export default function Securities() {
  const [list, setList] = useState<SecurityItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([getSecurities(), getClasses()])
      .then(([securities, classList]) => {
        setList(securities);
        setClasses(classList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const classNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classes) m.set(c.code, c.name);
    return m;
  }, [classes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (filterClass && s.classCode !== filterClass) return false;
      if (!q) return true;
      return (
        s.secFullName.toLowerCase().includes(q) ||
        s.isinCode.toLowerCase().includes(q) ||
        s.secCode.toLowerCase().includes(q) ||
        s.classCode.toLowerCase().includes(q)
      );
    });
  }, [list, filterClass, search]);

  useEffect(() => {
    setPage(1);
  }, [filterClass, search]);

  const sortedFiltered = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          a.classCode.localeCompare(b.classCode, 'ru') ||
          a.secFullName.localeCompare(b.secFullName, 'ru') ||
          a.secCode.localeCompare(b.secCode, 'ru'),
      ),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedFiltered, safePage],
  );

  const groups = useMemo(() => {
    const map = groupByClass(pageItems);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'ru'));
  }, [pageItems]);

  const filterInput =
    'h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

  const classOptions = [
    { value: '__all__', label: 'Все классы' },
    ...classes.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` })),
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Ценные бумаги</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <span className="text-xs text-muted-foreground">Класс</span>
              <SelectWithSearch
                value={filterClass || '__all__'}
                onValueChange={(v) => setFilterClass(v === '__all__' ? '' : (v ?? ''))}
                options={classOptions}
                placeholder="Все классы"
                withSearch={classes.length > 8}
                triggerClassName="h-8 w-56 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <span className="text-xs text-muted-foreground">Поиск</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Название, ISIN, код…"
                className={`${filterInput} w-full max-w-sm`}
              />
            </div>
            <span className="text-xs text-muted-foreground self-end pb-1 ml-auto">
              {filtered.length} инструментов · {groups.length} классов
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {list.length === 0 ? 'Нет данных из QUIK (таблица Securities).' : 'Нет записей по заданным фильтрам.'}
            </p>
          ) : (
            <>
              <Table className="table-fixed">
                <colgroup>
                  <col style={{ width: '70%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70%]">Наименование</TableHead>
                    <TableHead className="w-[30%]">ISIN</TableHead>
                  </TableRow>
                </TableHeader>
                {groups.map(([classCode, items]) => {
                  const classLabel = classNameByCode.get(classCode) ?? classCode;
                  return (
                    <TableBody key={classCode}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-0">
                        <TableCell colSpan={2} className="py-2 font-semibold text-sm">
                          {classCode}
                          {classLabel !== classCode && (
                            <span className="font-normal text-muted-foreground"> — {classLabel}</span>
                          )}
                          <span className="font-normal text-muted-foreground ml-2">({items.length})</span>
                        </TableCell>
                      </TableRow>
                      {items.map((row) => (
                        <TableRow key={row.secCode}>
                          <TableCell className="w-[70%]">{row.secFullName || row.secCode}</TableCell>
                          <TableCell className="w-[30%] font-mono text-sm">{row.isinCode || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  );
                })}
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Страница {safePage} из {totalPages}
                    {' · '}
                    {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} из {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(1)}
                      disabled={safePage === 1}
                      title="Первая"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <ChevronLeft className="h-3.5 w-3.5 -ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      title="Назад"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                      .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`dots-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === safePage ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPage(p as number)}
                          >
                            {p}
                          </Button>
                        ),
                      )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      title="Вперёд"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(totalPages)}
                      disabled={safePage === totalPages}
                      title="Последняя"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                      <ChevronRight className="h-3.5 w-3.5 -ml-2" />
                    </Button>
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
