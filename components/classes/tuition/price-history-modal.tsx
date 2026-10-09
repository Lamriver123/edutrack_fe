"use client";

import { Coins, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { schoolApi } from "@/lib/api/school";
import type { ClassPriceHistoryEntry } from "@/types/school";
import {
  EmptyState,
  InlineLoading,
  Modal,
  SecondaryAction,
} from "../classroom-ui";
import {
  formatMoney,
  getErrorMessage,
  toVietnamDateInputValue,
} from "../classroom-utils";
import { formatDateInput } from "./receipt-dialogs";

export function PriceHistoryModal({
  classId,
  className,
  onClose,
}: {
  classId: string;
  className: string;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<ClassPriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    schoolApi
      .getClassPriceHistory(classId)
      .then((data) => {
        if (active) setVersions(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(getErrorMessage(cause));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, attempt]);

  return (
    <Modal onClose={onClose} title="Lịch sử học phí">
      <div className="grid min-w-0 gap-4">
        <p className="text-[14px] font-semibold text-[var(--neutral-600)]">
          Mức giá theo ngày áp dụng của lớp {className}.
        </p>
        {isLoading ? (
          <InlineLoading text="Đang tải lịch sử học phí..." />
        ) : error ? (
          <div className="grid gap-3">
            <p className="text-[14px] text-red-600" role="alert">
              {error}
            </p>
            <SecondaryAction
              icon={<RefreshCw size={16} />}
              onClick={() => {
                setError("");
                setIsLoading(true);
                setAttempt((value) => value + 1);
              }}
              type="button"
            >
              Thử lại
            </SecondaryAction>
          </div>
        ) : versions.length ? (
          <div className="grid gap-3">
            {versions.map((version, index) => (
              <article
                className="grid min-w-0 grid-cols-2 gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-4 sm:grid-cols-3"
                key={version.id ?? `initial-${index}`}
              >
                <div className="col-span-2 min-w-0 sm:col-span-1">
                  <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                    Ngày áp dụng
                  </p>
                  <strong className="text-[14px] text-[var(--neutral-800)]">
                    {version.effectiveFrom
                      ? formatDateInput(
                          toVietnamDateInputValue(version.effectiveFrom),
                        )
                      : "Giá ban đầu"}
                  </strong>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                    Buổi thường
                  </p>
                  <strong className="text-[14px] text-[var(--brand-800)]">
                    {formatMoney(version.regularPrice)}
                  </strong>
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--neutral-500)]">
                    Học kèm 1:1
                  </p>
                  <strong className="text-[14px] text-cyan-800">
                    {formatMoney(version.makeupPrice)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Coins size={24} />}
            title="Chưa có lịch sử học phí"
            text="Các mức giá sẽ hiển thị tại đây khi được lưu."
          />
        )}
      </div>
    </Modal>
  );
}
