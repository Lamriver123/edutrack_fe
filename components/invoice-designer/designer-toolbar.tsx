import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  LoaderCircle,
  Redo2,
  Save,
  Trash2,
  Undo2,
  PanelLeft,
  PanelRight,
  Maximize2,
  Minimize2,
  History,
  Eye,
} from "lucide-react";
import type { InvoiceTemplate } from "@/types/invoice-template";
import type { Component, Editor } from "grapesjs";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { SelectPicker } from "@/components/ui/select-picker";
import styles from "./invoice-designer.module.css";

export function ToolButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      {...props}
      className={styles.toolButton}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

type Props = {
  editor: Editor | null;
  selected: Component | null;
  name: string;
  setName: (name: string) => void;
  dirty: boolean;
  saving: boolean;
  deleting: boolean;
  loading: boolean;
  save: () => void;
  template: InvoiceTemplate | null;
  templates: InvoiceTemplate[];
  selectVersion: (id: string) => void;
  onDeleteTemplate: () => void;
  toggleComponents: () => void;
  toggleProperties: () => void;
  componentsOpen: boolean;
  propertiesOpen: boolean;
  focused: boolean;
  toggleFocus: () => void;
  onPreview: () => void;
};

export function DesignerToolbar({
  editor,
  selected,
  name,
  setName,
  dirty,
  saving,
  deleting,
  loading,
  save,
  template,
  templates,
  selectVersion,
  onDeleteTemplate,
  toggleComponents,
  toggleProperties,
  componentsOpen,
  propertiesOpen,
  focused,
  toggleFocus,
  onPreview,
}: Props) {
  return (
    <>
      <div className={styles.toolbar}>
        <Link
          className={styles.toolButton}
          href="/profile"
          title="Quay lại"
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.documentName}>
          <input
            aria-label="Tên mẫu hóa đơn"
            value={name}
            maxLength={120}
            disabled={loading || saving}
            onChange={(event) => setName(event.target.value)}
          />
          <span role="status" data-dirty={dirty}>
            {loading
              ? "Đang tải..."
              : saving
                ? "Đang lưu..."
                : dirty
                  ? "Chưa lưu thay đổi"
                  : template?.type === "SYSTEM"
                    ? "Mẫu hệ thống"
                    : "Đã lưu"}
          </span>
        </div>
        <div className={styles.versionPicker}>
          <SelectPicker
            ariaLabel="Phiên bản mẫu"
            disabled={loading || saving}
            leadingIcon={<History size={16} aria-hidden="true" />}
            onChange={selectVersion}
            options={templates.map((item, index) => ({
              label:
                item.type === "SYSTEM"
                  ? `Mẫu hệ thống V${item.version}`
                  : `V${item.version} · ${item.name}${index === 0 ? " (Mới nhất)" : ""}`,
              value: item.id,
            }))}
            placeholder="Đang tải..."
            value={template?.id ?? ""}
            variant="toolbar"
          />
        </div>
        <ToolButton
          label={
            template?.type === "SYSTEM"
              ? "Không thể xóa mẫu hệ thống"
              : "Xóa mẫu hóa đơn"
          }
          disabled={
            !template ||
            template.type === "SYSTEM" ||
            template.readonly ||
            loading ||
            saving ||
            deleting
          }
          onClick={onDeleteTemplate}
        >
          {deleting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Trash2 size={18} />
          )}
        </ToolButton>
        <button
          className={styles.saveButton}
          type="button"
          onClick={save}
          disabled={!editor || saving || loading}
        >
          {saving ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          Lưu mẫu
        </button>
      </div>
      <div className={styles.editingToolbar}>
        <div className={styles.toolGroup}>
          <ToolButton
            label="Hoàn tác"
            disabled={!editor?.UndoManager.hasUndo()}
            onClick={() => editor?.UndoManager.undo()}
          >
            <Undo2 size={18} />
          </ToolButton>
          <ToolButton
            label="Làm lại"
            disabled={!editor?.UndoManager.hasRedo()}
            onClick={() => editor?.UndoManager.redo()}
          >
            <Redo2 size={18} />
          </ToolButton>
          <span className={styles.separator} />
          <ToolButton
            label="Nhân đôi thành phần"
            disabled={!selected?.get("copyable")}
            onClick={() => {
              if (editor && selected) {
                const copy = selected.clone();
                const [inserted] =
                  selected
                    .parent()
                    ?.append(copy, { at: selected.index() + 1 }) ?? [];
                if (inserted) {
                  const original = selected.getStyle();
                  if (original.position === "absolute")
                    inserted.addStyle({
                      top: `${parseFloat(String(original.top || 0)) + 16}px`,
                      left: `${parseFloat(String(original.left || 0)) + 16}px`,
                    });
                  editor.select(inserted);
                }
              }
            }}
          >
            <Copy size={18} />
          </ToolButton>
          <ToolButton
            label="Xóa thành phần"
            disabled={!selected?.get("removable")}
            onClick={() => selected?.remove()}
          >
            <Trash2 size={18} />
          </ToolButton>
        </div>
        <div className={styles.toolGroup}>
          <ToolButton
            label="Xem trước hóa đơn"
            disabled={!editor || loading || saving}
            onClick={onPreview}
          >
            <Eye size={18} />
          </ToolButton>
          <ToolButton
            label="Bảng thành phần"
            aria-pressed={componentsOpen}
            onClick={toggleComponents}
          >
            <PanelLeft size={18} />
          </ToolButton>
          <ToolButton
            label="Bảng thuộc tính"
            aria-pressed={propertiesOpen}
            onClick={toggleProperties}
          >
            <PanelRight size={18} />
          </ToolButton>
          <span className={styles.separator} />
          <ToolButton
            label={focused ? "Hiện các bảng công cụ" : "Ẩn các bảng công cụ"}
            aria-pressed={focused}
            onClick={toggleFocus}
          >
            {focused ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </ToolButton>
        </div>
      </div>
    </>
  );
}
