import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { Table, Td, Th } from "@/components/ui/Table";
import { QueryState } from "@/components/ui/QueryState";
import { displayValue } from "@/utils/data";

export function DataTable({
  columns,
  rows,
  isLoading,
  error,
  onRetry,
  searchPlaceholder = "Search table...",
  searchable = true,
  emptyTitle,
  emptyDescription,
  pageSize = 10,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return rows || [];
    return (rows || []).filter((row) => JSON.stringify(row).toLowerCase().includes(value));
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="min-w-0">
      {searchable ? (
        <div className="border-b border-[var(--border)] p-4">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
          />
        </div>
      ) : null}
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!visibleRows.length}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onRetry={onRetry}
      >
        <Table>
          <thead>
            <tr>{columns.map((column) => <Th key={column.key}>{column.header}</Th>)}</tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex}>
                {columns.map((column) => <Td key={column.key}>{column.render ? column.render(row) : displayValue(row[column.key])}</Td>)}
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="flex items-center justify-between border-t border-[var(--border)] p-4 text-sm text-[var(--muted)]">
          <span>Page {safePage} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
