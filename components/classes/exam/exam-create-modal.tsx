"use client";

import { useState, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { format } from "date-fns";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import type { Exam, CreateExamPayload } from "@/types/school";
import {
  PrimaryAction,
  SecondaryAction,
  TextInput,
} from "../classroom-ui";

type ExamCreateModalProps = {
  examToEdit?: Exam;
  onClose: () => void;
  onSubmit: (payload: CreateExamPayload, file?: File | null) => Promise<void>;
  isSubmitting: boolean;
};

export function ExamCreateModal({
  examToEdit,
  onClose,
  onSubmit,
  isSubmitting,
}: ExamCreateModalProps) {
  const [title, setTitle] = useState(examToEdit?.title || "");
  const [testDate, setTestDate] = useState(
    examToEdit?.testDate ? format(new Date(examToEdit.testDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")
  );
  const [maxScore, setMaxScore] = useState(examToEdit?.maxScore?.toString() || "10");
  const [description, setDescription] = useState(examToEdit?.description || "");
  const [file, setFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = title.trim().length > 0 && testDate.trim().length > 0 && Number(maxScore) > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    await onSubmit({
      title: title.trim(),
      testDate,
      maxScore: Number(maxScore),
      description: description.trim(),
    }, file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-[var(--shadow-modal)]">
        <div className="flex items-center justify-between border-b border-[var(--neutral-100)] px-6 py-4">
          <h2 className="text-[18px] font-extrabold text-[var(--neutral-800)]">
            {examToEdit ? "Cập nhật bài kiểm tra" : "Tạo bài kiểm tra"}
          </h2>
          <button
            className="rounded-lg p-2 text-[var(--neutral-400)] transition hover:bg-[var(--neutral-50)] hover:text-[var(--neutral-700)]"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold text-[var(--neutral-700)]" htmlFor="title">
                Tên bài kiểm tra <span className="text-[var(--error-500)]">*</span>
              </label>
              <TextInput
                autoFocus
                id="title"
                label=""
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Kiểm tra 15 phút, Giữa kỳ I..."
                required
                value={title}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-bold text-[var(--neutral-700)]" htmlFor="testDate">
                  Ngày thi <span className="text-[var(--error-500)]">*</span>
                </label>
                <input
                  className="h-11 rounded-lg border border-[var(--neutral-200)] px-3 text-[14px] font-medium text-[var(--neutral-800)] transition focus:border-[var(--brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)]"
                  id="testDate"
                  onChange={(e) => setTestDate(e.target.value)}
                  required
                  type="date"
                  value={testDate}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-bold text-[var(--neutral-700)]" htmlFor="maxScore">
                  Điểm tối đa <span className="text-[var(--error-500)]">*</span>
                </label>
                <input
                  className="h-11 rounded-lg border border-[var(--neutral-200)] px-3 text-[14px] font-medium text-[var(--neutral-800)] transition focus:border-[var(--brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)]"
                  id="maxScore"
                  min="0"
                  onChange={(e) => setMaxScore(e.target.value)}
                  required
                  step="0.1"
                  type="number"
                  value={maxScore}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold text-[var(--neutral-700)]" htmlFor="description">
                Ghi chú (không bắt buộc)
              </label>
              <TextInput
                id="description"
                label=""
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nội dung, phạm vi kiểm tra..."
                value={description}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-bold text-[var(--neutral-700)]">
                Đề kiểm tra (chỉ để lưu trữ)
              </label>
              <input
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                className="hidden"
                onChange={handleFileChange}
                ref={fileInputRef}
                type="file"
              />

              <div 
                className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)] p-4 transition hover:bg-[var(--neutral-100)]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-full bg-white shadow-sm text-[var(--brand-600)]">
                    {file || examToEdit?.fileUrl ? <FileText size={20} /> : <Upload size={20} />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[14px] font-bold text-[var(--neutral-800)]">
                      {file ? file.name : (examToEdit?.fileName ? examToEdit.fileName : "Tải lên đề bài")}
                    </span>
                    <span className="text-[12px] text-[var(--neutral-500)]">
                      {file || examToEdit?.fileName ? "Nhấn để thay đổi file (PDF/Word/Ảnh)" : "Hỗ trợ PDF, Word, Ảnh (Tối đa 5MB)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <SecondaryAction disabled={isSubmitting} onClick={onClose} type="button">
              Hủy
            </SecondaryAction>
            <PrimaryAction disabled={!isFormValid || isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Đang lưu...
                </>
              ) : examToEdit ? (
                "Cập nhật"
              ) : (
                "Tạo bài kiểm tra"
              )}
            </PrimaryAction>
          </div>
        </form>
      </div>
    </div>
  );
}
