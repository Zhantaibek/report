import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { api } from '../../api/client.ts';

interface DataSource {
  id: number;
  name: string;
  type: string;
  is_active: number;
}

export default function DataSources() {
  const [list, setList] = useState<DataSource[]>([]);

  useEffect(() => {
    api.get<DataSource[]>('/data-sources').then(setList).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Источники данных (БД)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Список источников</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет источников</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Активен</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((ds) => (
                  <TableRow key={ds.id}>
                    <TableCell>{ds.id}</TableCell>
                    <TableCell className="font-medium">{ds.name}</TableCell>
                    <TableCell>{ds.type}</TableCell>
                    <TableCell>{ds.is_active ? 'Да' : 'Нет'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
