"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { NoticeBanner } from "@/components/classes/classroom-ui";
import type { Notice } from "@/components/classes/classroom-types";

const RECEIPT_POLL_INTERVAL_MS = 4000;
const RECEIPT_POLL_TIMEOUT_MS = 5 * 60 * 1000;

type PendingReceipt = {
  receiptNumber: string;
  startedAt: number;
};

type NoticeContextType = {
  notice: Notice | null;
  setNotice: (notice: Notice | null) => void;
  unwatchReceipt: (receiptId: string) => void;
  watchReceipt: (receiptId: string, receiptNumber: string) => void;
};

const NoticeContext = createContext<NoticeContextType | undefined>(undefined);

export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingReceipts, setPendingReceipts] = useState<
    Record<string, PendingReceipt>
  >({});

  const handleSetNotice = useCallback((newNotice: Notice | null) => {
    setNotice(newNotice);
  }, []);

  const watchReceipt = useCallback((receiptId: string, receiptNumber: string) => {
    setPendingReceipts((prev) => {
      if (prev[receiptId]) return prev;
      return {
        ...prev,
        [receiptId]: { receiptNumber, startedAt: Date.now() },
      };
    });
  }, []);

  const unwatchReceipt = useCallback((receiptId: string) => {
    setPendingReceipts((prev) => {
      if (!prev[receiptId]) return prev;

      const next = { ...prev };
      delete next[receiptId];
      return next;
    });
  }, []);

  useEffect(() => {
    const pendingEntries = Object.entries(pendingReceipts);
    if (pendingEntries.length === 0) return;

    let isCurrent = true;
    let isPolling = false;

    const pollReceipts = async () => {
      if (isPolling || document.visibilityState === "hidden") return;

      isPolling = true;

      try {
        await Promise.all(
          pendingEntries.map(async ([id, pendingReceipt]) => {
            const hasTimedOut =
              Date.now() - pendingReceipt.startedAt >= RECEIPT_POLL_TIMEOUT_MS;

            try {
              const { schoolApi } = await import("@/lib/api/school");
              const receipt = await schoolApi.getReceiptDetail(id);
              if (!isCurrent) return;

              if (receipt.paymentStatus === "cancelled") {
                unwatchReceipt(id);
                return;
              }

              if (receipt.pdfStatus !== "pending") {
                unwatchReceipt(id);
                setNotice({
                  type: receipt.pdfStatus === "generated" ? "success" : "error",
                  text:
                    receipt.pdfStatus === "generated"
                      ? `Hóa đơn ${receipt.receiptNumber} đã được tạo PDF xong.`
                      : `Lỗi tạo PDF cho hóa đơn ${receipt.receiptNumber}. Bạn có thể tạo lại.`,
                });
                return;
              }

              if (hasTimedOut) {
                unwatchReceipt(id);
                setNotice({
                  type: "error",
                  text: `Hóa đơn ${pendingReceipt.receiptNumber} tạo PDF quá lâu. Bạn có thể thử tạo lại PDF.`,
                });
              }
            } catch {
              if (isCurrent && hasTimedOut) {
                unwatchReceipt(id);
                setNotice({
                  type: "error",
                  text: `Không thể kiểm tra PDF của hóa đơn ${pendingReceipt.receiptNumber}. Vui lòng thử lại sau.`,
                });
              }
            }
          }),
        );
      } finally {
        isPolling = false;
      }
    };

    const timer = window.setInterval(() => {
      void pollReceipts();
    }, RECEIPT_POLL_INTERVAL_MS);

    return () => {
      isCurrent = false;
      window.clearInterval(timer);
    };
  }, [pendingReceipts, unwatchReceipt]);

  return (
    <NoticeContext.Provider
      value={{
        notice,
        setNotice: handleSetNotice,
        unwatchReceipt,
        watchReceipt,
      }}
    >
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
