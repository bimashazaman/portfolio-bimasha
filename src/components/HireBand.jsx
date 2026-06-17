const PHRASE = "Let’s build something that survives";

/**
 * Full-bleed scrolling CTA band — alternating filled / outlined phrases.
 * The whole band is one link to the contact section; the moving copy is
 * decorative, with a screen-reader label on the link itself.
 */
export function HireBand() {
  // 8 items = two identical halves (F G F G | F G F G), so the -50%
  // marquee keyframe loops without a visible seam.
  const items = Array.from({ length: 8 });
  return (
    <section className="hire" aria-label="Work with me">
      <a className="hire-band" href="#contact">
        <span className="sr-only">{PHRASE} — get in touch</span>
        <div className="hire-track" aria-hidden="true">
          {items.map((_, i) => (
            <span className={`hire-item${i % 2 ? " ghost" : ""}`} key={i}>
              {PHRASE} <i>→</i>
            </span>
          ))}
        </div>
      </a>
    </section>
  );
}
