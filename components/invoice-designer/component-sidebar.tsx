import type { Editor } from "grapesjs";
import { useEffect, useRef, useState } from "react";
import { X, Shapes, Database, ImagePlus } from "lucide-react";
import { ToolButton } from "./designer-toolbar";
import styles from "./invoice-designer.module.css";

export function ComponentSidebar({
  editor,
  onClose,
  onImages,
}: {
  editor: Editor | null;
  onClose: () => void;
  onImages: () => void;
}) {
  const [tab, setTab] = useState("basic");
  const blocksRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = blocksRef.current;
    if (!editor || !container) return;
    const models = editor.Blocks.getAll().models.filter(
      (block) => String(block.id).startsWith("region-") === (tab === "regions"),
    );
    const blocks = editor.Blocks.render(models, {
      external: true,
    });
    if (blocks) container.append(blocks);
    const activate = (event: KeyboardEvent) => {
      const block =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(".gjs-block")
          : null;
      if (block && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        block.click();
      }
    };
    container.addEventListener("keydown", activate);
    return () => {
      container.removeEventListener("keydown", activate);
      container.replaceChildren();
    };
  }, [editor, tab]);

  return (
    <aside className={styles.components} aria-label="Thành phần hóa đơn">
      <div className={styles.panelHeading}>
        <h2>Thành phần</h2>
        <ToolButton label="Ẩn bảng thành phần" onClick={onClose}>
          <X size={16} />
        </ToolButton>
      </div>
      <div className={styles.sidebarTabs}>
        <div role="tablist" aria-label="Nhóm thành phần">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "basic"}
            title="Thành phần cơ bản"
            aria-label="Thành phần cơ bản"
            onClick={() => setTab("basic")}
          >
            <Shapes size={18} />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "regions"}
            title="Vùng dữ liệu động"
            aria-label="Vùng dữ liệu động"
            onClick={() => setTab("regions")}
          >
            <Database size={18} />
          </button>
        </div>
        <ToolButton
          label="Thư viện ảnh hóa đơn"
          onClick={onImages}
          disabled={!editor}
        >
          <ImagePlus size={18} />
        </ToolButton>
      </div>
      <div
        ref={blocksRef}
        className={`${styles.blockList} ${tab === "regions" ? styles.regionList : ""}`}
      />
    </aside>
  );
}
