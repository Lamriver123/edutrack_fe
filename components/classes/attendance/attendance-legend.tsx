export function AttendanceLegend({
  showingCount,
  totalCount,
}: {
  showingCount: number;
  totalCount: number;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] bg-[var(--neutral-50)] p-4 text-[13px] font-semibold text-[var(--neutral-500)] md:flex-row md:items-center">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-bold text-slate-700">Ký hiệu:</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-7 items-center justify-center rounded bg-emerald-500 text-[11px] font-bold text-white">CM</span>
          Có mặt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-7 items-center justify-center rounded bg-amber-500 text-[11px] font-bold text-white">CP</span>
          Có phép
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-6 w-7 items-center justify-center rounded bg-rose-500 text-[11px] font-bold text-white">KP</span>
          Không phép
        </span>
      </div>

      <div className="text-[12px] font-bold text-[var(--neutral-500)]">
        Hiển thị {showingCount}/{totalCount} học sinh
      </div>
    </div>
  );
}
