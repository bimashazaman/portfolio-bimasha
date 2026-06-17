import { useTheme } from "../hooks/useTheme";

/** Sun / moon button that flips the color theme. */
export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const isLight = theme === "light";

  // Circular reveal from the button via the View Transitions API.
  // Falls back to the plain swap when unsupported or reduced motion.
  const onToggle = (e) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) {
      toggle();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const next = isLight ? "dark" : "light";

    const vt = document.startViewTransition(() => {
      // Mutate the DOM synchronously so the "new" snapshot has the next
      // theme; the React state update below re-applies the same value.
      document.documentElement.dataset.theme = next;
      toggle();
    });
    vt.ready
      .then(() => {
        const radius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 550,
            easing: "cubic-bezier(0.22, 0.65, 0.18, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      })
      .catch(() => {});
  };

  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark mode" : "Light mode"}
      data-cursor="lg"
    >
      <span className="theme-toggle-track">
        <svg className="i-sun" viewBox="0 0 24 24" aria-hidden="true" width="15" height="15">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="2.5" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="21.5" />
            <line x1="2.5" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="21.5" y2="12" />
            <line x1="5.2" y1="5.2" x2="6.9" y2="6.9" />
            <line x1="17.1" y1="17.1" x2="18.8" y2="18.8" />
            <line x1="5.2" y1="18.8" x2="6.9" y2="17.1" />
            <line x1="17.1" y1="6.9" x2="18.8" y2="5.2" />
          </g>
        </svg>
        <svg className="i-moon" viewBox="0 0 24 24" aria-hidden="true" width="15" height="15">
          <path
            d="M20 14.2A8 8 0 1 1 9.8 4 6.3 6.3 0 0 0 20 14.2Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  );
}
