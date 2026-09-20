import { useEffect, useRef, useState, type ReactNode } from "react";
import { CopyPlus, LoaderCircle, Save } from "lucide-react";
import {
  Modal,
  PrimaryAction,
  SecondaryAction,
  TextInput,
} from "@/components/classes/classroom-ui";
import type {
  InvoiceTemplate,
  TemplateSaveMode,
} from "@/types/invoice-template";
import styles from "./invoice-designer.module.css";

export function DialogFocus({
  children,
  title,
  onClose,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = root?.querySelector<HTMLElement>('[role="dialog"]');
    if (!root || !dialog) return;
    dialog.setAttribute("aria-label", title);
    const controls = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ),
      ].filter((item) => item.getClientRects().length);
    const initial =
      dialog.querySelector<HTMLElement>(
        'input[type="text"], input:not([type])',
      ) ?? controls()[0];
    initial?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const items = controls();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    root.addEventListener("keydown", keyboard, true);
    return () => {
      root.removeEventListener("keydown", keyboard, true);
      previous?.focus();
    };
  }, [title]);
  return <div ref={ref}>{children}</div>;
}

export function SaveTemplateDialog({
  template,
  name,
  saving,
  onClose,
  onSave,
}: {
  template: InvoiceTemplate;
  name: string;
  saving: boolean;
  onClose: () => void;
  onSave: (mode: TemplateSaveMode, name: string) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<TemplateSaveMode>("new");
  const [draftName, setDraftName] = useState(name);
  const canOverwrite = template.type === "CUSTOM" && !template.readonly;
  const close = () => {
    if (!saving) onClose();
  };
  return (
    <DialogFocus title="Lưu mẫu hóa đơn" onClose={close}>
      <Modal title="Lưu mẫu hóa đơn" size="sm" onClose={close}>
        <form
          className={styles.saveForm}
          onSubmit={async (event) => {
            event.preventDefault();
            if (await onSave(mode, draftName)) onClose();
          }}
        >
          <fieldset className={styles.saveModes} disabled={saving}>
            <legend>Cách lưu</legend>
            <label data-selected={mode === "new"}>
              <input
                type="radio"
                name="save-mode"
                value="new"
                checked={mode === "new"}
                onChange={() => setMode("new")}
              />
              <CopyPlus size={19} />
              <span>Lưu phiên bản mới</span>
            </label>
            <label
              data-selected={mode === "overwrite"}
              aria-disabled={!canOverwrite}
            >
              <input
                type="radio"
                name="save-mode"
                value="overwrite"
                checked={mode === "overwrite"}
                disabled={!canOverwrite}
                onChange={() => setMode("overwrite")}
              />
              <Save size={19} />
              <span>
                Lưu đè{canOverwrite ? ` V${template.version}` : " mẫu hệ thống"}
              </span>
            </label>
          </fieldset>
          {mode === "overwrite" && (
            <p className={styles.overwriteWarning}>
              Nội dung hiện tại của phiên bản V{template.version} sẽ được thay
              thế.
            </p>
          )}
          <TextInput
            label="Tên phiên bản"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            maxLength={120}
            required
            disabled={saving}
          />
          <div className={styles.dialogActions}>
            <SecondaryAction type="button" disabled={saving} onClick={close}>
              Hủy
            </SecondaryAction>
            <PrimaryAction
              type="submit"
              disabled={saving || !draftName.trim()}
              icon={
                saving ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )
              }
            >
              {mode === "new" ? "Lưu phiên bản mới" : "Xác nhận lưu đè"}
            </PrimaryAction>
          </div>
        </form>
      </Modal>
    </DialogFocus>
  );
}
