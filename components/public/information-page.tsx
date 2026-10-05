import type { ReactNode } from "react";

export function InformationPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-10">
        <p className="mb-3 text-sm font-semibold text-[var(--brand-600)]">EduTrack Backup</p>
        <h1 className="text-3xl font-bold leading-tight text-[var(--neutral-900)] sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base leading-8 text-[var(--neutral-600)]">{description}</p>
      </header>
      <div className="space-y-8 text-base leading-8 text-[var(--neutral-600)] [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--neutral-900)] [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_a]:text-[var(--brand-700)] [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </article>
  );
}
