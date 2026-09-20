import type { Component, Editor } from "grapesjs";
import { Database } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { InvoiceRegionRegistry } from "@/types/invoice-template";

export const REGION_EDITOR_CSS = `
[data-edutrack-region] { outline: 1px dashed #7da8bc; outline-offset: -1px; }
[data-edutrack-region] [data-gjs-highlightable] { outline: none !important; }
`;

export function registerRegions(
  editor: Editor,
  registry: InvoiceRegionRegistry,
) {
  editor.Components.addType("invoice-region", {
    isComponent: (element) =>
      element.nodeType === 1 && element.hasAttribute("data-edutrack-region")
        ? { type: "invoice-region" }
        : false,
    model: {
      defaults: {
        tagName: "div",
        editable: false,
        droppable: false,
        resizable: true,
      },
      init() {
        const key = this.getAttributes()["data-edutrack-region"];
        const definition = registry.regions.find((item) => item.key === key);
        this.set("name", definition?.label ?? "Vùng dữ liệu");
      },
    },
  });
  for (const region of registry.regions) {
    editor.Blocks.add(`region-${region.key}`, {
      label: region.label,
      content: region.html,
      select: true,
      media: renderToStaticMarkup(
        createElement(Database, { size: 18, strokeWidth: 1.5 }),
      ),
      attributes: {
        title: region.label,
        "aria-label": `Vùng ${region.label}`,
        role: "button",
        tabindex: "0",
      },
      onClick: (block) => {
        const page = editor.getWrapper()?.find(".edutrack-invoice-page")[0];
        const content = block.getContent();
        if (!page || typeof content !== "string") return;
        const [added] = page.append(content);
        if (added) {
          added.addStyle({ width: "100%" });
          editor.select(added);
          added.getEl()?.scrollIntoView({ block: "nearest" });
        }
      },
    });
  }
}

export function lockRegionContents(editor: Editor) {
  editor
    .getWrapper()
    ?.find("[data-edutrack-region]")
    .forEach((region) => {
      region.set({
        type: "invoice-region",
        editable: false,
        droppable: false,
        resizable: true,
      });
      const lock = (component: Component) => {
        component.set({
          selectable: false,
          hoverable: false,
          editable: false,
          draggable: false,
          droppable: false,
          removable: false,
          copyable: false,
          resizable: false,
        });
        component.components().forEach(lock);
      };
      region.components().forEach(lock);
    });
}
