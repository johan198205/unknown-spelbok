import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-win text-win-ink hover:brightness-105 border-transparent font-bold",
  secondary:
    "bg-panel border-line text-text hover:border-[#3A4560] font-semibold",
  ghost:
    "bg-transparent border-line text-muted hover:text-text font-semibold",
  danger:
    "bg-loss/15 border-loss/40 text-loss hover:bg-loss/25 font-semibold",
};

const sizes = {
  sm: "px-3 py-2 text-13 rounded-lg text-[13px]",
  md: "px-4 py-2.5 text-[14.5px] rounded-[9px]",
  lg: "px-6 py-3.5 text-base rounded-[10px]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  size = "md",
  children,
}: {
  href: string;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 border transition no-underline hover:no-underline",
        variants[variant || "primary"],
        sizes[size || "md"],
        variant === "primary" && "hover:text-win-ink",
        variant === "secondary" && "hover:text-text",
        variant === "ghost" && "hover:text-text",
        variant === "danger" && "hover:text-loss",
        className
      )}
    >
      {children}
    </Link>
  );
}
