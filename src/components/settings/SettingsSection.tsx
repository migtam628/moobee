import type { ReactNode } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** A titled card on the Settings page. */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section aria-label={title} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

interface SettingRowProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}

/** One setting: its name and hint on the left, the control on the right (stacked on a phone). */
export function SettingRow({ label, hint, htmlFor, children }: SettingRowProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
