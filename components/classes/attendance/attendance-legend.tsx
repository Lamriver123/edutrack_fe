export function AttendanceLegend({
  showingCount,
  totalCount,
}: {
  showingCount: number;
  totalCount: number;
}) {
  return (
    <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-bold text-slate-700">Ký hiệu:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-5 rounded bg-emerald-500 text-white text-[10px] font-bold inline-flex items-center justify-center">CM</span>
          Có mặt
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-5 rounded bg-amber-500 text-white text-[10px] font-bold inline-flex items-center justify-center">CP</span>
          Có phép
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-5 rounded bg-rose-500 text-white text-[10px] font-bold inline-flex items-center justify-center">KP</span>
          Không phép
        </span>
      </div>

      <div className="text-[11px] font-bold text-slate-500">
        Hiển thị {showingCount}/{totalCount} học sinh
      </div>
    </div>
  );
}
