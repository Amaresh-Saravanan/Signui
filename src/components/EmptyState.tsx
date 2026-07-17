import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body: string;
  cta?: ReactNode;
}

/** Empty states teach the interface — icon, promise, one-sentence how, CTA. */
export function EmptyState({ icon: Icon, title, body, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-alt/50 px-8 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft">
        <Icon className="h-6 w-6 text-primary" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <p className="max-w-[40ch] text-sm text-text-secondary">{body}</p>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  );
}
