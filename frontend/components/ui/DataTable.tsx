"use client";

import { ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
import { Button } from "./button";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./skeleton";

export interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortDirection = "asc",
  onSort,
  isLoading = false,
  emptyTitle = "No data found",
  emptyDescription = "There are no records matching your request.",
  page = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <TableRow key={idx}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-5 w-full max-w-[120px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.className || ""} ${
                    col.sortable && onSort ? "cursor-pointer select-none" : ""
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.header}</span>
                    {col.sortable && sortKey === col.key && (
                      sortDirection === "asc" ? (
                        <ChevronUp className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      )
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={keyExtractor(item)} className="hover:bg-muted/40 transition-colors">
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.accessor(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-foreground">{Math.min(page * pageSize, totalItems)}</span> of{" "}
            <span className="font-medium text-foreground">{totalItems}</span> entries
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="h-8 px-2 text-xs"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5 && page > 3) {
                p = page - 2 + i;
                if (p > totalPages) p = totalPages - (4 - i);
              }
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange(p)}
                  className={`h-8 w-8 text-xs p-0 ${page === p ? "bg-primary text-white" : ""}`}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="h-8 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
