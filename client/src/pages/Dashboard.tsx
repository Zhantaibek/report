import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.tsx';
import { getCurrencyRates } from '../api/currency-rates.ts';
import type { CurrencyRate } from '../api/currency-rates.ts';

export default function Dashboard() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);

  useEffect(() => {
    getCurrencyRates().then(setRates).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Дашборд</h1>
      <Card>
        <CardHeader>
          <CardTitle>Курсы валют</CardTitle>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Валюта</TableHead>
                  <TableHead>Курс</TableHead>
                  <TableHead>База</TableHead>
                  <TableHead>Обновлено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.currencyCode}>
                    <TableCell className="font-medium">{r.currencyCode}</TableCell>
                    <TableCell>{r.rate}</TableCell>
                    <TableCell>{r.baseCurrency}</TableCell>
                    <TableCell>{r.updatedAt}</TableCell>
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
