"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/components/classes/classroom-utils";
import type { DashboardOverviewData } from "@/types/school";

export function YearlyRevenueChart({
  revenue,
}: {
  revenue: DashboardOverviewData["revenue"];
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(640);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const chartHeight = 250;
  const plotTop = 18;
  const plotBottom = 204;
  const plotHeight = plotBottom - plotTop;
  const left = chartWidth < 480 ? 48 : 64;
  const right = chartWidth < 480 ? 10 : 20;
  const plotWidth = chartWidth - left - right;
  const slotWidth = plotWidth / 12;
  const barWidth = Math.min(34, slotWidth * 0.52);
  const maxValue = Math.max(
    0,
    ...revenue.monthly.flatMap((item) => [
      item.collectedAmount,
      item.issuedAmount,
    ]),
  );
  const axisMax = getChartAxisMax(maxValue);
  const points = revenue.monthly
    .map((item, index) => {
      const x = left + slotWidth * index + slotWidth / 2;
      const y = plotBottom - (item.issuedAmount / axisMax) * plotHeight;
      return `${x},${y}`;
    })
    .join(" ");
  const collectedTotal = revenue.monthly.reduce(
    (sum, item) => sum + item.collectedAmount,
    0,
  );
  const issuedTotal = revenue.monthly.reduce(
    (sum, item) => sum + item.issuedAmount,
    0,
  );
  const hoveredIndex = revenue.monthly.findIndex(
    (item) => item.month === hoveredMonth,
  );
  const hoveredItem = hoveredIndex >= 0 ? revenue.monthly[hoveredIndex] : null;
  const hoveredX =
    hoveredIndex >= 0 ? left + slotWidth * hoveredIndex + slotWidth / 2 : left;

  let tooltipLeft = hoveredX - 95; // Tooltip width is 190px, so half is 95
  if (tooltipLeft < 4) tooltipLeft = 4;
  if (tooltipLeft + 190 > chartWidth - 4) tooltipLeft = chartWidth - 190 - 4;

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const updateWidth = (width: number) => {
      setChartWidth(Math.max(300, Math.floor(width)));
    };
    updateWidth(container.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="rounded-md border border-[#e8eaf2] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-extrabold text-[var(--brand-950)]">
              Biểu đồ doanh thu 12 tháng
            </h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-extrabold text-emerald-700">
              Năm {revenue.year}
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[var(--neutral-500)]">
            So sánh số tiền thực thu và tổng giá trị hóa đơn đã xuất
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-bold text-[var(--neutral-600)]">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            Đã thu {formatCompactMoney(collectedTotal)}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-3 bg-[var(--brand-500)]" />
            Đã xuất {formatCompactMoney(issuedTotal)}
          </span>
        </div>
      </div>

      <div
        className="relative mt-4 min-w-0 overflow-hidden"
        onMouseLeave={() => setHoveredMonth(null)}
        ref={chartContainerRef}
      >
        {hoveredItem ? (
          <div
            className="pointer-events-none absolute top-2 z-10 w-[190px] rounded-md border border-white/10 bg-[#111827] p-3 text-white shadow-[0_14px_32px_rgba(15,23,42,0.3)]"
            style={{ left: tooltipLeft }}
          >
            <p className="text-[13px] font-extrabold">
              Tháng {String(hoveredItem.month).padStart(2, "0")}/{revenue.year}
            </p>
            <div className="my-2 h-px bg-white/10" />
            <div className="grid gap-1.5 text-[12px] font-semibold">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Đã thu
                </span>
                <strong>{formatMoney(hoveredItem.collectedAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-indigo-300">
                  <span className="size-2 rounded-full bg-indigo-400" />
                  Đã xuất
                </span>
                <strong>{formatMoney(hoveredItem.issuedAmount)}</strong>
              </div>
            </div>
          </div>
        ) : null}
        <svg
          aria-label={`Biểu đồ doanh thu năm ${revenue.year}`}
          className="block h-[250px] w-full"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = plotBottom - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line
                  stroke="#e5e7eb"
                  strokeDasharray={ratio === 0 ? undefined : "4 5"}
                  x1={left}
                  x2={chartWidth - right}
                  y1={y}
                  y2={y}
                />
                <text
                  fill="#737373"
                  fontSize="12"
                  fontWeight="600"
                  textAnchor="end"
                  x={left - 10}
                  y={y + 4}
                >
                  {formatAxisMoney(axisMax * ratio)}
                </text>
              </g>
            );
          })}

          {hoveredIndex >= 0 ? (
            <g aria-hidden="true">
              <rect
                fill="rgba(99, 102, 241, 0.055)"
                height={plotHeight}
                rx="4"
                width={slotWidth}
                x={left + slotWidth * hoveredIndex}
                y={plotTop}
              />
              <line
                stroke="rgba(99, 102, 241, 0.42)"
                strokeDasharray="3 4"
                x1={hoveredX}
                x2={hoveredX}
                y1={plotTop}
                y2={plotBottom}
              />
            </g>
          ) : null}

          {revenue.monthly.map((item, index) => {
            const x = left + slotWidth * index + slotWidth / 2;
            const barHeight = (item.collectedAmount / axisMax) * plotHeight;
            return (
              <g key={item.month}>
                <rect
                  fill="#10b981"
                  height={barHeight}
                  rx="4"
                  width={barWidth}
                  x={x - barWidth / 2}
                  y={plotBottom - barHeight}
                >
                  <title>{`Tháng ${item.month}: Đã thu ${formatMoney(item.collectedAmount)}`}</title>
                </rect>
                <text
                  fill="#525252"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  x={x}
                  y={plotBottom + 26}
                >
                  T{item.month}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            points={points}
            stroke="var(--brand-500)"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {revenue.monthly.map((item, index) => {
            const x = left + slotWidth * index + slotWidth / 2;
            const y = plotBottom - (item.issuedAmount / axisMax) * plotHeight;
            return (
              <circle
                cx={x}
                cy={y}
                fill="white"
                key={item.month}
                r="4"
                stroke="var(--brand-600)"
                strokeWidth="3"
              >
                <title>{`Tháng ${item.month}: Đã xuất ${formatMoney(item.issuedAmount)}`}</title>
              </circle>
            );
          })}

          {revenue.monthly.map((item, index) => (
            <rect
              aria-label={`Tháng ${item.month}: đã thu ${formatMoney(item.collectedAmount)}, đã xuất ${formatMoney(item.issuedAmount)}`}
              fill="transparent"
              height={plotHeight + 28}
              key={item.month}
              onBlur={() => setHoveredMonth(null)}
              onFocus={() => setHoveredMonth(item.month)}
              onMouseEnter={() => setHoveredMonth(item.month)}
              role="button"
              tabIndex={0}
              width={slotWidth}
              x={left + slotWidth * index}
              y={plotTop}
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

function getChartAxisMax(value: number) {
  if (value <= 0) return 1_000_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return rounded * magnitude;
}

function formatAxisMoney(value: number) {
  if (value === 0) return "0";
  if (value >= 1_000_000_000) {
    return `${trimDecimal(value / 1_000_000_000)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)} tr`;
  }
  if (value >= 1_000) {
    return `${trimDecimal(value / 1_000)} k`;
  }
  return Math.round(value).toLocaleString("vi-VN");
}

function formatCompactMoney(value: number) {
  return `${formatAxisMoney(value)} VNĐ`;
}

function trimDecimal(value: number) {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  });
}
