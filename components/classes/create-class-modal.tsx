/* eslint-disable @next/next/no-img-element */

import {
  BookOpenCheck,
  CalendarDays,
  Coins,
  ImageIcon,
  LoaderCircle,
  Palette,
  Plus,
  Save,
  Upload,
} from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
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
  DEFAULT_CLASS_IMAGE_URL,
  formatCurrencyInput,
  getClassColorLabel,
  getClassColorTheme,
  normalizeClassColorHex,
} from "./classroom-utils";

export type ClassColorUsage = {
  classId: string;
  className: string;
  colorIndex: number;
  colorHex: string;
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
  imageFileName,
  imagePreviewUrl,
  isSubmitting,
  isUploadingImage,
  onChange,
  onClose,
  onImageFileChange,
  onImageUrlChange,
  onSubmit,
  usedColorUsages,
}: {
  form: ClassFormState;
  imageFileName: string;
  imagePreviewUrl?: string;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  onChange: (form: ClassFormState) => void;
  onClose: () => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (imageUrl: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  usedColorUsages: ClassColorUsage[];
}) {
  return (
    <ClassFormModal
      form={form}
      imageFileName={imageFileName}
      imagePreviewUrl={imagePreviewUrl}
      isSubmitting={isSubmitting}
      isUploadingImage={isUploadingImage}
      onChange={onChange}
      onClose={onClose}
      onImageFileChange={onImageFileChange}
      onImageUrlChange={onImageUrlChange}
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
  imageFileName,
  imagePreviewUrl,
  isSubmitting,
  isUploadingImage,
  onChange,
  onClose,
  onImageFileChange,
  onImageUrlChange,
  onSubmit,
  usedColorUsages,
}: {
  form: ClassFormState;
  imageFileName: string;
  imagePreviewUrl?: string;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  onChange: (form: ClassFormState) => void;
  onClose: () => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (imageUrl: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  usedColorUsages: ClassColorUsage[];
}) {
  return (
    <ClassFormModal
      form={form}
      imageFileName={imageFileName}
      imagePreviewUrl={imagePreviewUrl}
      isEditMode
      isSubmitting={isSubmitting}
      isUploadingImage={isUploadingImage}
      onChange={onChange}
      onClose={onClose}
      onImageFileChange={onImageFileChange}
      onImageUrlChange={onImageUrlChange}
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
  imageFileName,
  imagePreviewUrl,
  isEditMode = false,
  isSubmitting,
  isUploadingImage,
  onChange,
  onClose,
  onImageFileChange,
  onImageUrlChange,
  onSubmit,
  submitIcon,
  submitLoadingIcon,
  submitText,
  title,
  usedColorUsages,
}: {
  form: ClassFormState;
  imageFileName: string;
  imagePreviewUrl?: string;
  isEditMode?: boolean;
  isSubmitting: boolean;
  isUploadingImage: boolean;
  onChange: (form: ClassFormState) => void;
  onClose: () => void;
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (imageUrl: string) => void;
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

        <ClassImagePicker
          fileName={imageFileName}
          form={form}
          imagePreviewUrl={imagePreviewUrl}
          isUploading={isUploadingImage}
          onFileChange={onImageFileChange}
          onImageUrlChange={onImageUrlChange}
        />

        <ClassColorPicker
          onChange={(colorHex, colorIndex) =>
            onChange({
              ...form,
              colorHex,
              colorIndex: colorIndex ?? form.colorIndex,
            })
          }
          usedColorUsages={usedColorUsages}
          value={form.colorHex}
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

        <TextInput
          icon={<CalendarDays size={16} />}
          label="Ngày áp dụng giá"
          onChange={(event) =>
            onChange({
              ...form,
              priceEffectiveFrom: event.target.value,
            })
          }
          type="date"
          value={form.priceEffectiveFrom}
        />

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
            {isUploadingImage ? "Đang tải ảnh..." : submitText}
          </PrimaryAction>
        </div>
      </form>
    </Modal>
  );
}

function ClassImagePicker({
  fileName,
  form,
  imagePreviewUrl,
  isUploading,
  onFileChange,
  onImageUrlChange,
}: {
  fileName: string;
  form: ClassFormState;
  imagePreviewUrl?: string;
  isUploading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onImageUrlChange: (imageUrl: string) => void;
}) {
  const typedImageUrl = form.imageUrl.trim();
  const resolvedImageUrl =
    imagePreviewUrl || typedImageUrl || DEFAULT_CLASS_IMAGE_URL;
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const hasPreviewError = failedImageUrl === resolvedImageUrl;
  const previewImageUrl = hasPreviewError
    ? DEFAULT_CLASS_IMAGE_URL
    : resolvedImageUrl;
  const previewLabel = imagePreviewUrl
    ? "Preview ảnh vừa chọn"
    : typedImageUrl
      ? "Preview từ URL ảnh"
      : "Ảnh mặc định của lớp";

  return (
    <div className="grid gap-2">
      <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--neutral-600)]">
        <ImageIcon size={16} />
        Ảnh lớp học
      </span>
      <div className="grid gap-3 rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-2.5 sm:grid-cols-[180px_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white bg-white shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
          <img
            alt="Preview ảnh lớp học"
            className="size-full object-cover"
            onError={() => setFailedImageUrl(resolvedImageUrl)}
            src={previewImageUrl}
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-2.5 py-1 text-[12px] font-extrabold text-[var(--brand-700)] shadow-[var(--shadow-sm)]">
            {hasPreviewError ? "Ảnh lỗi, dùng mặc định" : previewLabel}
          </span>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--brand-200)] bg-white px-3 text-[13px] font-extrabold text-[var(--brand-700)] transition hover:bg-[var(--brand-50)]">
              {isUploading ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <Upload size={15} />
              )}
              Chọn ảnh
              <input
                accept="image/*"
                className="sr-only"
                disabled={isUploading}
                onChange={onFileChange}
                type="file"
              />
            </label>
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--neutral-500)]">
              {fileName || "Chọn file để xem trước, chưa upload Cloudinary."}
            </span>
          </div>

          <TextInput
            icon={<ImageIcon size={16} />}
            label="URL ảnh"
            onChange={(event) => onImageUrlChange(event.target.value)}
            placeholder="Dán URL ảnh lớp nếu muốn thay ảnh khác"
            type="url"
            value={form.imageUrl}
          />
          <p className="text-[12px] font-semibold leading-5 text-[var(--neutral-500)]">
            File hoặc URL chỉ được lưu khi bấm nút xác nhận.
          </p>
        </div>
      </div>
    </div>
  );
}

function ClassColorPicker({
  onChange,
  usedColorUsages,
  value,
}: {
  onChange: (colorHex: string, colorIndex?: number) => void;
  usedColorUsages: ClassColorUsage[];
  value: string;
}) {
  const selectedColorHex = normalizeClassColorHex(value);
  const selectedColor = getClassColorTheme(selectedColorHex);
  const selectedUsedBy = usedColorUsages.filter(
    (usage) =>
      normalizeClassColorHex(usage.colorHex) === selectedColorHex,
  );
  const selectedUsageText = selectedUsedBy.length
    ? `Đang dùng: ${selectedUsedBy
        .map((usage) => usage.className)
        .slice(0, 3)
        .join(", ")}${selectedUsedBy.length > 3 ? "..." : ""}`
    : "Màu này chưa được lớp nào dùng.";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-[14px] font-bold text-[var(--neutral-600)]">
          <Palette size={16} />
          Bảng phối màu lịch
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-extrabold"
          style={{
            background: selectedColor.background,
            color: selectedColor.text,
          }}
        >
          {getClassColorLabel(selectedColorHex)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CLASS_COLOR_OPTIONS.map((color, colorIndex) => {
          const colorHex = normalizeClassColorHex(color.accent);
          const colorTheme = getClassColorTheme(colorHex);
          const isActive = selectedColorHex === colorHex;
          const isUsed = usedColorUsages.some(
            (usage) =>
              normalizeClassColorHex(usage.colorHex) === colorHex,
          );

          return (
            <button
              aria-label={`Chọn màu ${color.label}${isUsed ? ", màu đã có lớp dùng" : ""}`}
              aria-pressed={isActive}
              className={`relative h-10 w-[52px] rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-400)] ${
                isActive
                  ? "border-[var(--brand-500)] shadow-[0_0_0_3px_rgba(99,102,241,0.18)]"
                  : "border-[var(--neutral-200)] hover:border-[var(--brand-300)]"
              }`}
              key={color.label}
              onClick={() => onChange(colorHex, colorIndex)}
              style={{
                background: `linear-gradient(135deg, ${colorTheme.accent} 0%, ${colorTheme.accent} 48%, ${colorTheme.background} 48%, ${colorTheme.background} 100%)`,
              }}
              title={`${color.label}${isUsed ? " - đã có lớp dùng" : ""}`}
              type="button"
            >
              <span className="sr-only">{color.label}</span>
              {isActive ? (
                <span className="absolute inset-1 rounded-lg border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.14)]" />
              ) : null}
              {isUsed ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-white shadow-[0_0_0_2px_rgba(15,23,42,0.18)]" />
              ) : null}
            </button>
          );
        })}

        <label
          className="relative grid h-10 min-w-[116px] cursor-pointer grid-cols-[40px_1fr] items-center overflow-hidden rounded-xl border border-[var(--neutral-200)] bg-white text-[12px] font-extrabold text-[var(--neutral-600)] transition hover:border-[var(--brand-300)]"
          title="Chọn màu bất kỳ"
        >
          <span
            className="h-full"
            style={{
              background: selectedColorHex,
            }}
          />
          <span className="px-2">{selectedColorHex.toUpperCase()}</span>
          <input
            aria-label="Chọn màu bất kỳ"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) =>
              onChange(normalizeClassColorHex(event.target.value))
            }
            type="color"
            value={selectedColorHex}
          />
        </label>
      </div>

      <p className="rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-3 py-2 text-[12px] font-semibold leading-5 text-[var(--neutral-500)]">
        {selectedUsageText}
      </p>
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
