import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "./SectionHeading";
import { Reveal } from "./Reveal";
import { ContactForm } from "./ContactForm";
import { useContent } from "../content/ContentContext";

const dhakaTime = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date());

/** Live local clock — answers "what's the timezone overlap?" at a glance. */
function LocalTime() {
  const [now, setNow] = useState(dhakaTime);
  useEffect(() => {
    const id = setInterval(() => setNow(dhakaTime()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="local-time">
      <i aria-hidden="true" /> {now} in Dhaka right now
    </span>
  );
}

/** The email link plus a small copy-to-clipboard affordance. */
function EmailRow() {
  const { meta } = useContent();
  const [copied, setCopied] = useState(false);
  const timer = useRef();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(meta.email);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the mailto link still works.
    }
  };

  return (
    <div className="email-row">
      <a className="email" href={`mailto:${meta.email}`}>
        {meta.email} <span aria-hidden="true">→</span>
      </a>
      <button
        type="button"
        className={`copy-email${copied ? " done" : ""}`}
        onClick={copy}
        aria-label="Copy email address"
      >
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </div>
  );
}

// Renders a real external link, or an inert placeholder (no jump-to-top) until
// the URL is filled in.
function Social({ label, href }) {
  const set = href && href !== "#";
  if (!set) {
    return (
      <a
        className="soon"
        role="link"
        aria-disabled="true"
        onClick={(e) => e.preventDefault()}
      >
        {label}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  );
}

export function Contact() {
  const { contact, meta } = useContent();
  return (
    <section id="contact" className="contact">
      <div className="wrap">
        <SectionHeading num="11" title="Contact" />

        <div className="contact-grid">
          <div className="contact-left">
            <Reveal as="h2" className="big">
              {contact.headline.map((seg, i) =>
                seg.it ? (
                  <span className="it" key={i}>
                    {seg.it}
                  </span>
                ) : (
                  seg.t
                )
              )}
            </Reveal>

            <Reveal as="p" className="pitch" delay={0.08}>
              {contact.pitch}
            </Reveal>

            <Reveal delay={0.1}>
              <span className="mono next-label">{contact.next.label}</span>
              <ol className="next-steps">
                {contact.next.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Reveal>

            <Reveal delay={0.12}>
              <EmailRow />
            </Reveal>

            <Reveal className="contact-meta" delay={0.16}>
              <Social label="LinkedIn ↗" href={meta.linkedin} />
              <Social label="GitHub ↗" href={meta.github} />
              <span>{meta.location}</span>
              <LocalTime />
            </Reveal>
          </div>

          <Reveal className="contact-right" delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
