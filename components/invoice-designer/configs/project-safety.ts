import DOMPurify from "dompurify";
import type { ProjectData } from "grapesjs";

const tags = [
  "b",
  "br",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "header",
  "hr",
  "i",
  "img",
  "main",
  "p",
  "section",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
];
const attributes = [
  "id",
  "class",
  "style",
  "data-edutrack-field",
  "data-edutrack-region",
  "data-edutrack-image-id",
  "src",
  "alt",
  "title",
  "width",
  "height",
  "colspan",
  "rowspan",
];
const componentTypes = new Set([
  "",
  "default",
  "wrapper",
  "text",
  "textnode",
  "image",
  "table",
  "row",
  "cell",
  "thead",
  "tbody",
  "tfoot",
  "invoice-region",
]);
const cssProperties = new Set(
  "align-items background background-color border border-bottom border-collapse border-color border-left border-radius border-right border-style border-top border-width bottom box-sizing color display font-family font-size font-style font-weight gap grid-template-columns height justify-content left line-height margin margin-bottom margin-left margin-right margin-top max-height max-width min-height min-width object-fit padding padding-bottom padding-left padding-right padding-top place-items position right size text-align text-decoration text-transform top transform vertical-align white-space width z-index".split(
    " ",
  ),
);
for (const side of ["top", "right", "bottom", "left"]) {
  for (const part of ["width", "style", "color"])
    cssProperties.add(`border-${side}-${part}`);
}
for (const property of [
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "row-gap",
  "column-gap",
  "justify-items",
  "grid-template-rows",
  "grid-column",
  "grid-column-start",
  "grid-column-end",
  "grid-row",
  "grid-row-start",
  "grid-row-end",
  "flex",
  "flex-basis",
  "flex-shrink",
  "overflow",
  "text-overflow",
  "box-shadow",
  "background-image",
  "letter-spacing",
  "overflow-x",
  "overflow-y",
  "white-space-collapse",
  "text-wrap-mode",
  "text-wrap-style",
])
  cssProperties.add(property);

export function safeImageUrl(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    if (url.username || url.password) return null;
    if (
      url.protocol === "https:" ||
      (url.origin === window.location.origin && url.protocol === "http:")
    ) {
      return url.href;
    }
  } catch {
    /* Invalid URLs are not added to the canvas. */
  }
  return null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function safeStyle(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record(value)).flatMap(([key, item]) => {
      const text = String(item);
      return cssProperties.has(key) &&
        !/[<>\\]|url\s*\(|expression\s*\(|@import|javascript:|behavior/i.test(
          text,
        )
        ? [[key, text]]
        : [];
    }),
  );
}

function safeCss(css: string): string {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return Array.from(sheet.cssRules)
    .flatMap((rule) => {
      if (!(rule instanceof CSSStyleRule) && !(rule instanceof CSSPageRule))
        return [];
      const style = declarationStyle(rule.style);
      const selector =
        rule instanceof CSSStyleRule ? rule.selectorText : "@page";
      return [
        `${selector} { ${Object.entries(style)
          .map(([key, value]) => `${key}: ${value}`)
          .join(";")} }`,
      ];
    })
    .join("\n");
}

function declarationStyle(declaration: CSSStyleDeclaration) {
  return safeStyle(
    Object.fromEntries(
      [...cssProperties].flatMap((key) => {
        const value = declaration.getPropertyValue(key);
        return value ? [[key, value]] : [];
      }),
    ),
  );
}

function safeAttributes(value: unknown) {
  return Object.fromEntries(
    Object.entries(record(value)).flatMap(([key, val]) => {
      if (
        !attributes.includes(key) ||
        key === "style" ||
        typeof val !== "string"
      )
        return [];
      if (key === "src")
        return safeImageUrl(val) ? [[key, safeImageUrl(val)!]] : [];
      return [[key, val]];
    }),
  );
}

export function safeHtml(value: string): string {
  const fragment = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: attributes,
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll("*").forEach((element) => {
    if (element.hasAttribute("src")) {
      const url = safeImageUrl(element.getAttribute("src") ?? "");
      if (url) element.setAttribute("src", url);
      else element.remove();
    }
    if (element instanceof HTMLElement && element.hasAttribute("style")) {
      const style = declarationStyle(element.style);
      element.setAttribute(
        "style",
        Object.entries(style)
          .map(([key, val]) => `${key}: ${val}`)
          .join(";"),
      );
    }
  });
  const holder = document.createElement("div");
  holder.append(fragment);
  return holder.innerHTML;
}

function safeComponent(value: unknown): unknown {
  if (typeof value === "string") return safeHtml(value);
  if (Array.isArray(value)) return value.map(safeComponent).filter(Boolean);
  const item = record(value);
  const type = typeof item.type === "string" ? item.type : "";
  const tag =
    typeof item.tagName === "string" ? item.tagName.toLowerCase() : "";
  if (
    !componentTypes.has(type) ||
    (tag && tag !== "body" && !tags.includes(tag))
  )
    return null;
  const imageSource =
    typeof item.src === "string"
      ? item.src
      : String(record(item.attributes).src ?? "");
  if ((type === "image" || tag === "img") && !safeImageUrl(imageSource))
    return null;
  // Rebuild only supported model properties; project JSON can also contain scripts and frame heads.
  return {
    type,
    ...(tag ? { tagName: tag } : {}),
    ...(typeof item.name === "string" ? { name: item.name } : {}),
    attributes: safeAttributes(item.attributes),
    style: safeStyle(item.style),
    classes: safeSelectors(item.classes),
    ...(typeof item.content === "string"
      ? { content: type === "textnode" ? item.content : safeHtml(item.content) }
      : {}),
    ...(item.components ? { components: safeComponent(item.components) } : {}),
    ...(type === "image" ? { src: safeImageUrl(imageSource) } : {}),
  };
}

function safeSelectors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap<string | { name: string; type: number }>(
    (item: unknown) => {
      if (typeof item === "string")
        return /^[#.\w-]+$/.test(item) ? [item] : [];
      const selector = record(item);
      return typeof selector.name === "string" && /^[\w-]+$/.test(selector.name)
        ? [{ name: selector.name, type: selector.type === 2 ? 2 : 1 }]
        : [];
    },
  );
}

function safeStyles(value: unknown): unknown {
  if (typeof value === "string") return safeCss(value);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    const rule = record(item);
    if (rule.atRuleType && rule.atRuleType !== "page") return [];
    const extra =
      typeof rule.selectorsAdd === "string" ? rule.selectorsAdd : "";
    const state =
      typeof rule.state === "string" && /^[a-z-]+$/.test(rule.state)
        ? rule.state
        : "";
    if (/[<>{}\\@]/.test(extra)) return [];
    return [
      {
        selectors: safeSelectors(rule.selectors),
        selectorsAdd: extra,
        state,
        style: safeStyle(rule.style),
        ...(rule.atRuleType === "page"
          ? { atRuleType: "page", singleAtRule: true }
          : {}),
      },
    ];
  });
}

export function safeProject(data: Record<string, unknown>): ProjectData {
  if (!Array.isArray(data.pages) || !data.pages.length) {
    throw new Error("Dữ liệu thiết kế không hợp lệ. Không thể mở mẫu hóa đơn.");
  }
  const page = record(data.pages[0]);
  const frame = Array.isArray(page.frames) ? record(page.frames[0]) : page;
  const component = safeComponent(frame.component);
  if (!component) throw new Error("Mẫu hóa đơn không có nội dung hợp lệ.");
  return {
    assets: [],
    pages: [
      {
        id: typeof page.id === "string" ? page.id : "invoice",
        component,
        styles: safeStyles(frame.styles),
      },
    ],
    styles: safeStyles(data.styles),
  };
}
