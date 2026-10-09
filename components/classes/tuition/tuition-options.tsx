"use client";

import { ChevronDown, History, Settings2 } from "lucide-react";
import { useEffect, useRef } from "react";

export function TuitionOptions({
  onPriceHistory,
}: {
  onPriceHistory: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const details = detailsRef.current;
      if (details && !details.contains(event.target as Node))
        details.open = false;
    }
    function closeOnEscape(event: KeyboardEvent) {
      const details = detailsRef.current;
      if (event.key === "Escape" && details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details className="relative" ref={detailsRef}>
      <summary className="inline-flex h-12 cursor-pointer list-none items-center gap-2 rounded-md border border-[var(--neutral-200)] bg-white px-4 text-[14px] font-bold text-[var(--neutral-700)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--neutral-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] [&::-webkit-details-marker]:hidden">
        <Settings2 size={16} />
        Tùy chọn
        <ChevronDown size={16} />
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-56 max-w-[calc(100vw-32px)] rounded-lg border border-[var(--neutral-200)] bg-white p-1.5 shadow-lg">
        <button
          className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[14px] font-semibold text-[var(--neutral-700)] hover:bg-[var(--brand-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]"
          onClick={() => {
            if (detailsRef.current) detailsRef.current.open = false;
            onPriceHistory();
          }}
          type="button"
        >
          <History size={16} />
          Lịch sử học phí
        </button>
      </div>
    </details>
  );
}
