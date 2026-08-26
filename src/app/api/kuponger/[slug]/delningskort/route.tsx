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

  const bookmakerLogo = getBookmakerLogoUrl(coupon.bookmakers?.logo_url);

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
        <div style={{ display: "flex", alignItems: "center", marginBottom: 30 }}>
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
            lineHeight: 1.06,
            color: TEXT,
            marginBottom: 26,
            maxWidth: 940,
          }}
        >
          {coupon.title}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "auto",
          }}
        >
          {coupon.legs.slice(0, 5).map((leg) => {
            const fx = leg.fixtures;
            const home = teamLogoUrl(fx?.home_logo, fx?.home_team_id, fx?.sport);
            const away = teamLogoUrl(fx?.away_logo, fx?.away_team_id, fx?.sport);
            return (
              <div
                key={leg.id}
                style={{ display: "flex", alignItems: "center", marginBottom: 14 }}
              >
                <Crest src={home} />
                <Crest src={away} />
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    color: "#C3CBDB",
                    maxWidth: 420,
                    overflow: "hidden",
                    marginRight: 18,
                  }}
                >
                  {fx?.home_name ?? "?"} – {fx?.away_name ?? "?"}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 700,
                    color: TEXT,
                  }}
                >
                  {leg.pick}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: MONO,
                    marginLeft: "auto",
                    fontSize: 28,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  {formatCouponOdds(leg.odds)}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            paddingTop: 30,
            borderTop: "1px solid #232B3E",
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
                width: 150,
                height: 56,
                borderRadius: 10,
                backgroundColor: "#1B2436",
                ...(bookmakerLogo
                  ? {
                      backgroundImage: `url(${bookmakerLogo})`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                      backgroundSize: "78% auto",
                    }
                  : {}),
              }}
            />
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

function Crest({ src }: { src: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        width: 44,
        height: 44,
        borderRadius: 99,
        backgroundColor: "rgba(230,234,242,.08)",
        marginRight: 18,
        ...(src
          ? {
              backgroundImage: `url(${src})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "34px 34px",
            }
          : {}),
      }}
    />
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
