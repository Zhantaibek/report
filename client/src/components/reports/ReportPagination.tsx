import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface ReportPaginationProps {
  page: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
}

export function ReportPagination({ page, totalPages, totalRecords, onPageChange }: ReportPaginationProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Всего сделок: {totalRecords}. Страница {page} из {totalPages}.</span>
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
      >
        <ChevronsLeft className="h-4 w-4 mr-1" />
        Первая
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Назад
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Вперёд
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        Последняя
        <ChevronsRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
