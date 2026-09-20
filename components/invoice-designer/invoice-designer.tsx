"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/components/classes/classroom-ui";
import { DialogFocus, SaveTemplateDialog } from "./designer-dialogs";
import { ComponentSidebar } from "./component-sidebar";
import { DesignerToolbar } from "./designer-toolbar";
import { InvoiceCanvas } from "./invoice-canvas";
import { PropertyPanel } from "./property-panel";
import { useInvoiceDesigner } from "./use-invoice-designer";
import styles from "./invoice-designer.module.css";
import type { Component } from "grapesjs";
import type { InvoiceImage } from "@/types/invoice-template";
import { ImageLibraryDialog } from "./image-library-dialog";
import { TemplatePreviewDialog } from "./template-preview-dialog";
import { safeHtml } from "./configs/project-safety";

const compactQuery = "(max-width: 959px)";
const subscribeCompact = (listener: () => void) => {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

export default function InvoiceDesigner() {
  const designer = useInvoiceDesigner();
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(compactQuery).matches,
    () => false,
  );
  const [componentsOpen, setComponentsOpen] = useState(true);
  const [propertiesPreference, setPropertiesPreference] = useState<
    boolean | null
  >(null);
  const [focused, setFocused] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imagePicker, setImagePicker] = useState<{
    target: Component | null;
  } | null>(null);
  const [preview, setPreview] = useState<{ html: string; css: string } | null>(
    null,
  );
  useEffect(() => {
    const open = () => setImagePicker({ target: null });
    designer.editor?.on("invoice:images:open", open);
    return () => {
      designer.editor?.off("invoice:images:open", open);
    };
  }, [designer.editor]);

  function chooseImage(image: InvoiceImage) {
    const editor = designer.editor;
    if (!editor) return;
    if (imagePicker?.target?.parent()) {
      imagePicker.target.set("src", image.url);
      imagePicker.target.addAttributes({
        alt: image.name,
        "data-edutrack-image-id": image.id,
      });
    } else {
      const paper = editor.getWrapper()?.find(".edutrack-invoice-page")[0];
      const [component] =
        paper?.append({
          type: "image",
          src: image.url,
          attributes: { alt: image.name, "data-edutrack-image-id": image.id },
        }) ?? [];
      if (component) {
        const viewport = editor.Canvas.getElement().getBoundingClientRect();
        const frame = editor.Canvas.getFrameEl().getBoundingClientRect();
        const zoom = editor.Canvas.getZoom() / 100;
        const originalWidth = image.width ?? 220;
        const originalHeight = image.height ?? 220;
        const scale = Math.min(1, 220 / originalWidth, 220 / originalHeight);
        const width = originalWidth * scale;
        const height = originalHeight * scale;
        component.addStyle({
          position: "absolute",
          width: `${width}px`,
          height: `${height}px`,
          "object-fit": "contain",
          left: `${Math.max(0, Math.min(794 - width, (viewport.left + viewport.width / 2 - frame.left) / zoom - width / 2))}px`,
          top: `${Math.max(0, Math.min(1123 - height, (viewport.top + viewport.height / 2 - frame.top) / zoom - height / 2))}px`,
        });
        editor.select(component);
      }
    }
  }
  const propertiesOpen = propertiesPreference ?? !compact;
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
  return (
    <div className={styles.designer} data-focused={focused}>
      <DesignerToolbar
        {...designer}
        save={() => setSaveOpen(true)}
        onDeleteTemplate={() => setDeleteOpen(true)}
        onPreview={() => {
          if (designer.editor)
            setPreview({
              html: safeHtml(designer.editor.getHtml()),
              css: designer.editor.getCss() ?? "",
            });
        }}
        componentsOpen={componentsOpen && !focused}
        propertiesOpen={propertiesOpen && !focused}
        toggleComponents={() => {
          setFocused(false);
          setComponentsOpen(focused || !componentsOpen);
        }}
        toggleProperties={() => {
          setFocused(false);
          setPropertiesPreference(focused || !propertiesOpen);
        }}
        focused={focused}
        toggleFocus={() => setFocused((value) => !value)}
      />
      <div className={styles.workspace} aria-busy={designer.loading}>
        <div
          className={styles.componentsDock}
          hidden={!componentsOpen || focused}
        >
          <ComponentSidebar
            editor={designer.error ? null : designer.editor}
            onClose={() => setComponentsOpen(false)}
            onImages={() => setImagePicker({ target: null })}
          />
        </div>
        <InvoiceCanvas
          canvasRef={designer.canvasRef}
          editor={designer.error ? null : designer.editor}
        />
        {compact && propertiesOpen && !focused && (
          <button
            className={styles.panelBackdrop}
            aria-label="Đóng bảng thuộc tính"
            onClick={() => setPropertiesPreference(false)}
          />
        )}
        <div
          className={styles.propertiesDock}
          hidden={!propertiesOpen || focused}
        >
          <PropertyPanel
            key={designer.selected?.cid ?? "none"}
            selected={designer.selected}
            onClose={() => setPropertiesPreference(false)}
            onImages={() =>
              setImagePicker({
                target: designer.selected?.is("image")
                  ? designer.selected
                  : null,
              })
            }
          />
        </div>
        {designer.loading || designer.error ? (
          <div className={styles.stateOverlay}>
            {designer.error ? (
              <>
                <AlertCircle size={26} />
                <p role="alert">{designer.error}</p>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={designer.retry}
                >
                  <RefreshCw size={16} />
                  Thử lại
                </button>
              </>
            ) : (
              <>
                <LoaderCircle className="animate-spin" size={26} />
                <p role="status">Đang mở mẫu hóa đơn...</p>
              </>
            )}
          </div>
        ) : null}
      </div>
      {saveOpen && designer.template && (
        <SaveTemplateDialog
          template={designer.template}
          name={designer.name}
          saving={designer.saving}
          onSave={designer.save}
          onClose={() => setSaveOpen(false)}
        />
      )}
      {deleteOpen && designer.template?.type === "CUSTOM" && (
        <ConfirmDialog
          title="Xóa mẫu hóa đơn"
          description={`Bạn có chắc muốn xóa “${designer.template.name}” (V${designer.template.version})? Mẫu sẽ không còn xuất hiện trong danh sách.`}
          cancelText="Giữ lại"
          confirmText="Xóa mẫu"
          tone="danger"
          isLoading={designer.deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={async () => {
            if (await designer.deleteTemplate()) setDeleteOpen(false);
          }}
        />
      )}
      {imagePicker && (
        <ImageLibraryDialog
          onClose={() => setImagePicker(null)}
          onChoose={chooseImage}
        />
      )}
      {preview && (
        <TemplatePreviewDialog {...preview} onClose={() => setPreview(null)} />
      )}
      {designer.pendingAction && (
        <DialogFocus title="Thay đổi chưa lưu" onClose={designer.cancelDiscard}>
          <ConfirmDialog
            title="Thay đổi chưa lưu"
            description={
              designer.pendingAction.type === "version"
                ? "Đổi phiên bản sẽ bỏ các thay đổi chưa lưu trong mẫu hiện tại."
                : "Rời trang sẽ bỏ các thay đổi chưa lưu trong mẫu hiện tại."
            }
            cancelText="Tiếp tục chỉnh sửa"
            confirmText="Bỏ thay đổi"
            tone="danger"
            isLoading={designer.saving}
            onCancel={designer.cancelDiscard}
            onConfirm={designer.confirmDiscard}
          />
        </DialogFocus>
      )}
    </div>
  );
}
