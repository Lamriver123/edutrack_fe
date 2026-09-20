import type { Component, Editor, EditorConfig } from "grapesjs";
import { registerBlocks } from "./blocks.config";
import type { InvoiceRegionRegistry } from "@/types/invoice-template";
import {
  registerRegions,
  lockRegionContents,
  REGION_EDITOR_CSS,
} from "./regions.config";

type ResizePositionOptions = { noScroll?: boolean };
type ResizePosition = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const toolbarLabels: Record<string, string> = {
  "core:component-exit": "Chọn khung chứa",
  "tlb-move": "Di chuyển",
  "tlb-clone": "Nhân đôi",
  "tlb-delete": "Xóa",
};

export const A4_WIDTH = 794;
export const A4_HEIGHT = 1123;
export const PAGE_CSS = `* { box-sizing: border-box; } body { margin: 0; background: #fff; } .edutrack-invoice-page { width: 210mm; min-height: 297mm; position: relative; box-sizing: border-box; } @page { size: A4; margin: 0; }`;

export function getInvoicePage(editor: Editor): Component | undefined {
  return editor.getWrapper()?.find(".edutrack-invoice-page")[0];
}

function documentScroll(document: Document, noScroll?: boolean) {
  if (noScroll) return { x: 0, y: 0 };
  const scrolling = document.scrollingElement ?? document.documentElement;
  return {
    x: scrolling?.scrollLeft ?? document.body?.scrollLeft ?? 0,
    y: scrolling?.scrollTop ?? document.body?.scrollTop ?? 0,
  };
}

function stableResizeOptions(editor: Editor, ratioDefault = false) {
  const framePoint = (event: Event) => {
    const pointer = event as MouseEvent;
    const frameDocument = editor.Canvas.getDocument();
    const targetDocument =
      (pointer.target as { ownerDocument?: Document } | null)?.ownerDocument ??
      null;
    const scroll = frameDocument
      ? documentScroll(frameDocument)
      : { x: 0, y: 0 };
    if (frameDocument && targetDocument === frameDocument) {
      return {
        x: pointer.clientX + scroll.x,
        y: pointer.clientY + scroll.y,
      };
    }
    const frame = editor.Canvas.getFrameEl();
    const rect = frame?.getBoundingClientRect();
    const zoom = Math.max(editor.Canvas.getZoom() / 100, 0.01);
    return rect
      ? {
          x: (pointer.clientX - rect.left) / zoom + scroll.x,
          y: (pointer.clientY - rect.top) / zoom + scroll.y,
        }
      : { x: pointer.clientX, y: pointer.clientY };
  };

  const elementPosition = (
    element: HTMLElement,
    options: ResizePositionOptions = {},
  ): ResizePosition => {
    const rect = element.getBoundingClientRect();
    const scroll = documentScroll(element.ownerDocument, options.noScroll);
    return {
      top: rect.top + scroll.y,
      left: rect.left + scroll.x,
      width: rect.width,
      height: rect.height,
    };
  };

  return {
    ratioDefault,
    mousePosFetcher: framePoint,
    posFetcher: elementPosition,
  };
}

export function configureInvoiceEditor(
  editor: Editor,
  registry: InvoiceRegionRegistry,
) {
  registerBlocks(editor);
  registerRegions(editor, registry);
  editor.on("component:add", () => lockRegionContents(editor));
  editor.on("canvas:drop", (_transfer, dropped) => {
    const component = Array.isArray(dropped) ? dropped[0] : dropped;
    if (!component) return;
    const page = getInvoicePage(editor);
    if (page && component.parent()?.is("wrapper")) component.move(page);
    editor.select(component);
  });
  [...editor.RichTextEditor.getAll()].forEach((action) =>
    editor.RichTextEditor.remove(action.name),
  );
  editor.RichTextEditor.add("bold", {
    icon: "<b>B</b>",
    attributes: { title: "In đậm" },
    result: (rte) => rte.exec("bold"),
  });
  editor.RichTextEditor.add("italic", {
    icon: "<i>I</i>",
    attributes: { title: "In nghiêng" },
    result: (rte) => rte.exec("italic"),
  });
  editor.on("component:create", (component: Component) => {
    const isPage = component.getClasses().includes("edutrack-invoice-page");
    const isField = Boolean(component.getAttributes()["data-edutrack-field"]);
    const isImage = component.is("image");
    component.set({
      resizable:
        !isPage && !component.is("wrapper")
          ? stableResizeOptions(editor, isImage)
          : false,
      ...(isPage
        ? {
            draggable: false,
            removable: false,
            copyable: false,
            selectable: false,
            hoverable: false,
          }
        : {}),
      ...(isField || component.find("[data-edutrack-field]").length
        ? { editable: false }
        : {}),
    });
    if (isImage) component.set({ activeOnRender: false });
    component.set(
      "toolbar",
      component.get("toolbar")?.map((button) => ({
        ...button,
        command:
          typeof button.command === "string"
            ? button.command
            : "core:component-exit",
        events: { pointerdown: "handleClick" },
        attributes: {
          ...button.attributes,
          title:
            typeof button.command === "string"
              ? toolbarLabels[button.command]
              : "Chọn khung chứa",
          "aria-label":
            typeof button.command === "string"
              ? toolbarLabels[button.command]
              : "Chọn khung chứa",
          role: "button",
        },
      })),
    );
  });
  editor.on("canvas:frame:load", () => {
    const doc = editor.Canvas.getDocument();
    if (!doc) return;
    const font = doc.createElement("link");
    font.rel = "stylesheet";
    font.href =
      "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700;800;900&display=swap";
    doc.head.append(font);
    // Rich text accepts plain text only; file and external HTML drops never enter the project.
    doc.addEventListener(
      "paste",
      (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (
          text &&
          (doc.activeElement as HTMLElement | null)?.isContentEditable
        ) {
          doc.execCommand("insertText", false, text);
        }
      },
      true,
    );
    doc.addEventListener(
      "drop",
      (event) => {
        if (
          event.dataTransfer?.files.length ||
          event.dataTransfer?.types.some((type) =>
            ["text/html", "text/uri-list"].includes(type),
          )
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
  });
}

export function invoiceEditorConfig(
  container: HTMLElement,
  registry: InvoiceRegionRegistry,
): EditorConfig {
  return {
    container,
    height: "100%",
    width: "100%",
    storageManager: false,
    panels: { defaults: [] },
    blockManager: {},
    assetManager: {
      custom: true,
      upload: false,
      autoAdd: false,
      dropzone: false,
    },
    styleManager: { custom: true },
    selectorManager: { componentFirst: true },
    layerManager: { custom: true },
    deviceManager: {
      devices: [
        {
          id: "a4",
          name: "A4",
          width: `${A4_WIDTH}px`,
          height: `${A4_HEIGHT}px`,
        },
      ],
    },
    devicePreviewMode: true,
    parser: {
      optionsHtml: {
        allowScripts: false,
        allowUnsafeAttr: false,
        allowUnsafeAttrValue: false,
      },
    },
    canvas: {
      scripts: [],
      styles: [],
      infiniteCanvas: true,
      allowExternalDrop: false,
      frameContent: "<!DOCTYPE html><html><head></head><body></body></html>",
    },
    dragMode: "absolute",
    nativeDnD: false,
    jsInHtml: false,
    canvasCss: REGION_EDITOR_CSS,
    noticeOnUnload: false,
    showOffsets: false,
    plugins: [(editor) => configureInvoiceEditor(editor, registry)],
  };
}
