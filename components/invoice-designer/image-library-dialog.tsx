/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Archive, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import {
  ConfirmDialog,
  Modal,
  PrimaryAction,
  SecondaryAction,
} from "@/components/classes/classroom-ui";
import { invoiceImagesApi } from "@/lib/api/invoice-images";
import type { InvoiceImage } from "@/types/invoice-template";
import { DialogFocus } from "./designer-dialogs";
import { ToolButton } from "./designer-toolbar";
import styles from "./invoice-designer.module.css";

export function ImageLibraryDialog({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: (image: InvoiceImage) => void;
}) {
  const [images, setImages] = useState<InvoiceImage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [archiving, setArchiving] = useState<InvoiceImage | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const close = () => {
    if (!busyRef.current) onClose();
  };
  useEffect(() => {
    const controller = new AbortController();
    invoiceImagesApi
      .list(undefined, controller.signal)
      .then((result) => {
        setImages(result.images);
        setCursor(result.nextCursor);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Không tải được thư viện ảnh.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type)) {
      setError("Chỉ nhận ảnh PNG, JPG hoặc WEBP.");
      return;
    }
    if (!selected.size || selected.size > 5 * 1024 * 1024) {
      setError("Ảnh phải có dung lượng từ 1 byte đến 5 MB.");
      return;
    }
    setError("");
    setPreview(URL.createObjectURL(selected));
    setFile(selected);
  };
  async function upload() {
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setUploading(true);
    setError("");
    try {
      const image = await invoiceImagesApi.upload(file);
      onChoose(image);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không tải được ảnh lên.",
      );
    } finally {
      busyRef.current = false;
      setUploading(false);
    }
  }
  return (
    <>
      <DialogFocus title="Thư viện ảnh hóa đơn" onClose={close}>
        <Modal title="Thư viện ảnh hóa đơn" size="wide" onClose={close}>
          <div className={styles.imageLibrary}>
            <div className={styles.libraryToolbar}>
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-label="Chọn ảnh hóa đơn"
                hidden
                disabled={uploading}
                onChange={(event) => {
                  chooseFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <SecondaryAction
                icon={<ImagePlus size={17} />}
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                Chọn ảnh từ máy
              </SecondaryAction>
              <span className={styles.libraryMeta}>
                PNG, JPG, WEBP · Tối đa 5 MB
              </span>
            </div>
            {error && (
              <div className={styles.libraryError} role="alert">
                {error}
              </div>
            )}
            {file && (
              <div className={styles.uploadPreview}>
                {preview && <img src={preview} alt="Ảnh sắp tải lên" />}
                <div>
                  <strong>{file.name}</strong>
                  <span>{Math.ceil(file.size / 1024)} KB</span>
                </div>
                <ToolButton
                  label="Bỏ ảnh đã chọn"
                  disabled={uploading}
                  onClick={() => {
                    setFile(null);
                    setPreview("");
                  }}
                >
                  <X size={17} />
                </ToolButton>
                <PrimaryAction
                  disabled={uploading}
                  type="button"
                  onClick={() => void upload()}
                  icon={
                    uploading ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )
                  }
                >
                  Tải lên và chèn
                </PrimaryAction>
              </div>
            )}
            <div className={styles.libraryGrid} aria-busy={loading}>
              {images.map((item) => (
                <div className={styles.libraryItem} key={item.id}>
                  <button
                    type="button"
                    title={item.name}
                    disabled={uploading}
                    aria-label={`Chèn ${item.name}`}
                    onClick={() => {
                      onChoose(item);
                      onClose();
                    }}
                  >
                    <img src={item.url} alt={item.name} loading="lazy" />
                    <span>{item.name}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.archiveImage}
                    title="Ẩn khỏi thư viện"
                    aria-label={`Ẩn ${item.name}`}
                    disabled={uploading}
                    onClick={() => setArchiving(item)}
                  >
                    <Archive size={16} />
                  </button>
                </div>
              ))}
              {loading && (
                <p role="status" className={styles.libraryEmpty}>
                  <LoaderCircle className="animate-spin" size={22} />
                  Đang tải ảnh...
                </p>
              )}
              {!loading && !images.length && !error && (
                <p className={styles.libraryEmpty}>
                  <ImagePlus size={30} />
                  Chưa có ảnh hóa đơn
                </p>
              )}
            </div>
            {!loading && error && !images.length && !file && (
              <SecondaryAction
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setAttempt((value) => value + 1);
                }}
              >
                Thử lại
              </SecondaryAction>
            )}
            {cursor && (
              <SecondaryAction
                type="button"
                disabled={loading || uploading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await invoiceImagesApi.list(cursor);
                    setImages((items) => [...items, ...result.images]);
                    setCursor(result.nextCursor);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Không tải được ảnh.",
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Xem thêm
              </SecondaryAction>
            )}
          </div>
        </Modal>
      </DialogFocus>
      {archiving && (
        <DialogFocus
          title="Ẩn ảnh khỏi thư viện"
          onClose={() => {
            if (!archiveBusy) setArchiving(null);
          }}
        >
          <ConfirmDialog
            title="Ẩn ảnh khỏi thư viện"
            description="Ảnh đã chèn vào các phiên bản và hóa đơn vẫn được giữ lại."
            confirmText="Ẩn ảnh"
            isLoading={archiveBusy}
            onCancel={() => setArchiving(null)}
            onConfirm={async () => {
              setArchiveBusy(true);
              busyRef.current = true;
              try {
                await invoiceImagesApi.archive(archiving.id);
                setImages((items) =>
                  items.filter((item) => item.id !== archiving.id),
                );
                setArchiving(null);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Không ẩn được ảnh.",
                );
                setArchiving(null);
              } finally {
                setArchiveBusy(false);
                busyRef.current = false;
              }
            }}
          />
        </DialogFocus>
      )}
    </>
  );
}
