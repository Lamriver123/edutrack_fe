/* eslint-disable @next/next/no-img-element */

"use client";

import {
  Camera,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  KeyRound,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Save,
  Settings,
  Trash2,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import type { PaymentBank, User } from "@/types/user";
import {
  PrimaryAction,
  SecondaryAction,
  TextArea,
  TextInput,
} from "@/components/classes/classroom-ui";
import { ProfileBankSelect } from "@/components/profile/profile-bank-select";
import {
  QrCropBox,
  QrCropToolbar,
  type QrCropState,
} from "@/components/profile/profile-qr-crop";
import {
  formatFileSize,
  type ProfileFormState,
} from "@/components/profile/profile-utils";

export const INITIAL_QR_CROP: QrCropState = {
  height: 90,
  width: 90,
  x: 5,
  y: 5,
};

export type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function TeacherProfileCard({
  avatarFileName,
  avatarPreviewUrl,
  isEditing,
  isSaving,
  onAvatarFileChange,
  onResetAvatar,
  userInitial,
}: {
  avatarFileName: string;
  avatarPreviewUrl: string;
  isEditing: boolean;
  isSaving: boolean;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetAvatar: () => void;
  userInitial: string;
}) {
  return (
    <div className="grid content-start justify-items-center py-1 sm:py-2">
      <div className="relative">
        <div className="grid size-32 place-items-center overflow-hidden rounded-full bg-[var(--brand-600)] text-[34px] font-extrabold text-white shadow-[0_12px_30px_rgba(30,41,59,0.16)] sm:size-36">
          {avatarPreviewUrl ? (
            <img
              alt="Ảnh đại diện giáo viên"
              className="size-full object-cover"
              src={avatarPreviewUrl}
            />
          ) : (
            userInitial
          )}
        </div>

        {isEditing ? (
          <>
            <label
              className="absolute bottom-1 right-1 grid size-11 cursor-pointer place-items-center rounded-full border-4 border-white bg-[var(--brand-600)] text-white shadow-[var(--shadow-md)] transition hover:bg-[var(--brand-700)] focus-within:ring-2 focus-within:ring-[var(--brand-200)]"
              title="Chọn ảnh đại diện"
            >
              {isSaving ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <Camera size={17} />
              )}
              <input
                accept="image/*"
                className="sr-only"
                disabled={isSaving}
                onChange={onAvatarFileChange}
                type="file"
              />
            </label>
            {avatarFileName ? (
              <button
                aria-label="Bỏ ảnh đại diện đã chọn"
                className="absolute right-1 top-1 grid size-9 place-items-center rounded-full border-4 border-white bg-[var(--neutral-700)] text-white shadow-[var(--shadow-md)] transition hover:bg-red-600"
                onClick={onResetAvatar}
                title="Bỏ ảnh đã chọn"
                type="button"
              >
                <X size={14} />
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ProfileEditFields({
  banks,
  form,
  isBanksLoading,
  onAvatarUrlChange,
  onBankAccountNumberChange,
  onBankChange,
  onChange,
  userEmail,
}: {
  banks: PaymentBank[];
  form: ProfileFormState;
  isBanksLoading: boolean;
  onAvatarUrlChange: (avatarUrl: string) => void;
  onBankAccountNumberChange: (accountNumber: string) => void;
  onBankChange: (bankBin: string) => void;
  onChange: (form: ProfileFormState) => void;
  userEmail: string;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          icon={<UserCircle size={16} />}
          label="Họ tên"
          onChange={(event) =>
            onChange({
              ...form,
              fullName: event.target.value,
            })
          }
          placeholder="Nhập họ tên giáo viên"
          value={form.fullName}
        />
        <TextInput
          disabled
          icon={<Mail size={16} />}
          label="Email"
          value={userEmail}
        />
        <TextInput
          icon={<Phone size={16} />}
          inputMode="tel"
          label="Số điện thoại"
          onChange={(event) =>
            onChange({
              ...form,
              phone: event.target.value,
            })
          }
          placeholder="VD: 0987654321"
          value={form.phone}
        />
        <TextInput
          icon={<MapPin size={16} />}
          label="Địa chỉ"
          onChange={(event) =>
            onChange({
              ...form,
              address: event.target.value,
            })
          }
          placeholder="Nhập địa chỉ"
          value={form.address}
        />
      </div>

      <div className="grid gap-3 border-t border-[var(--border)] pt-4">
        <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-[var(--brand-950)]">
          <Landmark className="text-[var(--brand-600)]" size={17} />
          Thông tin nhận học phí
        </h3>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          <ProfileBankSelect
            banks={banks}
            disabled={isBanksLoading || (!banks.length && !form.bankBin)}
            isLoading={isBanksLoading}
            onChange={onBankChange}
            value={form.bankBin}
          />
          <TextInput
            icon={<CreditCard size={16} />}
            inputMode="numeric"
            label="Số tài khoản"
            onChange={(event) => onBankAccountNumberChange(event.target.value)}
            placeholder="Nhập số tài khoản nhận học phí"
            value={form.bankAccountNumber}
          />
          <TextInput
            autoComplete="name"
            icon={<UserCircle size={16} />}
            label="Tên chủ tài khoản"
            onChange={(event) =>
              onChange({ ...form, bankAccountName: event.target.value })
            }
            placeholder="Nhập tên chủ tài khoản ngân hàng"
            value={form.bankAccountName}
          />
        </div>
      </div>

      <TextInput
        icon={<ImageIcon size={16} />}
        label="URL ảnh đại diện"
        onChange={(event) => onAvatarUrlChange(event.target.value)}
        placeholder="Hoặc dán URL ảnh nếu không upload file"
        type="url"
        value={form.avatarUrl}
      />

      <TextArea
        label="Ghi chú cá nhân"
        maxLength={500}
        onChange={(event) =>
          onChange({
            ...form,
            bio: event.target.value,
          })
        }
        placeholder="Thông tin ngắn để nhận diện hồ sơ giáo viên"
        value={form.bio}
      />
    </div>
  );
}

export function ProfileReadonlyFields({ user }: { user: User }) {
  return (
    <div className="grid gap-x-6 md:grid-cols-2">
      <ReadonlyItem icon={<UserCircle size={17} />} label="Họ tên" tone="brand">
        {user.fullName}
      </ReadonlyItem>
      <ReadonlyItem
        icon={<Mail size={17} />}
        label="Email"
        tone="sky"
        wrapMode="anywhere"
      >
        {user.email}
      </ReadonlyItem>
      <ReadonlyItem
        icon={<Phone size={17} />}
        label="Số điện thoại"
        tone="emerald"
      >
        {user.phone || "Chưa cập nhật"}
      </ReadonlyItem>
      <ReadonlyItem icon={<MapPin size={17} />} label="Địa chỉ" tone="amber">
        {user.address || "Chưa cập nhật"}
      </ReadonlyItem>
      <ReadonlyItem
        className="md:col-span-2"
        icon={<FileText size={17} />}
        label="Ghi chú cá nhân"
        tone="slate"
      >
        {user.bio || "Chưa có ghi chú"}
      </ReadonlyItem>
      <div className="grid md:col-span-2 md:grid-cols-3 md:gap-x-6">
        <ReadonlyItem
          icon={<Landmark size={17} />}
          label="Ngân hàng"
          tone="sky"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {user.bankLogoUrl ? (
              <img
                alt=""
                className="h-7 w-10 shrink-0 rounded-sm object-contain"
                src={user.bankLogoUrl}
              />
            ) : null}
            <span className="truncate">{user.bankName || "Chưa cập nhật"}</span>
          </span>
        </ReadonlyItem>
        <ReadonlyItem
          icon={<Landmark size={17} />}
          label="Tên tài khoản"
          tone="violet"
        >
          {user.bankAccountName || "Chưa cập nhật"}
        </ReadonlyItem>
        <ReadonlyItem
          icon={<CreditCard size={17} />}
          label="Số tài khoản"
          tone="rose"
        >
          {user.bankAccountNumber || "Chưa cập nhật"}
        </ReadonlyItem>
      </div>
    </div>
  );
}

function ReadonlyItem({
  children,
  className = "",
  icon,
  label,
  tone = "brand",
  wrapMode = "normal",
}: {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  label: string;
  tone?: "amber" | "brand" | "emerald" | "rose" | "sky" | "slate" | "violet";
  wrapMode?: "normal" | "anywhere";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-700",
    brand: "bg-[var(--brand-50)] text-[var(--brand-600)]",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
    slate: "bg-[var(--neutral-100)] text-[var(--neutral-600)]",
    violet: "bg-violet-50 text-violet-700",
  }[tone];

  return (
    <div
      className={`flex min-h-[76px] items-start gap-3 border-b border-[var(--border)] py-3.5 ${className}`}
    >
      <span
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-md ${toneClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[12px] font-extrabold text-[var(--neutral-500)]">
          {label}
        </span>
        <p
          className={`mt-1 min-w-0 text-[14px] font-bold leading-5 text-[var(--brand-950)] sm:text-[15px] ${
            wrapMode === "anywhere" ? "break-all" : "break-words"
          }`}
        >
          {children}
        </p>
      </div>
    </div>
  );
}

export function PaymentQrPanel({
  isBusy,
  isQrLoading,
  isRemovingQr,
  isUploadingQr,
  onQrCropChange,
  onQrFileChange,
  onRemoveQr,
  onResetQr,
  onSubmit,
  qrCrop,
  qrFile,
  qrFileName,
  qrPreviewUrl,
  user,
}: {
  isBusy: boolean;
  isQrLoading: boolean;
  isRemovingQr: boolean;
  isUploadingQr: boolean;
  onQrCropChange: (crop: QrCropState) => void;
  onQrFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveQr: () => void;
  onResetQr: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  qrCrop: QrCropState;
  qrFile: File | null;
  qrFileName: string;
  qrPreviewUrl: string;
  user: User;
}) {
  return (
    <aside className="grid content-start xl:h-full">
      <form
        className="rounded-md border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5 xl:h-full"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sky-50 text-sky-700">
              <QrCode size={19} />
            </span>
            <h3 className="truncate text-[19px] font-extrabold text-[var(--brand-950)]">
              QR thanh toán
            </h3>
          </div>
          {user.hasPaymentQr ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-extrabold text-emerald-700">
              <CheckCircle2 size={13} />
              Đã có
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3">
          <div className="relative mx-auto grid aspect-square w-full max-w-[260px] place-items-center overflow-hidden rounded-md border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)]">
            {isQrLoading ? (
              <div className="grid place-items-center gap-2 text-[14px] font-bold text-[var(--neutral-500)]">
                <LoaderCircle
                  className="animate-spin text-[var(--brand-500)]"
                  size={22}
                />
                Đang tải QR...
              </div>
            ) : qrPreviewUrl ? (
              <img
                alt="Ảnh QR thanh toán"
                className={`size-full ${qrFile ? "object-fill p-0" : "object-contain p-3"}`}
                src={qrPreviewUrl}
              />
            ) : (
              <div className="grid place-items-center gap-2 px-5 text-center text-[14px] font-bold text-[var(--neutral-500)]">
                <QrCode className="text-[var(--brand-500)]" size={38} />
                Chưa có QR thanh toán
              </div>
            )}
            {qrFile && qrPreviewUrl ? (
              <QrCropBox crop={qrCrop} onChange={onQrCropChange} />
            ) : null}

            {qrFile ? (
              <button
                aria-label="Bỏ ảnh QR đã chọn"
                className="absolute right-2 top-2 z-50 grid size-10 place-items-center rounded-full border border-[var(--neutral-200)] bg-white/95 text-[var(--neutral-600)] shadow-[var(--shadow-md)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
                disabled={isBusy}
                onClick={onResetQr}
                title="Bỏ ảnh đã chọn"
                type="button"
              >
                <X size={16} />
              </button>
            ) : user.hasPaymentQr ? (
              <button
                aria-label="Xóa QR thanh toán"
                className="absolute right-2 top-2 z-50 grid size-10 place-items-center rounded-full border border-red-100 bg-white/95 text-red-600 shadow-[var(--shadow-md)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:text-[var(--neutral-400)]"
                disabled={isBusy || isQrLoading || isRemovingQr}
                onClick={onRemoveQr}
                title="Xóa QR thanh toán"
                type="button"
              >
                {isRemovingQr ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            ) : null}
          </div>

          {qrFile ? (
            <QrCropToolbar onReset={() => onQrCropChange(INITIAL_QR_CROP)} />
          ) : null}

          {user.bankName ? (
            <div className="flex min-h-11 items-center justify-center rounded-md border border-sky-100 bg-sky-50/70 px-3">
              <div className="flex min-w-0 max-w-full items-center justify-center gap-3">
                {user.bankLogoUrl ? (
                  <img
                    alt=""
                    className="h-10 w-18 shrink-0 rounded-sm bg-white object-contain p-0.5"
                    src={user.bankLogoUrl}
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-sky-700">
                    <Landmark size={16} />
                  </span>
                )}
                <span className="min-w-0 truncate text-center text-[13px] font-extrabold text-sky-900">
                  {user.bankName}
                </span>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <label
              aria-disabled={isBusy}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-extrabold transition ${
                isBusy
                  ? "pointer-events-none cursor-not-allowed border-[var(--neutral-200)] bg-[var(--neutral-100)] text-[var(--neutral-400)]"
                  : "cursor-pointer border-[var(--brand-200)] bg-white text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
              }`}
            >
              <Upload className="shrink-0" size={16} />
              Chọn QR
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={isBusy}
                onChange={onQrFileChange}
                type="file"
              />
            </label>

            <PrimaryAction
              className="w-full px-3 text-[13px]"
              disabled={!qrFile || isBusy}
              icon={
                isUploadingQr ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )
              }
              type="submit"
            >
              Lưu QR
            </PrimaryAction>
          </div>

          <p className="truncate text-center text-[12px] font-semibold text-[var(--neutral-500)]">
            {qrFileName ||
              (user.hasPaymentQr
                ? `Đã lưu ${formatFileSize(user.paymentQrImageSize)}`
                : "PNG, JPG hoặc WEBP, tối đa 2MB")}
          </p>
        </div>
      </form>
    </aside>
  );
}

export function PasswordPanel({
  form,
  isBusy,
  isChangingPassword,
  isOpen,
  onChange,
  onClose,
  onOpen,
  onSubmit,
  onToggleShowPassword,
  showPassword,
}: {
  form: PasswordFormState;
  isBusy: boolean;
  isChangingPassword: boolean;
  isOpen: boolean;
  onChange: (form: PasswordFormState) => void;
  onClose: () => void;
  onOpen: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleShowPassword: () => void;
  showPassword: boolean;
}) {
  if (!isOpen) {
    return (
      <section className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--accent-50)] text-[var(--accent-600)]">
            <KeyRound size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold text-[var(--brand-950)]">
              Bảo mật tài khoản
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
              Mật khẩu đã được thiết lập
            </p>
          </div>
        </div>
        <PrimaryAction
          className="w-full sm:w-auto"
          icon={<LockKeyhole size={16} />}
          onClick={onOpen}
          type="button"
        >
          Đổi mật khẩu
        </PrimaryAction>
      </section>
    );
  }

  return (
    <form
      className="rounded-md border border-[var(--border)] bg-white shadow-[var(--shadow-card)]"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--accent-50)] text-[var(--accent-600)]">
            <KeyRound size={18} />
          </span>
          <h2 className="text-[19px] font-extrabold text-[var(--brand-950)]">
            Đổi mật khẩu
          </h2>
        </div>

        <SecondaryAction
          disabled={isBusy}
          icon={<X size={16} />}
          onClick={onClose}
          type="button"
        >
          Hủy
        </SecondaryAction>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-3">
        <PasswordInput
          label="Mật khẩu hiện tại"
          onChange={(value) =>
            onChange({
              ...form,
              currentPassword: value,
            })
          }
          showPassword={showPassword}
          value={form.currentPassword}
        />
        <PasswordInput
          label="Mật khẩu mới"
          onChange={(value) =>
            onChange({
              ...form,
              newPassword: value,
            })
          }
          showPassword={showPassword}
          value={form.newPassword}
        />
        <PasswordInput
          label="Nhập lại mật khẩu mới"
          onChange={(value) =>
            onChange({
              ...form,
              confirmPassword: value,
            })
          }
          showPassword={showPassword}
          value={form.confirmPassword}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--neutral-200)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-[14px] font-bold text-[var(--neutral-500)] transition hover:bg-[var(--neutral-50)] hover:text-[var(--brand-700)]"
          onClick={onToggleShowPassword}
          type="button"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        </button>

        <PrimaryAction
          className="w-full sm:w-auto"
          disabled={isBusy}
          icon={
            isChangingPassword ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <LockKeyhole size={16} />
            )
          }
          type="submit"
        >
          Lưu mật khẩu
        </PrimaryAction>
      </div>
    </form>
  );
}

function PasswordInput({
  label,
  onChange,
  showPassword,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  value: string;
}) {
  return (
    <TextInput
      autoComplete="new-password"
      icon={<LockKeyhole size={16} />}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Nhập mật khẩu"
      type={showPassword ? "text" : "password"}
      value={value}
    />
  );
}

export function SystemSettingsPanel({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Only show if not already standalone
    const timer = setTimeout(() => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone;
      if (!isStandalone) {
        setCanInstall(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function handleRestorePrompt() {
    localStorage.removeItem("pwa-install-dismissed");
    window.location.reload();
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex min-w-0 items-center gap-3 border-b border-[var(--border)] pb-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-[var(--neutral-100)] text-[var(--neutral-600)]">
          <Settings size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-extrabold text-[var(--brand-950)]">
            Hệ thống & Cài đặt
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-[var(--neutral-500)]">
            Quản lý ứng dụng và phiên đăng nhập
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {canInstall ? (
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 text-[14px] font-bold text-[var(--brand-700)] transition hover:bg-[var(--brand-100)] sm:w-auto"
            onClick={handleRestorePrompt}
            type="button"
          >
            <Download size={16} />
            Cài đặt ứng dụng
          </button>
        ) : null}

        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 text-[14px] font-bold text-red-600 transition hover:bg-red-100 sm:w-auto"
          onClick={onLogout}
          type="button"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </section>
  );
}
