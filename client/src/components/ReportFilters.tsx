import { Label } from './ui/label.tsx';
import { Input } from './ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select.tsx';
import type { RunFilters } from '../api/reports.ts';
import type { Broker } from '../api/brokers.ts';

interface Props {
  filters: RunFilters;
  onChange: (f: RunFilters) => void;
  brokers: Broker[];
  disabled?: boolean;
  singleDate?: boolean;
}

export default function ReportFilters({ filters, onChange, brokers, disabled, singleDate }: Props) {
  return (
    <>
      {singleDate ? (
        // Одна дата для аукционов и отчета 9
        <div className="space-y-2">
          <Label>
            Дата <span className="text-destructive">*</span>
          </Label>
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => {
              const date = e.target.value || undefined;
              onChange({ ...filters, dateFrom: date, dateTo: date });
            }}
            className="w-40"
            disabled={disabled}
            required
          />
        </div>
      ) : (
        // Диапазон дат для остальных отчетов
        <>
          <div className="space-y-2">
            <Label>
              Дата с <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
              className="w-40"
              disabled={disabled}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Дата по <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
              className="w-40"
              disabled={disabled}
              required
            />
          </div>
        </>
      )}
      <div className="flex-1 space-y-2">
        <Label>Инструмент</Label>
        <Input
          placeholder="Фильтр по инструменту"
          value={filters.instrument ?? ''}
          onChange={(e) => onChange({ ...filters, instrument: e.target.value || undefined })}
          className="w-full"
          disabled={disabled}
        />
      </div>
    </>
  );
}
