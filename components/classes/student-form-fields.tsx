/* eslint-disable @next/next/no-img-element */

import {
  Badge,
  Camera,
  CircleCheck,
  CirclePause,
  GraduationCap,
  ImageIcon,
  LoaderCircle,
  MapPin,
  NotebookText,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  SelectPicker,
  type SelectPickerOption,
} from "@/components/ui/select-picker";
import type { Gender, StudentStatus } from "@/types/school";
import type { StudentFormState } from "./classroom-types";
import { getDefaultAvatarByGender } from "./classroom-utils";
import { TextArea, TextInput } from "./classroom-ui";

const genderOptions: SelectPickerOption[] = [
  { label: "Nam", value: "male" },
  { label: "Nữ", value: "female" },
];

const studentStatusOptions: SelectPickerOption[] = [
  {
    icon: <CircleCheck size={16} />,
    label: "Đang học",
    tone: "success",
    value: "active",
  },
  {
    icon: <CirclePause size={16} />,
    label: "Tạm nghỉ",
    tone: "warning",
    value: "inactive",
  },
];

export function StudentFormFields({
  avatarPreviewUrl,
  disabled,
  form,
  isUploadingAvatar,
  onAvatarUpload,
  onChange,
  showStatus = false,
}: {
  avatarPreviewUrl?: string;
  disabled?: boolean;
  form: StudentFormState;
  isUploadingAvatar: boolean;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onChange: (form: StudentFormState) => void;
  showStatus?: boolean;
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
  return (
    <div className="grid gap-4">
      <div className="flex justify-center py-1">
        <label
          aria-label="Chọn ảnh đại diện học sinh"
          className={`group relative block size-28 shrink-0 rounded-full ${
            disabled || isUploadingAvatar
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer"
          }`}
          title="Chọn ảnh đại diện"
        >
          <span className="block size-full overflow-hidden rounded-full bg-[var(--brand-50)] shadow-[0_10px_26px_rgba(15,23,42,0.14)] ring-1 ring-[var(--neutral-200)] transition group-hover:ring-[var(--brand-300)]">
            <img
              alt="Ảnh đại diện học sinh"
              className="size-full object-cover"
              onError={() => setFailedPreviewUrl(resolvedAvatarPreviewUrl)}
              src={previewAvatarUrl}
            />
          </span>
          <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full border-[3px] border-white bg-[var(--brand-600)] text-white shadow-[var(--shadow-md)] transition group-hover:bg-[var(--brand-700)]">
            {isUploadingAvatar ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Camera size={16} />
            )}
          </span>
          <input
            accept="image/*"
            className="sr-only"
            disabled={disabled || isUploadingAvatar}
            onChange={onAvatarUpload}
            type="file"
          />
        </label>
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
        placeholder="Dán link ảnh nếu có"
        type="url"
        value={form.avatarUrl}
      />

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
      </div>

      <div
        className={`grid gap-3 ${
          showStatus ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
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

        <StudentFormSelect
          disabled={disabled}
          icon={<UserRound size={16} />}
          label="Giới tính"
          onChange={(gender) =>
            onChange({
              ...form,
              gender: gender as Gender,
            })
          }
          options={genderOptions}
          value={form.gender}
        />

        {showStatus ? (
          <StudentFormSelect
            disabled={disabled}
            label="Trạng thái học sinh"
            onChange={(status) =>
              onChange({
                ...form,
                status: status as StudentStatus,
              })
            }
            options={studentStatusOptions}
            value={form.status}
          />
        ) : null}
      </div>

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

function StudentFormSelect({
  disabled,
  icon,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  options: SelectPickerOption[];
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <SelectPicker
        ariaLabel={label}
        disabled={disabled}
        leadingIcon={icon}
        onChange={onChange}
        options={options}
        value={value}
      />
    </div>
  );
}
