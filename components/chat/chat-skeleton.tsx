import { Skeleton } from "@/components/ui/skeleton";

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Header Skeleton */}
      <div className="border-b p-4 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Messages Area Skeleton */}
      <div className="flex-1 p-4 space-y-6 overflow-hidden">
        {/* User Message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-16 w-[300px] rounded-2xl rounded-tr-sm" />
          </div>
        </div>

        {/* AI Message */}
        <div className="flex justify-start">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-24 w-[400px] rounded-2xl rounded-tl-sm" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          </div>
        </div>

        {/* User Message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] space-y-2">
            <Skeleton className="h-12 w-[200px] rounded-2xl rounded-tr-sm" />
          </div>
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="p-4 border-t bg-background">
        <div className="relative">
          <Skeleton className="h-[52px] w-full rounded-xl" />
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}
