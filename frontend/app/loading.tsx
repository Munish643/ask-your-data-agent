import { CardGridSkeleton, ListCardSkeleton, StatCardSkeleton } from "@/components/LoadingSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717]">
      <div className="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-[#ebebeb]">
        <div className="route-progress-bar h-full bg-[#0070f3]" />
      </div>
      <div className="page-fade-in grid min-h-screen lg:grid-cols-[18rem_1fr]">
        <aside className="hidden border-r border-[#ebebeb] bg-white p-4 lg:block">
          <div className="skeleton mb-8 h-10 w-44 rounded-md" />
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="skeleton h-10 rounded-md" />
            ))}
          </div>
        </aside>
        <div>
          <header className="border-b border-[#ebebeb] bg-white px-4 py-5 md:px-8">
            <div className="skeleton h-7 w-44 rounded-md" />
            <div className="skeleton mt-3 h-4 w-72 max-w-full rounded-md" />
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <StatCardSkeleton key={index} />
              ))}
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <ListCardSkeleton rows={4} />
              <CardGridSkeleton count={2} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
