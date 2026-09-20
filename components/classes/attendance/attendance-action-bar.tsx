import { CheckCheck, Send } from "lucide-react";

type AttendanceActionBarProps = {
  dirtyCellsSize: number;
  editingSessionsSize: number;
  isSaving: boolean;
  onCancel: () => void;
  onSaveOrClose: () => void;
};

export function AttendanceActionBar({
  dirtyCellsSize,
  editingSessionsSize,
  isSaving,
  onCancel,
  onSaveOrClose,
}: AttendanceActionBarProps) {
  if (dirtyCellsSize === 0 && editingSessionsSize === 0) {
    return null;
  }

  return (
    <aside aria-label="Thanh tác vụ lưu điểm danh" className="mt-4 flex flex-col items-stretch justify-between gap-4 rounded-md border border-[var(--border)] bg-white px-4 py-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:px-5">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <CheckCheck size={16} />
        </div>
        <div>
          <p className="text-[14px] font-extrabold text-[var(--neutral-800)]">Điểm danh chưa được lưu</p>
          <p className="text-[13px] text-[var(--neutral-500)]">Bạn có <span className="font-bold text-[var(--neutral-700)]">{dirtyCellsSize}</span> thay đổi cần ghi nhận.</p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button 
          onClick={onCancel}
          disabled={isSaving}
          className="h-11 flex-1 whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-5 text-[14px] font-bold text-[var(--neutral-700)] transition hover:bg-[var(--neutral-50)] disabled:opacity-50 sm:flex-none"
        >
          Hủy thay đổi
        </button>
        <button 
          onClick={onSaveOrClose}
          disabled={isSaving}
          className="flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[var(--brand-600)] px-5 text-[14px] font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-[var(--brand-700)] disabled:opacity-50 sm:flex-none"
        >
          <Send size={16} className="shrink-0" />
          <span className="truncate">{isSaving ? "Đang lưu..." : (dirtyCellsSize > 0 ? "Lưu" : "Đóng chỉnh sửa")}</span>
        </button>
      </div>
    </aside>
  );
}
