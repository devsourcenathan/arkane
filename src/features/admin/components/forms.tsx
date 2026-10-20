import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="field-label">
        {label} {required && <span className="text-fg-subtle">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}

export function TextField({ label, value, onChange, required, hint, type = "text", placeholder, maxLength }: TextFieldProps) {
  const id = `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} htmlFor={id} required={required} hint={hint}>
      <input
        id={id}
        type={type}
        className="field-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  maxLength?: number;
}) {
  const id = `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <textarea
        id={id}
        rows={rows}
        className="field-input resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min = 0,
  required,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
  min?: number;
  required?: boolean;
}) {
  const id = `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} htmlFor={id} hint={hint} required={required}>
      <input
        id={id}
        type="number"
        min={min}
        className="field-input"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Math.max(min, Math.floor(Number(v) || 0)));
        }}
        required={required}
      />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1 text-sm text-fg">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full border transition-colors ${
          checked ? "border-fg bg-fg" : "border-border-strong bg-surface"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
            checked ? "left-0.5 translate-x-5 bg-fg-inverted" : "left-0.5 bg-fg-muted"
          }`}
        />
      </button>
      {label}
    </label>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">{children}</div>;
}

export const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "archived", label: "Archivé" },
];
