import clsx from "@/lib/clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-md", className)} aria-hidden="true" />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#ebebeb] bg-white p-4 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a] sm:p-5">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-9 w-20" />
    </div>
  );
}

export function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-[#ebebeb] bg-white shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a]">
      <ListRowsSkeleton rows={rows} />
    </div>
  );
}

export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#ebebeb]">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-2 h-3 w-2/5" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-[#ebebeb] bg-white p-4 shadow-[0_1px_1px_#00000005,0_2px_2px_#0000000a] sm:p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <Skeleton className="mt-5 h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-[#ebebeb]">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(120px, 1fr))` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
