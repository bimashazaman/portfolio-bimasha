import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Counts from 0 up to `target` over `duration` ms once `active` is true.
 * Honors reduced motion by snapping straight to the target.
 */
export function useCountUp(target, active, duration = 1300) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    if (reduced || target === 0) {
      setValue(target);
      return;
    }

    let raf;
    let startTime;
    const ease = (t) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const step = (now) => {
      if (startTime === undefined) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      setValue(Math.round(ease(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduced]);

  return value;
}
