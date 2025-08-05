import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-optimized-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }

import { useMemo, memo } from "react";

const SKELETON_CARDS = Array.from({ length: 4 }, (_, i) => i);
const SKELETON_ORDERS = Array.from({ length: 3 }, (_, i) => i);
const SKELETON_DETAILS = Array.from({ length: 5 }, (_, i) => i);

const SkeletonCard = memo(({ index }: { index: number }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6" style={{ animationDelay: `${index * 100}ms` }}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <Skeleton className="h-4 w-20 mb-1" />
    <Skeleton className="h-8 w-24" />
  </div>
));

const SkeletonOrder = memo(({ index }: { index: number }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" style={{ animationDelay: `${index * 50}ms` }}>
    <div className="flex items-center space-x-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div>
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="text-right">
      <Skeleton className="h-4 w-16 mb-1" />
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
));

export const DashboardSkeleton = memo(() => {
  const skeletonCards = useMemo(() => SKELETON_CARDS, []);
  const skeletonOrders = useMemo(() => SKELETON_ORDERS, []);
  const skeletonDetails = useMemo(() => SKELETON_DETAILS, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {skeletonCards.map((i) => (
          <SkeletonCard key={i} index={i} />
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders Skeleton */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {skeletonOrders.map((i) => (
              <SkeletonOrder key={i} index={i} />
            ))}
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {skeletonDetails.map((i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
