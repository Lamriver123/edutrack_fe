import type { LucideIcon } from "lucide-react";

type FeaturePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
};

export function FeaturePlaceholder({
  description,
  eyebrow,
  icon: Icon,
  items,
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

      <section className="rounded-lg border border-[var(--neutral-200)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:items-start">
          <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-[var(--neutral-300)] bg-[var(--neutral-50)] p-6 text-center">
            <div>
              <div className="mx-auto grid size-14 place-items-center rounded-lg bg-white text-[var(--brand-600)] shadow-[var(--shadow-sm)]">
                <Icon size={24} />
              </div>
              <h3 className="mt-4 text-[17px] font-extrabold text-[var(--brand-950)]">
                Đã tách route
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-[var(--neutral-500)]">
                Nghiệp vụ chi tiết sẽ được nối vào khu vực này.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {items.map((item, index) => (
              <div
                className="grid grid-cols-[38px_1fr] items-start gap-3 rounded-lg border border-[var(--neutral-200)] bg-[var(--neutral-50)] p-3.5"
                key={item}
              >
                <span className="grid size-[38px] place-items-center rounded-lg bg-white text-[13px] font-extrabold text-[var(--brand-600)] shadow-[var(--shadow-sm)]">
                  {index + 1}
                </span>
                <p className="text-[14px] font-semibold leading-6 text-[var(--neutral-600)]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
