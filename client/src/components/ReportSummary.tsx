import ReportTable from './ReportTable.tsx';

interface Props {
  rows: Record<string, unknown>[];
}

export default function ReportSummary({ rows }: Props) {
  return <ReportTable rows={rows} />;
}
