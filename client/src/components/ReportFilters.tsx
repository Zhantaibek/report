import { Label } from './ui/label.tsx';
import { Input } from './ui/input.tsx';
import { DateInput } from './ui/date-input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select.tsx';
import type { RunFilters } from '../api/reports.ts';

interface Props {
  filters: RunFilters;
  onChange: (f: RunFilters) => void;
  disabled?: boolean;
  singleDate?: boolean;
}

export default function ReportFilters({ filters, onChange, disabled, singleDate }: Props) {
  return (
    <>
      {singleDate ? (
        // Одна дата для аукционов и отчета 9
        <div className="space-y-2">
          <Label>
            Дата <span className="text-destructive">*</span>
          </Label>
          <DateInput
            value={filters.dateFrom}
            onChange={(date) => onChange({ ...filters, dateFrom: date, dateTo: date })}
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
            <DateInput
              value={filters.dateFrom}
              onChange={(date) => onChange({ ...filters, dateFrom: date })}
              disabled={disabled}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>
              Дата по <span className="text-destructive">*</span>
            </Label>
            <DateInput
              value={filters.dateTo}
              onChange={(date) => onChange({ ...filters, dateTo: date })}
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
