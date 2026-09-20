"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type SelectPickerOption = {
  icon?: ReactNode;
  label: string;
  tone?: "default" | "success" | "warning" | "danger";
  value: string;
};

export function SelectPicker({
  ariaLabel,
  disabled = false,
  leadingIcon,
  onChange,
  options,
  placeholder = "Chọn giá trị",
  value,
  variant = "form",
}: {
  ariaLabel: string;
  disabled?: boolean;
  leadingIcon?: ReactNode;
  onChange: (value: string) => void;
  options: SelectPickerOption[];
  placeholder?: string;
  value: string;
  variant?: "form" | "toolbar";
}) {
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({
    bottom: undefined as number | undefined,
    left: 0,
    top: undefined as number | undefined,
    width: 0,
    maxHeight: 280,
  });
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = options[selectedIndex];
  const selectedIcon = selectedOption?.icon ?? leadingIcon;

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 6;
      const availableBelow = window.innerHeight - rect.bottom - gap - 12;
      const availableAbove = rect.top - gap - 12;
      const openAbove = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(
        120,
        Math.min(280, openAbove ? availableAbove : availableBelow),
      );
      setMenuPosition({
        bottom: openAbove ? window.innerHeight - rect.top + gap : undefined,
        left: Math.max(
          12,
          Math.min(rect.left, window.innerWidth - rect.width - 12),
        ),
        top: openAbove ? undefined : rect.bottom + gap,
        width: rect.width,
        maxHeight,
      });
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        triggerRef.current?.contains(target) ||
        optionRefs.current.some((option) => option?.contains(target))
      )
        return;
      setIsOpen(false);
    };

    updatePosition();
    document.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const focusTimer = window.setTimeout(
      () => optionRefs.current[Math.max(0, selectedIndex)]?.focus(),
      0,
    );
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, selectedIndex]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + options.length) % options.length;
    optionRefs.current[nextIndex]?.focus();
  }

  const toolbar = variant === "toolbar";

  return (
    <>
      <button
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`flex min-w-0 items-center justify-between gap-2 rounded-md border outline-none transition ${
          toolbar
            ? "h-9 w-full border-[#dedee3] bg-[#fafafa] px-2.5 text-xs font-semibold text-[#52525b] hover:border-teal-400 focus-visible:border-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500/20"
            : `h-12 w-full px-3.5 text-[14px] font-bold shadow-[var(--shadow-xs)] focus-visible:ring-3 ${getTriggerToneClass(
                selectedOption?.tone,
              )}`
        } disabled:cursor-not-allowed disabled:bg-[var(--neutral-50)] disabled:opacity-60`}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedIcon ? (
            <span className="shrink-0">{selectedIcon}</span>
          ) : null}
          <span className="truncate">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 opacity-60 transition-transform ${isOpen ? "rotate-180" : ""}`}
          size={toolbar ? 15 : 18}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            className="fixed z-[1000] grid overflow-y-auto rounded-md border border-[var(--border-strong)] bg-white p-1.5 shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
            id={listboxId}
            role="listbox"
            style={{
              left: menuPosition.left,
              maxHeight: menuPosition.maxHeight,
              top: menuPosition.top,
              bottom: menuPosition.bottom,
              width: menuPosition.width,
            }}
          >
            {options.map((option, index) => {
              const selected = option.value === value;
              return (
                <button
                  aria-selected={selected}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-bold outline-none transition ${getOptionToneClass(
                    option.tone,
                    selected,
                  )}`}
                  key={option.value}
                  onClick={() => choose(option.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.icon ? (
                      <span className="shrink-0">{option.icon}</span>
                    ) : null}
                    <span className="min-w-0 break-words">{option.label}</span>
                  </span>
                  {selected ? <Check className="shrink-0" size={16} /> : null}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

function getTriggerToneClass(tone?: SelectPickerOption["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:border-emerald-300 focus-visible:border-emerald-400 focus-visible:ring-emerald-500/10";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50/70 text-amber-700 hover:border-amber-300 focus-visible:border-amber-400 focus-visible:ring-amber-500/10";
  }

  if (tone === "danger") {
    return "border-red-200 bg-red-50/70 text-red-700 hover:border-red-300 focus-visible:border-red-400 focus-visible:ring-red-500/10";
  }

  return "border-[var(--border-strong)] bg-white text-[var(--neutral-800)] hover:border-[var(--brand-300)] focus-visible:border-[var(--brand-400)] focus-visible:text-[var(--brand-900)] focus-visible:ring-[rgba(99,102,241,0.1)]";
}

function getOptionToneClass(
  tone: SelectPickerOption["tone"],
  selected: boolean,
) {
  if (selected) {
    if (tone === "success") {
      return "bg-emerald-600 text-white";
    }

    if (tone === "warning") {
      return "bg-amber-500 text-white";
    }

    if (tone === "danger") {
      return "bg-red-600 text-white";
    }

    return "bg-[var(--brand-600)] text-white";
  }

  if (tone === "success") {
    return "text-emerald-700 hover:bg-emerald-50 focus-visible:bg-emerald-50";
  }

  if (tone === "warning") {
    return "text-amber-700 hover:bg-amber-50 focus-visible:bg-amber-50";
  }

  if (tone === "danger") {
    return "text-red-700 hover:bg-red-50 focus-visible:bg-red-50";
  }

  return "text-[var(--neutral-700)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-800)] focus-visible:bg-[var(--brand-50)] focus-visible:text-[var(--brand-800)]";
}
