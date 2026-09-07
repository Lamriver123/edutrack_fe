/* eslint-disable @next/next/no-img-element */

"use client";

import {
  Camera,
  CheckCircle2,
  CreditCard,
  Crop,
  Eye,
  EyeOff,
  ImageIcon,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Phone,
  QrCode,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  useDashboardSession,
  useDashboardUser,
} from "@/components/layout/dashboard-shell";
import { profileApi } from "@/lib/api/profile";
import type { UpdateProfilePayload, User } from "@/types/user";
import {
  ConfirmDialog,
  PrimaryAction,
  SecondaryAction,
  TextArea,
  TextInput,
} from "@/components/classes/classroom-ui";
import { useNotice } from "@/components/ui/notice-provider";
import { getErrorMessage } from "@/components/classes/classroom-utils";

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PAYMENT_QR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const PAYMENT_QR_ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MIN_QR_CROP_SIDE_PERCENT = 22;
const INITIAL_QR_CROP: QrCropState = {
  height: 90,
  width: 90,
  x: 5,
  y: 5,
};

type ProfileFormState = {
  fullName: string;
  avatarUrl: string;
  bankAccountName: string;
  bankAccountNumber: string;
  phone: string;
  address: string;
  bio: string;
};

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type QrCropState = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ConfirmAction =
  | "profile"
  | "password"
  | "paymentQr"
  | "removePaymentQr";

type ConfirmDialogConfig = {
  confirmText: string;
  description: string;
  isLoading: boolean;
  onConfirm: () => void;
  title: string;
  tone?: "danger";
};

export function ProfilePage() {
  const user = useDashboardUser();
  const { updateUser } = useDashboardSession();
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    buildProfileForm(user),
  );
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );
  const { setNotice } = useNotice();
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isRemovingQr, setIsRemovingQr] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [localAvatarPreviewUrl, setLocalAvatarPreviewUrl] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrFileName, setQrFileName] = useState("");
  const [qrCrop, setQrCrop] = useState<QrCropState>(INITIAL_QR_CROP);
  const [localQrPreviewUrl, setLocalQrPreviewUrl] = useState("");
  const [remoteQrPreviewUrl, setRemoteQrPreviewUrl] = useState("");

  const userInitial = user.fullName?.charAt(0)?.toUpperCase() ?? "G";
  const savedAvatarUrl = isProfileEditing
    ? profileForm.avatarUrl.trim()
    : user.avatarUrl?.trim() ?? "";
  const avatarPreviewUrl = localAvatarPreviewUrl || savedAvatarUrl;
  const qrPreviewUrl = localQrPreviewUrl || remoteQrPreviewUrl;
  const isBusy =
    isSavingProfile || isChangingPassword || isUploadingQr || isRemovingQr;
  const confirmConfig = confirmAction
    ? getConfirmConfig(confirmAction, {
        hasAvatarFile: Boolean(avatarFile),
        isChangingPassword,
        isRemovingQr,
        isSavingProfile,
        isUploadingQr,
        onChangePassword: () => void handleConfirmChangePassword(),
        onRemoveQr: () => void handleConfirmRemoveQr(),
        onSaveProfile: () => void handleConfirmSaveProfile(),
        onUploadQr: () => void handleConfirmUploadQr(),
      })
    : null;

  useEffect(() => {
    if (!user.hasPaymentQr) {
      return;
    }

    let isCurrent = true;
    let objectUrl = "";

    async function loadPaymentQr() {
      setIsQrLoading(true);

      try {
        const blob = await profileApi.getPaymentQrBlob();

        if (!isCurrent) {
          return;
        }

        if (!blob) {
          setRemoteQrPreviewUrl("");
          return;
        }

        objectUrl = URL.createObjectURL(blob);
        setRemoteQrPreviewUrl(objectUrl);
      } catch (error) {
        if (isCurrent) {
          setNotice({ type: "error", text: getErrorMessage(error) });
          setRemoteQrPreviewUrl("");
        }
      } finally {
        if (isCurrent) {
          setIsQrLoading(false);
        }
      }
    }

    void loadPaymentQr();

    return () => {
      isCurrent = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [user.hasPaymentQr, user.paymentQrImageUpdatedAt, setNotice]);

  useEffect(() => {
    return () => {
      if (localAvatarPreviewUrl) {
        URL.revokeObjectURL(localAvatarPreviewUrl);
      }
    };
  }, [localAvatarPreviewUrl]);

  useEffect(() => {
    return () => {
      if (localQrPreviewUrl) {
        URL.revokeObjectURL(localQrPreviewUrl);
      }
    };
  }, [localQrPreviewUrl]);

  function openProfileEditor() {
    setProfileForm(buildProfileForm(user));
    resetAvatarSelection();
    setIsProfileEditing(true);
  }

  function closeProfileEditor() {
    if (isSavingProfile) {
      return;
    }

    setProfileForm(buildProfileForm(user));
    resetAvatarSelection();
    setIsProfileEditing(false);
    setConfirmAction(null);
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isProfileEditing) {
      return;
    }

    if (!profileForm.fullName.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập họ tên giáo viên." });
      return;
    }

    setConfirmAction("profile");
  }

  async function handleConfirmSaveProfile() {
    setIsSavingProfile(true);

    try {
      const payload = buildProfilePayload(profileForm);

      if (avatarFile) {
        const uploadedAvatar = await profileApi.uploadTeacherAvatar(avatarFile);
        payload.avatarUrl = uploadedAvatar.url;
      }

      const updatedUser = await profileApi.updateProfile(payload);
      updateUser(updatedUser);
      setProfileForm(buildProfileForm(updatedUser));
      resetAvatarSelection();
      setIsProfileEditing(false);
      setNotice({ type: "success", text: "Đã cập nhật hồ sơ giáo viên." });
      setConfirmAction(null);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "error", text: "Ảnh đại diện phải là hình ảnh." });
      return;
    }

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      setNotice({ type: "error", text: "Ảnh đại diện không được vượt quá 5MB." });
      return;
    }

    setAvatarFile(file);
    setAvatarFileName(file.name);
    setLocalAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function resetAvatarSelection() {
    setAvatarFile(null);
    setAvatarFileName("");
    setLocalAvatarPreviewUrl("");
  }

  function handleAvatarUrlChange(avatarUrl: string) {
    resetAvatarSelection();
    setProfileForm((current) => ({
      ...current,
      avatarUrl,
    }));
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setNotice({ type: "error", text: "Vui lòng nhập đủ thông tin mật khẩu." });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setNotice({ type: "error", text: "Mật khẩu mới cần ít nhất 8 ký tự." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice({ type: "error", text: "Mật khẩu xác nhận chưa khớp." });
      return;
    }

    setConfirmAction("password");
  }

  async function handleConfirmChangePassword() {
    setIsChangingPassword(true);

    try {
      await profileApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        confirmPassword: "",
        currentPassword: "",
        newPassword: "",
      });
      setIsPasswordFormOpen(false);
      setNotice({ type: "success", text: "Đã đổi mật khẩu thành công." });
      setConfirmAction(null);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsChangingPassword(false);
    }
  }

  function closePasswordForm() {
    if (isChangingPassword) {
      return;
    }

    setPasswordForm({
      confirmPassword: "",
      currentPassword: "",
      newPassword: "",
    });
    setShowPassword(false);
    setIsPasswordFormOpen(false);
    setConfirmAction(null);
  }

  function handleQrFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!PAYMENT_QR_ACCEPTED_TYPES.has(file.type)) {
      setNotice({
        type: "error",
        text: "Ảnh QR chỉ hỗ trợ PNG, JPG hoặc WEBP.",
      });
      return;
    }

    if (file.size > PAYMENT_QR_MAX_SIZE_BYTES) {
      setNotice({ type: "error", text: "Ảnh QR không được vượt quá 2MB." });
      return;
    }

    setQrFile(file);
    setQrFileName(file.name);
    setQrCrop(INITIAL_QR_CROP);
    setLocalQrPreviewUrl(URL.createObjectURL(file));
  }

  function resetQrSelection() {
    setQrFile(null);
    setQrFileName("");
    setQrCrop(INITIAL_QR_CROP);
    setLocalQrPreviewUrl("");
  }

  function handleQrSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!qrFile) {
      setNotice({ type: "error", text: "Vui lòng chọn ảnh QR thanh toán." });
      return;
    }

    setConfirmAction("paymentQr");
  }

  async function handleConfirmUploadQr() {
    if (!qrFile) {
      setNotice({ type: "error", text: "Vui lòng chọn ảnh QR thanh toán." });
      setConfirmAction(null);
      return;
    }

    setIsUploadingQr(true);

    try {
      const croppedQrFile = await createCroppedQrFile(qrFile, qrCrop);

      if (croppedQrFile.size > PAYMENT_QR_MAX_SIZE_BYTES) {
        throw new Error(
          "Ảnh QR sau khi cắt vượt quá 2MB. Vui lòng chọn vùng nhỏ hơn hoặc dùng ảnh nhẹ hơn.",
        );
      }

      const updatedUser = await profileApi.uploadPaymentQr(croppedQrFile);
      updateUser(updatedUser);
      resetQrSelection();
      setNotice({ type: "success", text: "Đã lưu QR thanh toán." });
      setConfirmAction(null);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsUploadingQr(false);
    }
  }

  async function handleConfirmRemoveQr() {
    setIsRemovingQr(true);

    try {
      const updatedUser = await profileApi.removePaymentQr();
      updateUser(updatedUser);
      resetQrSelection();
      setRemoteQrPreviewUrl("");
      setNotice({ type: "success", text: "Đã xóa QR thanh toán." });
      setConfirmAction(null);
    } catch (error) {
      setNotice({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsRemovingQr(false);
    }
  }

  return (
    <section className="grid gap-5">


      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form
          className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]"
          onSubmit={handleProfileSubmit}
        >
          <div className="flex flex-col gap-3 border-b border-[var(--neutral-200)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1 text-[13px] font-extrabold text-[var(--brand-700)]">
                <UserCircle size={15} />
                Hồ sơ giáo viên
              </p>
              <h2 className="mt-3 text-[22px] font-extrabold leading-tight text-[var(--brand-950)] sm:text-[26px]">
                Thông tin người dùng
              </h2>
            </div>

            {isProfileEditing ? (
              <div className="grid gap-2 sm:flex sm:items-center">
                <SecondaryAction
                  disabled={isBusy}
                  icon={<X size={16} />}
                  onClick={closeProfileEditor}
                  type="button"
                >
                  Hủy
                </SecondaryAction>
                <PrimaryAction
                  className="w-full sm:w-auto"
                  disabled={isBusy}
                  icon={
                    isSavingProfile ? (
                      <LoaderCircle className="animate-spin" size={16} />
                    ) : (
                      <Save size={16} />
                    )
                  }
                  type="submit"
                >
                  {avatarFile && isSavingProfile
                    ? "Đang tải avatar..."
                    : "Lưu thông tin"}
                </PrimaryAction>
              </div>
            ) : (
              <SecondaryAction
                className="w-full sm:w-auto"
                icon={<Pencil size={16} />}
                onClick={openProfileEditor}
                type="button"
              >
                Chỉnh sửa
              </SecondaryAction>
            )}
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[240px_1fr]">
            <TeacherProfileCard
              avatarFileName={avatarFileName}
              avatarPreviewUrl={avatarPreviewUrl}
              email={user.email}
              isEditing={isProfileEditing}
              isSaving={isSavingProfile}
              isVerified={user.isEmailVerified}
              name={profileForm.fullName || user.fullName}
              onAvatarFileChange={handleAvatarFileChange}
              onResetAvatar={resetAvatarSelection}
              userInitial={userInitial}
            />

            {isProfileEditing ? (
              <ProfileEditFields
                form={profileForm}
                onAvatarUrlChange={handleAvatarUrlChange}
                onChange={setProfileForm}
                userEmail={user.email}
              />
            ) : (
              <ProfileReadonlyFields user={user} />
            )}
          </div>
        </form>

        <PaymentQrPanel
          isBusy={isBusy}
          isQrLoading={isQrLoading}
          isRemovingQr={isRemovingQr}
          isUploadingQr={isUploadingQr}
          onQrFileChange={handleQrFileChange}
          onQrCropChange={setQrCrop}
          onRemoveQr={() => setConfirmAction("removePaymentQr")}
          onResetQr={resetQrSelection}
          onSubmit={handleQrSubmit}
          qrCrop={qrCrop}
          qrFile={qrFile}
          qrFileName={qrFileName}
          qrPreviewUrl={qrPreviewUrl}
          user={user}
        />
      </section>

      <PasswordPanel
        form={passwordForm}
        isBusy={isBusy}
        isChangingPassword={isChangingPassword}
        isOpen={isPasswordFormOpen}
        onChange={setPasswordForm}
        onClose={closePasswordForm}
        onOpen={() => setIsPasswordFormOpen(true)}
        onSubmit={handlePasswordSubmit}
        onToggleShowPassword={() => setShowPassword((current) => !current)}
        showPassword={showPassword}
      />

      {confirmConfig ? (
        <ConfirmDialog
          confirmText={confirmConfig.confirmText}
          description={confirmConfig.description}
          isLoading={confirmConfig.isLoading}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          tone={confirmConfig.tone}
        />
      ) : null}
    </section>
  );
}

function TeacherProfileCard({
  avatarFileName,
  avatarPreviewUrl,
  email,
  isEditing,
  isSaving,
  isVerified,
  name,
  onAvatarFileChange,
  onResetAvatar,
  userInitial,
}: {
  avatarFileName: string;
  avatarPreviewUrl: string;
  email: string;
  isEditing: boolean;
  isSaving: boolean;
  isVerified: boolean;
  name: string;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onResetAvatar: () => void;
  userInitial: string;
}) {
  return (
    <div className="grid content-start gap-4 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 text-center">
      <div className="mx-auto grid size-24 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-[30px] font-extrabold text-white shadow-[var(--shadow-brand)]">
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

      <div>
        <p className="text-[16px] font-extrabold text-[var(--brand-950)]">
          {name || "Giáo viên"}
        </p>
        <p className="mt-1 break-all text-[13px] font-semibold text-[var(--neutral-500)]">
          {email}
        </p>
      </div>

      <p className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[13px] font-extrabold text-emerald-700">
        <ShieldCheck size={14} />
        {isVerified ? "Đã xác thực" : "Chưa xác thực"}
      </p>

      {isEditing ? (
        <div className="grid gap-2">
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--brand-200)] bg-white px-3 text-[13px] font-extrabold text-[var(--brand-700)] transition hover:bg-[var(--brand-50)]">
            {isSaving ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : (
              <Upload size={15} />
            )}
            Chọn avatar
            <input
              accept="image/*"
              className="sr-only"
              disabled={isSaving}
              onChange={onAvatarFileChange}
              type="file"
            />
          </label>
          <p className="truncate text-[12px] font-semibold text-[var(--neutral-500)]">
            {avatarFileName || "Chọn file để xem trước, chưa upload."}
          </p>
          {avatarFileName ? (
            <button
              className="h-9 rounded-lg text-[13px] font-bold text-[var(--neutral-500)] transition hover:bg-white hover:text-[var(--brand-700)]"
              onClick={onResetAvatar}
              type="button"
            >
              Bỏ ảnh đã chọn
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ProfileEditFields({
  form,
  onAvatarUrlChange,
  onChange,
  userEmail,
}: {
  form: ProfileFormState;
  onAvatarUrlChange: (avatarUrl: string) => void;
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
        <TextInput
          icon={<UserCircle size={16} />}
          label="Tên tài khoản"
          onChange={(event) =>
            onChange({
              ...form,
              bankAccountName: event.target.value,
            })
          }
          placeholder="VD: NGUYEN HUU NGOC LAM"
          value={form.bankAccountName}
        />
        <TextInput
          icon={<CreditCard size={16} />}
          inputMode="numeric"
          label="Số tài khoản"
          onChange={(event) =>
            onChange({
              ...form,
              bankAccountNumber: event.target.value,
            })
          }
          placeholder="Nhập số tài khoản nhận học phí"
          value={form.bankAccountNumber}
        />
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

function ProfileReadonlyFields({ user }: { user: User }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <ReadonlyItem icon={<UserCircle size={17} />} label="Họ tên">
        {user.fullName}
      </ReadonlyItem>
      <ReadonlyItem icon={<Mail size={17} />} label="Email" wrapMode="anywhere">
        {user.email}
      </ReadonlyItem>
      <ReadonlyItem icon={<Phone size={17} />} label="Số điện thoại">
        {user.phone || "Chưa cập nhật"}
      </ReadonlyItem>
      <ReadonlyItem icon={<MapPin size={17} />} label="Địa chỉ">
        {user.address || "Chưa cập nhật"}
      </ReadonlyItem>
      <ReadonlyItem icon={<UserCircle size={17} />} label="Tên tài khoản">
        {user.bankAccountName || "Chưa cập nhật"}
      </ReadonlyItem>
      <ReadonlyItem icon={<CreditCard size={17} />} label="Số tài khoản">
        {user.bankAccountNumber || "Chưa cập nhật"}
      </ReadonlyItem>
      <ReadonlyItem
        className="md:col-span-2"
        icon={<ImageIcon size={17} />}
        label="Ảnh đại diện"
        lineClamp={2}
        wrapMode="anywhere"
      >
        {user.avatarUrl || "Chưa cập nhật URL ảnh"}
      </ReadonlyItem>
      <ReadonlyItem
        className="md:col-span-2"
        icon={<UserCircle size={17} />}
        label="Ghi chú cá nhân"
      >
        {user.bio || "Chưa có ghi chú"}
      </ReadonlyItem>
    </div>
  );
}

function ReadonlyItem({
  children,
  className = "",
  icon,
  label,
  lineClamp,
  wrapMode = "normal",
}: {
  children: ReactNode;
  className?: string;
  icon: ReactNode;
  label: string;
  lineClamp?: number;
  wrapMode?: "normal" | "anywhere";
}) {
  return (
    <div
      className={`grid gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 ${className}`}
    >
      <span className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--neutral-500)]">
        {icon}
        {label}
      </span>
      <p
        className={`min-w-0 text-[15px] font-bold leading-6 text-[var(--brand-950)] ${
          wrapMode === "anywhere" ? "break-all" : "break-words"
        }`}
        style={
          lineClamp
            ? {
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: lineClamp,
                display: "-webkit-box",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {children}
      </p>
    </div>
  );
}

function PaymentQrPanel({
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
    <aside className="grid gap-5">
      <form
        className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-1 text-[13px] font-extrabold text-[var(--brand-700)]">
              <QrCode size={15} />
              QR thanh toán
            </p>
            <h3 className="mt-3 text-[20px] font-extrabold text-[var(--brand-950)]">
              Ảnh chuyển khoản
            </h3>
          </div>
          {user.hasPaymentQr ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-extrabold text-emerald-700">
              <CheckCircle2 size={13} />
              Đã có
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)]">
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
          </div>

          {qrFile ? (
            <QrCropToolbar onReset={() => onQrCropChange(INITIAL_QR_CROP)} />
          ) : null}

          <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--brand-200)] bg-white px-4 text-[14px] font-extrabold text-[var(--brand-700)] transition hover:bg-[var(--brand-50)]">
            <Upload size={16} />
            Chọn ảnh QR
            <input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={isBusy}
              onChange={onQrFileChange}
              type="file"
            />
          </label>

          <p className="truncate text-[13px] font-semibold text-[var(--neutral-500)]">
            {qrFileName ||
              (user.hasPaymentQr
                ? `Đã lưu ${formatFileSize(user.paymentQrImageSize)}`
                : "PNG, JPG hoặc WEBP, tối đa 2MB")}
          </p>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <PrimaryAction
              disabled={!qrFile || isBusy}
              icon={
                isUploadingQr ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Camera size={16} />
                )
              }
              type="submit"
            >
              Lưu QR
            </PrimaryAction>
            {qrFile ? (
              <SecondaryAction
                disabled={isBusy}
                onClick={onResetQr}
                type="button"
              >
                Bỏ ảnh đã chọn
              </SecondaryAction>
            ) : user.hasPaymentQr ? (
              <SecondaryAction
                className="border-red-100 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                disabled={isBusy || isRemovingQr}
                icon={
                  isRemovingQr ? (
                    <LoaderCircle className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )
                }
                onClick={onRemoveQr}
                type="button"
              >
                Xóa QR
              </SecondaryAction>
            ) : null}
          </div>
        </div>
      </form>
    </aside>
  );
}

function PasswordPanel({
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
  return (
    <form
      className="rounded-lg border border-[var(--neutral-200)] bg-white shadow-[var(--shadow-card)]"
      onSubmit={onSubmit}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--neutral-200)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-100)] bg-[var(--accent-50)] px-3 py-1 text-[13px] font-extrabold text-[var(--accent-600)]">
            <KeyRound size={15} />
            Bảo mật
          </p>
          <h2 className="mt-3 text-[21px] font-extrabold text-[var(--brand-950)]">
            Đổi mật khẩu
          </h2>
        </div>

        {isOpen ? (
          <SecondaryAction
            disabled={isBusy}
            icon={<X size={16} />}
            onClick={onClose}
            type="button"
          >
            Hủy
          </SecondaryAction>
        ) : (
          <PrimaryAction
            className="w-full sm:w-auto"
            icon={<LockKeyhole size={16} />}
            onClick={onOpen}
            type="button"
          >
            Đổi mật khẩu
          </PrimaryAction>
        )}
      </div>

      {isOpen ? (
        <>
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-[14px] font-bold text-[var(--neutral-500)] transition hover:bg-[var(--neutral-50)] hover:text-[var(--brand-700)]"
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
        </>
      ) : (
        <div className="flex items-center gap-3 px-5 py-5 text-[14px] font-semibold text-[var(--neutral-500)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--neutral-50)] text-[var(--brand-600)]">
            <LockKeyhole size={17} />
          </span>
          Mật khẩu đang được bảo vệ. Bấm Đổi mật khẩu khi bạn muốn cập nhật.
        </div>
      )}
    </form>
  );
}

type QrCropDragMode =
  | "move"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type QrCropDragState = {
  containerHeight: number;
  containerWidth: number;
  crop: QrCropState;
  mode: QrCropDragMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
};

function QrCropBox({
  crop,
  onChange,
}: {
  crop: QrCropState;
  onChange: (crop: QrCropState) => void;
}) {
  const normalizedCrop = normalizeQrCrop(crop);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<QrCropDragState | null>(null);

  function startDrag(
    mode: QrCropDragMode,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const overlay = overlayRef.current;

    if (!overlay) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = overlay.getBoundingClientRect();
    overlay.setPointerCapture(event.pointerId);
    dragRef.current = {
      containerHeight: rect.height,
      containerWidth: rect.width,
      crop: normalizedCrop,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX =
      ((event.clientX - drag.startClientX) / drag.containerWidth) * 100;
    const deltaY =
      ((event.clientY - drag.startClientY) / drag.containerHeight) * 100;

    onChange(resizeQrCrop(drag.crop, drag.mode, deltaX, deltaY));
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const overlay = overlayRef.current;

    if (overlay?.hasPointerCapture(event.pointerId)) {
      overlay.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      onPointerCancel={stopDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      ref={overlayRef}
    >
      <div
        aria-label="Di chuyển vùng cắt ảnh QR"
        className="absolute cursor-move rounded-lg border-2 border-white shadow-[0_0_0_999px_rgba(15,23,42,0.36),0_10px_26px_rgba(15,23,42,0.2)] ring-2 ring-[var(--brand-400)]"
        onPointerDown={(event) => startDrag("move", event)}
        role="button"
        style={{
          height: `${normalizedCrop.height}%`,
          left: `${normalizedCrop.x}%`,
          top: `${normalizedCrop.y}%`,
          width: `${normalizedCrop.width}%`,
        }}
        tabIndex={0}
      >
        <span className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/45" />
        <span className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/45" />
        <span className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-white/45" />
        <span className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-white/45" />
        <CropHandle mode="top" onPointerDown={startDrag} />
        <CropHandle mode="right" onPointerDown={startDrag} />
        <CropHandle mode="bottom" onPointerDown={startDrag} />
        <CropHandle mode="left" onPointerDown={startDrag} />
        <CropHandle mode="top-left" onPointerDown={startDrag} />
        <CropHandle mode="top-right" onPointerDown={startDrag} />
        <CropHandle mode="bottom-left" onPointerDown={startDrag} />
        <CropHandle mode="bottom-right" onPointerDown={startDrag} />
      </div>
    </div>
  );
}

function CropHandle({
  mode,
  onPointerDown,
}: {
  mode: QrCropDragMode;
  onPointerDown: (
    mode: QrCropDragMode,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  const isCorner = mode.includes("-");
  const className = isCorner
    ? getCornerHandleClassName(mode)
    : getEdgeHandleClassName(mode);

  return (
    <button
      aria-label={`Kéo cạnh ${getCropHandleLabel(mode)}`}
      className={className}
      onPointerDown={(event) => onPointerDown(mode, event)}
      type="button"
    >
      <span className="sr-only">{getCropHandleLabel(mode)}</span>
    </button>
  );
}

function QrCropToolbar({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)]/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--brand-700)]">
        <Crop size={15} />
        Cắt xén trước khi lưu
      </div>
      <button
        className="h-8 rounded-lg bg-white px-3 text-[12px] font-extrabold text-[var(--neutral-600)] shadow-[var(--shadow-sm)] transition hover:text-[var(--brand-700)]"
        onClick={onReset}
        type="button"
      >
        Đặt lại
      </button>
    </div>
  );
}

function getEdgeHandleClassName(mode: QrCropDragMode) {
  const baseClassName =
    "absolute z-30 rounded-full border-2 border-white bg-[var(--brand-500)] shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  switch (mode) {
    case "top":
      return `${baseClassName} left-1/2 top-0 h-3 w-14 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize`;
    case "right":
      return `${baseClassName} right-0 top-1/2 h-14 w-3 -translate-y-1/2 translate-x-1/2 cursor-ew-resize`;
    case "bottom":
      return `${baseClassName} bottom-0 left-1/2 h-3 w-14 -translate-x-1/2 translate-y-1/2 cursor-ns-resize`;
    case "left":
      return `${baseClassName} left-0 top-1/2 h-14 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize`;
    default:
      return baseClassName;
  }
}

function getCornerHandleClassName(mode: QrCropDragMode) {
  const baseClassName =
    "absolute z-40 size-5 rounded-full border-2 border-white bg-[var(--brand-600)] shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  switch (mode) {
    case "top-left":
      return `${baseClassName} left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize`;
    case "top-right":
      return `${baseClassName} right-0 top-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize`;
    case "bottom-left":
      return `${baseClassName} bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize`;
    case "bottom-right":
      return `${baseClassName} bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize`;
    default:
      return baseClassName;
  }
}

function getCropHandleLabel(mode: QrCropDragMode) {
  const labels: Record<QrCropDragMode, string> = {
    bottom: "dưới",
    "bottom-left": "góc dưới trái",
    "bottom-right": "góc dưới phải",
    left: "trái",
    move: "vùng cắt",
    right: "phải",
    top: "trên",
    "top-left": "góc trên trái",
    "top-right": "góc trên phải",
  };

  return labels[mode];
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

function buildProfileForm(user: User): ProfileFormState {
  return {
    address: user.address ?? "",
    avatarUrl: user.avatarUrl ?? "",
    bankAccountName: user.bankAccountName ?? "",
    bankAccountNumber: user.bankAccountNumber ?? "",
    bio: user.bio ?? "",
    fullName: user.fullName ?? "",
    phone: user.phone ?? "",
  };
}

function buildProfilePayload(form: ProfileFormState): UpdateProfilePayload {
  return {
    address: form.address.trim(),
    avatarUrl: form.avatarUrl.trim(),
    bankAccountName: form.bankAccountName.trim(),
    bankAccountNumber: form.bankAccountNumber.trim(),
    bio: form.bio.trim(),
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
  };
}

function getConfirmConfig(
  action: ConfirmAction,
  handlers: {
    hasAvatarFile: boolean;
    isChangingPassword: boolean;
    isRemovingQr: boolean;
    isSavingProfile: boolean;
    isUploadingQr: boolean;
    onChangePassword: () => void;
    onRemoveQr: () => void;
    onSaveProfile: () => void;
    onUploadQr: () => void;
  },
): ConfirmDialogConfig {
  const profileDescription = handlers.hasAvatarFile
    ? "Ảnh đại diện sẽ được tải lên Cloudinary, sau đó URL mới được lưu vào hồ sơ giáo viên."
    : "Thông tin hồ sơ sẽ được cập nhật trên hệ thống.";

  const configs: Record<ConfirmAction, ConfirmDialogConfig> = {
    password: {
      confirmText: "Đổi mật khẩu",
      description: "Mật khẩu mới sẽ được áp dụng cho tài khoản giáo viên này.",
      isLoading: handlers.isChangingPassword,
      onConfirm: handlers.onChangePassword,
      title: "Xác nhận đổi mật khẩu",
    },
    paymentQr: {
      confirmText: "Lưu QR",
      description:
        "Ảnh QR sẽ được lưu trực tiếp vào database và chỉ tài khoản giáo viên này có quyền xem.",
      isLoading: handlers.isUploadingQr,
      onConfirm: handlers.onUploadQr,
      title: "Xác nhận lưu QR thanh toán",
    },
    profile: {
      confirmText: "Lưu hồ sơ",
      description: profileDescription,
      isLoading: handlers.isSavingProfile,
      onConfirm: handlers.onSaveProfile,
      title: "Xác nhận cập nhật hồ sơ",
    },
    removePaymentQr: {
      confirmText: "Xóa QR",
      description:
        "Ảnh QR thanh toán hiện tại sẽ bị xóa khỏi database của tài khoản.",
      isLoading: handlers.isRemovingQr,
      onConfirm: handlers.onRemoveQr,
      title: "Xóa QR thanh toán",
      tone: "danger",
    },
  };

  return configs[action];
}

function normalizeQrCrop(crop: QrCropState): QrCropState {
  const width = clampNumber(crop.width, MIN_QR_CROP_SIDE_PERCENT, 100);
  const height = clampNumber(crop.height, MIN_QR_CROP_SIDE_PERCENT, 100);

  return {
    height,
    width,
    x: clampNumber(crop.x, 0, 100 - width),
    y: clampNumber(crop.y, 0, 100 - height),
  };
}

function resizeQrCrop(
  crop: QrCropState,
  mode: QrCropDragMode,
  deltaX: number,
  deltaY: number,
) {
  if (mode === "move") {
    return normalizeQrCrop({
      ...crop,
      x: crop.x + deltaX,
      y: crop.y + deltaY,
    });
  }

  let nextX = crop.x;
  let nextY = crop.y;
  let nextWidth = crop.width;
  let nextHeight = crop.height;

  if (mode.includes("left")) {
    const right = crop.x + crop.width;
    nextX = clampNumber(
      crop.x + deltaX,
      0,
      right - MIN_QR_CROP_SIDE_PERCENT,
    );
    nextWidth = right - nextX;
  }

  if (mode.includes("right")) {
    nextWidth = clampNumber(
      crop.width + deltaX,
      MIN_QR_CROP_SIDE_PERCENT,
      100 - crop.x,
    );
  }

  if (mode.includes("top")) {
    const bottom = crop.y + crop.height;
    nextY = clampNumber(
      crop.y + deltaY,
      0,
      bottom - MIN_QR_CROP_SIDE_PERCENT,
    );
    nextHeight = bottom - nextY;
  }

  if (mode.includes("bottom")) {
    nextHeight = clampNumber(
      crop.height + deltaY,
      MIN_QR_CROP_SIDE_PERCENT,
      100 - crop.y,
    );
  }

  return normalizeQrCrop({
    height: nextHeight,
    width: nextWidth,
    x: nextX,
    y: nextY,
  });
}

async function createCroppedQrFile(file: File, crop: QrCropState) {
  const image = await loadImageFromFile(file);
  const normalizedCrop = normalizeQrCrop(crop);
  const sourceX = Math.round((image.naturalWidth * normalizedCrop.x) / 100);
  const sourceY = Math.round((image.naturalHeight * normalizedCrop.y) / 100);
  const sourceWidth = Math.round(
    (image.naturalWidth * normalizedCrop.width) / 100,
  );
  const sourceHeight = Math.round(
    (image.naturalHeight * normalizedCrop.height) / 100,
  );
  const scale = Math.min(1, 1400 / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Trình duyệt không hỗ trợ chỉnh sửa ảnh QR.");
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const outputType = getCanvasOutputType(file.type);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, 0.95);
  });

  if (!blob) {
    throw new Error("Không thể tạo ảnh QR sau khi cắt.");
  }

  const finalType = blob.type || outputType;
  const extension = finalType.split("/")[1] || "png";
  const fileName = `payment-qr-${Date.now()}.${extension}`;

  return new File([blob], fileName, {
    lastModified: Date.now(),
    type: finalType,
  });
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể đọc ảnh QR đã chọn."));
    };
    image.src = objectUrl;
  });
}

function getCanvasOutputType(fileType: string) {
  if (fileType === "image/jpeg" || fileType === "image/webp") {
    return fileType;
  }

  return "image/png";
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function formatFileSize(size?: number) {
  if (!size) {
    return "ảnh QR";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}
