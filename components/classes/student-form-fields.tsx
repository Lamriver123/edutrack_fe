/* eslint-disable @next/next/no-img-element */

import {
  Badge,
  GraduationCap,
  ImageIcon,
  LoaderCircle,
  MapPin,
  NotebookText,
  Phone,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ChangeEvent } from "react";
import type { Gender, StudentStatus } from "@/types/school";
import type { StudentFormState } from "./classroom-types";
import { getDefaultAvatarByGender } from "./classroom-utils";
import { TextArea, TextInput } from "./classroom-ui";

export function StudentFormFields({
  avatarFileName,
  avatarPreviewUrl,
  disabled,
  form,
  isUploadingAvatar,
  onAvatarUpload,
  onChange,
  showStatus = false,
  subtitle = "Hồ sơ mới sẽ được thêm vào lớp đang chọn.",
}: {
  avatarFileName: string;
  avatarPreviewUrl?: string;
  disabled?: boolean;
  form: StudentFormState;
  isUploadingAvatar: boolean;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onChange: (form: StudentFormState) => void;
  showStatus?: boolean;
  subtitle?: string;
}) {
  const typedAvatarUrl = form.avatarUrl.trim();
  const defaultAvatarUrl = getDefaultAvatarByGender(form.gender);
  const resolvedAvatarPreviewUrl =
    avatarPreviewUrl || typedAvatarUrl || defaultAvatarUrl;
  const [failedPreviewUrl, setFailedPreviewUrl] = useState("");
  const hasPreviewError = failedPreviewUrl === resolvedAvatarPreviewUrl;

  const previewAvatarUrl = hasPreviewError
    ? defaultAvatarUrl
    : resolvedAvatarPreviewUrl;
  const previewSourceLabel = avatarPreviewUrl
    ? "Preview từ ảnh vừa chọn"
    : typedAvatarUrl
      ? "Preview từ URL ảnh hiện tại"
      : "Avatar mặc định theo giới tính";

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-[17px] font-extrabold text-[var(--brand-950)]">
            Thông tin học sinh
          </h4>
          <p className="mt-1 text-[14px] text-[var(--neutral-500)]">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-2 pr-3 shadow-[var(--shadow-sm)]">
          <img
            alt="Ảnh đại diện học sinh"
            className="size-16 rounded-xl border border-white object-cover shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            onError={() => setFailedPreviewUrl(resolvedAvatarPreviewUrl)}
            src={previewAvatarUrl}
          />
          <span className="grid max-w-[190px] gap-1 text-[13px] leading-5">
            <strong className="font-bold text-[var(--brand-950)]">
              {hasPreviewError ? "URL ảnh không tải được" : previewSourceLabel}
            </strong>
            <span className="font-semibold text-[var(--neutral-500)]">
              {avatarFileName
                ? `${avatarFileName} - chỉ tải lên khi lưu.`
                : typedAvatarUrl
                  ? "Có thể đổi URL hoặc chọn ảnh từ máy."
                  : "Có thể dán URL hoặc chọn ảnh từ máy."}
            </span>
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          disabled={disabled}
          icon={<UserRound size={16} />}
          label="Họ tên học sinh"
          onChange={(event) =>
            onChange({
              ...form,
              fullName: event.target.value,
            })
          }
          placeholder="Nguyễn Văn An"
          value={form.fullName}
        />
        <TextInput
          disabled={disabled}
          icon={<Badge size={16} />}
          label="Mã học sinh"
          onChange={(event) =>
            onChange({
              ...form,
              studentCode: event.target.value,
            })
          }
          placeholder="Tự sinh nếu bỏ trống"
          value={form.studentCode}
        />
        <TextInput
          disabled={disabled}
          icon={<GraduationCap size={16} />}
          label="Lớp mấy"
          onChange={(event) =>
            onChange({
              ...form,
              gradeLevel: event.target.value,
            })
          }
          placeholder="Ví dụ: Lớp 5"
          value={form.gradeLevel}
        />
      </div>

      <GenderPicker
        disabled={disabled}
        onChange={(gender) =>
          onChange({
            ...form,
            gender,
          })
        }
        value={form.gender}
      />

      {showStatus ? (
        <StudentStatusPicker
          disabled={disabled}
          onChange={(status) =>
            onChange({
              ...form,
              status,
            })
          }
          value={form.status}
        />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <TextInput
          disabled={disabled}
          icon={<Phone size={16} />}
          label="Số điện thoại học sinh"
          onChange={(event) =>
            onChange({
              ...form,
              phone: event.target.value,
            })
          }
          placeholder="090..."
          value={form.phone}
        />
        <TextInput
          disabled={disabled}
          label="Ngày sinh"
          onChange={(event) =>
            onChange({
              ...form,
              dateOfBirth: event.target.value,
            })
          }
          type="date"
          value={form.dateOfBirth}
        />
      </div>

      <TextInput
        disabled={disabled}
        icon={<ImageIcon size={16} />}
        label="URL ảnh đại diện"
        onChange={(event) =>
          onChange({
            ...form,
            avatarUrl: event.target.value,
          })
        }
        placeholder="Dán link Cloudinary nếu có"
        type="url"
        value={form.avatarUrl}
      />

      <div className="grid gap-2">
        <span className="text-[14px] font-bold text-[var(--neutral-600)]">
          Tải ảnh từ máy
        </span>
        <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
          <label
            className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-[14px] font-bold transition ${
              disabled || isUploadingAvatar
                ? "pointer-events-none border-[var(--neutral-200)] bg-[var(--neutral-100)] text-[var(--neutral-400)]"
                : "border-[var(--brand-200)] bg-white text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
            }`}
          >
            <input
              accept="image/*"
              className="sr-only"
              disabled={disabled || isUploadingAvatar}
              onChange={onAvatarUpload}
              type="file"
            />
            {isUploadingAvatar ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            {isUploadingAvatar ? "Đang tải ảnh" : "Chọn ảnh"}
          </label>
          <span className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
            {avatarFileName || "Chưa chọn ảnh, chưa tải lên Cloudinary"}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--neutral-200)] pt-4">
        <div className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[var(--brand-700)]">
          <Users size={16} />
          Liên hệ phụ huynh
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <TextInput
            disabled={disabled}
            icon={<UserRound size={16} />}
            label="Tên phụ huynh"
            onChange={(event) =>
              onChange({
                ...form,
                parentFullName: event.target.value,
              })
            }
            placeholder="Nguyễn Thị Bình"
            value={form.parentFullName}
          />
          <TextInput
            disabled={disabled}
            icon={<Phone size={16} />}
            label="Số điện thoại phụ huynh"
            onChange={(event) =>
              onChange({
                ...form,
                parentPhone: event.target.value,
              })
            }
            placeholder="091..."
            value={form.parentPhone}
          />
          <TextInput
            disabled={disabled}
            label="Quan hệ"
            onChange={(event) =>
              onChange({
                ...form,
                parentRelation: event.target.value,
              })
            }
            placeholder="Mẹ, bố, người giám hộ..."
            value={form.parentRelation}
          />
          <TextInput
            disabled={disabled}
            label="Ghi chú phụ huynh"
            onChange={(event) =>
              onChange({
                ...form,
                parentNote: event.target.value,
              })
            }
            placeholder="Khung giờ liên hệ phù hợp"
            value={form.parentNote}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextArea
          disabled={disabled}
          icon={<MapPin size={16} />}
          label="Địa chỉ"
          onChange={(event) =>
            onChange({
              ...form,
              address: event.target.value,
            })
          }
          placeholder="Địa chỉ liên hệ"
          value={form.address}
        />
        <TextArea
          disabled={disabled}
          icon={<NotebookText size={16} />}
          label="Ghi chú học sinh"
          onChange={(event) =>
            onChange({
              ...form,
              note: event.target.value,
            })
          }
          placeholder="Năng lực, lưu ý học tập..."
          value={form.note}
        />
      </div>
    </div>
  );
}

function StudentStatusPicker({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (status: StudentStatus) => void;
  value: StudentStatus;
}) {
  const options: { label: string; value: StudentStatus }[] = [
    { label: "Đang học", value: "active" },
    { label: "Tạm nghỉ", value: "inactive" },
  ];

  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        Trạng thái học sinh
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
              disabled={disabled}
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

function GenderPicker({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (gender: Gender) => void;
  value: Gender;
}) {
  const options: { label: string; value: Gender }[] = [
    { label: "Nam", value: "male" },
    { label: "Nữ", value: "female" },
  ];

  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        Giới tính
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
              disabled={disabled}
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
