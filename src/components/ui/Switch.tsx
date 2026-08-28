// Medvetet utan "use client": <Switch> renderas bara inuti klientkomponenter,
// och `switchClasses` måste kunna läsas från en serverkomponent (statistik-
// sidan). Ett klientdirektiv här hade gjort funktionen till en klientreferens
// som kastar när servern anropar den.
import { cn } from "@/lib/utils";

/**
 * Den enda på/av-reglaget i admin. Fanns tidigare i sex snarlika kopior med
 * fyra olika storlekar — samma kontroll ska se likadan ut oavsett modul.
 *
 * `sm` används i täta listor och tabellrader, `md` i inställningsrader där
 * reglaget står ensamt till höger om en rubrik.
 */
const SIZES = {
  sm: {
    track: "h-[22px] w-[38px]",
    knob: "size-[14px]",
    on: "left-[calc(100%-16px)]",
  },
  md: {
    track: "h-[26px] w-[46px]",
    knob: "size-[18px]",
    on: "left-[calc(100%-20px)]",
  },
} as const;

/**
 * För de få ställen där reglaget inte är en knapp — t.ex. statistikfiltret som
 * är en länk till samma sida med en annan query. Ger samma geometri och färg
 * som <Switch>, utan dess klick-beteende.
 */
export function switchClasses(checked: boolean, size: keyof typeof SIZES = "md") {
  const s = SIZES[size];
  return {
    track: cn(
      "relative block shrink-0 rounded-[var(--radius-pill)] border transition-colors",
      s.track,
      checked ? "border-win/45 bg-win/25" : "border-line-strong bg-panel-2"
    ),
    knob: cn(
      "absolute top-[2px] rounded-[var(--radius-pill)] transition-[left] duration-150",
      s.knob,
      checked ? cn(s.on, "bg-win") : "left-[2px] bg-muted"
    ),
  };
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 cursor-pointer rounded-[var(--radius-pill)] border p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        s.track,
        checked
          ? "border-win/45 bg-win/25"
          : "border-line-strong bg-panel-2 hover:border-line-hover",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[2px] rounded-[var(--radius-pill)] transition-[left] duration-150",
          s.knob,
          checked ? cn(s.on, "bg-win") : "left-[2px] bg-muted"
        )}
      />
    </button>
  );
}
