import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/**
 * Custom two-part cursor: a quick dot and a trailing ring that swells over
 * interactive elements. rAF lerp, no animation library. Only on fine-pointer +
 * hover devices, never under reduced motion.
 */
export function Cursor() {
  const reduced = usePrefersReducedMotion();
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    document.body.classList.add("cursor-on");

    let mx = -100, my = -100;
    let dx = mx, dy = my, rx = mx, ry = my;
    let ringScale = 1, dotScale = 1;
    let hover = false, visible = false, raf;

    const move = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = ring.style.opacity = "1";
      }
    };
    const over = (e) => {
      hover = Boolean(e.target.closest("a, button, [data-cursor]"));
    };
    const out = () => {
      visible = false;
      dot.style.opacity = ring.style.opacity = "0";
    };

    const loop = () => {
      dx += (mx - dx) * 0.35;
      dy += (my - dy) * 0.35;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ringScale += ((hover ? 1.55 : 1) - ringScale) * 0.2;
      dotScale += ((hover ? 0 : 1) - dotScale) * 0.2;
      dot.style.transform = `translate(${dx}px, ${dy}px) scale(${dotScale})`;
      ring.style.transform = `translate(${rx}px, ${ry}px) scale(${ringScale})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    document.addEventListener("mouseleave", out);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      document.removeEventListener("mouseleave", out);
      document.body.classList.remove("cursor-on");
    };
  }, [reduced]);

  if (reduced) return null;
  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" style={{ opacity: 0 }} />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" style={{ opacity: 0 }} />
    </>
  );
}
