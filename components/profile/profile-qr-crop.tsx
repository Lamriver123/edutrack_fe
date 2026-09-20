"use client";

import { Crop } from "lucide-react";
import {
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";

const MIN_QR_CROP_SIDE_PERCENT = 22;

export type QrCropState = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type QrCropDragMode =
  | "move"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type QrCropDragState = {
  containerHeight: number;
  containerWidth: number;
  crop: QrCropState;
  mode: QrCropDragMode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
};

export function QrCropBox({
  crop,
  onChange,
}: {
  crop: QrCropState;
  onChange: (crop: QrCropState) => void;
}) {
  const normalizedCrop = normalizeQrCrop(crop);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<QrCropDragState | null>(null);

  function startDrag(
    mode: QrCropDragMode,
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const overlay = overlayRef.current;

    if (!overlay) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = overlay.getBoundingClientRect();
    overlay.setPointerCapture(event.pointerId);
    dragRef.current = {
      containerHeight: rect.height,
      containerWidth: rect.width,
      crop: normalizedCrop,
      mode,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX =
      ((event.clientX - drag.startClientX) / drag.containerWidth) * 100;
    const deltaY =
      ((event.clientY - drag.startClientY) / drag.containerHeight) * 100;

    onChange(resizeQrCrop(drag.crop, drag.mode, deltaX, deltaY));
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const overlay = overlayRef.current;

    if (overlay?.hasPointerCapture(event.pointerId)) {
      overlay.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  }

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      onPointerCancel={stopDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      ref={overlayRef}
    >
      <div
        aria-label="Di chuyển vùng cắt ảnh QR"
        className="absolute cursor-move rounded-lg border-2 border-white shadow-[0_0_0_999px_rgba(15,23,42,0.36),0_10px_26px_rgba(15,23,42,0.2)] ring-2 ring-[var(--brand-400)]"
        onPointerDown={(event) => startDrag("move", event)}
        role="button"
        style={{
          height: `${normalizedCrop.height}%`,
          left: `${normalizedCrop.x}%`,
          top: `${normalizedCrop.y}%`,
          width: `${normalizedCrop.width}%`,
        }}
        tabIndex={0}
      >
        <span className="pointer-events-none absolute left-1/3 top-0 h-full w-px bg-white/45" />
        <span className="pointer-events-none absolute left-2/3 top-0 h-full w-px bg-white/45" />
        <span className="pointer-events-none absolute left-0 top-1/3 h-px w-full bg-white/45" />
        <span className="pointer-events-none absolute left-0 top-2/3 h-px w-full bg-white/45" />
        <CropHandle mode="top" onPointerDown={startDrag} />
        <CropHandle mode="right" onPointerDown={startDrag} />
        <CropHandle mode="bottom" onPointerDown={startDrag} />
        <CropHandle mode="left" onPointerDown={startDrag} />
        <CropHandle mode="top-left" onPointerDown={startDrag} />
        <CropHandle mode="top-right" onPointerDown={startDrag} />
        <CropHandle mode="bottom-left" onPointerDown={startDrag} />
        <CropHandle mode="bottom-right" onPointerDown={startDrag} />
      </div>
    </div>
  );
}

function CropHandle({
  mode,
  onPointerDown,
}: {
  mode: QrCropDragMode;
  onPointerDown: (
    mode: QrCropDragMode,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void;
}) {
  const isCorner = mode.includes("-");
  const className = isCorner
    ? getCornerHandleClassName(mode)
    : getEdgeHandleClassName(mode);

  return (
    <button
      aria-label={`Kéo cạnh ${getCropHandleLabel(mode)}`}
      className={className}
      onPointerDown={(event) => onPointerDown(mode, event)}
      type="button"
    >
      <span className="sr-only">{getCropHandleLabel(mode)}</span>
    </button>
  );
}

export function QrCropToolbar({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--brand-100)] bg-[var(--brand-50)]/60 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[13px] font-extrabold text-[var(--brand-700)]">
        <Crop size={15} />
        Cắt xén trước khi lưu
      </div>
      <button
        className="h-8 rounded-lg bg-white px-3 text-[12px] font-extrabold text-[var(--neutral-600)] shadow-[var(--shadow-sm)] transition hover:text-[var(--brand-700)]"
        onClick={onReset}
        type="button"
      >
        Đặt lại
      </button>
    </div>
  );
}

function getEdgeHandleClassName(mode: QrCropDragMode) {
  const baseClassName =
    "absolute z-30 rounded-full border-2 border-white bg-[var(--brand-500)] shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  switch (mode) {
    case "top":
      return `${baseClassName} left-1/2 top-0 h-3 w-14 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize`;
    case "right":
      return `${baseClassName} right-0 top-1/2 h-14 w-3 -translate-y-1/2 translate-x-1/2 cursor-ew-resize`;
    case "bottom":
      return `${baseClassName} bottom-0 left-1/2 h-3 w-14 -translate-x-1/2 translate-y-1/2 cursor-ns-resize`;
    case "left":
      return `${baseClassName} left-0 top-1/2 h-14 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize`;
    default:
      return baseClassName;
  }
}

function getCornerHandleClassName(mode: QrCropDragMode) {
  const baseClassName =
    "absolute z-40 size-5 rounded-full border-2 border-white bg-[var(--brand-600)] shadow-[0_4px_14px_rgba(79,70,229,0.35)] transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  switch (mode) {
    case "top-left":
      return `${baseClassName} left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize`;
    case "top-right":
      return `${baseClassName} right-0 top-0 -translate-y-1/2 translate-x-1/2 cursor-nesw-resize`;
    case "bottom-left":
      return `${baseClassName} bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize`;
    case "bottom-right":
      return `${baseClassName} bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize`;
    default:
      return baseClassName;
  }
}

function getCropHandleLabel(mode: QrCropDragMode) {
  const labels: Record<QrCropDragMode, string> = {
    bottom: "dưới",
    "bottom-left": "góc dưới trái",
    "bottom-right": "góc dưới phải",
    left: "trái",
    move: "vùng cắt",
    right: "phải",
    top: "trên",
    "top-left": "góc trên trái",
    "top-right": "góc trên phải",
  };

  return labels[mode];
}

export function normalizeQrCrop(crop: QrCropState): QrCropState {
  const width = clampNumber(crop.width, MIN_QR_CROP_SIDE_PERCENT, 100);
  const height = clampNumber(crop.height, MIN_QR_CROP_SIDE_PERCENT, 100);

  return {
    height,
    width,
    x: clampNumber(crop.x, 0, 100 - width),
    y: clampNumber(crop.y, 0, 100 - height),
  };
}

function resizeQrCrop(
  crop: QrCropState,
  mode: QrCropDragMode,
  deltaX: number,
  deltaY: number,
) {
  if (mode === "move") {
    return normalizeQrCrop({
      ...crop,
      x: crop.x + deltaX,
      y: crop.y + deltaY,
    });
  }

  let nextX = crop.x;
  let nextY = crop.y;
  let nextWidth = crop.width;
  let nextHeight = crop.height;

  if (mode.includes("left")) {
    const right = crop.x + crop.width;
    nextX = clampNumber(
      crop.x + deltaX,
      0,
      right - MIN_QR_CROP_SIDE_PERCENT,
    );
    nextWidth = right - nextX;
  }

  if (mode.includes("right")) {
    nextWidth = clampNumber(
      crop.width + deltaX,
      MIN_QR_CROP_SIDE_PERCENT,
      100 - crop.x,
    );
  }

  if (mode.includes("top")) {
    const bottom = crop.y + crop.height;
    nextY = clampNumber(
      crop.y + deltaY,
      0,
      bottom - MIN_QR_CROP_SIDE_PERCENT,
    );
    nextHeight = bottom - nextY;
  }

  if (mode.includes("bottom")) {
    nextHeight = clampNumber(
      crop.height + deltaY,
      MIN_QR_CROP_SIDE_PERCENT,
      100 - crop.y,
    );
  }

  return normalizeQrCrop({
    height: nextHeight,
    width: nextWidth,
    x: nextX,
    y: nextY,
  });
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
