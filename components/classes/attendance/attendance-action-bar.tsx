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
    <aside aria-label="Thanh tác vụ lưu điểm danh" className="mt-4 bg-white border border-slate-200 rounded-xl py-4 px-5 sm:px-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
          <CheckCheck size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Điểm danh chưa được lưu</p>
          <p className="text-xs text-slate-500">Bạn đã có <span className="font-bold text-slate-700">{dirtyCellsSize}</span> thay đổi cần được ghi nhận.</p>
        </div>
      </div>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <button 
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 sm:flex-none px-6 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition disabled:opacity-50 whitespace-nowrap"
        >
          Hủy thay đổi
        </button>
        <button 
          onClick={onSaveOrClose}
          disabled={isSaving}
          className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 whitespace-nowrap"
        >
          <Send size={16} className="shrink-0" />
          <span className="truncate">{isSaving ? "Đang lưu..." : (dirtyCellsSize > 0 ? "Lưu & Gửi thông báo" : "Đóng chỉnh sửa")}</span>
        </button>
      </div>
    </aside>
  );
}
