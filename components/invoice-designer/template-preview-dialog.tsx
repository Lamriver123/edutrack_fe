import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal } from "@/components/classes/classroom-ui";
import { invoiceTemplateApi } from "@/lib/api/invoice-template";
import { DialogFocus } from "./designer-dialogs";
import styles from "./invoice-designer.module.css";

export function TemplatePreviewDialog({
  html,
  css,
  onClose,
}: {
  html: string;
  css: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    invoiceTemplateApi
      .preview(html, css, controller.signal)
      .then((data) => setResult(data.html))
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Không thể xem trước mẫu.",
          );
      });
    return () => controller.abort();
  }, [html, css]);
  return (
    <DialogFocus title="Xem trước · Dữ liệu mẫu" onClose={onClose}>
      <Modal title="Xem trước · Dữ liệu mẫu" size="wide" onClose={onClose}>
        {error ? (
          <p role="alert">{error}</p>
        ) : !result ? (
          <p className={styles.libraryEmpty} role="status">
            <LoaderCircle className="animate-spin" size={24} />
            Đang tạo bản xem trước...
          </p>
        ) : (
          <iframe
            className={styles.templatePreview}
            title="Bản xem trước hóa đơn"
            sandbox=""
            srcDoc={result}
          />
        )}
      </Modal>
    </DialogFocus>
  );
}
