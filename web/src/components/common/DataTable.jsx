import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ErrorState } from './ErrorState';
import { TableSkeleton } from './LoadingState';

/**
 * Consistent table shell: toolbar + states (loading/error/empty) + rows + pagination.
 * columns: [{ key, header, render?(row), align?: 'right', className? }]
 */
export function DataTable({
  columns,
  rows = [],
  loading,
  error,
  onRetry,
  empty,
  rowKey = '_id',
  onRowClick,
  meta,
  onPage,
  toolbar,
}) {
  const showTable = !loading && !error && rows.length > 0;
  return (
    <Card className="gap-0 overflow-hidden py-0">
      {toolbar && <div className="border-b p-3">{toolbar}</div>}

      {loading ? (
        <TableSkeleton cols={columns.length} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        empty
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={cn(c.align === 'right' && 'text-right', c.headClassName)}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r[rowKey]}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={cn(c.align === 'right' && 'text-right tabular-nums', c.className)}>
                    {c.render ? c.render(r) : (r[c.key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showTable && meta && (
        <div className="text-muted-foreground flex items-center justify-between gap-3 border-t p-3 text-sm">
          <span>
            {meta.total} total · page {meta.page} of {meta.pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
