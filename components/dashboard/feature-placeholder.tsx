import type { LucideIcon } from "lucide-react";

type FeaturePlaceholderProps = {
  emptyText: string;
  emptyTitle: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function FeaturePlaceholder({
  description,
  emptyText,
  emptyTitle,
  eyebrow,
  icon: Icon,
  title,
}: FeaturePlaceholderProps) {
  return (
    <section className="grid gap-5">
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-[var(--brand-600)]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-[26px] font-extrabold leading-tight text-[var(--brand-950)]">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--neutral-500)]">
          {description}
        </p>
      </div>

      <section className="grid min-h-[320px] place-items-center rounded-md border border-[var(--border)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
        <div className="max-w-md">
          <div className="mx-auto grid size-14 place-items-center rounded-md border border-[var(--border)] bg-[var(--brand-50)] text-[var(--brand-600)]">
            <Icon size={24} />
          </div>
          <h3 className="mt-4 text-[18px] font-extrabold text-[var(--brand-950)]">
            {emptyTitle}
          </h3>
          <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)]">
            {emptyText}
          </p>
        </div>
      </section>
    </section>
  );
}
