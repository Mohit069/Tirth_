"use client";

import type { ReactNode } from "react";
import { AlertIcon, MinusIcon, PlusIcon } from "./icons";

export const inputClass =
  "h-[52px] w-full rounded-xl border-2 bg-card px-4 text-[18px] text-ink placeholder:text-[#a8998c] outline-none transition focus:border-brand";

export function inputBorder(hasError: boolean): string {
  return hasError ? "border-danger" : "border-line-strong";
}

export function Section({
  step,
  title,
  altTitle,
  altLang,
  icon,
  children,
  id,
}: {
  step: number;
  title: string;
  altTitle: string;
  altLang: string;
  icon?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-3xl border border-line bg-card p-4 shadow-[0_1px_3px_rgba(35,28,23,0.05)] sm:p-5">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-[15px] font-bold text-white">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-bold leading-tight">{title}</h2>
          <p className="text-[13px] leading-snug text-muted" lang={altLang}>
            {altTitle}
          </p>
        </div>
        {icon ? <span className="text-brand/80">{icon}</span> : null}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  label,
  altLabel,
  altLang,
  optional,
}: {
  htmlFor?: string;
  label: string;
  altLabel: string;
  altLang: string;
  optional?: string;
}) {
  const content = (
    <>
      <span className="text-[17px] font-semibold leading-snug">
        {label}
        {optional ? <span className="text-[14px] font-normal text-muted"> ({optional})</span> : null}
      </span>
      <span className="block text-[13px] leading-snug text-muted" lang={altLang}>
        {altLabel}
      </span>
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="block">
      {content}
    </label>
  ) : (
    <div>{content}</div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-[14px] font-medium leading-snug text-danger">
      <AlertIcon size={17} className="mt-px shrink-0" />
      {message}
    </p>
  );
}

/** − [number] + control. Typing works too, for big groups. */
export function Counter({
  id,
  value,
  onChange,
  min = 0,
  max,
  label,
  decreaseLabel,
  increaseLabel,
  invalid,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  invalid?: boolean;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const btn =
    "grid size-12 shrink-0 place-items-center rounded-full border-2 border-line-strong bg-card text-ink transition active:scale-90 active:bg-brand-soft disabled:opacity-35";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`${decreaseLabel}: ${label}`}>
        <MinusIcon size={22} />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={min}
        max={max}
        value={String(value)}
        aria-invalid={invalid || undefined}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const n = parseInt(e.currentTarget.value.replace(/\D/g, "") || "0", 10);
          onChange(clamp(Number.isNaN(n) ? min : n));
        }}
        className={`tabular h-12 w-16 rounded-xl border-2 bg-card text-center text-[22px] font-bold outline-none focus:border-brand ${invalid ? "border-danger" : "border-line-strong"}`}
      />
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`${increaseLabel}: ${label}`}>
        <PlusIcon size={22} />
      </button>
    </div>
  );
}

export type Choice<V extends string> = { value: V; label: string; sub?: string };

/** Big tappable radio buttons. */
export function ChoiceGroup<V extends string>({
  name,
  options,
  value,
  onChange,
  columns = 3,
  labelledBy,
  invalid,
}: {
  name: string;
  options: Choice<V>[];
  value: V | null;
  onChange: (v: V) => void;
  columns?: 2 | 3;
  labelledBy?: string;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <label
            key={o.value}
            className={`flex min-h-[52px] cursor-pointer select-none flex-col items-center justify-center rounded-xl border-2 px-2 py-2 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-tint active:scale-[0.97] ${
              selected
                ? "border-brand bg-brand-soft text-brand-strong"
                : invalid
                  ? "border-danger/60 bg-card"
                  : "border-line-strong bg-card"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="text-[16px] font-semibold leading-tight">{o.label}</span>
            {o.sub ? <span className="mt-0.5 text-[12px] leading-tight text-muted">{o.sub}</span> : null}
          </label>
        );
      })}
    </div>
  );
}
