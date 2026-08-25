"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";

const KEY = "spelbok.onboarding.done";

const SLIDES = [
  {
    title: "Logga dina spel",
    body: "Svep för att sätta resultat och håll koll på varje tipp i spelkorten.",
    visual: "card",
  },
  {
    title: "Följ din utveckling",
    body: "Se ackumulerat netto, ROI och hitrate växa över tid.",
    visual: "chart",
  },
  {
    title: "Tävla mot andra",
    body: "Jämför dig i topplistorna mot andra publika spelböcker.",
    visual: "board",
  },
];

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY) && window.innerWidth < 1024) {
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;
  const slide = SLIDES[index];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-bg-soft lg:hidden">
      <div className="flex justify-end px-4 pt-4">
        <button type="button" onClick={finish} className="text-sm font-semibold text-muted">
          Hoppa över
        </button>
      </div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80 && index < SLIDES.length - 1) {
            setIndex(index + 1);
          } else if (info.offset.x > 80 && index > 0) {
            setIndex(index - 1);
          }
          animate(x, 0, { type: "spring", stiffness: 380, damping: 34 });
        }}
        className="flex flex-1 flex-col items-center justify-center px-8 text-center"
      >
        <div className="mb-8 flex h-44 w-full max-w-xs items-center justify-center rounded-[16px] border border-line bg-panel">
          {slide.visual === "card" ? (
            <div className="w-[78%] rounded-[12px] border border-line bg-panel-2 p-3 text-left">
              <div className="text-[10px] uppercase tracking-[0.12em] text-faint">
                Premier League
              </div>
              <div className="mt-1 text-sm font-semibold">Liverpool – Arsenal</div>
              <div className="mt-1 font-bold text-win">Ö2.5</div>
            </div>
          ) : null}
          {slide.visual === "chart" ? (
            <svg viewBox="0 0 200 80" className="h-24 w-48">
              <path
                d="M10 60 L50 45 L90 50 L130 28 L170 18 L190 22"
                fill="none"
                stroke="#66E38A"
                strokeWidth="3"
              />
            </svg>
          ) : null}
          {slide.visual === "board" ? (
            <div className="w-[78%] space-y-2 text-left">
              {["1 · Anna +12%", "2 · Du +8%", "3 · Erik +3%"].map((row) => (
                <div
                  key={row}
                  className="rounded-[8px] border border-line bg-panel-2 px-3 py-2 text-sm"
                >
                  {row}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <h2 className="font-display text-[28px] font-semibold">{slide.title}</h2>
        <p className="mt-3 max-w-sm text-[15px] text-muted">{slide.body}</p>
      </motion.div>

      <div className="flex items-center justify-between px-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-win" : "bg-line-strong"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            if (index >= SLIDES.length - 1) finish();
            else setIndex(index + 1);
          }}
          className="rounded-[12px] bg-win px-5 py-2.5 text-sm font-bold text-win-ink"
        >
          {index >= SLIDES.length - 1 ? "Kom igång" : "Nästa"}
        </button>
      </div>
    </div>
  );
}
