import { useEffect, useState } from "react";

/**
 * Floating "back to top" button. Renders as an #top anchor so the global
 * smooth-scroll handler (useSmoothScroll) drives it — and it still works under
 * reduced motion / no-JS via CSS scroll-behavior.
 */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#top"
      className={`to-top${show ? " show" : ""}`}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      data-cursor="lg"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M12 19V5M6 11l6-6 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
