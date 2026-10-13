import { forwardRef } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldBase =
  "w-full rounded-suave border border-arena bg-blanco-roto px-3.5 text-sm text-tinta " +
  "placeholder:text-gris-calido-300 transition-colors duration-200 " +
  "focus:border-oliva focus:outline-none focus:ring-2 focus:ring-oliva/20";

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function FieldLabel({ label, hint, error, required }: FieldProps) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label className="text-tinta-suave text-sm font-medium">
        {label}
        {required ? <span className="text-oliva ml-0.5">*</span> : null}
      </label>
      {hint && !error ? <span className="text-gris-calido text-xs">{hint}</span> : null}
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, className = "", id, ...props },
  ref,
) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} error={error} required={required} />
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} h-11 ${className}`}
        {...props}
      />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, className = "", ...props },
  ref,
) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} error={error} required={required} />
      <textarea
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} min-h-28 py-3 leading-relaxed ${className}`}
        {...props}
      />
    </div>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, className = "", children, ...props },
  ref,
) {
  return (
    <div>
      <FieldLabel label={label} hint={hint} error={error} required={required} />
      <select
        ref={ref}
        aria-invalid={Boolean(error)}
        className={`${fieldBase} h-11 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
