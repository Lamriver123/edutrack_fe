"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { NoticeBanner } from "@/components/classes/classroom-ui";
import type { Notice } from "@/components/classes/classroom-types";

type NoticeContextType = {
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
  watchReceipt: (receiptId: string, receiptNumber: string) => void;
};

const NoticeContext = createContext<NoticeContextType | undefined>(undefined);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingReceipts, setPendingReceipts] = useState<Record<string, string>>({});

  const handleSetNotice = useCallback((newNotice: Notice | null) => {
    setNotice(newNotice);
  }, []);

  const watchReceipt = useCallback((receiptId: string, receiptNumber: string) => {
    setPendingReceipts((prev) => {
      if (prev[receiptId]) return prev;
      return { ...prev, [receiptId]: receiptNumber };
    });
  }, []);

  useEffect(() => {
    const pendingIds = Object.keys(pendingReceipts);
    if (pendingIds.length === 0) return;

    let isCurrent = true;
    const timer = setInterval(() => {
      pendingIds.forEach(async (id) => {
        try {
          const { schoolApi } = await import("@/lib/api/school");
          const receipt = await schoolApi.getReceiptDetail(id);
          if (!isCurrent) return;

          if (receipt.pdfStatus !== "pending") {
            setPendingReceipts((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
            setNotice({
              type: receipt.pdfStatus === "generated" ? "success" : "error",
              text:
                receipt.pdfStatus === "generated"
                  ? `Hóa đơn ${receipt.receiptNumber} đã được tạo PDF xong.`
                  : `Lỗi tạo PDF cho hóa đơn ${receipt.receiptNumber}. Bạn có thể tạo lại.`,
            });
          }
        } catch {
          // ignore transient errors
        }
      });
    }, 4000);

    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [pendingReceipts]);

  return (
    <NoticeContext.Provider value={{ notice, setNotice: handleSetNotice, watchReceipt }}>
      {children}
      {notice ? (
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      ) : null}
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error("useNotice must be used within NoticeProvider");
  }
  return context;
}
