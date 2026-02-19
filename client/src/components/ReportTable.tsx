import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table.tsx';

interface Props {
  rows: Record<string, unknown>[];
}

export default function ReportTable({ rows }: Props) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Нет данных</p>;
  const headers = Object.keys(rows[0]!);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={i}>
            {headers.map((h) => (
              <TableCell key={h}>{String((row as Record<string, unknown>)[h] ?? '')}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
