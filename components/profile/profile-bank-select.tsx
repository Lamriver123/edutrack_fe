/* eslint-disable @next/next/no-img-element */

"use client";

import { Landmark, LoaderCircle } from "lucide-react";
import { SelectPicker } from "@/components/ui/select-picker";
import type { PaymentBank } from "@/types/user";

export function ProfileBankSelect({
  banks,
  disabled,
  isLoading,
  onChange,
  value,
}: {
  banks: PaymentBank[];
  disabled: boolean;
  isLoading: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        Ngân hàng
      </span>
      <SelectPicker
        ariaLabel="Chọn ngân hàng nhận học phí"
        disabled={disabled}
        leadingIcon={
          isLoading ? (
            <LoaderCircle className="animate-spin" size={16} />
          ) : (
            <Landmark size={16} />
          )
        }
        onChange={onChange}
        options={[
          {
            icon: <Landmark size={17} />,
            label: "Chưa chọn ngân hàng",
            value: "",
          },
          ...banks.map((bank) => ({
            description: `${bank.name} · BIN ${bank.bin}`,
            icon: bank.logo ? (
              <img
                alt=""
                className="size-15 rounded-sm object-contain"
                src={bank.logo}
              />
            ) : (
              <Landmark size={17} />
            ),
            label: bank.shortName,
            searchText: `${bank.name} ${bank.code} ${bank.bin}`,
            value: bank.bin,
          })),
        ]}
        placeholder={isLoading ? "Đang tải ngân hàng..." : "Chọn ngân hàng"}
        searchable
        searchEmptyText="Không tìm thấy ngân hàng phù hợp."
        searchPlaceholder="Tìm tên, mã ngân hàng hoặc BIN..."
        value={value}
      />
    </div>
  );
}
