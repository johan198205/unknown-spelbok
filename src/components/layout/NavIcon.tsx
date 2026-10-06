import {
  BookOpen,
  Info,
  Landmark,
  Medal,
  MessagesSquare,
  Trophy,
} from "lucide-react";

/**
 * Ikonerna framför menyvalen. Nyckeln är en sträng så att serverkomponenter
 * (SiteHeader) kan skicka menyn till klientnavet — komponenter går inte att
 * skicka över den gränsen.
 */
const ICONS = {
  spelbok: BookOpen,
  planket: MessagesSquare,
  topplista: Trophy,
  tavlingar: Medal,
  spelbolag: Landmark,
  "om-oss": Info,
} as const;

export type NavIconKey = keyof typeof ICONS;

export function NavIcon({
  name,
  className,
}: {
  name: NavIconKey;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon aria-hidden strokeWidth={2} className={className ?? "size-4 shrink-0"} />;
}
