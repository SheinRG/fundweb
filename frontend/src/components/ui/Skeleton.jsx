export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-200/70 ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full divide-y divide-zinc-100">
        <div
          className="grid gap-4 border-b border-zinc-100 bg-zinc-50/50 px-5 py-3.5"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-2.5" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-4 px-5 py-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={c === 0 ? 'h-3 w-24' : 'h-3'} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-surface px-5 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}