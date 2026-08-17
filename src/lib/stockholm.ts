const TZ = "Europe/Stockholm";

export const FIXTURE_PICKER_DAYS = 14;

export function stockholmYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return new Date(utc).toISOString().slice(0, 10);
}

function tzOffsetMs(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return asUtc - instant.getTime();
}

function stockholmMidnight(ymd: string) {
  const guess = new Date(`${ymd}T00:00:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(TZ, guess));
}

/** [from, to) för ett kalenderdygn i svensk tid, som ISO-strängar. */
export function stockholmDayBounds(ymd: string) {
  const from = stockholmMidnight(ymd);
  const to = stockholmMidnight(addCalendarDays(ymd, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

export type DayChip = {
  ymd: string;
  weekday: string;
  day: string;
  isToday: boolean;
  isTomorrow: boolean;
};

export function upcomingDayChips(count = FIXTURE_PICKER_DAYS): DayChip[] {
  const today = stockholmYmd();
  return Array.from({ length: count }, (_, i) => {
    const ymd = addCalendarDays(today, i);
    const noon = new Date(`${ymd}T12:00:00Z`);
    return {
      ymd,
      weekday: noon.toLocaleDateString("sv-SE", {
        weekday: "short",
        timeZone: TZ,
      }),
      day: String(Number(ymd.slice(8))),
      isToday: i === 0,
      isTomorrow: i === 1,
    };
  });
}
