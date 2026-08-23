import { bookmakerInitial, getBookmakerLogoUrl } from "@/lib/bookmakers";
import { cn } from "@/lib/utils";

type BookmakerLogoProps = {
  /** Storage-path eller full URL. Null → ingen logga (om inte placeholder). */
  logoPath?: string | null;
  name?: string | null;
  /** Visa grå cirkel med initial — endast när bookmaker_id saknas. */
  placeholder?: boolean;
  size?: number;
  /**
   * Sätt för wordmark-loggor: `size` blir höjd, bredden växer fritt upp till
   * `maxWidth`. Utan detta renderas loggan i en kvadrat, vilket kramar ihop
   * breda loggor (Unibet m.fl.) till några få pixlar i höjd.
   */
  maxWidth?: number;
  className?: string;
};

export function BookmakerLogo({
  logoPath,
  name,
  placeholder = false,
  size = 18,
  maxWidth,
  className,
}: BookmakerLogoProps) {
  const src = getBookmakerLogoUrl(logoPath);
  const label = name?.trim() || "";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        title={label || undefined}
        height={size}
        className={cn("shrink-0 object-contain object-left", className)}
        style={
          maxWidth
            ? { height: size, width: "auto", maxWidth }
            : { width: size, height: size }
        }
      />
    );
  }

  if (!placeholder) return null;

  return (
    <span
      aria-hidden
      title={label || undefined}
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
