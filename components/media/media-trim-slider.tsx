"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function formatDuration(seconds: number) {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00.0";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s}.${ms}`;
}

export function MediaTrimSlider({
  start,
  end,
  max,
  onChange,
}: {
  start: number;
  end: number;
  max: number;
  onChange: (range: { start: number; end: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  const safeMax = isFinite(max) && max > 0 ? max : 1;
  const safeStart = isFinite(start) ? Math.max(0, Math.min(start, safeMax)) : 0;
  const safeEnd = isFinite(end) ? Math.max(0, Math.min(end, safeMax)) : safeMax;

  const handlePointerDown = (thumb: 'start' | 'end') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(thumb);
  };

  const calcValue = useCallback((clientX: number) => {
    if (!containerRef.current || safeMax <= 0) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;
    return Math.round(percent * safeMax * 10) / 10;
  }, [safeMax]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    const newValue = calcValue(e.clientX);
    if (newValue === null) return;

    if (isDragging === 'start') {
      onChange({ start: Math.max(0, Math.min(newValue, safeEnd - 0.1)), end: safeEnd });
    } else {
      onChange({ start: safeStart, end: Math.min(safeMax, Math.max(newValue, safeStart + 0.1)) });
    }
  }, [isDragging, safeMax, safeStart, safeEnd, onChange, calcValue]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const startPercent = (safeStart / safeMax) * 100;
  const endPercent = (safeEnd / safeMax) * 100;

  return (
    <div className="flex flex-col gap-4 w-full px-2 mt-4">
      <div className="flex items-center justify-between text-[13px] font-medium text-[var(--neutral-700)]">
        <span>Bắt đầu: {formatDuration(safeStart)}</span>
        <span>Kết thúc: {formatDuration(safeEnd)}</span>
        <span>Độ dài: {formatDuration(safeEnd - safeStart)}</span>
      </div>

      <div className="w-full relative h-10 flex items-center select-none touch-none" ref={containerRef}>
        {/* Background track */}
        <div className="absolute left-0 right-0 h-2 bg-zinc-200 rounded-full" />
        
        {/* Active track */}
        <div 
          className="absolute h-2 bg-[var(--brand-500)] rounded-full pointer-events-none"
          style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
        />
        
        {/* Start thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-6 bg-[var(--brand-600)] rounded-full border-2 border-white shadow-lg hover:scale-125 transition-transform cursor-grab active:cursor-grabbing z-10 touch-none"
          style={{ left: `${startPercent}%` }}
          onPointerDown={handlePointerDown('start')}
        />
        
        {/* End thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-6 bg-[var(--brand-600)] rounded-full border-2 border-white shadow-lg hover:scale-125 transition-transform cursor-grab active:cursor-grabbing z-10 touch-none"
          style={{ left: `${endPercent}%` }}
          onPointerDown={handlePointerDown('end')}
        />
      </div>
    </div>
  );
}
