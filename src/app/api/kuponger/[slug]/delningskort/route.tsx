import { ImageResponse } from "next/og";
import { getBookmakerLogoUrl } from "@/lib/bookmakers";
import {
  COUPON_STATUS_LABEL,
  couponNetto,
  formatCouponOdds,
  isSettled,
  possibleWin,
} from "@/lib/coupons";
import { getCouponBySlug } from "@/lib/coupons-server";
import { teamLogoUrl } from "@/lib/logos";
import { loadOgFonts, OG_DISPLAY, OG_MONO, OG_SANS } from "@/lib/og-fonts";
import { formatMoney } from "@/lib/utils";

const WIDTH = 1200;
const HEIGHT = 630;

const DISPLAY = OG_DISPLAY;
const MONO = OG_MONO;
const SANS = OG_SANS;

const GREEN = "#66E38A";
const RED = "#FF5C6C";
const AMBER = "#FFB84D";
const CYAN = "#35D6F5";
const TEXT = "#E6EAF2";
const MUTED = "#8A94AB";
const FAINT = "#5D6883";

/**
 * Höjdbudget: 630 px minus 112 px padding, huvud (~70), en rad titel (~81)
 * och fot (~115) lämnar runt 255 px åt benen. Fyra ben i normal storlek
 * får plats; fem ritas i kompakt läge. Fler än fem: fyra kompakta ben och
 * en rad "+N fler" i stället för att tappa resten utan att säga något.
 */
const MAX_LEGS = 5;

/**
 * Satori ritar inte background-image: url(...), bara <img>. Bilderna
 * hämtas här i förväg med timeout och skickas in som data-URL:er, så en
 * långsam eller trasig logga ger en tom ruta i stället för en bild som
 * hänger eller kastar. Satori klarar PNG, JPEG, GIF och SVG — inte WebP
 * eller AVIF, så de hoppas över.
 */
const IMAGE_TIMEOUT_MS = 3000;
const IMAGE_MAX_BYTES = 1_500_000;

async function loadImage(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.length || buf.length > IMAGE_MAX_BYTES) return null;

    const isPng = [0x89, 0x50, 0x4e, 0x47].every((b, i) => buf[i] === b);
    const isJpeg = [0xff, 0xd8, 0xff].every((b, i) => buf[i] === b);
    const isGif = [0x47, 0x49, 0x46, 0x38].every((b, i) => buf[i] === b);
    let mime: string | null = isPng
      ? "image/png"
      : isJpeg
        ? "image/jpeg"
        : isGif
          ? "image/gif"
          : null;

    if (!mime && /svg/i.test(res.headers.get("content-type") ?? "")) {
      // Satori kastar på en SVG utan viewBox eller mått.
      const text = new TextDecoder().decode(buf);
      if (/<svg[\s\S]*?(viewBox|width=)/i.test(text)) mime = "image/svg+xml";
    }
    if (!mime) return null;

    return `data:${mime};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Delningskortet som PNG, 1200 × 630.
 *
 * En serverrendering, inte en canvas i webbläsaren: lagloggorna ligger på
 * media.api-sports.io och skulle förorena en canvas så att toDataURL()
 * kastar. Samma URL används både av "Ladda ner PNG" och av og:image, så
 * det användaren laddar ner är exakt det Facebook visar.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const coupon = await getCouponBySlug(slug);

  if (!coupon) {
    return new Response("Kupongen finns inte", { status: 404 });
  }

  const settled = isSettled(coupon);
  const netto = couponNetto(coupon);
  const accent =
    coupon.status === "open"
      ? CYAN
      : coupon.status === "won"
        ? GREEN
        : coupon.status === "lost"
          ? RED
          : AMBER;
  const accentSoft =
    coupon.status === "open"
      ? "rgba(53,214,245,.16)"
      : coupon.status === "won"
        ? "rgba(102,227,138,.16)"
        : coupon.status === "lost"
          ? "rgba(255,92,108,.16)"
          : "rgba(255,184,77,.16)";

  const overflow = coupon.legs.length > MAX_LEGS;
  const visibleLegs = coupon.legs.slice(0, overflow ? MAX_LEGS - 1 : MAX_LEGS);
  const hiddenLegs = coupon.legs.length - visibleLegs.length;
  const dense = coupon.legs.length >= MAX_LEGS;
  const crestSize = dense ? 36 : 44;
  const legFont = dense ? 22 : 26;
  const legGap = dense ? 10 : 14;

  // Alla bilder hämtas parallellt; samma lag i två ben hämtas en gång.
  const urls = new Set<string>();
  const bookmakerUrl = getBookmakerLogoUrl(coupon.bookmakers?.logo_url);
  if (bookmakerUrl) urls.add(bookmakerUrl);
  for (const leg of visibleLegs) {
    const fx = leg.fixtures;
    const home = teamLogoUrl(fx?.home_logo, fx?.home_team_id, fx?.sport);
    const away = teamLogoUrl(fx?.away_logo, fx?.away_team_id, fx?.sport);
    if (home) urls.add(home);
    if (away) urls.add(away);
  }
  const images = new Map(
    await Promise.all(
      [...urls].map(async (url) => [url, await loadImage(url)] as const)
    )
  );
  const image = (url: string | null) => (url ? images.get(url) ?? null : null);
  const bookmakerLogo = image(bookmakerUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          padding: "56px 60px",
          backgroundColor: "#0B0E14",
          backgroundImage:
            "radial-gradient(circle at 82% 8%, #1A2336, #0B0E14 62%)",
          fontFamily: SANS,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 30,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: DISPLAY,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: 6,
              color: TEXT,
              marginRight: 16,
            }}
          >
            SPELBOK
          </div>
          {coupon.kicker ? (
            <div
              style={{
                display: "flex",
                fontFamily: DISPLAY,
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: 2.2,
                textTransform: "uppercase",
                padding: "8px 14px",
                borderRadius: 8,
                backgroundColor: accentSoft,
                color: accent,
              }}
            >
              {coupon.kicker}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontFamily: MONO,
              marginLeft: "auto",
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: 1.2,
              padding: "9px 16px",
              borderRadius: 8,
              backgroundColor: accentSoft,
              color: accent,
            }}
          >
            {COUPON_STATUS_LABEL[coupon.status]}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: DISPLAY,
            fontSize: 52,
            fontWeight: 600,
            // 1,2 i stället för 1,06: overflow hidden klipper annars av
            // nedstaplarna (g, j, y) på enradstiteln.
            lineHeight: 1.2,
            color: TEXT,
            marginBottom: 19,
            maxWidth: 940,
            flexShrink: 0,
            // En rad, alltid: en titel på två rader trycker benen över foten.
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {coupon.title}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "auto",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {visibleLegs.map((leg) => {
            const fx = leg.fixtures;
            const home = teamLogoUrl(fx?.home_logo, fx?.home_team_id, fx?.sport);
            const away = teamLogoUrl(fx?.away_logo, fx?.away_team_id, fx?.sport);
            return (
              <div
                key={leg.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: legGap,
                  flexShrink: 0,
                }}
              >
                <Crest src={image(home)} size={crestSize} />
                <Crest src={image(away)} size={crestSize} />
                <div
                  style={{
                    display: "flex",
                    fontSize: legFont,
                    color: "#C3CBDB",
                    maxWidth: 420,
                    minWidth: 0,
                    flexShrink: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginRight: 18,
                  }}
                >
                  {`${fx?.home_name ?? "?"} – ${fx?.away_name ?? "?"}`}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: legFont,
                    fontWeight: 700,
                    color: TEXT,
                    maxWidth: 300,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {leg.pick}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: MONO,
                    marginLeft: "auto",
                    paddingLeft: 18,
                    flexShrink: 0,
                    fontSize: legFont + 2,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  {formatCouponOdds(leg.odds)}
                </div>
              </div>
            );
          })}
          {hiddenLegs > 0 ? (
            <div
              style={{
                display: "flex",
                fontFamily: MONO,
                fontSize: 20,
                fontWeight: 600,
                color: MUTED,
                flexShrink: 0,
              }}
            >
              {`+${hiddenLegs} fler`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            paddingTop: 30,
            borderTop: "1px solid #232B3E",
            flexShrink: 0,
          }}
        >
          <Field
            label="Insats"
            value={formatMoney(Number(coupon.stake), "kr").replace("+", "")}
            size={32}
          />
          <Field
            label="Totalodds"
            value={formatCouponOdds(coupon.total_odds)}
            size={46}
            color={GREEN}
          />
          {/* Avgjord kupong delas med sitt utfall, aldrig med möjlig vinst. */}
          {settled ? (
            <Field
              label="Utfall"
              value={formatMoney(netto, "kr")}
              size={32}
              color={netto > 0 ? GREEN : netto < 0 ? RED : TEXT}
            />
          ) : (
            <Field
              label="Möjlig vinst"
              value={formatMoney(possibleWin(coupon), "kr")}
              size={32}
              color={GREEN}
            />
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              marginLeft: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 150,
                height: 56,
                borderRadius: 10,
                backgroundColor: "#1B2436",
              }}
            >
              {bookmakerLogo ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                <img
                  src={bookmakerLogo}
                  width={117}
                  height={40}
                  style={{ objectFit: "contain" }}
                />
              ) : null}
            </div>
            <div style={{ display: "flex", fontSize: 15, color: FAINT, marginTop: 10 }}>
              spelbok.se · 18+ · Spela ansvarsfullt
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: await loadOgFonts(),
      headers: {
        // Kupongen ändras när ett ben rättas — en timmes cache räcker för
        // att slippa rendera om vid varje delning utan att visa gårdagens
        // status i en förhandsvisning.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    }
  );
}

/** src är en data-URL från loadImage, eller null för en tom cirkel. */
function Crest({ src, size }: { src: string | null; size: number }) {
  const inner = Math.round(size * 0.77);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 99,
        backgroundColor: "rgba(230,234,242,.08)",
        marginRight: 18,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img
          src={src}
          width={inner}
          height={inner}
          style={{ objectFit: "contain" }}
        />
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  size,
  color = TEXT,
}: {
  label: string;
  value: string;
  size: number;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 52 }}>
      <div
        style={{
          display: "flex",
          fontSize: 15,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: MUTED,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: MONO,
          fontSize: size,
          fontWeight: 600,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}
