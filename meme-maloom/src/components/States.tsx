export function EmptyState({
  title = "No memes found",
  description = "Try adjusting your filters or search for something else.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-navy-900/15 bg-white/60 px-6 py-16 text-center">
      <div className="text-5xl" aria-hidden="true">
        🕵️
      </div>
      <p className="font-display text-lg font-bold text-navy-900">{title}</p>
      <p className="max-w-sm text-sm text-navy-500">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 rounded-full bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-saffron-600"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-3xl border-2 border-pink-200 bg-pink-50 px-6 py-16 text-center"
    >
      <div className="text-5xl" aria-hidden="true">
        ⚠️
      </div>
      <p className="font-display text-lg font-bold text-navy-900">{title}</p>
      <p className="max-w-sm text-sm text-navy-600">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full bg-pink-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-pink-600"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl border-2 border-navy-900/10 bg-white">
      <div className="aspect-video bg-navy-900/10" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-2/3 rounded-full bg-navy-900/10" />
        <div className="h-3 w-full rounded-full bg-navy-900/10" />
        <div className="h-3 w-4/5 rounded-full bg-navy-900/10" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading memes"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
