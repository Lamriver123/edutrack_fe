"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  MoreHorizontal,
  Trash2,
  Upload,
  UserMinus,
} from "lucide-react";
import { useState, type ChangeEvent } from "react";
import type {
  DeleteStudentMode,
  Student,
  StudentImportResult,
  UpdateStudentPayload,
} from "@/types/school";
import type { StudentFormState } from "@/components/classes/classroom-types";
import {
  Modal,
  PrimaryAction,
  SecondaryAction,
  StudentAvatar,
} from "@/components/classes/classroom-ui";
import { getStudentAvatar } from "@/components/classes/classroom-utils";
import styles from "@/components/classes/classroom-manager.module.css";

export function BulkStudentActionMenu({
  disabled,
  onSelectAction,
  selectedCount,
}: {
  disabled: boolean;
  onSelectAction: (mode: DeleteStudentMode) => void;
  selectedCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleAction(mode: DeleteStudentMode) {
    onSelectAction(mode);
    setIsOpen(false);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] px-4 text-[14px] font-bold text-[var(--brand-800)]">
        Đã chọn {selectedCount} học sinh
      </span>
      <div
        className="relative"
        onBlur={(event) => {
          const nextFocus = event.relatedTarget;

          if (
            nextFocus instanceof Node &&
            event.currentTarget.contains(nextFocus)
          ) {
            return;
          }

          setIsOpen(false);
        }}
      >
        <button
          aria-expanded={isOpen}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-4 text-[14px] font-bold text-[var(--neutral-700)] shadow-[var(--shadow-sm)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] disabled:pointer-events-none disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)] sm:w-auto"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <MoreHorizontal size={16} />
          Thao tác
          <ChevronDown
            className="text-[var(--neutral-400)] transition"
            data-open={isOpen}
            size={16}
          />
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-[90] grid w-[260px] rounded-lg border border-[var(--neutral-200)] bg-white p-2 shadow-[0_18px_44px_rgba(15,23,42,0.14)] sm:left-auto sm:right-0">
            <button
              className="flex min-h-11 items-start gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-bold text-[var(--neutral-700)] transition hover:bg-[var(--brand-50)] hover:text-[var(--brand-800)]"
              onClick={() => handleAction("deactivate")}
              type="button"
            >
              <UserMinus className="mt-0.5 shrink-0" size={16} />
              <span>
                <span className="block">Chuyển tạm nghỉ</span>
                <span className="mt-0.5 block text-[12px] font-semibold text-[var(--neutral-500)]">
                  Giữ hồ sơ và lịch sử quản lý.
                </span>
              </span>
            </button>
            <button
              className="flex min-h-11 items-start gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-bold text-red-600 transition hover:bg-red-50"
              onClick={() => handleAction("delete")}
              type="button"
            >
              <Trash2 className="mt-0.5 shrink-0" size={16} />
              <span>
                <span className="block">Xóa vĩnh viễn</span>
                <span className="mt-0.5 block text-[12px] font-semibold text-red-400">
                  Chỉ dùng khi không cần giữ hồ sơ.
                </span>
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <div
        className={styles.filterSelect}
        onBlur={(event) => {
          const nextFocus = event.relatedTarget;

          if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
            return;
          }

          setIsOpen(false);
        }}
      >
        <button
          aria-expanded={isOpen}
          className={styles.scheduleSelectButton}
          data-open={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className={styles.scheduleSelectValue}>
            <span>{selectedOption?.label ?? "Chọn"}</span>
          </span>
          <ChevronDown
            className={styles.scheduleSelectChevron}
            data-open={isOpen}
            size={18}
          />
        </button>

        {isOpen ? (
          <div className={styles.filterSelectMenu} role="listbox">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  aria-selected={isSelected}
                  className={styles.scheduleSelectOption}
                  data-selected={isSelected}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check size={15} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ImportStudentsModal({
  file,
  isImporting,
  onClose,
  onConfirm,
  onDownloadTemplate,
  onFileChange,
  result,
}: {
  file: File | null;
  isImporting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onDownloadTemplate: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  result: StudentImportResult | null;
}) {
  const visibleErrors = result?.errors.slice(0, 5) ?? [];

  return (
    <Modal onClose={onClose} title="Import danh sách học sinh">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="flex items-center gap-2 text-[15px] font-extrabold text-[var(--brand-900)]">
                <FileSpreadsheet size={17} />
                Mẫu danh sách học sinh
              </h4>
              <p className="mt-1 text-[14px] font-semibold leading-6 text-[var(--neutral-600)]">
                Tải mẫu Excel, vui lòng tuân thủ theo form mẫu này!!!
              </p>
            </div>
            <SecondaryAction
              className="h-11 w-full px-3 sm:w-auto"
              icon={<Download size={15} />}
              onClick={onDownloadTemplate}
              type="button"
            >
              Tải mẫu
            </SecondaryAction>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-[14px] font-bold text-[var(--neutral-600)]">
            File danh sách
          </span>
          <label className="flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--brand-200)] bg-white px-4 py-6 text-center transition hover:bg-[var(--brand-50)]">
            <input
              accept=".xlsx,.csv,.txt,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
              className="sr-only"
              disabled={isImporting}
              onChange={onFileChange}
              type="file"
            />
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-700)]">
              <Upload size={20} />
            </span>
            <span className="grid gap-1">
              <strong className="text-[15px] text-[var(--brand-900)]">
                {file ? file.name : "Chọn file mẫu đã nhập dữ liệu"}
              </strong>
              <span className="text-[13px] font-semibold text-[var(--neutral-500)]">
                Mẫu XLSX của hệ thống, CSV, TSV hoặc TXT; tối đa 2MB.
              </span>
            </span>
          </label>
        </div>

        {result ? (
          <div className="grid gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <ImportMetric label="Tổng dòng" value={result.totalRows} />
              <ImportMetric label="Thành công" value={result.successCount} />
              <ImportMetric label="Lỗi" value={result.failedCount} />
            </div>
            {visibleErrors.length ? (
              <div className="grid gap-2">
                <strong className="text-[14px] text-red-700">
                  Dòng cần kiểm tra lại
                </strong>
                <div className="grid max-h-40 gap-2 overflow-y-auto pr-1">
                  {visibleErrors.map((error) => (
                    <div
                      className="rounded-lg border border-red-100 bg-red-50 p-3 text-[13px] font-semibold leading-5 text-red-700"
                      key={`${error.row}-${error.message}`}
                    >
                      Dòng {error.row}: {error.message}
                    </div>
                  ))}
                  {result.errors.length > visibleErrors.length ? (
                    <div className="text-[13px] font-semibold text-[var(--neutral-500)]">
                      Còn {result.errors.length - visibleErrors.length} lỗi
                      khác trong file.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] pt-4 sm:flex-row sm:justify-end">
          <SecondaryAction disabled={isImporting} onClick={onClose} type="button">
            Hủy
          </SecondaryAction>
          <PrimaryAction
            disabled={!file || isImporting}
            icon={
              isImporting ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <Upload size={16} />
              )
            }
            onClick={onConfirm}
            type="button"
          >
            Import danh sách
          </PrimaryAction>
        </div>
      </div>
    </Modal>
  );
}

function ImportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white bg-white p-3 shadow-[var(--shadow-sm)]">
      <span className="block text-[12px] font-bold text-[var(--neutral-500)]">
        {label}
      </span>
      <strong className="mt-1 block text-[20px] text-[var(--brand-950)]">
        {value}
      </strong>
    </div>
  );
}

export function StudentDirectoryIdentity({ student }: { student: Student }) {
  return (
    <div className="grid min-w-0 grid-cols-[48px_1fr] items-center gap-3">
      <StudentAvatar alt={student.fullName} src={getStudentAvatar(student)} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold text-[var(--neutral-800)]">
          {student.fullName}
        </span>
        <span className="block truncate text-[13px] text-[var(--neutral-500)]">
          {student.studentCode}
        </span>
      </span>
    </div>
  );
}

export function buildStudentUpdatePayload(
  form: StudentFormState,
): UpdateStudentPayload {
  return {
    studentCode: form.studentCode.trim(),
    fullName: form.fullName.trim(),
    gender: form.gender,
    avatarUrl: form.avatarUrl.trim() || undefined,
    dateOfBirth: form.dateOfBirth || undefined,
    gradeLevel: form.gradeLevel.trim(),
    phone: form.phone.trim(),
    parent: {
      fullName: form.parentFullName.trim(),
      phone: form.parentPhone.trim(),
      relation: form.parentRelation.trim(),
      note: form.parentNote.trim(),
    },
    address: form.address.trim(),
    note: form.note.trim(),
    status: form.status,
  };
}

export function DeleteStudentModal({
  isDeleting,
  mode,
  onChangeMode,
  onClose,
  onConfirm,
  student,
}: {
  isDeleting: boolean;
  mode: DeleteStudentMode;
  onChangeMode: (mode: DeleteStudentMode) => void;
  onClose: () => void;
  onConfirm: () => void;
  student: Student;
}) {
  const options: Array<{
    description: string;
    label: string;
    value: DeleteStudentMode;
  }> = [
    {
      description:
        "Giữ hồ sơ trong danh bạ, đổi trạng thái sang tạm nghỉ và rời khỏi các lớp đang học.",
      label: "Tạm nghỉ",
      value: "deactivate",
    },
    {
      description:
        "Xóa hồ sơ khỏi hệ thống. Thao tác này không nên dùng nếu còn cần lịch sử quản lý.",
      label: "Xóa vĩnh viễn",
      value: "delete",
    },
  ];

  return (
    <Modal onClose={isDeleting ? () => undefined : onClose} size="sm" title="Xóa học sinh">
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-red-100 bg-red-50 p-4 text-red-700">
          <span className="flex items-center gap-2 text-[15px] font-extrabold">
            <AlertTriangle size={18} />
            Chọn cách xử lý hồ sơ
          </span>
          <p className="text-[14px] font-semibold leading-6">
            Bạn đang thao tác với học sinh {student.fullName}. Vui lòng chọn
            cách xóa trước khi xác nhận.
          </p>
        </div>

        <div className="grid gap-2">
          {options.map((option) => {
            const isActive = mode === option.value;

            return (
              <button
                className={`grid gap-1 rounded-lg border p-3 text-left transition ${
                  isActive
                    ? "border-red-300 bg-red-50 text-red-800"
                    : "border-[var(--neutral-200)] bg-white text-[var(--neutral-700)] hover:border-red-100 hover:bg-red-50"
                }`}
                disabled={isDeleting}
                key={option.value}
                onClick={() => onChangeMode(option.value)}
                type="button"
              >
                <strong className="text-[14px]">{option.label}</strong>
                <span className="text-[13px] font-semibold leading-5 text-[var(--neutral-500)]">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
          <SecondaryAction disabled={isDeleting} onClick={onClose} type="button">
            Hủy
          </SecondaryAction>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-red-500 bg-red-600 px-5 text-[14px] font-bold text-white shadow-[0_18px_30px_rgba(220,38,38,0.18)] transition hover:bg-red-500 disabled:pointer-events-none disabled:opacity-60"
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Trash2 size={16} />
            )}
            {mode === "delete" ? "Xóa vĩnh viễn" : "Chuyển tạm nghỉ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

