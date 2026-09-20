"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, Pencil, RefreshCw } from "lucide-react";
import { invoiceTemplateApi } from "@/lib/api/invoice-template";
import type { InvoiceTemplate } from "@/types/invoice-template";
import { SecondaryAction } from "./classroom-ui";

export function ReceiptTemplatePicker({
  value,
  onChange,
  disabled,
}: {
  value: InvoiceTemplate | null;
  onChange: (template: InvoiceTemplate | null) => void;
  disabled: boolean;
}) {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const previousId = useRef<string | undefined>(undefined);
  const reload = () => {
    previousId.current = value?.id;
    setError("");
    setLoading(true);
    onChange(null);
    setAttempt((current) => current + 1);
  };
  useEffect(() => {
    const controller = new AbortController();
    invoiceTemplateApi
      .list(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        const preferred =
          items.find((item) => item.id === previousId.current) ??
          items.find((item) => item.type === "CUSTOM" && item.isDefault) ??
          items.find((item) => item.type === "SYSTEM" && item.isDefault) ??
          items[0];
        if (!preferred) throw new Error("Không tìm thấy mẫu hóa đơn.");
        setTemplates(items);
        onChange(preferred);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải mẫu hóa đơn.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt, onChange]);

  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex min-w-0 items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-2 text-sm font-bold text-[var(--neutral-700)]">
          <span className="flex items-center gap-2">
            <FileText size={16} />
            Mẫu hóa đơn
          </span>
          <span className="relative block min-w-0">
            <select
              className="h-12 w-full min-w-0 appearance-none rounded-lg border border-[var(--neutral-200)] bg-white py-0 pl-3.5 pr-10 text-[15px] font-extrabold text-[var(--neutral-800)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow,color] duration-200 hover:border-[var(--brand-400)] focus:border-[var(--brand-400)] focus:text-[var(--brand-900)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:cursor-not-allowed disabled:bg-[var(--neutral-50)] disabled:opacity-60"
              disabled={disabled || loading || Boolean(error)}
              value={value?.id ?? ""}
              onChange={(event) =>
                onChange(
                  templates.find((item) => item.id === event.target.value) ??
                    null,
                )
              }
            >
              {!value && (
                <option value="">
                  {loading ? "Đang tải mẫu..." : "Chưa chọn mẫu"}
                </option>
              )}
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.type === "SYSTEM" ? "Mẫu hệ thống" : item.name} · V
                  {item.version}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-400)]"
              size={18}
            />
          </span>
        </label>
        <button
          type="button"
          onClick={reload}
          disabled={disabled || loading}
          className="grid size-12 shrink-0 place-items-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-600)] transition hover:border-[var(--brand-200)] hover:bg-[var(--neutral-50)] focus-visible:border-[var(--brand-400)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:opacity-50"
          title="Tải lại danh sách mẫu"
          aria-label="Tải lại danh sách mẫu"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
        <a
          className="grid size-12 shrink-0 place-items-center rounded-lg border border-[var(--neutral-200)] text-[var(--brand-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] focus-visible:border-[var(--brand-400)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]"
          href="/settings/invoice-template"
          target="_blank"
          rel="noopener noreferrer"
          title="Chỉnh sửa mẫu hóa đơn"
          aria-label="Chỉnh sửa mẫu hóa đơn"
        >
          <Pencil size={17} />
        </a>
      </div>
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <SecondaryAction
            icon={<RefreshCw size={15} />}
            disabled={disabled}
            onClick={reload}
          >
            Tải lại mẫu
          </SecondaryAction>
        </div>
      )}
    </div>
  );
}
