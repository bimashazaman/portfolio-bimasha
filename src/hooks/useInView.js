import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver hook (replaces framer-motion's useInView).
 * Returns [ref, inView]. Defaults to firing once. Falls back to "in view" when
 * IntersectionObserver isn't available so content never gets stuck hidden.
 */
export function useInView({
  once = true,
  rootMargin = "0px 0px -12% 0px",
  threshold = 0,
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView];
}
