"use client";

import dynamic from "next/dynamic";

const InvoiceDesigner = dynamic(() => import("./invoice-designer"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="grid h-dvh place-items-center text-sm text-neutral-500"
    >
      Đang mở mẫu hóa đơn...
    </div>
  ),
});

export function InvoiceDesignerLoader() {
  return <InvoiceDesigner />;
}
