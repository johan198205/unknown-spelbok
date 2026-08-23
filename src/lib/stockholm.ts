const TZ = "Europe/Stockholm";

export const FIXTURE_PICKER_DAYS = 14;
export const FIXTURE_PICKER_PAST_DAYS = 30;
export const FIXTURE_PICKER_FUTURE_DAYS = 30;

export function stockholmYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addStockholmDays(ymd: string, days: number) {
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

/** ISO-tidpunkt för en lokal svensk klockslag, t.ex. ("2026-01-15", 12, 0). */
export function stockholmIso(ymd: string, hour = 12, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const guess = new Date(`${ymd}T${hh}:${mm}:00Z`);
  return new Date(guess.getTime() - tzOffsetMs(TZ, guess)).toISOString();
}

/** [from, to) för ett kalenderdygn i svensk tid, som ISO-strängar. */
export function stockholmDayBounds(ymd: string) {
  const from = stockholmMidnight(ymd);
  const to = stockholmMidnight(addStockholmDays(ymd, 1));
  return { from: from.toISOString(), to: to.toISOString() };
}

export type DayChip = {
  ymd: string;
  weekday: string;
  day: string;
  isToday: boolean;
  isTomorrow: boolean;
  isYesterday: boolean;
};

function chipForOffset(today: string, offset: number): DayChip {
  const ymd = addStockholmDays(today, offset);
  const noon = new Date(`${ymd}T12:00:00Z`);
  return {
    ymd,
    weekday: noon.toLocaleDateString("sv-SE", {
      weekday: "short",
      timeZone: TZ,
    }),
    day: String(Number(ymd.slice(8))),
    isToday: offset === 0,
    isTomorrow: offset === 1,
    isYesterday: offset === -1,
  };
}

export function upcomingDayChips(count = FIXTURE_PICKER_DAYS): DayChip[] {
  const today = stockholmYmd();
  return Array.from({ length: count }, (_, i) => chipForOffset(today, i));
}

/** 30 dagar bakåt + idag + 30 dagar framåt, med idag i mitten. */
export function fixtureDayChips(
  past = FIXTURE_PICKER_PAST_DAYS,
  future = FIXTURE_PICKER_FUTURE_DAYS
): DayChip[] {
  const today = stockholmYmd();
  return Array.from({ length: past + 1 + future }, (_, i) =>
    chipForOffset(today, i - past)
  );
}
