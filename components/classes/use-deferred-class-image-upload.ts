"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { schoolApi } from "@/lib/api/school";

const MAX_CLASS_IMAGE_SIZE = 5 * 1024 * 1024;

export function useDeferredClassImageUpload() {
  const [classImageFile, setClassImageFile] = useState<File | null>(null);
  const [classImageFileName, setClassImageFileName] = useState("");
  const [classImagePreviewUrl, setClassImagePreviewUrl] = useState("");
  const [isUploadingClassImage, setIsUploadingClassImage] = useState(false);

  useEffect(() => {
    return () => {
      if (classImagePreviewUrl) {
        URL.revokeObjectURL(classImagePreviewUrl);
      }
    };
  }, [classImagePreviewUrl]);

  const resetClassImageSelection = useCallback(() => {
    setClassImageFile(null);
    setClassImageFileName("");
    setClassImagePreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return "";
    });
  }, []);

  const selectClassImageFile = useCallback(
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

      if (file.size > MAX_CLASS_IMAGE_SIZE) {
        onError("Ảnh lớp học cần nhỏ hơn 5MB.");
        return;
      }

      setClassImageFile(file);
      setClassImageFileName(file.name);
      setClassImagePreviewUrl((currentPreviewUrl) => {
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }

        return URL.createObjectURL(file);
      });
    },
    [],
  );

  const uploadSelectedClassImage = useCallback(async () => {
    if (!classImageFile) {
      return undefined;
    }

    setIsUploadingClassImage(true);

    try {
      const uploadedImage = await schoolApi.uploadClassImage(classImageFile);

      return uploadedImage.url;
    } finally {
      setIsUploadingClassImage(false);
    }
  }, [classImageFile]);

  return {
    classImageFileName,
    classImagePreviewUrl,
    isUploadingClassImage,
    resetClassImageSelection,
    selectClassImageFile,
    uploadSelectedClassImage,
  };
}
