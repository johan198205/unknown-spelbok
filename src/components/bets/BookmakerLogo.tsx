import { bookmakerInitial, getBookmakerLogoUrl } from "@/lib/bookmakers";
import { cn } from "@/lib/utils";

type BookmakerLogoProps = {
  /** Storage-path eller full URL. Null → ingen logga (om inte placeholder). */
  logoPath?: string | null;
  name?: string | null;
  /** Visa grå cirkel med initial — endast när bookmaker_id saknas. */
  placeholder?: boolean;
  size?: number;
  className?: string;
};

export function BookmakerLogo({
  logoPath,
  name,
  placeholder = false,
  size = 18,
  className,
}: BookmakerLogoProps) {
  const src = getBookmakerLogoUrl(logoPath);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!placeholder) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#2A3348] font-semibold text-[#9AA6BD]",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.55) }}
    >
      {bookmakerInitial(name)}
    </span>
  );
}
