"use client";

import {
  LoaderCircle,
  Pencil,
  Save,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  useDashboardSession,
  useDashboardUser,
} from "@/components/layout/dashboard-shell";
import { profileApi } from "@/lib/api/profile";
import {
  ConfirmDialog,
  PrimaryAction,
  SecondaryAction,
} from "@/components/classes/classroom-ui";
import { useNotice } from "@/components/ui/notice-provider";
import { getErrorMessage } from "@/components/classes/classroom-utils";
import type { QrCropState } from "@/components/profile/profile-qr-crop";
import {
  buildProfileForm,
  buildProfilePayload,
  createCroppedQrFile,
  getConfirmConfig,
  type ConfirmAction,
  type ProfileFormState,
} from "@/components/profile/profile-utils";
import {
  INITIAL_QR_CROP,
  PasswordPanel,
  PaymentQrPanel,
  ProfileEditFields,
  ProfileReadonlyFields,
  TeacherProfileCard,
  type PasswordFormState,
} from "@/components/profile/profile-sections";

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PAYMENT_QR_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const PAYMENT_QR_ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
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
    : (user.avatarUrl?.trim() ?? "");
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
      setNotice({
        type: "error",
        text: "Ảnh đại diện không được vượt quá 5MB.",
      });
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
      setNotice({
        type: "error",
        text: "Vui lòng nhập đủ thông tin mật khẩu.",
      });
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
    <section className="grid gap-4">
      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-stretch">
        <form
          className="overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-[var(--shadow-card)] xl:h-full"
          onSubmit={handleProfileSubmit}
        >
          <div className="flex flex-col gap-4 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--brand-50)] text-[var(--brand-600)]">
                <UserCircle size={20} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-extrabold leading-tight text-[var(--brand-950)]">
                    Hồ sơ giáo viên
                  </h2>
                  <p
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-extrabold ${
                      user.isEmailVerified
                        ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                        : "border-amber-100 bg-amber-50 text-amber-700"
                    }`}
                  >
                    <ShieldCheck size={14} />
                    {user.isEmailVerified ? "Đã xác thực" : "Chưa xác thực"}
                  </p>
                </div>
              </div>
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

          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[168px_minmax(0,1fr)]">
            <TeacherProfileCard
              avatarFileName={avatarFileName}
              avatarPreviewUrl={avatarPreviewUrl}
              isEditing={isProfileEditing}
              isSaving={isSavingProfile}
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
