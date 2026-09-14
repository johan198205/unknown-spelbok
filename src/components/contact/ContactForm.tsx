"use client";

import { useRef, useState } from "react";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MSG = 2000;

type Status = "idle" | "sending" | "sent";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>("Support");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const submitting = useRef(false);

  const ready =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    message.trim().length > 0 &&
    consent &&
    status !== "sent";

  const len = message.length;
  const counterColor =
    len > 1800 ? "#FFB84D" : len > 0 ? "#C3CBDB" : "#5D6883";

  function validate(): string | null {
    if (!name.trim() || !email.trim()) {
      return "Fyll i namn och e-post så vi kan svara.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      return "E-postadressen ser inte rätt ut.";
    }
    if (!message.trim()) {
      return "Skriv ett meddelande.";
    }
    if (!consent) {
      return "Du behöver godkänna att vi sparar meddelandet för att kunna svara.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sent" || submitting.current) return;

    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    submitting.current = true;
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
          consent,
          website: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Något gick fel. Försök igen om en stund.");
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Något gick fel. Försök igen om en stund.");
      setStatus("idle");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative rounded-2xl border border-line bg-panel p-7"
    >
      <h2 className="font-display text-[22px] font-semibold text-text">
        Skicka ett meddelande
      </h2>
      <p className="mt-1 text-[14px] text-[#8A94AB]">
        Vi svarar till den e-post du anger.
      </p>

      {/* Honeypot — dold för människor */}
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Webbplats</label>
        <input
          id="contact-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Namn" htmlFor="contact-name">
          <input
            id="contact-name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            disabled={status === "sent"}
            className={fieldClass}
            autoComplete="name"
          />
        </Field>
        <Field label="E-post" htmlFor="contact-email">
          <input
            id="contact-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            disabled={status === "sent"}
            className={fieldClass}
            autoComplete="email"
          />
        </Field>
      </div>

      <div className="mt-5">
        <span className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94AB]">
          Ärende
        </span>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TOPICS.map((t) => {
            const on = topic === t;
            return (
              <button
                key={t}
                type="button"
                disabled={status === "sent"}
                onClick={() => {
                  setTopic(t);
                  setError("");
                }}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3.5 py-[9px] text-[13.5px] font-semibold transition-colors",
                  on
                    ? "border-[rgba(102,227,138,.45)] bg-[rgba(102,227,138,.14)] text-win"
                    : "border-line-strong bg-transparent text-[#C3CBDB]"
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {topic === "Spelbolagslistan" ? (
        <p className="mt-4 rounded-[10px] border border-[rgba(255,184,77,.3)] bg-[rgba(255,184,77,.08)] px-3.5 py-3 text-[13.5px] leading-relaxed text-[#FFC96B]">
          Vi ändrar aldrig betyg eller rankning mot ersättning. Skriv gärna, men
          vet att listan bygger på vår egen bedömning.
        </p>
      ) : null}

      <div className="mt-5">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <label
            htmlFor="contact-message"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94AB]"
          >
            Meddelande
          </label>
          <span
            className="font-mono-num text-[12px]"
            style={{ color: counterColor }}
          >
            {len}/{MAX_MSG}
          </span>
        </div>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={MAX_MSG}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value.slice(0, MAX_MSG));
            setError("");
          }}
          disabled={status === "sent"}
          className={cn(fieldClass, "min-h-[140px] resize-y")}
        />
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.5] text-[#8A94AB]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            setError("");
          }}
          disabled={status === "sent"}
          className="mt-0.5 size-[18px] shrink-0 accent-win"
        />
        <span>
          Jag godkänner att Spelbok sparar mitt meddelande och min e-post för
          att kunna svara. Uppgifterna raderas inom 12 månader.
        </span>
      </label>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-[rgba(255,92,108,.35)] bg-[rgba(255,92,108,.1)] px-3.5 py-3 text-[13.5px] text-[#FF8A96]"
        >
          {error}
        </p>
      ) : null}

      {status === "sent" ? (
        <p
          role="status"
          className="mt-4 rounded-[10px] border border-win-border bg-win-soft px-3.5 py-3 text-[13.5px] leading-relaxed text-win"
        >
          Tack, meddelandet är skickat. Du får en kopia till din e-post. Vi hör
          av oss inom 24 timmar på vardagar.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending" || status === "sent"}
        className={cn(
          "mt-5 w-full rounded-[11px] px-4 py-[15px] text-[15.5px] font-bold transition-colors",
          ready && status === "idle"
            ? "cursor-pointer border border-win bg-win text-win-ink hover:brightness-105"
            : "cursor-not-allowed border border-line-strong bg-panel-2 text-[#5D6883]"
        )}
      >
        {status === "sent"
          ? "Skickat"
          : status === "sending"
            ? "Skickar…"
            : "Skicka meddelande"}
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A94AB]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-[10px] border border-line bg-[#0F1420] px-3.5 py-[13px] text-[15px] text-text outline-none placeholder:text-[#5D6883] focus:border-line-hover disabled:opacity-60";
