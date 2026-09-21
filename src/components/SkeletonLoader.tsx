import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-sand/40 rounded-xl ${className}`} />
);

export const SkeletonCard: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div className="bg-white rounded-2xl border border-sand p-5 space-y-4 shadow-xs animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sand/50" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 bg-sand/60 rounded" />
          <div className="h-3 w-20 bg-sand/40 rounded" />
        </div>
      </div>
      <div className="h-6 w-16 bg-sand/40 rounded-full" />
    </div>
    <div className="space-y-2 pt-2 border-t border-sand/40">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-1">
          <div className="h-3 w-28 bg-sand/40 rounded" />
          <div className="h-3 w-16 bg-sand/50 rounded font-mono" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ columns?: number; rows?: number }> = ({ 
  columns = 5, 
  rows = 6 
}) => (
  <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden animate-pulse">
    {/* Table Header skeleton */}
    <div className="p-4 bg-linen/50 border-b border-sand flex items-center justify-between">
      <div className="h-4 w-40 bg-sand/60 rounded" />
      <div className="h-8 w-48 bg-sand/40 rounded-xl" />
    </div>
    {/* Table Head row */}
    <div className="grid grid-cols-5 gap-4 p-3.5 bg-cream/40 border-b border-sand/60 text-xs">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-3 bg-sand/50 rounded w-4/5" />
      ))}
    </div>
    {/* Table Body rows */}
    <div className="divide-y divide-sand/40">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid grid-cols-5 gap-4 p-4 items-center">
          {Array.from({ length: columns }).map((_, c) => (
            <div 
              key={c} 
              className={`h-3.5 rounded ${c === 0 ? 'w-3/4 bg-sand/60' : 'w-1/2 bg-sand/40'}`} 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const ModuleSkeletonView: React.FC<{ title?: string }> = ({ title = 'Chargement du module...' }) => (
  <div className="space-y-6 animate-fade-in">
    {/* Top Metrics Row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-sand p-4 space-y-2.5 shadow-xs animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-sand/50 rounded" />
            <div className="w-8 h-8 rounded-lg bg-sand/40" />
          </div>
          <div className="h-7 w-28 bg-sand/70 rounded font-mono" />
          <div className="h-2.5 w-36 bg-sand/30 rounded" />
        </div>
      ))}
    </div>

    {/* Main Content Table or Grid */}
    <SkeletonTable columns={5} rows={6} />
  </div>
);
