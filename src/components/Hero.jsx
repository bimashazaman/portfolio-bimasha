import { useEffect, useRef, useState } from "react";
import { Marquee } from "./Marquee";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useContent } from "../content/ContentContext";

const HEADWORDS = [
  "I",
  "build",
  "AI",
  "systems",
  "that",
  { t: "survive", it: true },
  "production.",
];

// Circular text for the rotating "open to work" badge.
const ORBIT_TEXT = "OPEN TO WORK · FULL-STACK × AI · OPEN TO WORK · FULL-STACK × AI · ";

export function Hero() {
  const { hero, about } = useContent();
  // `ready` flips on after mount to trigger the CSS entrance.
  const [ready, setReady] = useState(false);
  const sectionRef = useRef(null);
  const portraitRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Cursor-reactive dot field (--mx/--my on the section) + gentle 3D tilt on
  // the portrait. Desktop pointers only; skipped for reduced motion.
  useEffect(() => {
    if (reduced) return undefined;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return undefined;

    const sec = sectionRef.current;
    const card = portraitRef.current;
    let raf = 0;
    const target = { x: -999, y: -999, rx: 0, ry: 0 };
    const state = { x: -999, y: -999, rx: 0, ry: 0 };

    const tick = () => {
      state.x += (target.x - state.x) * 0.18;
      state.y += (target.y - state.y) * 0.18;
      state.rx += (target.rx - state.rx) * 0.12;
      state.ry += (target.ry - state.ry) * 0.12;

      sec.style.setProperty("--mx", `${state.x.toFixed(1)}px`);
      sec.style.setProperty("--my", `${state.y.toFixed(1)}px`);
      if (card) {
        card.style.transform = `perspective(900px) rotateX(${state.rx.toFixed(
          2
        )}deg) rotateY(${state.ry.toFixed(2)}deg)`;
      }

      const settled =
        Math.abs(target.x - state.x) < 0.5 &&
        Math.abs(target.y - state.y) < 0.5 &&
        Math.abs(target.rx - state.rx) < 0.02 &&
        Math.abs(target.ry - state.ry) < 0.02;
      raf = settled ? 0 : requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      const r = sec.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;

      if (card) {
        const c = card.getBoundingClientRect();
        const px = (e.clientX - c.left) / c.width - 0.5;
        const py = (e.clientY - c.top) / c.height - 0.5;
        const over = px >= -0.5 && px <= 0.5 && py >= -0.5 && py <= 0.5;
        target.ry = over ? px * 7 : 0;
        target.rx = over ? -py * 7 : 0;
      }
      wake();
    };

    const onLeave = () => {
      target.rx = 0;
      target.ry = 0;
      wake();
    };

    sec.addEventListener("pointermove", onMove, { passive: true });
    sec.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      sec.removeEventListener("pointermove", onMove);
      sec.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <section className="hero" id="top" ref={sectionRef}>
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="wrap hero-grid">
        <div className="hero-copy">
          <span className={`avail hero-in${ready ? " ready" : ""}`}>
            <i aria-hidden="true" />
            {hero.available}
          </span>
          <p
            className={`kicker mono hero-in${ready ? " ready" : ""}`}
            style={{ "--d": "0.08s" }}
          >
            {hero.kicker}
          </p>

          <h1 className={`hero-title${ready ? " ready" : ""}`}>
            {HEADWORDS.map((w, i) => {
              const text = typeof w === "string" ? w : w.t;
              const isIt = typeof w === "object" && w.it;
              return (
                <span
                  key={i}
                  className={isIt ? "word it" : "word"}
                  style={{ "--i": i }}
                >
                  {text}
                </span>
              );
            })}
          </h1>

          <p
            className={`hero-sub hero-in${ready ? " ready" : ""}`}
            style={{ "--d": "0.55s" }}
          >
            {hero.sub}
          </p>

          <div
            className={`hero-cta hero-in${ready ? " ready" : ""}`}
            style={{ "--d": "0.7s" }}
          >
            <a className="btn solid" href="#work">
              See the work <span className="arrow">↓</span>
            </a>
            <a className="btn ghost" href="#contact">
              Start a conversation <span className="arrow">→</span>
            </a>
          </div>
        </div>

        <div
          className={`hero-portrait hero-in${ready ? " ready" : ""}`}
          style={{ "--d": "0.35s" }}
        >
          <div className="hero-portrait-frame" ref={portraitRef}>
            <img
              src={about.profile.photo}
              alt={`${about.profile.name}, ${about.profile.role}`}
              fetchPriority="high"
              decoding="async"
            />
          </div>

          <a
            className="orbit"
            href="#contact"
            aria-label="Open to work — get in touch"
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <path
                  id="orbit-circle"
                  d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"
                />
              </defs>
              <text>
                <textPath href="#orbit-circle">{ORBIT_TEXT}</textPath>
              </text>
            </svg>
            <span className="orbit-core" aria-hidden="true">
              ✦
            </span>
          </a>
        </div>
      </div>

      <div className="scroll-hint" aria-hidden="true">
        <i />
        Scroll
      </div>

      <Marquee />
    </section>
  );
}
