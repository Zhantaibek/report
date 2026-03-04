import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.tsx';
import { RefreshCw } from 'lucide-react';
import { getCurrencyRates, refreshCurrencyRates } from '../api/currency-rates.ts';
import type { CurrencyRate } from '../api/currency-rates.ts';

export default function Dashboard() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    getCurrencyRates().then(setRates).catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await refreshCurrencyRates();
      setRates(res.rates);
      setMessage({ text: 'Курс обновлён', type: 'success' });
    } catch {
      setMessage({ text: 'Ошибка при обновлении', type: 'info' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <Card className="w-1/2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Курсы валют</CardTitle>
            <a href="https://www.nbkr.kg/index.jsp?lang=RUS" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
              Источник: НБКР
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {message && (
            <p className={`text-sm mb-3 ${message.type === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>
              {message.text}
            </p>
          )}
          {rates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет данных</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Валюта</TableHead>
                  <TableHead>Курс к сому</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r) => (
                  <TableRow key={r.currencyCode}>
                    <TableCell className="font-medium">{r.currencyCode}</TableCell>
                    <TableCell>{r.rate}</TableCell>
                    <TableCell>{new Date(r.updatedAt).toLocaleDateString('ru-RU')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Обновление…' : 'Обновить курс'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
