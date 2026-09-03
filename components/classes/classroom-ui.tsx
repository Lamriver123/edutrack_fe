/* eslint-disable @next/next/no-img-element */

"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import type { Notice } from "./classroom-types";
import styles from "./classroom-manager.module.css";

export function Modal({
  children,
  onClose,
  size = "default",
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  size?: "default" | "sm";
  title: string;
}) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
      <div
        className={`${styles.modalPanel} ${
          size === "sm" ? styles.modalPanelSm : ""
        }`}
      >
        <div className="flex min-h-[72px] items-center justify-between gap-3 border-b border-[var(--neutral-200)] px-5 py-4">
          <h3 className="truncate text-[20px] font-extrabold text-[var(--brand-950)]">
            {title}
          </h3>
          <button
            aria-label="Đóng"
            className="grid size-11 place-items-center rounded-lg border border-[var(--neutral-200)] text-[var(--neutral-500)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-600)]"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  cancelText = "Hủy",
  confirmText = "Đồng ý",
  description,
  icon,
  isLoading = false,
  onCancel,
  onConfirm,
  title,
  tone = "default",
}: {
  cancelText?: string;
  confirmText?: string;
  description: string;
  icon?: ReactNode;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <Modal
      onClose={isLoading ? () => undefined : onCancel}
      size="sm"
      title={title}
    >
      <div className={styles.confirmDialog}>
        <span className={styles.confirmIcon} data-tone={tone}>
          {icon ?? <AlertCircle size={22} />}
        </span>
        <p className={styles.confirmDescription}>{description}</p>
        <div className={styles.confirmActions}>
          <SecondaryAction
            className={styles.confirmActionButton}
            disabled={isLoading}
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </SecondaryAction>
          {tone === "danger" ? (
            <button
              className={styles.confirmDangerButton}
              disabled={isLoading}
              onClick={onConfirm}
              type="button"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : null}
              {confirmText}
            </button>
          ) : (
            <PrimaryAction
              className={styles.confirmActionButton}
              disabled={isLoading}
              icon={
                isLoading ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : undefined
              }
              onClick={onConfirm}
              type="button"
            >
              {confirmText}
            </PrimaryAction>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function NoticeBanner({
  durationMs = 3500,
  notice,
  onClose,
}: {
  durationMs?: number;
  notice: Notice;
  onClose?: () => void;
}) {
  const isSuccess = notice.type === "success";
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!closeRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      closeRef.current?.();
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [durationMs, notice.text, notice.type]);

  return (
    <div
      className={`fixed right-4 top-4 z-[90] flex w-[min(calc(100vw-32px),560px)] animate-slide-up items-start gap-3 rounded-lg border px-4 py-3.5 text-[14px] font-semibold shadow-[var(--shadow-xl)] backdrop-blur-xl ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
          : "border-red-200 bg-red-50/95 text-red-800"
      }`}
      role={isSuccess ? "status" : "alert"}
    >
      <span className="mt-0.5 shrink-0">
        {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      </span>
      <span className="min-w-0 flex-1 break-words leading-6">
        {notice.text}
      </span>
      {onClose ? (
        <button
          aria-label="Đóng thông báo"
          className={`-mr-1 grid size-7 shrink-0 place-items-center rounded-lg transition ${
            isSuccess
              ? "text-emerald-700 hover:bg-emerald-100"
              : "text-red-700 hover:bg-red-100"
          }`}
          onClick={onClose}
          type="button"
        >
          <X size={15} />
        </button>
      ) : null}
    </div>
  );
}

export function InlineLoading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] px-4 py-5 text-[14px] font-semibold text-[var(--neutral-500)]">
      <LoaderCircle className="animate-spin text-[var(--brand-500)]" size={17} />
      {text}
    </div>
  );
}

export function EmptyState({
  action,
  icon,
  text,
  title,
}: {
  action?: ReactNode;
  icon: ReactNode;
  text: string;
  title?: string;
}) {
  return (
    <div className="grid min-h-[150px] place-items-center rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)] px-4 py-7 text-center">
      <div>
        <div className="mx-auto grid size-11 place-items-center rounded-lg bg-white text-[var(--brand-500)] shadow-[var(--shadow-sm)]">
          {icon}
        </div>
        {title ? (
          <h3 className="mt-3 text-[15px] font-bold text-[var(--brand-950)]">
            {title}
          </h3>
        ) : null}
        <p className="mx-auto mt-2 max-w-sm text-[14px] font-semibold leading-6 text-[var(--neutral-500)]">
          {text}
        </p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}

export function TextInput({
  icon,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <span className="relative">
        {icon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--neutral-400)]">
            {icon}
          </span>
        ) : null}
        <input
          className={`h-12 w-full rounded-lg border border-[var(--neutral-200)] bg-white px-4 text-[15px] font-medium text-[var(--neutral-800)] outline-none transition placeholder:text-[var(--neutral-400)] hover:border-[var(--brand-200)] focus:border-[var(--brand-400)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)] ${
            icon ? "pl-11" : ""
          }`}
          {...props}
        />
      </span>
    </label>
  );
}

export function TextArea({
  icon,
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  icon?: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[14px] font-bold text-[var(--neutral-600)]">
        {label}
      </span>
      <span className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-3.5 top-3.5 text-[var(--neutral-400)]">
            {icon}
          </span>
        ) : null}
        <textarea
          className={`min-h-[104px] w-full resize-y rounded-lg border border-[var(--neutral-200)] bg-white px-4 py-3.5 text-[15px] font-medium text-[var(--neutral-800)] outline-none transition placeholder:text-[var(--neutral-400)] hover:border-[var(--brand-200)] focus:border-[var(--brand-400)] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)] ${
            icon ? "pl-11" : ""
          }`}
          {...props}
        />
      </span>
    </label>
  );
}

export function PrimaryAction({
  children,
  className = "",
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[var(--brand-500)] to-[var(--brand-700)] px-5 text-[14px] font-bold text-white shadow-[var(--shadow-brand)] transition hover:from-[var(--brand-400)] hover:to-[var(--brand-600)] disabled:pointer-events-none disabled:from-[var(--neutral-300)] disabled:to-[var(--neutral-400)] ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function SecondaryAction({
  children,
  className = "",
  icon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
}) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--neutral-200)] bg-white px-5 text-[14px] font-bold text-[var(--neutral-700)] transition hover:border-[var(--brand-200)] hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] disabled:pointer-events-none disabled:bg-[var(--neutral-100)] disabled:text-[var(--neutral-400)] ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

export function StudentAvatar({
  alt,
  size = "md",
  src,
}: {
  alt: string;
  size?: "sm" | "md" | "lg";
  src: string;
}) {
  const sizeClass =
    size === "lg" ? "size-16" : size === "sm" ? "size-10" : "size-12";

  return (
    <img
      alt={alt}
      className={`${sizeClass} rounded-lg border border-[var(--neutral-200)] object-cover`}
      src={src}
    />
  );
}
