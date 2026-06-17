import { useState } from "react";
import { useContent } from "../content/ContentContext";

// The form POSTs to the site's own PHP API by default (/api/contact.php →
// saved to the DB, readable in /admin). Override with VITE_CONTACT_ENDPOINT
// (e.g. a Formspree URL) if you'd rather. Either way, if the request fails for
// any reason it falls back to opening a prefilled email, so it never dead-ends.
const ENDPOINT =
  import.meta.env.VITE_CONTACT_ENDPOINT ||
  `${import.meta.env.VITE_API_BASE || "/api"}/contact.php`;

const STAGES = [
  "Prototype stage",
  "Reliability problems",
  "Scaling pains",
  "Haven't started yet",
];

const EMPTY = { name: "", email: "", stage: STAGES[0], message: "" };

export function ContactForm() {
  const { meta } = useContent();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const set = (key) => (e) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!values.name.trim()) e.name = "Your name, please.";
    if (!values.email.trim()) e.email = "An email so I can reply.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      e.email = "That email looks off.";
    if (values.message.trim().length < 10)
      e.message = "A sentence or two about the project.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Last-resort path: open a prefilled email so a down backend never blocks
  // someone from reaching out.
  const mailtoFallback = () => {
    const subject = encodeURIComponent(`Project enquiry — ${values.name}`);
    const body = encodeURIComponent(
      `Name: ${values.name}\nEmail: ${values.email}\nStage: ${values.stage}\n\n${values.message}`
    );
    window.location.href = `mailto:${meta.email}?subject=${subject}&body=${body}`;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (status === "submitting") return;
    if (!validate()) return;

    setStatus("submitting");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      setValues(EMPTY);
      setStatus("success");
    } catch {
      // Backend unavailable → fall back to a prefilled email instead of erroring.
      mailtoFallback();
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div className="form-done" role="status">
        <span className="form-done-mark" aria-hidden="true">✓</span>
        <h3>Thanks — it&rsquo;s on its way.</h3>
        <p>
          I read every note myself and reply within a day. If your mail client
          opened instead, just hit send — or reach me directly:
        </p>
        <a className="form-reset" href={`mailto:${meta.email}`}>
          {meta.email}
        </a>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit} noValidate>
      <div className={`field${errors.name ? " invalid" : ""}`}>
        <label htmlFor="cf-name">Name</label>
        <input
          id="cf-name"
          type="text"
          value={values.name}
          onChange={set("name")}
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "cf-name-e" : undefined}
        />
        {errors.name && (
          <span className="field-error" id="cf-name-e">
            {errors.name}
          </span>
        )}
      </div>

      <div className={`field${errors.email ? " invalid" : ""}`}>
        <label htmlFor="cf-email">Email</label>
        <input
          id="cf-email"
          type="email"
          value={values.email}
          onChange={set("email")}
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "cf-email-e" : undefined}
        />
        {errors.email && (
          <span className="field-error" id="cf-email-e">
            {errors.email}
          </span>
        )}
      </div>

      <div className="field">
        <label htmlFor="cf-stage">Where are you?</label>
        <div className="select-wrap">
          <select id="cf-stage" value={values.stage} onChange={set("stage")}>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`field${errors.message ? " invalid" : ""}`}>
        <label htmlFor="cf-message">What are you building?</label>
        <textarea
          id="cf-message"
          rows={4}
          value={values.message}
          onChange={set("message")}
          placeholder="Your product, and where the AI piece is stuck."
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "cf-message-e" : undefined}
        />
        {errors.message && (
          <span className="field-error" id="cf-message-e">
            {errors.message}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn solid form-submit"
        disabled={status === "submitting"}
        data-cursor="lg"
      >
        {status === "submitting" ? "Sending…" : "Send it"}{" "}
        <span className="arrow">→</span>
      </button>

      <p className="form-note">
        Goes straight to my inbox — I read every message myself and reply within a
        day.
      </p>

      {status === "error" && (
        <p className="form-status" role="alert">
          Something went wrong sending that. Email me directly at{" "}
          <a href={`mailto:${meta.email}`}>{meta.email}</a>.
        </p>
      )}
    </form>
  );
}
