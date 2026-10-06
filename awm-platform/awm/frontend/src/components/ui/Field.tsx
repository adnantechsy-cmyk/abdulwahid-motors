'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  error?: string;
  hint?: string;
  /** Shown beside the label, e.g. "Optional". */
  tag?: string;
};

const inputClass =
  'h-12 w-full border bg-white px-4 text-base placeholder:text-awm-muted/60 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-awm-red';

/** Label + input + hint/error wired together for screen readers. */
export function TextField({ label, error, hint, tag, className = '', ...input }: FieldProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-center justify-between text-sm font-bold">
        <span>{label}</span>
        {tag && <span className="text-xs font-medium text-awm-muted">{tag}</span>}
      </label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputClass} ${error ? 'border-awm-red' : 'border-awm-line'} ${className}`}
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-awm-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}

type PasswordProps = FieldProps & { showLabel: string; hideLabel: string };

export function PasswordField({ showLabel, hideLabel, label, error, hint, tag, className = '', ...input }: PasswordProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-center justify-between text-sm font-bold">
        <span>{label}</span>
        {tag && <span className="text-xs font-medium text-awm-muted">{tag}</span>}
      </label>
      <div className="relative">
        <input
          {...input}
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          // Passwords are typed left-to-right in both languages.
          dir="ltr"
          className={`${inputClass} pe-14 text-start ${error ? 'border-awm-red' : 'border-awm-line'} ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-awm-muted hover:text-awm-black"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-awm-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-sm font-medium text-awm-red">{error}</p>}
    </div>
  );
}
