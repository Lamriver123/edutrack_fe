import type { Editor } from "grapesjs";
import { ImageIcon, Minus, Square, Type } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export const BASIC_BLOCKS = [
  { id: "invoice-text", label: "Văn bản", icon: Type },
  { id: "invoice-image", label: "Hình ảnh", icon: ImageIcon },
  { id: "invoice-box", label: "Khung", icon: Square },
  { id: "invoice-divider", label: "Đường kẻ", icon: Minus },
] as const;

export function registerBlocks(editor: Editor) {
  editor.Blocks.add("invoice-text", {
    label: "Văn bản",
    content: {
      type: "text",
      tagName: "p",
      content: "Nội dung mới",
      style: {
        "font-size": "16px",
        width: "220px",
        margin: "0",
        padding: "8px",
      },
    },
  });
  editor.Blocks.add("invoice-image", {
    label: "Hình ảnh",
    content: {
      type: "image",
      src: `${window.location.origin}/logo.png`,
      attributes: { alt: "Logo EduTrack" },
      style: { width: "100px", height: "100px", "object-fit": "contain" },
    },
  });
  editor.Blocks.add("invoice-box", {
    label: "Khung",
    content: {
      tagName: "div",
      name: "Khung",
      style: {
        width: "240px",
        "min-height": "90px",
        padding: "12px",
        border: "1px solid #a3a3a3",
        "background-color": "#ffffff",
      },
    },
  });
  editor.Blocks.add("invoice-divider", {
    label: "Đường kẻ",
    content: {
      tagName: "hr",
      name: "Đường kẻ",
      style: {
        width: "260px",
        height: "2px",
        border: "0",
        "background-color": "#737373",
        margin: "12px 0",
      },
    },
  });
  for (const { id, label, icon } of BASIC_BLOCKS) {
    editor.Blocks.get(id).set({
      media: renderToStaticMarkup(
        createElement(icon, { size: 22, strokeWidth: 1.5 }),
      ),
      attributes: {
        title: label,
        "aria-label": label,
        role: "button",
        tabindex: "0",
      },
      select: true,
      onClick: (block) => {
        if (id === "invoice-image") {
          editor.trigger("invoice:images:open");
          return;
        }
        const page = editor.getWrapper()?.find(".edutrack-invoice-page")[0];
        const content = block.getContent();
        if (!page || !content) return;
        const [component] = page.append(
          typeof content === "function" ? content() : content,
        );
        if (component) {
          component.addStyle({
            position: "absolute",
            top: `${Math.min(1000, component.getEl()?.offsetTop ?? 840)}px`,
            left: "64px",
          });
          editor.select(component);
        }
      },
    });
  }
  editor.on("block:drag:stop", (component, block) => {
    if (block?.id === "invoice-image") {
      component?.remove();
      editor.trigger("invoice:images:open");
    }
  });
}
