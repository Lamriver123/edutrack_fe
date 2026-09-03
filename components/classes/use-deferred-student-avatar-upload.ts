"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { schoolApi } from "@/lib/api/school";

const MAX_STUDENT_AVATAR_SIZE = 5 * 1024 * 1024;

export function useDeferredStudentAvatarUpload() {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const resetAvatarSelection = useCallback(() => {
    setAvatarFile(null);
    setAvatarFileName("");
    setAvatarPreviewUrl("");
  }, []);

  const selectAvatarFile = useCallback(
    (
      event: ChangeEvent<HTMLInputElement>,
      onError: (message: string) => void,
    ) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        onError("File tải lên phải là hình ảnh.");
        return;
      }

      if (file.size > MAX_STUDENT_AVATAR_SIZE) {
        onError("Ảnh học sinh cần nhỏ hơn 5MB.");
        return;
      }

      setAvatarFile(file);
      setAvatarFileName(file.name);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    },
    [],
  );

  const uploadSelectedAvatar = useCallback(async () => {
    if (!avatarFile) {
      return undefined;
    }

    setIsUploadingAvatar(true);

    try {
      const uploadedImage = await schoolApi.uploadStudentAvatar(avatarFile);

      return uploadedImage.url;
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [avatarFile]);

  return {
    avatarFileName,
    avatarPreviewUrl,
    isUploadingAvatar,
    resetAvatarSelection,
    selectAvatarFile,
    uploadSelectedAvatar,
  };
}
