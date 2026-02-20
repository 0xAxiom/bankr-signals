export function CardSkeleton() {
  return (
    <div className="border border-[#2a2a2a] rounded-lg p-4 bg-[#1a1a1a] animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-6 bg-[#2a2a2a] rounded"></div>
          <div className="w-16 h-6 bg-[#2a2a2a] rounded"></div>
          <div className="w-8 h-4 bg-[#2a2a2a] rounded"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-16 h-4 bg-[#2a2a2a] rounded"></div>
          <div className="w-20 h-4 bg-[#2a2a2a] rounded"></div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="w-16 h-3 bg-[#2a2a2a] rounded"></div>
          <div className="w-12 h-3 bg-[#2a2a2a] rounded"></div>
        </div>
        <div className="w-full bg-[#2a2a2a] rounded-full h-1.5"></div>
      </div>

      <div className="grid grid-cols-4 gap-4 text-xs mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="w-8 h-3 bg-[#2a2a2a] rounded mb-1"></div>
            <div className="w-16 h-4 bg-[#2a2a2a] rounded"></div>
          </div>
        ))}
      </div>

      <div className="w-full h-4 bg-[#2a2a2a] rounded"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
      <div className="bg-[#111] border-b border-[#2a2a2a] px-4 py-3">
        <div className="flex justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-16 h-3 bg-[#2a2a2a] rounded"></div>
          ))}
        </div>
      </div>
      
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-[#2a2a2a] last:border-0 px-4 py-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="w-4 h-4 bg-[#2a2a2a] rounded"></div>
            <div className="flex flex-col">
              <div className="w-24 h-4 bg-[#2a2a2a] rounded mb-1"></div>
              <div className="w-20 h-3 bg-[#2a2a2a] rounded"></div>
            </div>
            <div className="w-12 h-4 bg-[#2a2a2a] rounded"></div>
            <div className="w-8 h-4 bg-[#2a2a2a] rounded"></div>
            <div className="w-6 h-4 bg-[#2a2a2a] rounded"></div>
            <div className="w-6 h-4 bg-[#2a2a2a] rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 mb-12 pb-8 border-b border-[#2a2a2a]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="w-16 h-8 bg-[#2a2a2a] rounded mb-2"></div>
          <div className="w-12 h-3 bg-[#2a2a2a] rounded"></div>
        </div>
      ))}
    </div>
  );
}