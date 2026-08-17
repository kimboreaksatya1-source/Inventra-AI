"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCardSkeleton() {
  return (
    <Card className="p-5 gap-0">
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-full">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="size-10 rounded-xl" />
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in-fade">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="p-0">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-4 flex-1 max-w-[160px]" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-4 w-16 hidden sm:block" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-[220px] w-full" />
    </Card>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="size-8 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Skeleton className="h-12 w-2/3" />
      </div>
    </div>
  );
}
