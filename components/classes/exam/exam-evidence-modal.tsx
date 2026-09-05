"use client";

import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Upload, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";

type ExamEvidenceModalProps = {
  examId: string;
  studentId: string;
  studentName: string;
  examTitle: string;
  existingImages: string[];
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
  score: string;
  note: string;
  maxScore: number;
  onScoreChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onRemove: (imageUrl: string) => void;
};

export function ExamEvidenceModal({
  studentName,
  examTitle,
  existingImages,
  onClose,
  onUpload,
  isUploading,
  score,
  note,
  maxScore,
  onScoreChange,
  onNoteChange,
  onRemove,
}: ExamEvidenceModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      onUpload(selected);
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-[var(--shadow-modal)] max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[var(--neutral-100)] px-6 py-4">
          <div>
            <h2 className="text-[18px] font-extrabold text-[var(--neutral-800)]">
              Minh chứng bài làm
            </h2>
            <p className="text-[13px] text-[var(--neutral-500)] mt-0.5">
              {studentName} - {examTitle}
            </p>
          </div>
          <button
            className="rounded-lg p-2 text-[var(--neutral-400)] transition hover:bg-[var(--neutral-50)] hover:text-[var(--neutral-700)] self-start"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <label className="text-[14px] font-bold text-[var(--neutral-700)] block mb-2">
              Điểm số (Tối đa: {maxScore})
            </label>
            <input
              className="w-full text-left h-12 px-4 border border-[var(--neutral-200)] rounded-lg font-bold text-[15px] focus:outline-none focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
              max={maxScore}
              min={0}
              onChange={(e) => onScoreChange(e.target.value)}
              placeholder="Nhập điểm..."
              step="0.1"
              type="number"
              value={score}
            />
          </div>

          <div className="mb-6">
            <label className="text-[14px] font-bold text-[var(--neutral-700)] block mb-2">
              Ghi chú điểm
            </label>
            <input
              className="w-full h-12 rounded-lg border border-[var(--neutral-200)] px-4 text-[15px] font-semibold text-[var(--neutral-700)] outline-none transition placeholder:text-[var(--neutral-400)] focus:border-[var(--brand-500)] focus:ring-1 focus:ring-[var(--brand-500)]"
              maxLength={80}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="VD: 20/30 câu"
              value={note}
            />
          </div>

          <div className="mb-2">
            <label className="text-[14px] font-bold text-[var(--neutral-700)] block mb-1">
              Ảnh minh chứng
            </label>
          </div>

          {existingImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {existingImages.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg border border-[var(--neutral-200)] overflow-hidden relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-2">
                    <a href={img} target="_blank" rel="noreferrer" className="text-white text-[13px] font-semibold hover:underline">
                      Xem lớn
                    </a>
                    <button
                      onClick={() => onRemove(img)}
                      className="text-white bg-[var(--error-500)] hover:bg-[var(--error-600)] p-1.5 rounded-full shadow transition"
                      title="Xóa ảnh"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-[var(--neutral-200)] rounded-lg mb-6 bg-[var(--neutral-50)]">
              <ImageIcon className="text-[var(--neutral-300)] mb-2" size={32} />
              <p className="text-[14px] text-[var(--neutral-500)]">Chưa có ảnh minh chứng nào.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-bold text-[var(--neutral-700)]">
              Thêm ảnh mới
            </label>
            <input
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />
            
            <button 
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--brand-300)] bg-[var(--brand-50)] p-4 text-[var(--brand-700)] transition hover:bg-[var(--brand-100)]"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {isUploading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Upload size={20} />
              )}
              <span className="font-semibold text-[14px]">
                {isUploading ? "Đang lưu..." : "Thêm ảnh từ thiết bị"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
