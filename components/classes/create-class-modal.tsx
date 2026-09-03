import {
  BookOpenCheck,
  Coins,
  ImageIcon,
  LoaderCircle,
  Palette,
  Plus,
  Save,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import type { ClassStatus } from "@/types/school";
import type { ClassFormState } from "./classroom-types";
import {
  Modal,
  PrimaryAction,
  SecondaryAction,
  TextArea,
  TextInput,
} from "./classroom-ui";
import {
  CLASS_COLOR_OPTIONS,
  formatCurrencyInput,
} from "./classroom-utils";

export type ClassColorUsage = {
  classId: string;
  className: string;
  colorIndex: number;
};

function CurrencyInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <span className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--neutral-400)]">
          <Coins size={16} />
        </span>
        <input
          className="h-12 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-4 pl-11 pr-16 text-[15px] font-medium text-[var(--neutral-800)] outline-none transition placeholder:text-[var(--neutral-400)] hover:border-[var(--brand-200)] focus:border-[var(--brand-400)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)]"
          inputMode="numeric"
          onChange={(event) => onChange(formatCurrencyInput(event.target.value))}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] font-extrabold text-[var(--brand-600)]">
          VND
        </span>
      </span>
    </label>
  );
}

export function CreateClassModal({
  form,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  usedColorUsages,
}: {
  form: ClassFormState;
  isSubmitting: boolean;
  onChange: (form: ClassFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  usedColorUsages: ClassColorUsage[];
}) {
  return (
    <ClassFormModal
      form={form}
      isSubmitting={isSubmitting}
      onChange={onChange}
      onClose={onClose}
      onSubmit={onSubmit}
      submitIcon={<Plus size={16} />}
      submitLoadingIcon={<LoaderCircle className="animate-spin" size={16} />}
      submitText="Tạo lớp"
      title="Tạo lớp học"
      usedColorUsages={usedColorUsages}
    />
  );
}

export function EditClassModal({
  form,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  usedColorUsages,
}: {
  form: ClassFormState;
  isSubmitting: boolean;
  onChange: (form: ClassFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  usedColorUsages: ClassColorUsage[];
}) {
  return (
    <ClassFormModal
      form={form}
      isEditMode
      isSubmitting={isSubmitting}
      onChange={onChange}
      onClose={onClose}
      onSubmit={onSubmit}
      submitIcon={<Save size={16} />}
      submitLoadingIcon={<LoaderCircle className="animate-spin" size={16} />}
      submitText="Lưu thay đổi"
      title="Sửa lớp học"
      usedColorUsages={usedColorUsages}
    />
  );
}

function ClassFormModal({
  form,
  isEditMode = false,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
  submitIcon,
  submitLoadingIcon,
  submitText,
  title,
  usedColorUsages,
}: {
  form: ClassFormState;
  isEditMode?: boolean;
  isSubmitting: boolean;
  onChange: (form: ClassFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitIcon: ReactNode;
  submitLoadingIcon: ReactNode;
  submitText: string;
  title: string;
  usedColorUsages: ClassColorUsage[];
}) {
  return (
    <Modal onClose={onClose} title={title}>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <TextInput
          icon={<BookOpenCheck size={16} />}
          label="Tên lớp"
          onChange={(event) =>
            onChange({
              ...form,
              name: event.target.value,
            })
          }
          placeholder="Ví dụ: Tiếng Anh 6A"
          value={form.name}
        />

        <TextInput
          icon={<ImageIcon size={16} />}
          label="Ảnh lớp học"
          onChange={(event) =>
            onChange({
              ...form,
              imageUrl: event.target.value,
            })
          }
          placeholder="Dán URL ảnh lớp nếu muốn thay ảnh mặc định"
          type="url"
          value={form.imageUrl}
        />

        <ClassColorPicker
          onChange={(colorIndex) =>
            onChange({
              ...form,
              colorIndex,
            })
          }
          usedColorUsages={usedColorUsages}
          value={form.colorIndex}
        />

        {isEditMode ? (
          <ClassStatusPicker
            onChange={(status) =>
              onChange({
                ...form,
                status,
              })
            }
            value={form.status}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <CurrencyInput
            label="Giá buổi thường"
            onChange={(value) =>
              onChange({
                ...form,
                regularPrice: value,
              })
            }
            placeholder="50.000"
            value={form.regularPrice}
          />
          <CurrencyInput
            label="Giá học bù"
            onChange={(value) =>
              onChange({
                ...form,
                makeupPrice: value,
              })
            }
            placeholder="70.000"
            value={form.makeupPrice}
          />
        </div>

        <TextArea
          label="Mô tả"
          onChange={(event) =>
            onChange({
              ...form,
              description: event.target.value,
            })
          }
          placeholder="Ghi chú ngắn về lớp, lịch học dự kiến..."
          value={form.description}
        />

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] pt-4 sm:flex-row sm:justify-end">
          <SecondaryAction onClick={onClose} type="button">
            Hủy
          </SecondaryAction>
          <PrimaryAction
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? submitLoadingIcon : submitIcon}
            {submitText}
          </PrimaryAction>
        </div>
      </form>
    </Modal>
  );
}

function ClassColorPicker({
  onChange,
  usedColorUsages,
  value,
}: {
  onChange: (colorIndex: number) => void;
  usedColorUsages: ClassColorUsage[];
  value: number;
}) {
  return (
    <div className="grid gap-2">
      <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--neutral-600)]">
        <Palette size={16} />
        Màu hiển thị trên thời khóa biểu
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        {CLASS_COLOR_OPTIONS.map((color, colorIndex) => {
          const isActive = value === colorIndex;
          const usedBy = usedColorUsages.filter(
            (usage) => usage.colorIndex === colorIndex,
          );

          return (
            <button
              className={`grid min-h-[74px] gap-2 rounded-lg border p-3 text-left transition ${
                isActive
                  ? "border-[var(--brand-400)] bg-[var(--brand-50)] shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
                  : "border-[var(--neutral-200)] bg-white hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)]"
              }`}
              key={color.label}
              onClick={() => onChange(colorIndex)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-8 shrink-0 rounded-lg border border-white shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
                  style={{ background: color.accent }}
                />
                <span className="min-w-0">
                  <strong className="block truncate text-[14px] text-[var(--brand-950)]">
                    {color.label}
                  </strong>
                  <span className="block truncate text-[12px] font-semibold text-[var(--neutral-500)]">
                    {usedBy.length
                      ? `Đã dùng: ${usedBy
                          .map((usage) => usage.className)
                          .slice(0, 2)
                          .join(", ")}`
                      : "Chưa lớp nào dùng"}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClassStatusPicker({
  onChange,
  value,
}: {
  onChange: (status: ClassStatus) => void;
  value: ClassStatus;
}) {
  const options: Array<{ label: string; value: ClassStatus }> = [
    { label: "Đang học", value: "active" },
    { label: "Tạm dừng", value: "inactive" },
  ];

  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        Trạng thái lớp
      </span>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-1.5">
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              className={`h-11 rounded-lg text-[14px] font-bold transition ${
                isActive
                  ? "bg-white text-[var(--brand-700)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--neutral-500)] hover:bg-white/70"
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
