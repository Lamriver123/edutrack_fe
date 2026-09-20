import type { Component } from "grapesjs";
import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  MousePointer2,
  X,
  ImagePlus,
} from "lucide-react";
import { useNotice } from "@/components/ui/notice-provider";
import { safeImageUrl } from "./configs/project-safety";
import { ToolButton } from "./designer-toolbar";
import styles from "./invoice-designer.module.css";

export function PropertyPanel({
  selected,
  onClose,
  onImages,
}: {
  selected: Component | null;
  onClose: () => void;
  onImages: () => void;
}) {
  const { setNotice } = useNotice();
  const [tab, setTab] = useState("content");
  const heading = (
    <div className={styles.panelHeading}>
      <h2>Thuộc tính</h2>
      <ToolButton label="Ẩn bảng thuộc tính" onClick={onClose}>
        <X size={16} />
      </ToolButton>
    </div>
  );
  if (!selected) {
    return (
      <aside className={styles.properties} aria-label="Thuộc tính">
        {heading}
        <div className={styles.emptySelection}>
          <MousePointer2 size={24} />
          <span>Chưa chọn thành phần</span>
        </div>
      </aside>
    );
  }
  const element = selected.getEl();
  const computed =
    element?.ownerDocument.defaultView?.getComputedStyle(element);
  const value = (property: string) =>
    String(
      selected.getStyle()[property] ??
        computed?.getPropertyValue(property) ??
        "",
    );
  const update = (property: string, next: string) => {
    if (next) selected.addStyle({ [property]: next });
    else selected.removeStyle(property);
  };
  const dynamic =
    Boolean(selected.getAttributes()["data-edutrack-region"]) ||
    Boolean(selected.getAttributes()["data-edutrack-field"]) ||
    selected.find("[data-edutrack-field]").length > 0;

  function numberField(label: string, property: string, min = 0, max = 2000) {
    const numeric = parseFloat(value(property));
    return (
      <label className={styles.field}>
        {label}
        <div className={styles.numberInput}>
          <input
            aria-label={label}
            type="number"
            min={min}
            max={max}
            step="1"
            value={
              Number.isFinite(numeric) ? Math.round(numeric * 10) / 10 : ""
            }
            onChange={(event) => {
              const next = event.target.value;
              if (next === "") update(property, "");
              else if (Number.isFinite(Number(next)))
                update(
                  property,
                  `${Math.min(max, Math.max(min, Number(next)))}px`,
                );
            }}
          />
          <span>px</span>
        </div>
      </label>
    );
  }

  function colorField(label: string, property: string, fallback: string) {
    const color = value(property);
    const channels = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const hex = /^#[0-9a-f]{6}$/i.test(color)
      ? color
      : channels
        ? `#${channels
            .slice(1)
            .map((part) => Number(part).toString(16).padStart(2, "0"))
            .join("")}`
        : fallback;
    return (
      <label className={styles.colorField}>
        <span>{label}</span>
        <input
          aria-label={label}
          type="color"
          value={hex}
          onChange={(event) => update(property, event.target.value)}
        />
      </label>
    );
  }

  return (
    <aside className={styles.properties} aria-label="Thuộc tính">
      {heading}
      <p className={styles.selectionName}>
        {dynamic
          ? selected.getName()
          : selected.is("image")
            ? "Hình ảnh"
            : selected.getName()}
      </p>
      <div
        className={styles.propertyTabs}
        role="tablist"
        aria-label="Nhóm thuộc tính"
      >
        {[
          { id: "content", label: "Nội dung" },
          { id: "layout", label: "Bố cục" },
          { id: "style", label: "Kiểu dáng" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`property-${item.id}`}
            id={`tab-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="property-content"
        aria-labelledby="tab-content"
        hidden={tab !== "content"}
      >
        {selected.is("image") ? (
          <form
            className={styles.propertySection}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const url = safeImageUrl(String(data.get("src") ?? "").trim());
              if (!url) {
                setNotice({
                  type: "error",
                  text: "Địa chỉ ảnh không hợp lệ. Hãy dùng URL HTTPS hoặc ảnh trong ứng dụng.",
                });
                return;
              }
              selected.set("src", url);
              selected.removeAttributes("data-edutrack-image-id");
              selected.addAttributes({ alt: String(data.get("alt") ?? "") });
            }}
          >
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={onImages}
            >
              <ImagePlus size={16} />
              Chọn ảnh từ thư viện
            </button>
            <label className={styles.field}>
              Địa chỉ ảnh
              <input
                key={String(selected.get("src"))}
                name="src"
                aria-label="Địa chỉ ảnh"
                type="url"
                required
                defaultValue={String(selected.get("src") ?? "")}
              />
            </label>
            <label className={styles.field}>
              Mô tả ảnh
              <input
                key={String(selected.getAttributes().alt)}
                name="alt"
                aria-label="Mô tả ảnh"
                defaultValue={String(selected.getAttributes().alt ?? "")}
                maxLength={200}
              />
            </label>
            <button className={styles.secondaryButton} type="submit">
              Áp dụng ảnh
            </button>
          </form>
        ) : null}
        {!selected.is("image") ? (
          <div className={styles.propertySection}>
            <h3>Văn bản</h3>
            <label className={styles.field}>
              Phông chữ
              <select
                aria-label="Phông chữ"
                value={value("font-family")
                  .split(",")[0]
                  .replace(/["']/g, "")
                  .trim()}
                onChange={(event) => update("font-family", event.target.value)}
              >
                {[
                  "Arial",
                  "Georgia",
                  "Times New Roman",
                  "Verdana",
                  "Tahoma",
                  "Courier New",
                ].map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </label>
            {numberField("Cỡ chữ", "font-size", 8, 120)}
            <div className={styles.formatTools}>
              <ToolButton
                label="In đậm"
                aria-pressed={
                  Number(value("font-weight")) >= 600 ||
                  value("font-weight") === "bold"
                }
                onClick={() =>
                  update(
                    "font-weight",
                    Number(value("font-weight")) >= 600 ||
                      value("font-weight") === "bold"
                      ? "400"
                      : "700",
                  )
                }
              >
                <Bold size={17} />
              </ToolButton>
              <ToolButton
                label="In nghiêng"
                aria-pressed={value("font-style") === "italic"}
                onClick={() =>
                  update(
                    "font-style",
                    value("font-style") === "italic" ? "normal" : "italic",
                  )
                }
              >
                <Italic size={17} />
              </ToolButton>
              <span className={styles.separator} />
              {(
                [
                  { id: "left", label: "Căn trái", icon: AlignLeft },
                  { id: "center", label: "Căn giữa", icon: AlignCenter },
                  { id: "right", label: "Căn phải", icon: AlignRight },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <ToolButton
                  key={id}
                  label={label}
                  aria-pressed={value("text-align") === id}
                  onClick={() => update("text-align", id)}
                >
                  <Icon size={17} />
                </ToolButton>
              ))}
            </div>
            {colorField("Màu chữ", "color", "#262626")}
          </div>
        ) : null}
      </div>
      <div
        className={styles.propertySection}
        role="tabpanel"
        id="property-layout"
        aria-labelledby="tab-layout"
        hidden={tab !== "layout"}
      >
        <h3>Vị trí và kích thước</h3>
        <label className={styles.field}>
          Vị trí
          <select
            aria-label="Vị trí"
            value={value("position") === "absolute" ? "absolute" : "relative"}
            onChange={(event) => {
              update("position", event.target.value);
              if (event.target.value === "absolute")
                selected.addStyle({ top: "64px", left: "64px" });
              else {
                selected.removeStyle("top");
                selected.removeStyle("left");
              }
            }}
          >
            <option value="relative">Theo bố cục</option>
            <option value="absolute">Tự do</option>
          </select>
        </label>
        {value("position") === "absolute" ? (
          <div className={styles.fieldGrid}>
            {numberField("X", "left", -794, 794)}
            {numberField("Y", "top", -1123, 2246)}
          </div>
        ) : null}
        <div className={styles.fieldGrid}>
          {numberField("Chiều rộng", "width", 1, 794)}
          {numberField("Chiều cao", "height", 1, 2246)}
        </div>
        <div className={styles.fieldGrid}>
          {numberField("Lề trong", "padding", 0, 120)}
          {numberField("Lề ngoài", "margin", 0, 120)}
        </div>
      </div>
      <div
        className={styles.propertySection}
        role="tabpanel"
        id="property-style"
        aria-labelledby="tab-style"
        hidden={tab !== "style"}
      >
        <h3>Nền và viền</h3>
        {colorField("Màu nền", "background-color", "#ffffff")}
        <label className={styles.field}>
          Kiểu viền
          <select
            aria-label="Kiểu viền"
            value={value("border-style")}
            onChange={(event) => update("border-style", event.target.value)}
          >
            <option value="none">Không viền</option>
            <option value="solid">Nét liền</option>
            <option value="dashed">Nét đứt</option>
            <option value="dotted">Chấm</option>
          </select>
        </label>
        {numberField("Độ dày viền", "border-width", 0, 20)}
        {colorField("Màu viền", "border-color", "#a3a3a3")}
      </div>
    </aside>
  );
}
