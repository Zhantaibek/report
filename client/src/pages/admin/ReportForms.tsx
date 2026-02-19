import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { getReportForms } from '../../api/report-forms.ts';
import type { ReportForm } from '../../api/report-forms.ts';

export default function ReportFormsAdmin() {
  const [list, setList] = useState<ReportForm[]>([]);

  useEffect(() => {
    getReportForms().then(setList).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Формы отчётов</h1>
      <Card>
        <CardHeader>
          <CardTitle>Список форм</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет форм</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead>Тип</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.id}</TableCell>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{f.code}</TableCell>
                    <TableCell>{f.type}</TableCell>
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
