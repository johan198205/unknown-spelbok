import { cn } from "@/lib/utils";

export function Input({
  className,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
      ) : null}
      <input
        className={cn(
          "w-full rounded-[9px] border border-line bg-bg-soft px-3 py-3 text-[15px] text-text outline-none placeholder:text-faint focus:border-blue",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Textarea({
  className,
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
      ) : null}
      <textarea
        className={cn(
          "w-full resize-y rounded-[9px] border border-line bg-bg-soft px-3 py-3 text-[15px] text-text outline-none placeholder:text-faint focus:border-blue",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function Select({
  className,
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
      ) : null}
      <select
        className={cn(
          "w-full rounded-[9px] border border-line bg-bg-soft px-3 py-3 text-[15px] text-text outline-none focus:border-blue",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
